import { Router } from 'express';
import fetch from 'node-fetch';
import authenticate from '../middleware/authenticate.js';

const router = Router();
const PYTHON_AI_BASE_URL = 'http://127.0.0.1:8001/api/ai';

router.post('/generate-soap', authenticate, async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_AI_BASE_URL}/generate-soap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Error from AI service' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Python AI service proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to AI agent.' });
  }
});

router.post('/recommend-goals', authenticate, async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_AI_BASE_URL}/recommend-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Error from AI service' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Python AI service proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to AI agent.' });
  }
});

router.post('/translate-soap', authenticate, async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_AI_BASE_URL}/translate-soap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Error from AI service' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Python AI service proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to AI agent.' });
  }
});

export default router;
