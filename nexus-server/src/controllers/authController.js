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
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT m.EmpID AS employee_id, d.EmailID AS email, a.Password AS password_hash, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department
        FROM dbo.AdminLogins a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE (LOWER(a.Username) = LOWER(@email) OR LOWER(d.EmailID) = LOWER(@email) OR LOWER(d.UPPID) = LOWER(@email)) AND m.EmpStatus = 'Active' AND a.UserStatus = 'Active'
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.recordset[0];

    // Check if account has been activated
    if (!user.password_hash) {
      return res.status(403).json({ 
        message: 'Account not activated. Please use the first-time setup flow to activate your account.' 
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate Token
    const token = jwt.sign(
      { 
        id: user.employee_id, 
        email: user.email, 
        role: user.role_name 
      },
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
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT m.EmpID AS employee_id, d.EmailID AS email, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department
        FROM dbo.AdminLogins a
        JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE m.EmpID = @id AND m.EmpStatus = 'Active' AND a.UserStatus = 'Active'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = result.recordset[0];
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
