import bcrypt from 'bcryptjs';
import { connectDB, sql } from '../config/db.js';
import nodemailer from 'nodemailer';
import dns from 'dns';

export const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const empId = req.user.id;
  const role = req.user.role;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required.' });
  }

  try {
    const pool = await connectDB();
    const targetTable = role === 'employee' ? 'dbo.EmployeeLogins' : 'dbo.AdminLogins';

    // Check if user exists before attempting to update
    const userResult = await pool.request()
      .input('id', sql.Int, empId)
      .query(`SELECT EmpID FROM ${targetTable} WHERE EmpID = @id`);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User login account not found.' });
    }

    // Hash and update new password
    const newHash = bcrypt.hashSync(newPassword, 10);
    
    // Check if admin login exists
    const adminCheck = await pool.request()
      .input('id', sql.Int, empId)
      .query(`SELECT EmpID FROM dbo.AdminLogins WHERE EmpID = @id`);

    if (adminCheck.recordset.length > 0) {
      await pool.request()
        .input('id', sql.Int, empId)
        .input('hash', sql.VarChar, newHash)
        .query(`UPDATE dbo.AdminLogins SET Password = @hash, FailedAttempts = 0, LockoutUntil = NULL WHERE EmpID = @id`);
    }

    // Check if employee login exists
    const empCheck = await pool.request()
      .input('id', sql.Int, empId)
      .query(`SELECT EmpID FROM dbo.EmployeeLogins WHERE EmpID = @id`);

    if (empCheck.recordset.length > 0) {
      await pool.request()
        .input('id', sql.Int, empId)
        .input('hash', sql.VarChar, newHash)
        .query(`UPDATE dbo.EmployeeLogins SET Password = @hash, FailedAttempts = 0, LockoutUntil = NULL WHERE EmpID = @id`);
    }

    // Log to AuditLogs
    await pool.request()
      .input('id', sql.Int, empId)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@id, 'PASSWORD_CHANGE', 'User changed their password successfully')
      `);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change Password Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Official email is required.' });
  }

  try {
    const pool = await connectDB();

    // Check if employee exists and get their PersonalEmail
    const empResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT DISTINCT d.EmpID, d.PersonalEmail, d.FullName 
        FROM dbo.EmployeeDetails d
        LEFT JOIN dbo.AdminLogins a ON d.EmpID = a.EmpID
        LEFT JOIN dbo.EmployeeLogins e ON d.EmpID = e.EmpID
        WHERE LOWER(d.OfficialEmail) = LOWER(@email)
           OR LOWER(a.Username) = LOWER(@email)
           OR LOWER(e.Username) = LOWER(@email)
      `);

    if (empResult.recordset.length === 0) {
      return res.status(404).json({ message: 'No account found with that official email address.' });
    }

    const { EmpID, PersonalEmail, FullName } = empResult.recordset[0];

    if (!PersonalEmail) {
      return res.status(400).json({ 
        message: 'No personal email registered for password recovery. Please contact HR.' 
      });
    }

    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = bcrypt.hashSync(otp, 10);

    // Save token to DB with 15-minute expiration
    await pool.request()
      .input('empId', sql.Int, EmpID)
      .input('hash', sql.VarChar, tokenHash)
      .query(`
        INSERT INTO dbo.PasswordResetTokens (EmpID, TokenHash, ExpiresAt)
        VALUES (@empId, @hash, DATEADD(minute, 15, GETDATE()))
      `);

    // Send actual email using nodemailer
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER || 'sriharshabobbi52@gmail.com',
          pass: process.env.SMTP_PASSWORD || 'mqia tysi lgcr kbmo'
        },
        connectionTimeout: 5000,
        socketTimeout: 5000,
        lookup: (hostname, options, callback) => {
          dns.lookup(hostname, { family: 4 }, callback);
        }
      });

      const mailOptions = {
        from: `"Nexus HRMS Support" <${process.env.SMTP_USER || 'sriharshabobbi52@gmail.com'}>`,
        to: PersonalEmail,
        subject: 'Nexus HRMS - Password Recovery OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2563EB;">Password Recovery OTP</h2>
            <p>Hi ${FullName},</p>
            <p>You have requested to reset your password. Please use the OTP below to verify your identity and complete the process.</p>
            <p>Your One-Time Password (OTP) is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 5px; margin: 20px 0; padding: 10px; background: #f1f5f9; text-align: center; border-radius: 8px;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 14px;">This OTP will expire in 15 minutes.</p>
            <p>If you did not request this action, please secure your account immediately.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Successfully sent password recovery OTP email to ${PersonalEmail}`);
    } catch (emailErr) {
      console.error('[SMTP] Failed to send password recovery OTP email:', emailErr);
      return res.status(500).json({ 
        message: 'Failed to send password recovery OTP email. Please check your SMTP configuration or try again later.' 
      });
    }

    // Write audit log
    await pool.request()
      .input('empId', sql.Int, EmpID)
      .input('desc', sql.VarChar, `Password recovery OTP generated and sent to personal email: ${PersonalEmail}`)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@empId, 'PASSWORD_OTP_SENT', @desc)
      `);

    res.json({ 
      message: 'A password reset OTP has been sent to your registered personal email address.'
    });
  } catch (err) {
    console.error('Forgot Password Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    const pool = await connectDB();

    const empResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`SELECT EmpID FROM dbo.EmployeeDetails WHERE LOWER(OfficialEmail) = LOWER(@email)`);

    if (empResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    const empId = empResult.recordset[0].EmpID;

    const tokensResult = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        SELECT TokenID, TokenHash 
        FROM dbo.PasswordResetTokens 
        WHERE EmpID = @empId AND IsUsed = 0 AND ExpiresAt > GETDATE()
        ORDER BY CreatedAt DESC
      `);

    let isValid = false;
    for (const record of tokensResult.recordset) {
      if (bcrypt.compareSync(otp, record.TokenHash)) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    res.json({ message: 'OTP verified successfully.', verified: true });
  } catch (err) {
    console.error('Verify OTP Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
  }

  try {
    const pool = await connectDB();

    // Get EmpID from OfficialEmail
    const empResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`SELECT EmpID FROM dbo.EmployeeDetails WHERE LOWER(OfficialEmail) = LOWER(@email)`);

    if (empResult.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    const empId = empResult.recordset[0].EmpID;

    // Retrieve active, unexpired tokens for this EmpID
    const tokensResult = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        SELECT TokenID, TokenHash 
        FROM dbo.PasswordResetTokens 
        WHERE EmpID = @empId AND IsUsed = 0 AND ExpiresAt > GETDATE()
        ORDER BY CreatedAt DESC
      `);

    let matchedTokenId = null;
    for (const record of tokensResult.recordset) {
      if (bcrypt.compareSync(otp, record.TokenHash)) {
        matchedTokenId = record.TokenID;
        break;
      }
    }

    if (!matchedTokenId) {
      // Log failed reset attempt
      await pool.request()
        .input('empId', sql.Int, empId)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@empId, 'PASSWORD_RESET_FAILED', 'Failed password reset attempt (invalid or expired OTP)')
        `);
      return res.status(400).json({ message: 'Invalid or expired password reset OTP.' });
    }

    // Mark token as used
    await pool.request()
      .input('tokenId', sql.Int, matchedTokenId)
      .query(`UPDATE dbo.PasswordResetTokens SET IsUsed = 1 WHERE TokenID = @tokenId`);

    // Hash and update the password on both AdminLogins and EmployeeLogins if present
    const newHash = bcrypt.hashSync(newPassword, 10);
    
    // Check if admin login exists
    const adminCheck = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`SELECT EmpID FROM dbo.AdminLogins WHERE EmpID = @empId`);

    if (adminCheck.recordset.length > 0) {
      await pool.request()
        .input('empId', sql.Int, empId)
        .input('hash', sql.VarChar, newHash)
        .query(`UPDATE dbo.AdminLogins SET Password = @hash, FailedAttempts = 0, LockoutUntil = NULL WHERE EmpID = @empId`);
    }

    // Check if employee login exists
    const empCheck = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`SELECT EmpID FROM dbo.EmployeeLogins WHERE EmpID = @empId`);

    if (empCheck.recordset.length > 0) {
      await pool.request()
        .input('empId', sql.Int, empId)
        .input('hash', sql.VarChar, newHash)
        .query(`UPDATE dbo.EmployeeLogins SET Password = @hash, FailedAttempts = 0, LockoutUntil = NULL WHERE EmpID = @empId`);
    }

    // Write audit log
    await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@empId, 'PASSWORD_RESET_SUCCESS', 'Password reset successfully using OTP')
      `);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset Password Error: ', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
