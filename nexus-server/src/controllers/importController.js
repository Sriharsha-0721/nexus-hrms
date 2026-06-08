import { Readable } from 'stream';
import csv from 'csv-parser';
import crypto from 'crypto';
import { employeeService } from '../services/employeeService.js';

/**
 * Parses CSV buffer into JSON array. Normalizes headers to lower_snake_case.
 */
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => {
          // Normalize column headers: trim, lowercase, replace hyphens and spaces with underscores
          return header
            .trim()
            .toLowerCase()
            .replace(/[-\s]/g, '_');
        }
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Endpoint controller to handle CSV import file uploaded by admin.
 */
export const importEmployees = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file uploaded. Please upload a valid .csv file.' });
  }

  try {
    const parsedRows = await parseCSV(req.file.buffer);

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded CSV file is empty.' });
    }

    // Generate unique ID for this migration/import run
    const sessionId = crypto.randomUUID();

    // Call service to process staging, validation and production merge
    const stats = await employeeService.importEmployees(parsedRows, sessionId);

    // If all records were failed/errors, return 422, otherwise 200
    if (stats.errorsCount === stats.totalProcessed) {
      return res.status(422).json({
        message: 'All records in the CSV failed validation. None were imported.',
        stats
      });
    }

    res.json({
      message: 'CSV import processed successfully.',
      stats
    });

  } catch (err) {
    console.error('CSV Import Controller Error: ', err);
    res.status(500).json({ message: `Failed to process CSV file: ${err.message}` });
  }
};
