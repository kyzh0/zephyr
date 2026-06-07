import scrapeStation from './scrapeStation';
import scrapeWebcam from './scrapeWebcam';
import mongoose from 'mongoose';

const scrapeType = process.argv[2];
const type = process.argv[3];
if (!scrapeType || !type) {
  console.error('Usage: scrape <scrapeType> <type>');
  process.exit(1);
}

const { DB_CONNECTION_STRING } = process.env;

if (!DB_CONNECTION_STRING) {
  console.error('DB_CONNECTION_STRING is not set');
  process.exit(1);
}

try {
  await mongoose.connect(DB_CONNECTION_STRING);

  if (scrapeType === 's') {
    await scrapeStation(type);
  } else if (scrapeType === 'w') {
    await scrapeWebcam(type);
  } else {
    console.error('Invalid scrapeType, must be "s" or "w"');
    process.exit(1);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
