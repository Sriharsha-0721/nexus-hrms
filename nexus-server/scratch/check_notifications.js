import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/db_pg.js';

async function main() {
  console.log('Connecting to PostgreSQL to check Notifications table...');
  try {
    const pool = await connectDB();
    const req = pool.request();

    console.log('Listing latest 5 notifications in database:');
    const result = await req.query(`
      SELECT NotificationID, EmpID, Title, Message, IsRead, Category, RelatedID, CreatedAt
      FROM dbo.Notifications
      ORDER BY NotificationID DESC LIMIT 5
    `);
    console.table(result.recordset);

  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    process.exit(0);
  }
}

main();
