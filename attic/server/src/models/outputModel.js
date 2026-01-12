import mongoose from 'mongoose';

const schema = mongoose.Schema({
  time: {
    type: Date,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  isHighResolution: Boolean
});

export const Output = mongoose.model('Output', schema);
