import mongoose from 'mongoose';

const schema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  monthlyLimit: {
    type: Number,
    required: true
  },
  usage: [
    {
      month: {
        type: String,
        required: true
      },
      apiCalls: {
        type: Number,
        required: true
      }
    }
  ]
});

export const Client = mongoose.model('Client', schema);
