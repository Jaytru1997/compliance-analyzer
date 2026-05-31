import { Router } from 'express';
import { UserModel } from '../models/user.model';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In a real app we'd return a JWT here. 
    // Since the frontend is just setting a boolean isAuthenticated, returning success is enough.
    res.json({ success: true, username: user.username });
  } catch (error: any) {
    console.error('[Auth Route]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
