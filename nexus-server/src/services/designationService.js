import { connectDB, sql } from '../config/db.js';

export const designationService = {
  getAllDesignations: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT DesignationID AS id, DesignationName AS name, Description AS description
      FROM dbo.Designations
      ORDER BY DesignationName ASC
    `);
    return result.recordset;
  },

  getDesignationById: async (id) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT DesignationID AS id, DesignationName AS name, Description AS description
        FROM dbo.Designations
        WHERE DesignationID = @id
      `);
    if (result.recordset.length === 0) return null;
    return result.recordset[0];
  },

  createDesignation: async (data) => {
    const { name, description } = data;
    if (!name) throw new Error('Designation name is required.');

    const pool = await connectDB();
    // Check duplicate
    const checkDup = await pool.request()
      .input('name', sql.VarChar, name)
      .query('SELECT DesignationID FROM dbo.Designations WHERE LOWER(DesignationName) = LOWER(@name)');
    if (checkDup.recordset.length > 0) {
      throw new Error('A designation with this name already exists.');
    }

    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('description', sql.VarChar, description || null)
      .query(`
        INSERT INTO dbo.Designations (DesignationName, Description)
        OUTPUT inserted.DesignationID AS id
        VALUES (@name, @description)
      `);
    return result.recordset[0].id;
  },

  updateDesignation: async (id, data) => {
    const { name, description } = data;
    if (!name) throw new Error('Designation name is required.');

    const pool = await connectDB();
    // Check duplicate
    const checkDup = await pool.request()
      .input('name', sql.VarChar, name)
      .input('id', sql.Int, id)
      .query('SELECT DesignationID FROM dbo.Designations WHERE LOWER(DesignationName) = LOWER(@name) AND DesignationID <> @id');
    if (checkDup.recordset.length > 0) {
      throw new Error('A designation with this name already exists.');
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar, name)
      .input('description', sql.VarChar, description || null)
      .query(`
        UPDATE dbo.Designations
        SET DesignationName = @name, Description = @description
        WHERE DesignationID = @id
      `);
    if (result.rowsAffected[0] === 0) {
      throw new Error('Designation not found.');
    }
    return true;
  },

  deleteDesignation: async (id) => {
    const pool = await connectDB();
    
    // Check if employees are mapped to this designation
    const empCheck = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) AS count FROM dbo.EmployeeMaster WHERE DesignationID = @id');
    if (empCheck.recordset[0].count > 0) {
      throw new Error('Cannot delete designation: it has active employee mappings.');
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.Designations WHERE DesignationID = @id');
    if (result.rowsAffected[0] === 0) {
      throw new Error('Designation not found.');
    }
    return true;
  }
};
