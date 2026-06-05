import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/documents/upload — Upload patient document (SLP and Admin)
router.post('/upload', authenticate, authorize('SLP', 'ADMIN'), upload.single('file'), async (req, res) => {
  try {
    const { patientId, documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!patientId || !documentType) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'patientId and documentType are required' });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Patient not found' });
    }

    const document = await prisma.document.create({
      data: {
        patientId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        documentType,
        storagePath: req.file.filename,
        uploadedBy: req.user.name || req.user.email
      }
    });

    // Log in AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DOCUMENT_UPLOAD',
        resource: 'DOCUMENT',
        resourceId: document.id,
        details: { patientId, fileName: document.fileName, documentType }
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Document upload error:', error);
    // Cleanup if file exists in request
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:patientId — Fetch all documents for a patient (SLP, Admin, Parent ownership check)
router.get('/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Role verification
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    const docs = await prisma.document.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(docs);
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id — Delete document (SLP and Admin only)
router.delete('/:id', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from local storage
    const filePath = path.join(UPLOADS_DIR, document.storagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id } });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DOCUMENT_DELETE',
        resource: 'DOCUMENT',
        resourceId: id,
        details: { patientId: document.patientId, fileName: document.fileName }
      }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/download/:id — Download document securely (SLP, Admin, Parent ownership check)
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: { patient: true }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Parent HIPAA checks
    if (req.user.role === 'PARENT' && document.patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    const filePath = path.join(UPLOADS_DIR, document.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
