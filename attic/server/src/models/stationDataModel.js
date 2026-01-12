import mongoose from 'mongoose';

const schema = mongoose.Schema({
  time: {
    type: Date,
    required: true
  },
  windAverage: Number,
  windGust: Number,
  windBearing: Number,
  temperature: Number,
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  }
});

schema.index({ station: 1, time: -1 });

export const StationData = mongoose.model('StationData', schema);
