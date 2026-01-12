import mongoose from 'mongoose';

const schema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  takeoffLocation: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  landingLocation: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  rating: {
    paragliding: {
      type: String
    },
    hangGliding: {
      type: String
    }
  },
  siteGuideUrl: {
    type: String,
    required: true
  },
  validBearings: {
    type: String
  },
  elevation: {
    type: Number,
    required: true
  },
  radio: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  mandatoryNotices: {
    type: String
  },
  airspaceNotices: {
    type: String
  },
  landingNotices: {
    type: String
  },
  isDisabled: {
    type: Boolean
  }
});

schema.index({ name: 1 });

export const Site = mongoose.model('Site', schema);
