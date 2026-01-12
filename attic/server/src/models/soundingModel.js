import mongoose from 'mongoose';

const schema = mongoose.Schema({
  name: {
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
  raspRegion: {
    type: String,
    required: true
  },
  raspId: {
    type: String,
    required: true
  },
  images: [
    {
      time: {
        type: Date,
        required: true
      },
      url: {
        type: String,
        required: true
      }
    }
  ]
});

export const Sounding = mongoose.model('Sounding', schema);
