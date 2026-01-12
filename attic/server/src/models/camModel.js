import mongoose from 'mongoose';

const schema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  externalLink: {
    type: String,
    required: true
  },
  externalId: String,
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  currentTime: {
    type: Date,
    default: Date.now
  },
  currentUrl: String,
  images: [
    {
      time: {
        type: Date,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      fileSize: Number,
      hash: String
    }
  ]
});

export const Cam = mongoose.model('Cam', schema);
