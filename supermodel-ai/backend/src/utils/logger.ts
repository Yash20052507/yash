// src/utils/logger.ts
import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, align } = winston.format;

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new winston.transports.Console()],
});
