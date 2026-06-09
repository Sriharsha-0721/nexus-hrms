import { connectDB, sql } from '../config/db.js';

export const departmentService = {
  getAllDepartments: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT d.DepartmentID AS id, d.DepartmentName AS name, d.ManagerEmpID AS managerId,
             m.FirstName + ' ' + m.LastName AS managerName
      FROM dbo.Departments d
      LEFT JOIN dbo.EmployeeMaster m ON d.ManagerEmpID = m.EmpID
      ORDER BY d.DepartmentName ASC
    `);
    return result.recordset;
  },

  getDepartmentById: async (id) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT d.DepartmentID AS id, d.DepartmentName AS name, d.ManagerEmpID AS managerId,
               m.FirstName + ' ' + m.LastName AS managerName
        FROM dbo.Departments d
        LEFT JOIN dbo.EmployeeMaster m ON d.ManagerEmpID = m.EmpID
        WHERE d.DepartmentID = @id
      `);
    if (result.recordset.length === 0) return null;
    return result.recordset[0];
  },

  createDepartment: async (data) => {
    const { name, managerId } = data;
    if (!name) throw new Error('Department name is required.');

    const pool = await connectDB();
    // Check duplicate
    const checkDup = await pool.request()
      .input('name', sql.VarChar, name)
      .query('SELECT DepartmentID FROM dbo.Departments WHERE LOWER(DepartmentName) = LOWER(@name)');
    if (checkDup.recordset.length > 0) {
      throw new Error('A department with this name already exists.');
    }

    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('managerId', sql.Int, managerId || null)
      .query(`
        INSERT INTO dbo.Departments (DepartmentName, ManagerEmpID)
        OUTPUT inserted.DepartmentID AS id
        VALUES (@name, @managerId)
      `);
    return result.recordset[0].id;
  },

  updateDepartment: async (id, data) => {
    const { name, managerId } = data;
    if (!name) throw new Error('Department name is required.');

    const pool = await connectDB();
    // Check duplicate
    const checkDup = await pool.request()
      .input('name', sql.VarChar, name)
      .input('id', sql.Int, id)
      .query('SELECT DepartmentID FROM dbo.Departments WHERE LOWER(DepartmentName) = LOWER(@name) AND DepartmentID <> @id');
    if (checkDup.recordset.length > 0) {
      throw new Error('A department with this name already exists.');
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar, name)
      .input('managerId', sql.Int, managerId || null)
      .query(`
        UPDATE dbo.Departments
        SET DepartmentName = @name, ManagerEmpID = @managerId
        WHERE DepartmentID = @id
      `);
    if (result.rowsAffected[0] === 0) {
      throw new Error('Department not found.');
    }
    return true;
  },

  deleteDepartment: async (id) => {
    const pool = await connectDB();
    
    // Check if employees are mapped to this department
    const empCheck = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) AS count FROM dbo.EmployeeMaster WHERE DepartmentID = @id');
    if (empCheck.recordset[0].count > 0) {
      throw new Error('Cannot delete department: it has active employee mappings.');
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.Departments WHERE DepartmentID = @id');
    if (result.rowsAffected[0] === 0) {
      throw new Error('Department not found.');
    }
    return true;
  }
};
