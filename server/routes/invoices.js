import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import PDFDocument from 'pdfkit';
import { emitToPatientRoom } from '../socket.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to update invoice status based on payment state and due date
async function updateInvoiceStatus(invoiceId, userId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  if (!invoice) return;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, invoice.totalAmount - totalPaid);

  let status = invoice.status;
  if (totalPaid >= invoice.totalAmount) {
    status = 'PAID';
  } else if (totalPaid > 0) {
    status = 'PARTIALLY_PAID';
  } else {
    // Check if overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      status = 'OVERDUE';
    } else {
      status = 'PENDING';
    }
  }

  const previousStatus = invoice.status;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: totalPaid,
      balanceAmount: balance,
      status
    }
  });

  if (status === 'PAID' && previousStatus !== 'PAID') {
    await prisma.auditLog.create({
      data: {
        userId: userId || 'system',
        action: 'INVOICE_PAID',
        resource: 'INVOICE',
        resourceId: invoiceId,
        details: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount }
      }
    });
  }
}

// 1. CREATE INVOICE (ADMIN ONLY)
router.post('/invoices', authenticate, authorize('ADMIN'), async (req, res) => {
  const { patientId, invoiceDate, dueDate, notes, items = [], gstRate = 18, sessionIds = [] } = req.body;

  if (!patientId || items.length === 0) {
    return res.status(400).json({ error: 'Patient and at least one item are required' });
  }

  try {
    // Generate custom Invoice Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date(invoiceDate).toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `SS-${dateStr}-${randomSuffix}`;

    // Compute totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = subtotal * (gstRate / 100);
    const totalAmount = subtotal + taxAmount;
    const balanceAmount = totalAmount;

    // Check default status
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);
    const status = due < today ? 'OVERDUE' : 'PENDING';

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          patientId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          subtotal,
          taxAmount,
          totalAmount,
          balanceAmount,
          status,
          notes,
          createdBy: req.user.email,
        }
      });

      const invoiceItems = await Promise.all(
        items.map(item => tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: item.description,
            quantity: parseInt(item.quantity, 10),
            rate: parseFloat(item.rate),
            amount: parseInt(item.quantity, 10) * parseFloat(item.rate)
          }
        }))
      );

      if (sessionIds && sessionIds.length > 0) {
        await tx.session.updateMany({
          where: {
            id: { in: sessionIds },
            patientId
          },
          data: {
            invoiceId: invoice.id
          }
        });
      }

      return { invoice, items: invoiceItems };
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_INVOICE',
        resource: 'INVOICE',
        resourceId: result.invoice.id,
        details: { invoiceNumber, totalAmount }
      }
    });

    emitToPatientRoom(patientId, 'invoice_created', result.invoice);

    res.status(201).json(result);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. GET INVOICES (ADMIN, SLP, PARENT ROLE CHECKS)
