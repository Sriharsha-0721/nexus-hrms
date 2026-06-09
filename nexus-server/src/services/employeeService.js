import { connectDB, sql } from '../config/db.js';
import bcrypt from 'bcryptjs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'employee'];

export const employeeService = {
  getAllEmployees: async (adminId = null) => {
    const pool = await connectDB();
    let query = `
      SELECT m.EmpID AS employee_id, d.UPPID AS legacy_emp_id, d.EmailID AS email, 
             m.FirstName AS first_name, m.LastName AS last_name, 
             COALESCE(des.DesignationName, m.Designation) AS designation, 
             COALESCE(dept.DepartmentName, m.Department) AS department, 
             m.DOJ AS join_date, m.EmpStatus AS status, d.Phone AS phone,
             m.DepartmentID AS department_id, m.DesignationID AS designation_id,
             rep.ManagerEmpID AS manager_id,
             mgr.FirstName + ' ' + mgr.LastName AS manager_name,
             map.AdminEmpID AS hr_admin_id,
             adm.FirstName + ' ' + adm.LastName AS hr_admin_name
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
      LEFT JOIN dbo.Designations des ON m.DesignationID = des.DesignationID
      LEFT JOIN dbo.EmployeeReporting rep ON m.EmpID = rep.EmployeeEmpID
      LEFT JOIN dbo.EmployeeMaster mgr ON rep.ManagerEmpID = mgr.EmpID
      LEFT JOIN dbo.AdminEmployeeMapping map ON m.EmpID = map.EmployeeEmpID
      LEFT JOIN dbo.EmployeeMaster adm ON map.AdminEmpID = adm.EmpID
    `;

    const request = pool.request();
    if (adminId) {
      request.input('adminId', sql.Int, adminId);
      query += ` WHERE m.EmpID IN (SELECT EmployeeEmpID FROM dbo.AdminEmployeeMapping WHERE AdminEmpID = @adminId) `;
    }

    query += ` ORDER BY m.EmpID DESC `;
    const result = await request.query(query);

    // Fetch roles
    const adminLogins = await pool.request().query('SELECT EmpID, Role FROM dbo.AdminLogins');
    const adminRolesMap = {};
    adminLogins.recordset.forEach(row => {
      adminRolesMap[row.EmpID] = row.Role || 'admin';
    });

    return result.recordset.map(row => ({
      id: row.employee_id,
      legacyEmpId: row.legacy_emp_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: adminRolesMap[row.employee_id] || 'employee',
      designation: row.designation,
      department: row.department,
      departmentId: row.department_id,
      designationId: row.designation_id,
      joinDate: row.join_date,
      status: row.status,
      phone: row.phone,
      managerId: row.manager_id,
      managerName: row.manager_name,
      hrAdminId: row.hr_admin_id,
      hrAdminName: row.hr_admin_name
    }));
  },

  getEmployeeById: async (id) => {
    const pool = await connectDB();
    
    const roleResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT Role FROM dbo.AdminLogins WHERE EmpID = @id
      `);
    const roleName = roleResult.recordset.length > 0 ? roleResult.recordset[0].Role : 'employee';

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.EmpID AS employee_id, d.UPPID AS legacy_emp_id, d.EmailID AS email, 
               m.FirstName AS first_name, m.LastName AS last_name, 
               COALESCE(des.DesignationName, m.Designation) AS designation, 
               COALESCE(dept.DepartmentName, m.Department) AS department, 
               m.DOJ AS join_date, m.EmpStatus AS status, d.Phone AS phone,
               m.DepartmentID AS department_id, m.DesignationID AS designation_id,
               d.DOB AS dob, d.Gender AS gender, d.Address AS address, 
               d.BankName AS bank_name, d.BankAccountNo AS bank_account_no, d.IFSCCode AS ifsc_code,
               d.MaritalStatus AS marital_status, d.Nationality AS nationality,
               d.EmploymentType AS employment_type, d.AadharNo AS aadhar_no,
               d.PANNo AS pan_no, d.UANNo AS uan_no,
               d.EmergencyContactName AS emergency_contact_name,
               d.EmergencyContactPhone AS emergency_contact_phone,
               rep.ManagerEmpID AS manager_id,
               mgr.FirstName + ' ' + mgr.LastName AS manager_name,
               map.AdminEmpID AS hr_admin_id,
               adm.FirstName + ' ' + adm.LastName AS hr_admin_name
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        LEFT JOIN dbo.Departments dept ON m.DepartmentID = dept.DepartmentID
        LEFT JOIN dbo.Designations des ON m.DesignationID = des.DesignationID
        LEFT JOIN dbo.EmployeeReporting rep ON m.EmpID = rep.EmployeeEmpID
        LEFT JOIN dbo.EmployeeMaster mgr ON rep.ManagerEmpID = mgr.EmpID
        LEFT JOIN dbo.AdminEmployeeMapping map ON m.EmpID = map.EmployeeEmpID
        LEFT JOIN dbo.EmployeeMaster adm ON map.AdminEmpID = adm.EmpID
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
      role: roleName,
      designation: row.designation,
      department: row.department,
      departmentId: row.department_id,
      designationId: row.designation_id,
      joinDate: row.join_date,
      status: row.status,
      phone: row.phone,
      dob: row.dob,
      gender: row.gender,
      address: row.address,
      maritalStatus: row.marital_status,
      nationality: row.nationality,
      employmentType: row.employment_type || 'Full-time',
      aadharNo: row.aadhar_no,
      panNo: row.pan_no,
      uanNo: row.uan_no,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      bankName: row.bank_name,
      bankAccountNo: row.bank_account_no,
      ifscCode: row.ifsc_code,
      managerId: row.manager_id,
      managerName: row.manager_name,
      hrAdminId: row.hr_admin_id,
      hrAdminName: row.hr_admin_name
    };
  },

  createEmployee: async (data, actorEmpId = null) => {
    const { 
      firstName, lastName, designationId, departmentId, joinDate, phone, email,
      dob, gender, address, bankName, bankAccountNo, ifscCode,
      maritalStatus, nationality, employmentType, aadharNo, panNo, uanNo,
      emergencyContactName, emergencyContactPhone, managerId, hrAdminId
    } = data;

    if (!firstName || !lastName) {
      throw new Error('First Name and Last Name are required.');
    }

    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }

    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Generate unique username (lowercase, sanitized firstname.lastname@nexus.com)
      const usernameBase = `${firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`;
      let targetUsername = `${usernameBase}@nexus.com`;
      
      let checkResult = await transaction.request()
        .input('usernameCheck', sql.VarChar, targetUsername)
        .query(`
          SELECT COUNT(*) AS cnt FROM (
            SELECT Username FROM dbo.EmployeeLogins WHERE Username = @usernameCheck
            UNION
            SELECT Username FROM dbo.AdminLogins WHERE Username = @usernameCheck
          ) AS all_logins
        `);
      
      let counter = 1;
      while (checkResult.recordset[0].cnt > 0) {
        targetUsername = `${usernameBase}${counter}@nexus.com`;
        
        const tempReq = transaction.request();
        tempReq.input('usernameCheck', sql.VarChar, targetUsername);
        checkResult = await tempReq.query(`
          SELECT COUNT(*) AS cnt FROM (
            SELECT Username FROM dbo.EmployeeLogins WHERE Username = @usernameCheck
            UNION
            SELECT Username FROM dbo.AdminLogins WHERE Username = @usernameCheck
          ) AS all_logins
        `);
        counter++;
      }

      // Check if email already exists in Details (if email provided)
      const finalEmail = email || targetUsername;
      if (email) {
        const emailCheck = await transaction.request()
          .input('email', sql.VarChar, email)
          .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE EmailID = @email');
        if (emailCheck.recordset.length > 0) {
          throw new Error('An employee with this email already exists.');
        }
      }

      // 2. Hash temporary password
      const tempPassword = 'Temp@123';
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(tempPassword, salt);

      const jd = joinDate ? new Date(joinDate) : new Date();
      const fullName = `${firstName} ${lastName}`.trim();

      // 3. Insert into EmployeeMaster
      const masterResult = await transaction.request()
        .input('firstName', sql.VarChar, firstName)
        .input('lastName', sql.VarChar, lastName)
        .input('joinDate', sql.Date, jd)
        .input('departmentId', sql.Int, departmentId || null)
        .input('designationId', sql.Int, designationId || null)
        .query(`
          INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
          OUTPUT inserted.EmpID
          VALUES (@firstName, @lastName, @joinDate, '', '', 'Active', @departmentId, @designationId)
        `);

      const empId = masterResult.recordset[0].EmpID;
      const finalLegacyId = `EMP${empId}`; // UPPID

      // 4. Insert into EmployeeDetails
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('fullName', sql.VarChar, fullName)
        .input('phone', sql.VarChar, phone || null)
        .input('email', sql.VarChar, finalEmail)
        .input('legacyEmpId', sql.VarChar, finalLegacyId)
        .input('dob', sql.Date, dob ? new Date(dob) : null)
        .input('gender', sql.VarChar, gender || null)
        .input('address', sql.VarChar, address || null)
        .input('bankName', sql.VarChar, bankName || null)
        .input('bankAccountNo', sql.VarChar, bankAccountNo || null)
        .input('ifscCode', sql.VarChar, ifscCode || null)
        .input('maritalStatus', sql.VarChar, maritalStatus || null)
        .input('nationality', sql.VarChar, nationality || null)
        .input('employmentType', sql.VarChar, employmentType || 'Full-time')
        .input('aadharNo', sql.VarChar, aadharNo || null)
        .input('panNo', sql.VarChar, panNo || null)
        .input('uanNo', sql.VarChar, uanNo || null)
        .input('emergencyContactName', sql.VarChar, emergencyContactName || null)
        .input('emergencyContactPhone', sql.VarChar, emergencyContactPhone || null)
        .query(`
          INSERT INTO dbo.EmployeeDetails (
            EmpID, FullName, Phone, EmailID, UPPID, DOB, Gender, Address,
            BankName, BankAccountNo, IFSCCode, MaritalStatus, Nationality,
            EmploymentType, AadharNo, PANNo, UANNo, EmergencyContactName, EmergencyContactPhone
          )
          VALUES (
            @empId, @fullName, @phone, @email, @legacyEmpId, @dob, @gender, @address,
            @bankName, @bankAccountNo, @ifscCode, @maritalStatus, @nationality,
            @employmentType, @aadharNo, @panNo, @uanNo, @emergencyContactName, @emergencyContactPhone
          )
        `);

      // 5. Insert into EmployeeLogins
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('username', sql.VarChar, targetUsername)
        .input('password', sql.VarChar, passwordHash)
        .query(`
          INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
          VALUES (@empId, @username, @password, 'Active')
        `);

      // 6. Insert default SalaryRevisions
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('effectiveDate', sql.Date, jd)
        .query(`
          INSERT INTO dbo.SalaryRevisions (
            EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance,
            MedicalAllowance, ConveyanceAllowance, OtherAllowance,
            ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive, CreatedAt
          )
          VALUES (
            @empId, @effectiveDate, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            12.00, 0.40, 0.00, 'Initial salary structure', 1, GETDATE()
          )
        `);

      // 7. Insert Reporting Manager (EmployeeReporting)
      if (managerId) {
        await transaction.request()
          .input('empId', sql.Int, empId)
          .input('managerId', sql.Int, managerId)
          .query(`
            INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID)
            VALUES (@empId, @managerId)
          `);
        
        await transaction.request()
          .input('actorEmpId', sql.Int, actorEmpId || empId)
          .input('empId', sql.Int, empId)
          .input('desc', sql.VarChar, `Assigned manager ID ${managerId} to employee ID ${empId}`)
          .query(`
            INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
            VALUES (@actorEmpId, 'MANAGER_CHANGED', @desc)
          `);
      }

      // 8. Insert HR Admin mapping (AdminEmployeeMapping)
      if (hrAdminId) {
        await transaction.request()
          .input('empId', sql.Int, empId)
          .input('hrAdminId', sql.Int, hrAdminId)
          .query(`
            INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID)
            VALUES (@hrAdminId, @empId)
          `);

        await transaction.request()
          .input('actorEmpId', sql.Int, actorEmpId || empId)
          .input('empId', sql.Int, empId)
          .input('desc', sql.VarChar, `Assigned HR Admin ID ${hrAdminId} to employee ID ${empId}`)
          .query(`
            INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
            VALUES (@actorEmpId, 'EMPLOYEE_ASSIGNED_TO_HR', @desc)
          `);
      }

      // 9. Log employee creation to AuditLogs
      const createdDesc = `Created employee record for ${fullName} (${targetUsername}) with UPPID ${finalLegacyId}`;
      await transaction.request()
        .input('actorEmpId', sql.Int, actorEmpId || empId)
        .input('desc', sql.VarChar, createdDesc)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'EMPLOYEE_CREATE', @desc)
        `);

      // 10. Send Welcome Notification
      const welcomeMsg = `Welcome ${fullName}! Your account has been created. Your username is ${targetUsername} and temporary password is ${tempPassword}. Please change your password after logging in.`;
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('message', sql.VarChar, welcomeMsg)
        .query(`
          INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
          VALUES (@empId, 'Welcome to Nexus HRMS', @message, 0, GETDATE())
        `);

      await transaction.commit();
      return empId;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  updateEmployee: async (id, data, currentUserRole, actorEmpId = null) => {
    const { 
      email, firstName, lastName, designationId, departmentId, status, phone, password, legacyEmpId,
      dob, gender, address, bankName, bankAccountNo, ifscCode,
      maritalStatus, nationality, employmentType, aadharNo, panNo, uanNo,
      emergencyContactName, emergencyContactPhone, managerId, hrAdminId
    } = data;

    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format.');
    }

    const pool = await connectDB();
    
    const employeeCheck = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.EmpID, d.EmailID, d.UPPID, m.EmpStatus
        FROM dbo.EmployeeMaster m
        LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
        WHERE m.EmpID = @id
      `);
    
    if (employeeCheck.recordset.length === 0) {
      throw new Error('Employee not found.');
    }

    const currentEmployee = employeeCheck.recordset[0];

    if (email && email !== currentEmployee.EmailID) {
      const emailCheck = await pool.request()
        .input('email', sql.VarChar, email)
        .input('id', sql.Int, id)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE EmailID = @email AND EmpID <> @id');
      if (emailCheck.recordset.length > 0) {
        throw new Error('An employee with this email already exists.');
      }
    }

    if (legacyEmpId && legacyEmpId !== currentEmployee.UPPID) {
      const legacyCheck = await pool.request()
        .input('legacyEmpId', sql.VarChar, legacyEmpId)
        .input('id', sql.Int, id)
        .query('SELECT EmpID FROM dbo.EmployeeDetails WHERE UPPID = @legacyEmpId AND EmpID <> @id');
      if (legacyCheck.recordset.length > 0) {
        throw new Error('An employee with this Legacy ID already exists.');
      }
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const targetFirstName = firstName !== undefined ? firstName : null;
      const targetLastName = lastName !== undefined ? lastName : null;
      const fullName = (targetFirstName !== null || targetLastName !== null) 
        ? `${targetFirstName || ''} ${targetLastName || ''}`.trim() 
        : null;

      let newStatus = currentEmployee.EmpStatus;
      if (status !== undefined && ['SuperAdmin', 'HRAdmin'].includes(currentUserRole)) {
        newStatus = status;
        if (newStatus !== currentEmployee.EmpStatus) {
          await transaction.request()
            .input('actorEmpId', sql.Int, actorEmpId || id)
            .input('id', sql.Int, id)
            .input('status', sql.VarChar, newStatus)
            .query(`
              INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
              VALUES (@actorEmpId, 'EMPLOYEE_STATUS_CHANGE', 'Changed status of employee ID ' + CAST(@id AS VARCHAR) + ' to ' + @status)
            `);
            
          await transaction.request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar, newStatus === 'Active' ? 'Active' : 'Inactive')
            .query(`
              UPDATE dbo.EmployeeLogins SET UserStatus = @status WHERE EmpID = @id;
              UPDATE dbo.AdminLogins SET UserStatus = @status WHERE EmpID = @id;
            `);
        }
      }

      await transaction.request()
        .input('id', sql.Int, id)
        .input('firstName', sql.VarChar, targetFirstName)
        .input('lastName', sql.VarChar, targetLastName)
        .input('departmentId', sql.Int, departmentId !== undefined ? departmentId : null)
        .input('designationId', sql.Int, designationId !== undefined ? designationId : null)
        .input('status', sql.VarChar, newStatus)
        .query(`
          UPDATE dbo.EmployeeMaster
          SET FirstName = COALESCE(@firstName, FirstName),
              LastName = COALESCE(@lastName, LastName),
              DepartmentID = COALESCE(@departmentId, DepartmentID),
              DesignationID = COALESCE(@designationId, DesignationID),
              EmpStatus = @status
          WHERE EmpID = @id
        `);

      await transaction.request()
        .input('id', sql.Int, id)
        .input('email', sql.VarChar, email !== undefined ? email : null)
        .input('fullName', sql.VarChar, fullName)
        .input('phone', sql.VarChar, phone !== undefined ? phone : null)
        .input('legacyEmpId', sql.VarChar, legacyEmpId !== undefined ? legacyEmpId : null)
        .input('dob', sql.Date, dob !== undefined && dob ? new Date(dob) : null)
        .input('gender', sql.VarChar, gender !== undefined ? gender : null)
        .input('address', sql.VarChar, address !== undefined ? address : null)
        .input('bankName', sql.VarChar, bankName !== undefined ? bankName : null)
        .input('bankAccountNo', sql.VarChar, bankAccountNo !== undefined ? bankAccountNo : null)
        .input('ifscCode', sql.VarChar, ifscCode !== undefined ? ifscCode : null)
        .input('maritalStatus', sql.VarChar, maritalStatus !== undefined ? maritalStatus : null)
        .input('nationality', sql.VarChar, nationality !== undefined ? nationality : null)
        .input('employmentType', sql.VarChar, employmentType !== undefined ? employmentType : null)
        .input('aadharNo', sql.VarChar, aadharNo !== undefined ? aadharNo : null)
        .input('panNo', sql.VarChar, panNo !== undefined ? panNo : null)
        .input('uanNo', sql.VarChar, uanNo !== undefined ? uanNo : null)
        .input('emergencyContactName', sql.VarChar, emergencyContactName !== undefined ? emergencyContactName : null)
        .input('emergencyContactPhone', sql.VarChar, emergencyContactPhone !== undefined ? emergencyContactPhone : null)
        .query(`
          UPDATE dbo.EmployeeDetails
          SET EmailID = COALESCE(@email, EmailID),
              FullName = COALESCE(@fullName, FullName),
              Phone = COALESCE(@phone, Phone),
              UPPID = COALESCE(@legacyEmpId, UPPID),
              DOB = COALESCE(@dob, DOB),
              Gender = COALESCE(@gender, Gender),
              Address = COALESCE(@address, Address),
              BankName = COALESCE(@bankName, BankName),
              BankAccountNo = COALESCE(@bankAccountNo, BankAccountNo),
              IFSCCode = COALESCE(@ifscCode, IFSCCode),
              MaritalStatus = COALESCE(@maritalStatus, MaritalStatus),
              Nationality = COALESCE(@nationality, Nationality),
              EmploymentType = COALESCE(@employmentType, EmploymentType),
              AadharNo = COALESCE(@aadharNo, AadharNo),
              PANNo = COALESCE(@panNo, PANNo),
              UANNo = COALESCE(@uanNo, UANNo),
              EmergencyContactName = COALESCE(@emergencyContactName, EmergencyContactName),
              EmergencyContactPhone = COALESCE(@emergencyContactPhone, EmergencyContactPhone)
          WHERE EmpID = @id
        `);

      const updatedUsername = email !== undefined ? email : null;
      if (updatedUsername) {
        await transaction.request()
          .input('id', sql.Int, id)
          .input('username', sql.VarChar, updatedUsername)
          .query(`
            UPDATE dbo.EmployeeLogins SET Username = @username WHERE EmpID = @id;
            UPDATE dbo.AdminLogins SET Username = @username WHERE EmpID = @id;
          `);
      }

      if (password) {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        await transaction.request()
          .input('id', sql.Int, id)
          .input('password', sql.VarChar, passwordHash)
          .query(`
            UPDATE dbo.EmployeeLogins SET Password = @password WHERE EmpID = @id;
            UPDATE dbo.AdminLogins SET Password = @password WHERE EmpID = @id;
          `);
      }

      if (managerId !== undefined) {
        const checkReport = await transaction.request()
          .input('empId', sql.Int, id)
          .query('SELECT ManagerEmpID FROM dbo.EmployeeReporting WHERE EmployeeEmpID = @empId');
        
        if (checkReport.recordset.length > 0) {
          const oldManagerId = checkReport.recordset[0].ManagerEmpID;
          if (oldManagerId !== managerId) {
            if (managerId) {
              await transaction.request()
                .input('empId', sql.Int, id)
                .input('managerId', sql.Int, managerId)
                .query('UPDATE dbo.EmployeeReporting SET ManagerEmpID = @managerId WHERE EmployeeEmpID = @empId');
            } else {
              await transaction.request()
                .input('empId', sql.Int, id)
                .query('DELETE FROM dbo.EmployeeReporting WHERE EmployeeEmpID = @empId');
            }
            
            await transaction.request()
              .input('actorEmpId', sql.Int, actorEmpId || id)
              .input('id', sql.Int, id)
              .input('desc', sql.VarChar, `Changed manager for employee ID ${id} to manager ID ${managerId || 'None'}`)
              .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorEmpId, \'MANAGER_CHANGED\', @desc)');
          }
        } else if (managerId) {
          await transaction.request()
            .input('empId', sql.Int, id)
            .input('managerId', sql.Int, managerId)
            .query('INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID) VALUES (@empId, @managerId)');
          
          await transaction.request()
            .input('actorEmpId', sql.Int, actorEmpId || id)
            .input('id', sql.Int, id)
            .input('desc', sql.VarChar, `Assigned manager ID ${managerId} to employee ID ${id}`)
            .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorEmpId, \'MANAGER_CHANGED\', @desc)');
        }
      }

      if (hrAdminId !== undefined) {
        const checkMapping = await transaction.request()
          .input('empId', sql.Int, id)
          .query('SELECT AdminEmpID FROM dbo.AdminEmployeeMapping WHERE EmployeeEmpID = @empId');
        
        if (checkMapping.recordset.length > 0) {
          const oldAdminId = checkMapping.recordset[0].AdminEmpID;
          if (oldAdminId !== hrAdminId) {
            if (hrAdminId) {
              await transaction.request()
                .input('empId', sql.Int, id)
                .input('hrAdminId', sql.Int, hrAdminId)
                .query('UPDATE dbo.AdminEmployeeMapping SET AdminEmpID = @hrAdminId WHERE EmployeeEmpID = @empId');
            } else {
              await transaction.request()
                .input('empId', sql.Int, id)
                .query('DELETE FROM dbo.AdminEmployeeMapping WHERE EmployeeEmpID = @empId');
            }
            
            await transaction.request()
              .input('actorEmpId', sql.Int, actorEmpId || id)
              .input('id', sql.Int, id)
              .input('desc', sql.VarChar, `Changed assigned HR Admin for employee ID ${id} to admin ID ${hrAdminId || 'None'}`)
              .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorEmpId, \'EMPLOYEE_ASSIGNED_TO_HR\', @desc)');
          }
        } else if (hrAdminId) {
          await transaction.request()
            .input('empId', sql.Int, id)
            .input('hrAdminId', sql.Int, hrAdminId)
            .query('INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID) VALUES (@hrAdminId, @empId)');
          
          await transaction.request()
            .input('actorEmpId', sql.Int, actorEmpId || id)
            .input('id', sql.Int, id)
            .input('desc', sql.VarChar, `Assigned HR Admin ID ${hrAdminId} to employee ID ${id}`)
            .query('INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc) VALUES (@actorEmpId, \'EMPLOYEE_ASSIGNED_TO_HR\', @desc)');
        }
      }

      await transaction.request()
        .input('actorEmpId', sql.Int, actorEmpId || id)
        .input('id', sql.Int, id)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'EMPLOYEE_UPDATE', 'Updated details for employee ID ' + CAST(@id AS VARCHAR))
        `);

      await transaction.request()
        .input('id', sql.Int, id)
        .query(`
          INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
          VALUES (@id, 'Profile Updated', 'Your profile details have been successfully updated.', 0, GETDATE())
        `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  deleteEmployee: async (id, actorEmpId = null) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const updateResult = await transaction.request()
        .input('id', sql.Int, id)
        .query(`
          UPDATE dbo.EmployeeMaster
          SET EmpStatus = 'Inactive'
          WHERE EmpID = @id
        `);

      if (updateResult.rowsAffected[0] === 0) {
        throw new Error('Employee not found.');
      }

      await transaction.request()
        .input('id', sql.Int, id)
        .query(`
          UPDATE dbo.EmployeeLogins
          SET UserStatus = 'Inactive'
          WHERE EmpID = @id;
          UPDATE dbo.AdminLogins
          SET UserStatus = 'Inactive'
          WHERE EmpID = @id;
        `);

      await transaction.request()
        .input('actorEmpId', sql.Int, actorEmpId || id)
        .input('id', sql.Int, id)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'EMPLOYEE_STATUS_CHANGE', 'Soft-deleted (status set to Inactive) employee ID ' + CAST(@id AS VARCHAR))
        `);

      await transaction.request()
        .input('id', sql.Int, id)
        .query(`
          INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
          VALUES (@id, 'Account Deactivated', 'Your account has been deactivated. Please contact your HR administrator for any queries.', 0, GETDATE())
        `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  createAdminAccount: async (data, actorEmpId = null) => {
    const { username, password, role, firstName, lastName, email } = data;
    if (!username || !password || !role || !firstName || !lastName) {
      throw new Error('All fields (username, password, role, firstName, lastName) are required.');
    }
    if (!['HRAdmin', 'PayrollAdmin'].includes(role)) {
      throw new Error('Only HRAdmin and PayrollAdmin accounts can be created.');
    }
    
    const pool = await connectDB();
    
    const userCheck = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT COUNT(*) AS cnt FROM (
          SELECT Username FROM dbo.AdminLogins WHERE Username = @username
          UNION
          SELECT Username FROM dbo.EmployeeLogins WHERE Username = @username
        ) AS all_users
      `);
    if (userCheck.recordset[0].cnt > 0) {
      throw new Error('Username already exists.');
    }
    
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const masterResult = await transaction.request()
        .input('firstName', sql.VarChar, firstName)
        .input('lastName', sql.VarChar, lastName)
        .query(`
          INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
          OUTPUT inserted.EmpID
          VALUES (@firstName, @lastName, GETDATE(), @role, 'Administration', 'Active')
        `);
      const empId = masterResult.recordset[0].EmpID;
      
      const fullName = `${firstName} ${lastName}`.trim();
      const finalEmail = email || username;
      const finalLegacyId = `ADM${empId}`;
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('fullName', sql.VarChar, fullName)
        .input('email', sql.VarChar, finalEmail)
        .input('legacyEmpId', sql.VarChar, finalLegacyId)
        .query(`
          INSERT INTO dbo.EmployeeDetails (EmpID, FullName, EmailID, UPPID, EmploymentType)
          VALUES (@empId, @fullName, @email, @legacyEmpId, 'Full-time')
        `);
        
      await transaction.request()
        .input('empId', sql.Int, empId)
        .input('username', sql.VarChar, username)
        .input('password', sql.VarChar, passwordHash)
        .input('role', sql.VarChar, role)
        .query(`
          INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
          VALUES (@empId, @username, @password, @role, 'Active')
        `);
        
      await transaction.request()
        .input('actorEmpId', sql.Int, actorEmpId || empId)
        .input('actionDesc', sql.VarChar, `Created ${role} account: ${username}`)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'ADMIN_CREATE', @actionDesc)
        `);
        
      await transaction.commit();
      return empId;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  getAdminAccounts: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT a.AppUserID AS id, a.EmpID AS empId, a.Username AS username, a.Role AS role, a.UserStatus AS status,
             m.FirstName AS firstName, m.LastName AS lastName, d.EmailID AS email
      FROM dbo.AdminLogins a
      LEFT JOIN dbo.EmployeeMaster m ON a.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON a.EmpID = d.EmpID
      ORDER BY a.AppUserID DESC
    `);
    return result.recordset;
  },

  assignEmployeesToAdmin: async (adminId, employeeIds, actorEmpId = null) => {
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('adminId', sql.Int, adminId)
        .query('DELETE FROM dbo.AdminEmployeeMapping WHERE AdminEmpID = @adminId');

      for (const empId of employeeIds) {
        await transaction.request()
          .input('adminId', sql.Int, adminId)
          .input('empId', sql.Int, empId)
          .query('INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID) VALUES (@adminId, @empId)');
      }

      await transaction.request()
        .input('actorEmpId', sql.Int, actorEmpId || adminId)
        .input('adminId', sql.Int, adminId)
        .input('count', sql.Int, employeeIds.length)
        .query(`
          INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
          VALUES (@actorEmpId, 'ADMIN_MAPPING_UPDATE', 'Assigned ' + CAST(@count AS VARCHAR) + ' employees to Admin ID ' + CAST(@adminId AS VARCHAR))
        `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  getAssignedEmployeesForAdmin: async (adminId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('adminId', sql.Int, adminId)
      .query(`
        SELECT EmployeeEmpID AS employeeId FROM dbo.AdminEmployeeMapping WHERE AdminEmpID = @adminId
      `);
    return result.recordset.map(row => row.employeeId);
  },

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

    // Staging Table insert
    for (const row of parsedRows) {
      const legacyEmpId = row['legacy_emp_id'] || row['legacyempid'] || row['emp_num'] || row['employee_id'] || row['id'] || '';
      const email = row['email'] || row['email_address'] || '';
      const firstName = row['first_name'] || row['firstname'] || '';
      const lastName = row['last_name'] || row['lastname'] || '';
      const designation = row['designation'] || row['title'] || '';
      const department = row['department'] || row['dept'] || '';
      const joinDate = row['join_date'] || row['joindate'] || '';
      const phone = row['phone'] || row['phone_number'] || '';
      const role = row['role'] || 'employee';

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

    // Validation
    const stagedRowsResult = await pool.request()
      .input('importSessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT * FROM dbo.Staging_Employees WHERE import_session_id = @importSessionId AND validation_status = 'Pending'`);

    const stagedRows = stagedRowsResult.recordset;
    const seenLegacyIds = new Set();
    const seenEmails = new Set();

    const existingEmployeesResult = await pool.request().query(`
      SELECT m.EmpID AS employee_id, d.EmailID AS email, d.UPPID AS legacy_emp_id
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
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

      if (!legacyId) {
        isValid = false;
        errors.push('LegacyEmpId is missing.');
      } else {
        if (seenLegacyIds.has(legacyId)) {
          isValid = false;
          errors.push(`Duplicate LegacyEmpId '${legacyId}' in CSV.`);
        }
        seenLegacyIds.add(legacyId);
      }

      if (!firstName && !lastName) {
        isValid = false;
        errors.push('First and Last name are required.');
      }

      if (email) {
        if (!EMAIL_REGEX.test(email)) {
          isValid = false;
          errors.push(`Invalid email format: '${email}'`);
        } else {
          if (seenEmails.has(email)) {
            isValid = false;
            errors.push(`Duplicate email '${email}' in CSV.`);
          }
          seenEmails.add(email);

          const existingWithEmail = dbEmployees.find(e => e.email && e.email.toLowerCase() === email.toLowerCase());
          if (existingWithEmail && existingWithEmail.legacy_emp_id !== legacyId) {
            isValid = false;
            errors.push(`Email '${email}' is already registered to employee ID: ${existingWithEmail.employee_id}.`);
          }
        }
      }

      if (!VALID_ROLES.includes(role)) {
        isValid = false;
        errors.push(`Invalid role '${stagedRow.raw_role}'.`);
      }

      let parsedDate = new Date();
      if (joinDateStr) {
        parsedDate = new Date(joinDateStr);
        if (isNaN(parsedDate.getTime())) {
          isValid = false;
          errors.push(`Invalid join date: '${joinDateStr}'.`);
        }
      }

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

    // Merge into production
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

      const prodRecord = dbEmployees.find(e => e.legacy_emp_id === legacyId);

      try {
        if (prodRecord) {
          const empId = prodRecord.employee_id;
          
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

          await pool.request()
            .input('empId', sql.Int, empId)
            .input('email', sql.VarChar, email)
            .input('fullName', sql.VarChar, fullName)
            .input('phone', sql.VarChar, phone)
            .query(`
              UPDATE dbo.EmployeeDetails
              SET EmailID = @email,
                  FullName = @fullName,
                  Phone = @phone
              WHERE EmpID = @empId
            `);

          // Update logins
          const username = email || legacyId;
          await pool.request().input('empId', sql.Int, empId).query(`
            DELETE FROM dbo.AdminLogins WHERE EmpID = @empId;
            DELETE FROM dbo.EmployeeLogins WHERE EmpID = @empId;
          `);

          if (role === 'admin') {
            await pool.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, username)
              .input('role', sql.VarChar, role)
              .query(`
                INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
                VALUES (@empId, @username, NULL, @role, 'Active')
              `);
          } else {
            await pool.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, username)
              .query(`
                INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
                VALUES (@empId, @username, NULL, 'Active')
              `);
          }
          
          stats.updatedCount++;
        } else {
          // New insert
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

          const username = email || legacyId;
          if (role === 'admin') {
            await pool.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, username)
              .input('role', sql.VarChar, role)
              .query(`
                INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
                VALUES (@empId, @username, NULL, @role, 'Active')
              `);
          } else {
            await pool.request()
              .input('empId', sql.Int, empId)
              .input('username', sql.VarChar, username)
              .query(`
                INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
                VALUES (@empId, @username, NULL, 'Active')
              `);
          }

          stats.importedCount++;
        }

        await pool.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Imported', imported_at = GETDATE() WHERE staging_id = @stagingId`);

      } catch (err) {
        console.error(`Failed to merge staging employee ${legacyId}: `, err);
        stats.errorsCount++;
        stats.details.push({
          row: legacyId,
          status: 'Failed to Merge',
          error: err.message
        });

        await pool.request()
          .input('stagingId', sql.Int, validRow.staging_id)
          .input('error', sql.VarChar, `Merge Error: ${err.message}`)
          .query(`UPDATE dbo.Staging_Employees SET validation_status = 'Invalid', validation_error = @error WHERE staging_id = @stagingId`);
      }
    }

    return stats;
  }
};
