import { Readable } from 'stream';
import csv from 'csv-parser';
import { connectDB, sql } from '../config/db.js';
import { importService } from '../services/importService.js';

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
 * Endpoint controller to handle CSV import file uploads by type.
 */
export const importData = async (req, res) => {
  const { type } = req.params;
  const actorId = req.user.id;
  const role = req.user.role;

  // RBAC checks
  const hrTypes = ['master', 'details', 'attendance', 'leaves'];
  const payrollTypes = ['salary'];

  if (hrTypes.includes(type) && !['SuperAdmin', 'HRAdmin'].includes(role)) {
    return res.status(403).json({ message: 'Access forbidden: Only SuperAdmin and HRAdmin can perform this import.' });
  }

  if (payrollTypes.includes(type) && !['SuperAdmin', 'PayrollAdmin'].includes(role)) {
    return res.status(403).json({ message: 'Access forbidden: Only SuperAdmin and PayrollAdmin can perform this import.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file uploaded. Please upload a valid .csv file.' });
  }

  try {
    const parsedRows = await parseCSV(req.file.buffer);

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded CSV file is empty.' });
    }

    let stats;
    switch (type) {
      case 'master':
        stats = await importService.importMaster(parsedRows, actorId);
        break;
      case 'details':
        stats = await importService.importDetails(parsedRows, actorId);
        break;
      case 'attendance':
        stats = await importService.importAttendance(parsedRows, actorId);
        break;
      case 'leaves':
        stats = await importService.importLeaves(parsedRows, actorId);
        break;
      case 'salary':
        stats = await importService.importSalary(parsedRows, actorId);
        break;
      default:
        return res.status(400).json({ message: `Invalid import type: '${type}'. Supported types: master, details, attendance, leaves, salary.` });
    }

    if (stats.failedCount === stats.totalProcessed) {
      return res.status(422).json({
        message: 'All records in the CSV failed validation. None were imported.',
        stats
      });
    }

    res.json({
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} CSV import processed successfully.`,
      stats
    });

  } catch (err) {
    console.error(`CSV Import Controller Error (${type}): `, err);
    res.status(500).json({ message: `Failed to process CSV file: ${err.message}` });
  }
};

/**
 * Get import logs history (Admin only)
 */
export const getImportLogs = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT i.ImportID AS id, i.FileType AS fileType, i.UploadedDate AS uploadedDate,
             i.TotalRows AS totalRows, i.SuccessRows AS successRows, i.FailedRows AS failedRows, i.Status AS status,
             m.FirstName + ' ' + m.LastName AS uploaderName
      FROM dbo.ImportAuditLogs i
      LEFT JOIN dbo.EmployeeMaster m ON i.UploadedBy = m.EmpID
      ORDER BY i.UploadedDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Get Import Logs Error: ', err);
    res.status(500).json({ message: 'Failed to retrieve import logs.' });
  }
};