router.get('/invoices', authenticate, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'SCHOOL_COORDINATOR') {
      return res.status(403).json({ error: 'No billing access' });
    }

    if (req.user.role === 'PARENT') {
      where = { patient: { parentUserId: req.user.id } };
    } else {
      // Admin or SLP
      if (req.query.patientId) {
        where.patientId = req.query.patientId;
      }
    }

    // Auto-update status to OVERDUE for pending invoices where dueDate is passed
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        ...where,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() }
      }
    });

    for (const inv of unpaidInvoices) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'OVERDUE' }
      });
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: true, items: true },
      orderBy: { invoiceDate: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET SINGLE INVOICE
router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { patient: true, items: true, payments: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Authorization checks
    if (req.user.role === 'PARENT' && invoice.patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to invoice' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      return res.status(403).json({ error: 'No billing access' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Fetch invoice details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. PATCH INVOICE (ADMIN ONLY)
router.patch('/invoices/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { status, notes, dueDate, items, discountAmount } = req.body;
  try {
    const invoiceId = req.params.id;
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let data = {};
      if (status) data.status = status;
      if (notes !== undefined) data.notes = notes;
      if (dueDate) data.dueDate = new Date(dueDate);

      if (items || discountAmount !== undefined) {
        let finalItems = items ? [...items] : await tx.invoiceItem.findMany({ where: { invoiceId } });
        
        finalItems = finalItems.filter(item => item.description !== 'Discount' && item.description !== 'Discount Applied');

        if (discountAmount && parseFloat(discountAmount) > 0) {
          finalItems.push({
            description: 'Discount Applied',
            quantity: 1,
            rate: -parseFloat(discountAmount),
            amount: -parseFloat(discountAmount)
          });
        }

        await tx.invoiceItem.deleteMany({
          where: { invoiceId }
        });

        const subtotal = finalItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const gstRate = 18;
        const taxAmount = subtotal * (gstRate / 100);
        const totalAmount = subtotal + taxAmount;
        
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const balanceAmount = Math.max(0, totalAmount - totalPaid);

        data.subtotal = subtotal;
        data.taxAmount = taxAmount;
        data.totalAmount = totalAmount;
        data.balanceAmount = balanceAmount;

        if (data.status !== 'CANCELLED') {
          if (totalPaid >= totalAmount) {
            data.status = 'PAID';
          } else if (totalPaid > 0) {
            data.status = 'PARTIALLY_PAID';
          } else {
            const today = new Date();
            const due = dueDate ? new Date(dueDate) : new Date(invoice.dueDate);
            data.status = due < today ? 'OVERDUE' : 'PENDING';
          }
        }

        await Promise.all(
          finalItems.map(item => tx.invoiceItem.create({
            data: {
              invoiceId,
              description: item.description,
              quantity: parseInt(item.quantity, 10),
              rate: parseFloat(item.rate),
              amount: parseInt(item.quantity, 10) * parseFloat(item.rate)
            }
          }))
        );
      } else {
        if (status === 'CANCELLED') {
          data.balanceAmount = 0;
        }
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data,
        include: { items: true }
      });
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_INVOICE',
        resource: 'INVOICE',
        resourceId: updated.id,
        details: { invoiceNumber: updated.invoiceNumber, totalAmount: updated.totalAmount }
      }
    });

    emitToPatientRoom(invoice.patientId, 'invoice_updated', updated);

    res.json(updated);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 5. POST PAYMENT (ADMIN ONLY)
router.post('/payments', authenticate, authorize('ADMIN'), async (req, res) => {
  const { invoiceId, amount, paymentMethod, transactionId, notes, paymentDate } = req.body;

  if (!invoiceId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invoice reference and positive payment amount are required' });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        patientId: invoice.patientId,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId: transactionId || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes || null
      }
    });

    // Update invoice balance and status
    await updateInvoiceStatus(invoiceId, req.user.id);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RECORD_PAYMENT',
        resource: 'PAYMENT',
        resourceId: payment.id,
        details: { invoiceId, patientId: invoice.patientId, amount }
      }
    });

    emitToPatientRoom(invoice.patientId, 'payment_received', payment);
    emitToPatientRoom(invoice.patientId, 'invoice_updated', { id: invoiceId });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 6. GET ALL PAYMENTS (ADMIN ONLY)
