import { type Logger } from '@nestjs/common';
import { type Response } from 'express';
import { type Readable } from 'stream';

export const streamToCsv = (
  stream: Readable,
  res: Response,
  options: {
    filename: string;
    logger?: Logger;
  },
) => {
  stream.on('error', (e) => {
    options.logger?.error(
      'An error occurred while streaming CSV data.',
      e.stack,
    );
    res.status(500).send('An error occurred while downloading data.');
  });

  res.setHeader('Content-Type', 'text/csv');

  const filename = options.filename.replace(/(\.csv)?$/, '.csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  stream.pipe(res);
};

export const streamToNdJson = (
  stream: Readable,
  res: Response,
  options: {
    filename: string;
    logger?: Logger;
  },
) => {
  stream.on('error', (e) => {
    options.logger?.error(
      'An error occurred while streaming NDJSON data.',
      e.stack,
    );
    res.status(500).send('An error occurred while downloading data.');
  });

  res.setHeader('Content-Type', 'application/x-ndjson');

  const filename = options.filename.replace(/(\.ndjson)?$/, '.ndjson');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  stream.pipe(res);
};
