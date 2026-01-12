import express, { type Request, type Response } from 'express';
import { User } from '../models/userModel';

const router = express.Router();

type AuthBody = {
  username: string;
  password: string;
};

type AuthResponse = {
  key: string;
};

router.post(
  '/',
  async (
    req: Request<Record<string, never>, AuthResponse, AuthBody>,
    res: Response<AuthResponse>
  ) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    res.json({ key: user.key });
  }
);

export default router;
