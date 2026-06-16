import dotenv from 'dotenv';
dotenv.config();

import { payrollService } from '../src/services/payrollService.js';
import { connectDB } from '../src/config/db_pg.js';

async function main() {
  console.log('Testing payroll release and notifications...');
  try {
    const pool = await connectDB();
    
    // Check latest run
    const req1 = pool.request();
    const runResult = await req1.query(`
      SELECT RunID, Status, Version 
      FROM dbo.PayrollRuns 
      WHERE SalaryMonth = 6 AND SalaryYear = 2026 
      ORDER BY Version DESC LIMIT 1
    `);
    
    const run = runResult.recordset[0];
    console.log(`Before update: RunID=${run.RunID}, Status=${run.Status}`);

    // Update status to Approved
    const req2 = pool.request();
    await req2.input('runId', run.RunID).query(`
      UPDATE dbo.PayrollRuns 
      SET Status = 'Approved' 
      WHERE RunID = @runId
    `);
    console.log('Update query executed.');

    // Fetch back to verify
    const req3 = pool.request();
    const checkRes = await req3.input('runId', run.RunID).query(`
      SELECT RunID, Status 
      FROM dbo.PayrollRuns 
      WHERE RunID = @runId
    `);
    console.log('After update in DB:', checkRes.recordset[0]);

    // Call releasePayroll
    console.log(`Releasing payroll...`);
    const releaseResult = await payrollService.releasePayroll(run.RunID, 1002);
    console.log('Release Payroll completed successfully!', releaseResult);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

main();
