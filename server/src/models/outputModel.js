import mongoose from 'mongoose';

const schema = mongoose.Schema({
  time: {
    type: Date,
    required: true
  },
  path: {
    type: String,
    required: true
  }
});

export const Output = mongoose.model('Output', schema);