router.get('/payments', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        invoice: {
          include: { patient: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. GET REVENUE REPORTS (ADMIN ONLY)
router.get('/reports/revenue', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { items: true, patient: true }
    });

    // Monthly revenue grouping (based on invoiceDate)
    const monthlyData = {};
    invoices.forEach(inv => {
      const monthKey = new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
      });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, billed: 0, collected: 0 };
      }
      monthlyData[monthKey].billed += inv.totalAmount;
      monthlyData[monthKey].collected += inv.paidAmount;
    });
    const monthlyRevenue = Object.values(monthlyData);

    // Paid vs Pending (pie)
    const paidSum = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pendingSum = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    // Top paying patients
    const patientData = {};
    invoices.forEach(inv => {
      const pId = inv.patientId;
      const pName = inv.patient.name;
      if (!patientData[pId]) {
        patientData[pId] = { name: pName, totalPaid: 0, totalBilled: 0 };
      }
      patientData[pId].totalPaid += inv.paidAmount;
      patientData[pId].totalBilled += inv.totalAmount;
    });
    const topPatients = Object.values(patientData)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);

    // Revenue by Service Category
    const serviceData = {
      'Assessment': 0,
      'Therapy': 0,
      'Teletherapy': 0,
      'Consultation': 0,
      'Other Services': 0
    };

    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const desc = item.description.toLowerCase();
        if (desc.includes('assess') || desc.includes('eval')) {
          serviceData['Assessment'] += item.amount;
        } else if (desc.includes('tele')) {
          serviceData['Teletherapy'] += item.amount;
        } else if (desc.includes('therapy') || desc.includes('session')) {
          serviceData['Therapy'] += item.amount;
        } else if (desc.includes('consult')) {
          serviceData['Consultation'] += item.amount;
        } else {
          serviceData['Other Services'] += item.amount;
        }
      });
    });

    const revenueByService = Object.keys(serviceData).map(key => ({
      service: key,
      value: serviceData[key]
    }));

    res.json({
      monthlyRevenue,
      paidVsPending: [
        { name: 'Collected', value: paidSum },
        { name: 'Pending', value: pendingSum }
      ],
      topPatients,
      revenueByService
    });
  } catch (error) {
    console.error('Fetch revenue reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. GENERATE INVOICE PDF (ADMIN, SLP, PARENT)
router.get('/invoices/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { patient: true, items: true, payments: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (req.user.role === 'PARENT' && invoice.patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to invoice PDF' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      return res.status(403).json({ error: 'No billing access' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1E3A8A').text('SPEECHSYNC CLINIC', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#4B5563');
    doc.text('Premium SLP Clinical Care & Teletherapy', 50, 75);
    doc.text('124 Clinical Complex, AGTech Road, Solapur, MH', 50, 90);
    doc.text('GSTIN: 27AABCS1423D1Z4', 50, 105);

    // Invoice Title
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 75, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 400, 90, { align: 'right' });
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 400, 105, { align: 'right' });
    doc.text(`Status: ${invoice.status}`, 400, 120, { align: 'right' });

    doc.moveTo(50, 140).lineTo(545, 140).stroke('#E5E7EB');

    // Bill To
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F2937').text('BILL TO:', 50, 155);
    doc.font('Helvetica').fillColor('#4B5563');
    doc.text(`Patient: ${invoice.patient.name}`, 50, 172);
    doc.text(`Guardian: ${invoice.patient.guardianName || 'N/A'}`, 50, 187);
    doc.text(`Phone: ${invoice.patient.guardianPhone || 'N/A'}`, 50, 202);
    doc.text(`Policy: ${invoice.patient.insuranceCarrier || 'Self Pay'} (${invoice.patient.insurancePolicy || 'N/A'})`, 50, 217);

    // Table Header
    let y = 250;
    doc.rect(50, y, 495, 20).fill('#F3F4F6');
    doc.fillColor('#374151').font('Helvetica-Bold').fontSize(10);
    doc.text('Description', 60, y + 5);
    doc.text('Qty', 320, y + 5, { width: 40, align: 'right' });
    doc.text('Rate (₹)', 380, y + 5, { width: 70, align: 'right' });
    doc.text('Amount (₹)', 465, y + 5, { width: 75, align: 'right' });

    doc.font('Helvetica').fillColor('#4B5563');
    y += 20;

    // Items
    invoice.items.forEach(item => {
      y += 10;
      doc.text(item.description, 60, y);
      doc.text(item.quantity.toString(), 320, y, { width: 40, align: 'right' });
      doc.text(item.rate.toLocaleString('en-IN'), 380, y, { width: 70, align: 'right' });
      doc.text(item.amount.toLocaleString('en-IN'), 465, y, { width: 75, align: 'right' });
      y += 15;
      doc.moveTo(50, y).lineTo(545, y).stroke('#F3F4F6');
    });

    y += 15;
    // Totals Block
    doc.font('Helvetica').text('Subtotal:', 350, y, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, 465, y, { width: 75, align: 'right' });
    
    y += 18;
    doc.font('Helvetica').text('GST (18%):', 350, y, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').text(`₹${invoice.taxAmount.toLocaleString('en-IN')}`, 465, y, { width: 75, align: 'right' });

    y += 18;
    doc.font('Helvetica-Bold').fillColor('#111827').text('Total Amount:', 350, y, { width: 100, align: 'right' });
    doc.text(`₹${invoice.totalAmount.toLocaleString('en-IN')}`, 465, y, { width: 75, align: 'right' });

    y += 18;
    doc.font('Helvetica').fillColor('#10B981').text('Collected Amount:', 350, y, { width: 100, align: 'right' });
    doc.text(`₹${invoice.paidAmount.toLocaleString('en-IN')}`, 465, y, { width: 75, align: 'right' });

    y += 18;
    doc.font('Helvetica-Bold').fillColor('#EF4444').text('Balance Due:', 350, y, { width: 100, align: 'right' });
    doc.text(`₹${invoice.balanceAmount.toLocaleString('en-IN')}`, 465, y, { width: 75, align: 'right' });

    // Payment History
    if (invoice.payments && invoice.payments.length > 0) {
      y += 40;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F2937').text('PAYMENT LOG:', 50, y);
      y += 15;
      invoice.payments.forEach(p => {
        doc.fontSize(9).font('Helvetica').fillColor('#4B5563');
        const pDate = new Date(p.paymentDate).toLocaleDateString('en-IN');
        doc.text(`${pDate} — Paid ₹${p.amount.toLocaleString('en-IN')} via ${p.paymentMethod} (Txn: ${p.transactionId || 'N/A'})`, 50, y);
        y += 14;
      });
    }

    // Notes
    if (invoice.notes) {
      y += 25;
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6B7280');
      doc.text(`Notes: ${invoice.notes}`, 50, y, { width: 450 });
    }

    // Footer compliance
    doc.fontSize(8).fillColor('#9CA3AF').text('Thank you for choosing SpeechSync. This is a computer-generated invoice and does not require a physical signature.', 50, 740, { width: 495, align: 'center' });

    doc.end();

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EXPORT',
        resource: 'INVOICE_PDF',
        resourceId: invoice.id,
        details: { invoiceNumber: invoice.invoiceNumber }
      }
    });

  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

