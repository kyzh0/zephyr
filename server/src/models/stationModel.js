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
  currentAverage: Number,
  currentGust: Number,
  currentBearing: Number,
  currentTemperature: Number,
  elevation: Number,
  validBearings: String,
  popupMessage: String,
  isHighResolution: Boolean,
  isError: Boolean,
  isOffline: Boolean,
  isDisabled: Boolean,
  harvestWindAverageId: String,
  harvestWindGustId: String,
  harvestWindDirectionId: String,
  harvestTemperatureId: String,
  harvestCookie: String,
  gwWindAverageFieldName: String,
  gwWindGustFieldName: String,
  gwWindBearingFieldName: String,
  gwTemperatureFieldName: String,
  weatherlinkCookie: String
});

schema.virtual('dataNew', {
  ref: 'StationData',
  localField: '_id',
  foreignField: 'station'
});

schema.set('toObject', { virtuals: true });
schema.set('toJSON', { virtuals: true });

export const Station = mongoose.model('Station', schema);
