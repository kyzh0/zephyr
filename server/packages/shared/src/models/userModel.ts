import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type UserAttrs = {
  username: string;
  password: string;
  key: string;
};

export type UserDoc = HydratedDocument<UserAttrs>;

const userSchema = new mongoose.Schema<UserAttrs>({
  username: { type: String, required: true },
  password: { type: String, required: true },
  key: { type: String, required: true }
});

export const User: Model<UserAttrs> = mongoose.model<UserAttrs>('User', userSchema);
