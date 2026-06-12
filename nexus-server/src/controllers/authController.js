import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, sql } from '../config/db.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const pool = await connectDB();

    // Check AdminLogins using OfficialEmail
    let result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT m.EmpID AS employee_id,
               d.OfficialEmail AS email,
               a.Password AS password_hash,
               m.FirstName AS first_name,
               m.LastName AS last_name,
               a.Role AS role_name,
               m.Designation AS designation,
               m.Department AS department,
               m.EmpStatus AS emp_status,
               a.UserStatus AS user_status,
               a.FailedAttempts AS failed_attempts,
               a.LockoutUntil AS lockout_until
        FROM dbo.AdminLogins a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE (LOWER(a.Username) = LOWER(@email) OR LOWER(d.OfficialEmail) = LOWER(@email))
      `);

    let user;
    if (result.recordset.length > 0) {
      user = result.recordset[0];
    } else {
      // Check EmployeeLogins using OfficialEmail
      result = await pool.request()
        .input('email', sql.VarChar, email)
        .query(`
          SELECT m.EmpID AS employee_id,
                 d.OfficialEmail AS email,
                 e.Password AS password_hash,
                 m.FirstName AS first_name,
                 m.LastName AS last_name,
                 'employee' AS role_name,
                 m.Designation AS designation,
                 m.Department AS department,
                 m.EmpStatus AS emp_status,
                 e.UserStatus AS user_status,
                 e.FailedAttempts AS failed_attempts,
                 e.LockoutUntil AS lockout_until
          FROM dbo.EmployeeLogins e
          JOIN dbo.EmployeeMaster m ON e.EmpID = m.EmpID
          LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
          WHERE (LOWER(e.Username) = LOWER(@email) OR LOWER(d.OfficialEmail) = LOWER(@email))
        `);
      if (result.recordset.length > 0) {
        user = result.recordset[0];
      }
    }

    if (!user) {
      // Log failed login for non-existent user
      await pool.request()
        .input('desc', sql.VarChar, `Failed login attempt for non-existent user: ${email}`)
        .query(`INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (NULL, 'LOGIN_FAILED', @desc)`);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Lockout check
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      return res.status(403).json({ 
        message: `Account is locked due to multiple failed login attempts. Please try again after 15 minutes.` 
      });
    }

    // Business rule checks based on EmpStatus
    if (user.emp_status === 'Inactive') {
      return res.status(403).json({ message: 'This account is currently inactive. Please contact HR.' });
    }
    if (['Resigned', 'Terminated', 'Retired'].includes(user.emp_status)) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact HR.' });
    }
    if (user.user_status !== 'Active') {
      return res.status(403).json({ message: 'Account not activated. Please use the first-time setup flow to activate your account.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    const targetTable = user.role_name === 'employee' ? 'dbo.EmployeeLogins' : 'dbo.AdminLogins';

    if (!isMatch) {
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      if (newFailedAttempts >= 5) {
        await pool.request()
          .input('id', sql.Int, user.employee_id)
          .query(`UPDATE ${targetTable} SET FailedAttempts = FailedAttempts + 1, LockoutUntil = DATEADD(minute, 15, GETDATE()) WHERE EmpID = @id`);
        
        await pool.request()
          .input('id', sql.Int, user.employee_id)
          .input('desc', sql.VarChar, `Account locked due to 5 failed login attempts: ${user.email}`)
          .query(`INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@id, 'ACCOUNT_LOCKED', @desc)`);
      } else {
        await pool.request()
          .input('id', sql.Int, user.employee_id)
          .query(`UPDATE ${targetTable} SET FailedAttempts = FailedAttempts + 1 WHERE EmpID = @id`);
      }

      await pool.request()
        .input('id', sql.Int, user.employee_id)
        .input('desc', sql.VarChar, `Failed login attempt (incorrect password) for user: ${user.email}`)
        .query(`INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@id, 'LOGIN_FAILED', @desc)`);

      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Reset failed attempts on success
    await pool.request()
      .input('id', sql.Int, user.employee_id)
      .query(`UPDATE ${targetTable} SET FailedAttempts = 0, LockoutUntil = NULL, LastLogin = GETDATE() WHERE EmpID = @id`);

    await pool.request()
      .input('id', sql.Int, user.employee_id)
      .input('desc', sql.VarChar, `Successful login for user: ${user.email}`)
      .query(`INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@id, 'USER_LOGIN', @desc)`);

    const token = jwt.sign(
      { id: user.employee_id, email: user.email, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.employee_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        designation: user.designation,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Login Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const pool = await connectDB();
    
    // Try AdminLogins first
    let result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT m.EmpID AS employee_id, d.OfficialEmail AS email, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department
        FROM dbo.AdminLogins a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE m.EmpID = @id AND m.EmpStatus = 'Active' AND a.UserStatus = 'Active'
      `);

    let user;
    if (result.recordset.length > 0) {
      user = result.recordset[0];
    } else {
      // Try EmployeeLogins
      result = await pool.request()
        .input('id', sql.Int, req.user.id)
        .query(`
          SELECT m.EmpID AS employee_id, d.OfficialEmail AS email, m.FirstName AS first_name, m.LastName AS last_name, 'employee' AS role_name, m.Designation AS designation, m.Department AS department
          FROM dbo.EmployeeLogins e
          JOIN dbo.EmployeeMaster m ON e.EmpID = m.EmpID
          LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
          WHERE m.EmpID = @id AND m.EmpStatus = 'Active' AND e.UserStatus = 'Active'
        `);
      if (result.recordset.length > 0) {
        user = result.recordset[0];
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      user: {
        id: user.employee_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        designation: user.designation,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Get Me Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
