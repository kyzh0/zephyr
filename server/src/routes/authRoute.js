import express from 'express';
import { User } from '../models/userModel.js';
import md5 from 'md5';

const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username, password: password });
  if (!user) {
    res.status(401).send();
    return;
  }
  res.json({ key: md5(username + password) });
});

export default router;