// 9. GENERATE RECEIPT PDF (ADMIN, SLP, PARENT)
router.get('/payments/:id/pdf', authenticate, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        invoice: {
          include: { patient: true }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    if (req.user.role === 'PARENT' && payment.invoice.patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to payment receipt' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      return res.status(403).json({ error: 'No billing access' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_${payment.id.slice(0, 8)}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#10B981').text('PAYMENT RECEIPT', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#4B5563');
    doc.text('SpeechSync SLP Clinic', 50, 75);
    doc.text('Solapur, Maharashtra, India', 50, 90);
    doc.text('GSTIN: 27AABCS1423D1Z4', 50, 105);

    // Receipt details
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('RECEIPT DETAILS', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text(`Receipt No: REC-${payment.id.slice(0, 8).toUpperCase()}`, 400, 70, { align: 'right' });
    doc.text(`Payment Date: ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}`, 400, 85, { align: 'right' });
    doc.text(`Payment Method: ${payment.paymentMethod}`, 400, 100, { align: 'right' });
    if (payment.transactionId) {
      doc.text(`Txn ID: ${payment.transactionId}`, 400, 115, { align: 'right' });
    }

    doc.moveTo(50, 135).lineTo(545, 135).stroke('#E5E7EB');

    // Patient and Payer details
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F2937').text('RECEIVED FROM:', 50, 150);
    doc.font('Helvetica').fillColor('#4B5563');
    doc.text(`Patient Name: ${payment.invoice.patient.name}`, 50, 167);
    doc.text(`Guardian Name: ${payment.invoice.patient.guardianName || 'N/A'}`, 50, 182);

    // Amount box
    doc.rect(50, 210, 495, 50).fill('#F0FDF4');
    doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(14);
    doc.text(`Amount Received: ₹${payment.amount.toLocaleString('en-IN')}`, 65, 227);

    // Invoice Ref
    doc.fontSize(10).font('Helvetica').fillColor('#374151');
    doc.text(`Invoice Reference: ${payment.invoice.invoiceNumber}`, 50, 280);
    doc.text(`Invoice Date: ${new Date(payment.invoice.invoiceDate).toLocaleDateString('en-IN')}`, 50, 295);
    doc.text(`Total Invoice Amount: ₹${payment.invoice.totalAmount.toLocaleString('en-IN')}`, 50, 310);
    doc.text(`Remaining Invoice Balance: ₹${payment.invoice.balanceAmount.toLocaleString('en-IN')}`, 50, 325);

    if (payment.notes) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6B7280');
      doc.text(`Receipt Notes: ${payment.notes}`, 50, 360, { width: 450 });
    }

    doc.fontSize(8).fillColor('#9CA3AF').text('This is a system-generated transaction acknowledgment. Thank you for your payment.', 50, 740, { width: 495, align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Generate receipt PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate payment receipt PDF' });
    }
  }
});

// 10. DELETE INVOICE (ADMIN ONLY)
router.delete('/invoices/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { sessions: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { invoiceId },
        data: { invoiceId: null }
      });

      await tx.invoice.delete({
        where: { id: invoiceId }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_INVOICE',
        resource: 'INVOICE',
        resourceId: invoiceId,
        details: { invoiceNumber: invoice.invoiceNumber }
      }
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. POST REFUND (ADMIN ONLY)
router.post('/payments/:id/refund', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const refundAmount = req.body.amount ? parseFloat(req.body.amount) : payment.amount;

    if (refundAmount <= 0 || refundAmount > payment.amount) {
      return res.status(400).json({ error: 'Invalid refund amount' });
    }

    const refundPayment = await prisma.payment.create({
      data: {
        invoiceId: payment.invoiceId,
        patientId: payment.patientId,
        amount: -refundAmount,
        paymentMethod: 'REFUND',
        transactionId: req.body.transactionId || `REF-${Date.now()}`,
        paymentDate: new Date(),
        notes: req.body.notes || `Refund for Payment #${paymentId.slice(0, 8)}`
      }
    });

    await updateInvoiceStatus(payment.invoiceId, req.user.id);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'RECORD_PAYMENT',
        resource: 'REFUND',
        resourceId: refundPayment.id,
        details: { invoiceId: payment.invoiceId, amount: -refundAmount }
      }
    });

    res.status(201).json(refundPayment);
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
