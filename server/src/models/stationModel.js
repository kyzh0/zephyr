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
  isError: Boolean,
  isOffline: Boolean,
  data: [
    {
      time: {
        type: Date,
        required: true
      },
      windAverage: Number,
      windGust: Number,
      windBearing: Number,
      temperature: Number
    }
  ],
  harvestWindAverageId: String,
  harvestWindGustId: String,
  harvestWindDirectionId: String,
  harvestTemperatureId: String,
  harvestLongInterval: Boolean,
  harvestCookie: String,
  gwWindAverageFieldName: String,
  gwWindGustFieldName: String,
  gwWindBearingFieldName: String,
  gwTemperatureFieldName: String
});

export const Station = mongoose.model('Station', schema);
