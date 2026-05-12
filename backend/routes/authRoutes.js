import express from 'express';
import * as auth from '../methods/authMethods.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public routes ────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const result = await auth.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await auth.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const result = await auth.forgotPassword(req.body.email);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await auth.resetPassword(email, otp, newPassword);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Protected: get current user ──────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await auth.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: user management ───────────────────────────────────────────────────
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await auth.listUsers(req.query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await auth.adminCreateUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await auth.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await auth.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
