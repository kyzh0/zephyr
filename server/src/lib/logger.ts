import winston from 'winston';
import { SeqTransport } from '@datalust/winston-seq';

const { SEQ_INGESTION_URL } = process.env;

const transports: winston.transport[] = [];
if (SEQ_INGESTION_URL) {
  transports.push(
    new SeqTransport({
      serverUrl: SEQ_INGESTION_URL,
      onError: (e: unknown) => {
        console.error(e);
      }
    })
  );
}

const logger = winston.createLogger({
  format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.json()),
  transports: transports
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

export default logger;
