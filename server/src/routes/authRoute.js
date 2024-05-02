import express from 'express';

import { User } from '../models/userModel.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username, password: password });
  if (!user) {
    res.status(401).send();
    return;
  }
  res.json({ key: user.key });
});

export default router;
