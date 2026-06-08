import { connectDB, sql } from '../config/db.js';
import bcrypt from 'bcryptjs';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'employee'];

/**
 * Service to manage employee records, business rule validations, and legacy imports.
 */
export const employeeService = {
  /**
   * Get all active and inactive employees
   */
  getAllEmployees: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT m.EmpID AS employee_id, d.UPPID AS legacy_emp_id, d.EmailID AS email, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department, m.DOJ AS join_date, m.EmpStatus AS status, d.Phone AS phone
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.AdminLogins a ON m.EmpID = a.EmpID
      ORDER BY m.EmpID DESC
    `);

    return result.recordset.map(row => ({
      id: row.employee_id,
      legacyEmpId: row.legacy_emp_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role_name || 'employee',
      designation: row.designation,
      department: row.department,
      joinDate: row.join_date,
      status: row.status,
      phone: row.phone
    }));
  },

  /**
   * Get employee by ID
   */
  getEmployeeById: async (id) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.EmpID AS employee_id, d.UPPID AS legacy_emp_id, d.EmailID AS email, m.FirstName AS first_name, m.LastName AS last_name, a.Role AS role_name, m.Designation AS designation, m.Department AS department, m.DOJ AS join_date, m.EmpStatus AS status, d.Phone AS phone
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        LEFT JOIN dbo.AdminLogins a ON m.EmpID = a.EmpID
        WHERE m.EmpID = @id
      `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return {
      id: row.employee_id,
      legacyEmpId: row.legacy_emp_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role_name || 'employee',
      designation: row.designation,
      department: row.department,
      joinDate: row.join_date,
      status: row.status,
      phone: row.phone
    };
  },

  /**
   * Create a new employee with business validations
   */
  createEmployee: async (data) => {
    const { email, firstName, lastName, role, designation, department, joinDate, phone, password, legacyEmpId } = data;

    // Enforce email format validation if provided
    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }

    // Require email and password for direct additions (non-legacy imports)
    if (!legacyEmpId) {
      if (!email) throw new Error('Email is required for direct employee creation.');
      if (!password) throw new Error('Password is required for direct employee creation.');
    }

    const pool = await connectDB();

    // Check if email already exists
    if (email) {
      const emailCheck = await pool.request()
        .input('email', sql.VarChar, email)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE EmailID = @email');
      
      if (emailCheck.recordset.length > 0) {
        throw new Error('An employee with this email already exists.');
      }
    }

    // Check if legacyEmpId already exists
    if (legacyEmpId) {
      const legacyCheck = await pool.request()
        .input('legacyEmpId', sql.VarChar, legacyEmpId)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE UPPID = @legacyEmpId');

      if (legacyCheck.recordset.length > 0) {
        throw new Error('An employee with this Legacy ID already exists.');
      }
    }

    // Check role
    const roleName = role ? role.toLowerCase() : 'employee';
    if (!VALID_ROLES.includes(roleName)) {
      throw new Error('Invalid role specified. Role must be admin or employee.');
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    const jd = joinDate ? new Date(joinDate) : new Date();
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

    // Begin Transaction/sequential inserts
    // 1. Insert into EmployeeMaster
    const masterResult = await pool.request()
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('joinDate', sql.Date, jd)
      .input('designation', sql.VarChar, designation || null)
      .input('department', sql.VarChar, department || null)
      .query(`
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
        OUTPUT inserted.EmpID
        VALUES (@firstName, @lastName, @joinDate, @designation, @department, 'Active')
      `);

    const empId = masterResult.recordset[0].EmpID;

    // 2. Insert into EmployeeDetails
    const finalLegacyId = legacyEmpId || `EMP${empId}`;
    await pool.request()
      .input('empId', sql.Int, empId)
      .input('fullName', sql.VarChar, fullName)
      .input('phone', sql.VarChar, phone || null)
      .input('email', sql.VarChar, email || null)
      .input('legacyEmpId', sql.VarChar, finalLegacyId)
      .query(`
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, Phone, EmailID, UPPID)
        VALUES (@empId, @fullName, @phone, @email, @legacyEmpId)
      `);

    // 3. Insert into AdminLogins
    // Username can be email, or if no email (e.g. imported) we use finalLegacyId
    const username = email || finalLegacyId;
    await pool.request()
      .input('empId', sql.Int, empId)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, passwordHash)
      .input('role', sql.VarChar, roleName)
      .query(`
        INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
        VALUES (@empId, @username, @password, @role, 'Active')
      `);

    return empId;
  },

  /**
   * Update employee details with validations
   */
  updateEmployee: async (id, data, currentUserRole) => {
    const { email, firstName, lastName, designation, department, status, phone, password, legacyEmpId } = data;

    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }

    const pool = await connectDB();
    
    // Check if employee exists
    const employeeCheck = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.EmpID, d.EmailID, d.UPPID, a.Password AS password_hash
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        LEFT JOIN dbo.AdminLogins a ON m.EmpID = a.EmpID
        WHERE m.EmpID = @id
      `);
    
    if (employeeCheck.recordset.length === 0) {
      throw new Error('Employee not found.');
    }

    const currentEmployee = employeeCheck.recordset[0];

    // Check if email is being updated and is already in use
    if (email && email !== currentEmployee.EmailID) {
      const emailCheck = await pool.request()
        .input('email', sql.VarChar, email)
        .input('id', sql.Int, id)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE EmailID = @email AND EmpID <> @id');
      if (emailCheck.recordset.length > 0) {
        throw new Error('An employee with this email already exists.');
      }
    }

    // Check if legacyEmpId is being updated and is already in use
    if (legacyEmpId && legacyEmpId !== currentEmployee.UPPID) {
      const legacyCheck = await pool.request()
        .input('legacyEmpId', sql.VarChar, legacyEmpId)
        .input('id', sql.Int, id)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE UPPID = @legacyEmpId AND EmpID <> @id');
      if (legacyCheck.recordset.length > 0) {
        throw new Error('An employee with this Legacy ID already exists.');
      }
    }

    // Prepare password update
    let passwordHash = currentEmployee.password_hash;
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    // Business Rule Check: Non-admins cannot toggle status
    const newStatus = (currentUserRole === 'admin' && status) ? status : 'Active';

    // Business Rule Check: Nullable email/password only allowed for unactivated accounts (imported)
    const isImportedAndNotActivated = !passwordHash;
    if (!isImportedAndNotActivated) {
      const targetEmail = email || currentEmployee.EmailID;
      if (!targetEmail) {
        throw new Error('Email cannot be empty for an activated employee account.');
      }
    }

    const targetFirstName = firstName || '';
    const targetLastName = lastName || '';
    const fullName = `${targetFirstName} ${targetLastName}`.trim();

    // 1. Update EmployeeMaster
    await pool.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.VarChar, firstName || null)
      .input('lastName', sql.VarChar, lastName || null)
      .input('designation', sql.VarChar, designation || null)
      .input('department', sql.VarChar, department || null)
      .input('status', sql.VarChar, newStatus)
      .query(`
        UPDATE dbo.EmployeeMaster
        SET FirstName = COALESCE(@firstName, FirstName),
            LastName = COALESCE(@lastName, LastName),
            Designation = COALESCE(@designation, Designation),
            Department = COALESCE(@department, Department),
            EmpStatus = @status
        WHERE EmpID = @id
      `);

    // 2. Update EmployeeDetails
    await pool.request()
      .input('id', sql.Int, id)
      .input('email', sql.VarChar, email || null)
      .input('fullName', sql.VarChar, fullName || null)
      .input('phone', sql.VarChar, phone || null)
      .input('legacyEmpId', sql.VarChar, legacyEmpId || null)
      .query(`
        UPDATE dbo.EmployeeDetails
        SET EmailID = COALESCE(@email, EmailID),
            FullName = CASE WHEN @fullName IS NOT NULL AND @fullName <> '' THEN @fullName ELSE FullName END,
            Phone = COALESCE(@phone, Phone),
            UPPID = COALESCE(@legacyEmpId, UPPID)
        WHERE EmpID = @id
      `);

    // 3. Update AdminLogins
    const targetUsername = email || legacyEmpId || currentEmployee.EmailID || currentEmployee.UPPID;
    await pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.VarChar, targetUsername)
      .input('password', sql.VarChar, passwordHash)
      .input('status', sql.VarChar, newStatus)
      .query(`
        UPDATE dbo.AdminLogins
        SET Username = COALESCE(@username, Username),
            Password = COALESCE(@password, Password),
            UserStatus = @status
        WHERE EmpID = @id
      `);

    return true;
  },

  /**
   * Delete an employee record
   */
  deleteEmployee: async (id) => {
    const pool = await connectDB();
    const deleteResult = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.EmployeeMaster WHERE EmpID = @id');

    if (deleteResult.rowsAffected[0] === 0) {
      throw new Error('Employee not found.');
    }

    return true;
  },

  /**
   * Processes CSV import files using a staging and verification pattern.
   * Inserts raw data into dbo.Staging_Employees, runs validation, merges valid records, and reports errors.
   */
  importEmployees: async (parsedRows, sessionId) => {
    const pool = await connectDB();
    const stats = {
      sessionId,
      totalProcessed: parsedRows.length,
      stagingInserted: 0,
      importedCount: 0,
      updatedCount: 0,
      errorsCount: 0,
      details: []
    };

    // Step 1: Bulk insert all records into the staging table (dbo.Staging_Employees)
    for (const row of parsedRows) {
      // Map common Progress CSV variations to standard variables
      const legacyEmpId = row['legacy_emp_id'] || row['legacyempid'] || row['emp_num'] || row['emp_num'] || row['employee_id'] || row['id'] || '';
      const email = row['email'] || row['email_address'] || '';
      const firstName = row['first_name'] || row['firstname'] || row['first_name'] || '';
      const lastName = row['last_name'] || row['lastname'] || row['last_name'] || '';
      const designation = row['designation'] || row['title'] || row['role_title'] || '';
      const department = row['department'] || row['dept'] || row['dept_code'] || row['dept_code'] || '';
      const joinDate = row['join_date'] || row['joindate'] || row['join_date'] || '';
      const phone = row['phone'] || row['phone_number'] || row['tel'] || '';
      const role = row['role'] || row['role_name'] || 'employee';

      try {
        await pool.request()
          .input('importSessionId', sql.UniqueIdentifier, sessionId)
          .input('legacyEmpId', sql.VarChar, legacyEmpId.trim() || null)
          .input('email', sql.VarChar, email.trim() || null)
          .input('firstName', sql.VarChar, firstName.trim() || null)
          .input('lastName', sql.VarChar, lastName.trim() || null)
          .input('designation', sql.VarChar, designation.trim() || null)
          .input('department', sql.VarChar, department.trim() || null)
          .input('joinDate', sql.VarChar, joinDate.trim() || null)
          .input('phone', sql.VarChar, phone.trim() || null)
          .input('role', sql.VarChar, role.trim() || null)
          .query(`
            INSERT INTO dbo.Staging_Employees 
            (import_session_id, raw_legacy_emp_id, raw_email, raw_first_name, raw_last_name, raw_designation, raw_department, raw_join_date, raw_phone, raw_role, validation_status)
            VALUES 
            (@importSessionId, @legacyEmpId, @email, @firstName, @lastName, @designation, @department, @joinDate, @phone, @role, 'Pending')
          `);
        
        stats.stagingInserted++;
      } catch (err) {
        console.error('Failed to insert employee into staging: ', err);
        stats.errorsCount++;
        stats.details.push({
          row: legacyEmpId || firstName || 'Unknown',
          status: 'Failed to Stage',
          error: err.message
        });
      }
    }

    // Step 2: Query the staged rows for this session and validate them
    const stagedRowsResult = await pool.request()
      .input('importSessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT * FROM dbo.Staging_Employees WHERE import_session_id = @importSessionId AND validation_status = 'Pending'`);

    const stagedRows = stagedRowsResult.recordset;

    // Track unique values in this CSV session to detect duplicate keys in the uploaded file itself
    const seenLegacyIds = new Set();
    const seenEmails = new Set();

    // Load existing database employee mappings for lookup
    const existingEmployeesResult = await pool.request().query(`
      SELECT m.EmpID AS employee_id, d.EmailID AS email, d.UPPID AS legacy_emp_id, a.Password AS password_hash
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.AdminLogins a ON m.EmpID = a.EmpID
    `);
    const dbEmployees = existingEmployeesResult.recordset;

    for (const stagedRow of stagedRows) {
      let isValid = true;
      const errors = [];
      const legacyId = stagedRow.raw_legacy_emp_id;
      const email = stagedRow.raw_email;
      const firstName = stagedRow.raw_first_name;
      const lastName = stagedRow.raw_last_name;
      const role = stagedRow.raw_role ? stagedRow.raw_role.toLowerCase() : 'employee';
      const joinDateStr = stagedRow.raw_join_date;

      // 1. Mandatory Legacy Identifier Check
      if (!legacyId) {
        isValid = false;
        errors.push('LegacyEmpId (emp-num) is missing or empty.');
      } else {
        if (seenLegacyIds.has(legacyId)) {
          isValid = false;
          errors.push(`Duplicate LegacyEmpId '${legacyId}' found in CSV upload.`);
        }
        seenLegacyIds.add(legacyId);
      }

      // 2. First & Last Name Check
      if (!firstName && !lastName) {
        isValid = false;
        errors.push('First name and Last name are required.');
      }

      // 3. Email validation & duplication check
      if (email) {
        if (!EMAIL_REGEX.test(email)) {
          isValid = false;
          errors.push(`Invalid email format: '${email}'`);
        } else {
          if (seenEmails.has(email)) {
            isValid = false;
            errors.push(`Duplicate email '${email}' found in CSV upload.`);
          }
          seenEmails.add(email);

          // Check if this email is already registered in the DB to someone else
          const existingWithEmail = dbEmployees.find(e => e.email && e.email.toLowerCase() === email.toLowerCase());
          if (existingWithEmail && existingWithEmail.legacy_emp_id !== legacyId) {
            isValid = false;
            errors.push(`Email '${email}' is already registered to employee ID: ${existingWithEmail.employee_id}.`);
          }
        }
      }

      // 4. Role validation
      if (!VALID_ROLES.includes(role)) {
        isValid = false;
        errors.push(`Invalid role '${stagedRow.raw_role}'. Must be 'admin' or 'employee'.`);
      }

      // 5. Date validation
      let parsedDate = new Date();
      if (joinDateStr) {
        parsedDate = new Date(joinDateStr);
        if (isNaN(parsedDate.getTime())) {
          isValid = false;
          errors.push(`Invalid join date format: '${joinDateStr}'. Use YYYY-MM-DD.`);
        }
      }

      // Update validation status in staging
      const status = isValid ? 'Valid' : 'Invalid';
      const errorMsg = errors.join(' | ');

      await pool.request()
        .input('stagingId', sql.Int, stagedRow.staging_id)
        .input('status', sql.VarChar, status)
        .input('error', sql.VarChar, errorMsg || null)
        .query('UPDATE dbo.Staging_Employees SET validation_status = @status, validation_error = @error WHERE staging_id = @stagingId');

      if (!isValid) {
        stats.errorsCount++;
        stats.details.push({
          row: legacyId || `${firstName} ${lastName}`,
          status: 'Invalid',
          error: errorMsg
        });
      }
    }

    // Step 3: Insert or update (upsert) the validated staging rows into production
    const validRowsResult = await pool.request()
      .input('importSessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT * FROM dbo.Staging_Employees WHERE import_session_id = @importSessionId AND validation_status = 'Valid'`);

    const validRows = validRowsResult.recordset;

    for (const validRow of validRows) {
      const legacyId = validRow.raw_legacy_emp_id;
      const email = validRow.raw_email || null;
      const firstName = validRow.raw_first_name;
      const lastName = validRow.raw_last_name;
      const role = validRow.raw_role.toLowerCase();
      const designation = validRow.raw_designation || null;
      const department = validRow.raw_department || null;
      const joinDate = validRow.raw_join_date ? new Date(validRow.raw_join_date) : new Date();
      const phone = validRow.raw_phone || null;
      const fullName = `${firstName || ''} ${lastName || ''}`.trim();

      // Check if employee with legacyId exists in production
      const prodRecord = dbEmployees.find(e => e.legacy_emp_id === legacyId);

      try {
        if (prodRecord) {
          const empId = prodRecord.employee_id;
          // Updates:
          // Keep existing password_hash if present.
          let finalEmail = email;
          if (!finalEmail && prodRecord.password_hash && prodRecord.email) {
            finalEmail = prodRecord.email; // Preserve email if they activated their account
          }

          // 1. Update EmployeeMaster
          await pool.request()
            .input('empId', sql.Int, empId)
            .input('firstName', sql.VarChar, firstName)
            .input('lastName', sql.VarChar, lastName)
            .input('designation', sql.VarChar, designation)
            .input('department', sql.VarChar, department)
            .input('joinDate', sql.Date, joinDate)
            .query(`
              UPDATE dbo.EmployeeMaster
              SET FirstName = @firstName,
                  LastName = @lastName,
                  Designation = @designation,
                  Department = @department,
                  DOJ = @joinDate
              WHERE EmpID = @empId
            `);

          // 2. Update EmployeeDetails
          await pool.request()
            .input('empId', sql.Int, empId)
            .input('email', sql.VarChar, finalEmail)
            .input('fullName', sql.VarChar, fullName)
            .input('phone', sql.VarChar, phone)
            .query(`
              UPDATE dbo.EmployeeDetails
              SET EmailID = @email,
                  FullName = @fullName,
                  Phone = @phone
              WHERE EmpID = @empId
            `);

          // 3. Update AdminLogins
          const username = finalEmail || legacyId;
          await pool.request()
            .input('empId', sql.Int, empId)
            .input('username', sql.VarChar, username)
            .input('role', sql.VarChar, role)
            .query(`
              UPDATE dbo.AdminLogins
              SET Username = @username,
                  Role = @role
              WHERE EmpID = @empId
            `);
          
          stats.updatedCount++;
          stats.details.push({
            row: legacyId,
            status: 'Updated',
            error: null
          });
        } else {
          // New Employee Insert
          // 1. Insert into EmployeeMaster
          const insertMasterResult = await pool.request()
            .input('firstName', sql.VarChar, firstName)
            .input('lastName', sql.VarChar, lastName)
            .input('designation', sql.VarChar, designation)
            .input('department', sql.VarChar, department)
            .input('joinDate', sql.Date, joinDate)
            .query(`
              INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
              OUTPUT inserted.EmpID
              VALUES (@firstName, @lastName, @joinDate, @designation, @department, 'Active')
            `);

          const empId = insertMasterResult.recordset[0].EmpID;

          // 2. Insert into EmployeeDetails
          await pool.request()
            .input('empId', sql.Int, empId)
            .input('email', sql.VarChar, email)
            .input('fullName', sql.VarChar, fullName)
            .input('phone', sql.VarChar, phone)
            .input('legacyId', sql.VarChar, legacyId)
            .query(`
              INSERT INTO dbo.EmployeeDetails (EmpID, FullName, EmailID, Phone, UPPID)
              VALUES (@empId, @fullName, @email, @phone, @legacyId)
            `);

          // 3. Insert into AdminLogins
          const username = email || legacyId;
          await pool.request()
            .input('empId', sql.Int, empId)
            .input('username', sql.VarChar, username)
            .input('role', sql.VarChar, role)
            .query(`
              INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
              VALUES (@empId, @username, NULL, @role, 'Active')
            `);

          stats.importedCount++;
          stats.details.push({
            row: legacyId,
            status: 'Created',
            error: null
          });
        }

        // Update staging status to 'Imported'
        await pool.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Imported', imported_at = GETDATE() WHERE staging_id = @stagingId`);

      } catch (err) {
        console.error(`Failed to merge staging employee ${legacyId} into production: `, err);
        stats.errorsCount++;
        stats.details.push({
          row: legacyId,
          status: 'Failed to Merge',
          error: err.message
        });

        // Mark row as invalid due to merge failure
        await pool.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .input('error', sql.VarChar, `Merge Error: ${err.message}`)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Invalid', validation_error = @error WHERE staging_id = @stagingId`);
      }
    }

    return stats;
  }
};
