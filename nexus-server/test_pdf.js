import { downloadPayrollSummaryPdf, downloadPayslipPdf } from './src/services/payslipService.js';
import fs from 'fs';

const test = async () => {
  try {
    // Mock response object
    const resSummary = {
      setHeader: () => {},
      on: (event, cb) => {},
      once: (event, cb) => {},
      emit: () => {},
      write: () => {},
      end: () => {}
    };
    
    // Test Summary PDF
    console.log("Testing summary PDF generation...");
    // Mock stream pipe to a file
    resSummary.pipe = (dest) => {};
    // Wait we need to mock it properly
  } catch (err) {
    console.error(err);
  }
};
test();
