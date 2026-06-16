import dotenv from 'dotenv';
dotenv.config();

import { employeeService } from '../src/services/employeeService.js';
import { connectDB } from '../src/config/db_pg.js';

async function main() {
  console.log('Testing SQL query result casing serialization under PostgreSQL...');
  try {
    await connectDB();

    console.log('\nFetching admin accounts...');
    const admins = await employeeService.getAdminAccounts();
    
    if (admins.length > 0) {
      console.log('First admin raw object keys:', Object.keys(admins[0]));
      
      // Simulate Express JSON serialization
      const jsonString = JSON.stringify(admins[0]);
      console.log('Serialized JSON output:', jsonString);
      
      const parsed = JSON.parse(jsonString);
      if (parsed.firstName && parsed.lastName && parsed.empId) {
        console.log('\n[SUCCESS] Serialized JSON output successfully contains firstName, lastName, and empId!');
      } else {
        console.error('\n[FAILURE] Serialized JSON output is missing cased keys! Keys are:', Object.keys(parsed));
      }
    } else {
      console.log('No admin accounts found in database.');
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

main();
