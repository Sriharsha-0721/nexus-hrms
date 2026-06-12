import { connectDB } from './config/db.js';

async function run() {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      UPDATE dbo.AdminLogins 
      SET Username = 'harsha.r@nexus.com' 
      WHERE Username = 'superadmin@nexus.com'
    `);
    console.log('Updated rows:', result.rowsAffected);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
