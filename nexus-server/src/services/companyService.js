import { connectDB, sql } from '../config/db.js';

export const companyService = {
  getCompanySettings: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT TOP 1 SettingID, CompanyName, CompanyAddress, CompanyPAN, CompanyGST, 
                   PFNumber, ESINumber, PayrollProcessingDay, SalaryCreditDay, 
                   ContactNumber, SupportEmail, CompanyLogo
      FROM dbo.CompanySettings
    `);
    return result.recordset[0] || null;
  },

  updateCompanyAddress: async (address) => {
    if (!address) {
      throw new Error('Company address is required.');
    }
    const pool = await connectDB();
    await pool.request()
      .input('address', sql.VarChar, address)
      .query(`
        UPDATE dbo.CompanySettings
        SET CompanyAddress = @address
      `);
    return true;
  }
};
