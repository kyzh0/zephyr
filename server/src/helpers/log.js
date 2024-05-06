import winston from 'winston';
import { SeqTransport } from '@datalust/winston-seq';

const logger = winston.createLogger({
  format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.json()),
  transports: [
    new SeqTransport({
      serverUrl: 'http://localhost:5341',
      apiKey: process.env.SEQ_KEY,
      onError: (e) => {
        console.error(e);
      }
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

export default logger;
