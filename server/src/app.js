import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { Station } from './models/stationModel.js';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

mongoose.connect(process.env.CONNECTION_STRING);

app.get('/', (req, res) => res.send('Hello world 2!'));
app.get('/test', async (req, res) => {
  const stations = await Station.find();
  res.json(stations);
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
