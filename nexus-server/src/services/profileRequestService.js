import { connectDB, sql } from '../config/db.js';

export const profileRequestService = {
  createRequest: async (empId, requestedData) => {
    if (!requestedData || Object.keys(requestedData).length === 0) {
      throw new Error('No profile data provided for request.');
    }

    const pool = await connectDB();
    const dataJson = JSON.stringify(requestedData);

    const result = await pool.request()
      .input('empId', sql.Int, empId)
      .input('requestedData', sql.VarChar(sql.MAX), dataJson)
      .query(`
        INSERT INTO dbo.EmployeeProfileChangeRequests (EmpID, RequestedData, Status)
        OUTPUT inserted.RequestID AS id
        VALUES (@empId, @requestedData, 'Pending')
      `);

    // Log to AuditLogs
    await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@empId, 'PROFILE_REQ_SUBMIT', 'Submitted a profile change request for approval.')
      `);

    return result.recordset[0].id;
  },

  getPendingRequests: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT r.RequestID AS id, r.EmpID AS empId, r.RequestedData AS requestedData,
             r.Status AS status, r.RequestedAt AS requestedAt,
             m.FirstName + ' ' + m.LastName AS employeeName,
             d.EmailID AS employeeEmail
      FROM dbo.EmployeeProfileChangeRequests r
      JOIN dbo.EmployeeMaster m ON r.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      WHERE r.Status = 'Pending'
      ORDER BY r.RequestedAt DESC
    `);
    
    return result.recordset.map(row => ({
      ...row,
      requestedData: JSON.parse(row.requestedData)
    }));
  },

  getAllRequests: async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT r.RequestID AS id, r.EmpID AS empId, r.RequestedData AS requestedData,
             r.Status AS status, r.Reason AS reason, r.RequestedAt AS requestedAt,
             r.ProcessedAt AS processedAt,
             m.FirstName + ' ' + m.LastName AS employeeName,
             d.EmailID AS employeeEmail,
             p.FirstName + ' ' + p.LastName AS processedByName
      FROM dbo.EmployeeProfileChangeRequests r
      JOIN dbo.EmployeeMaster m ON r.EmpID = m.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.EmployeeMaster p ON r.ProcessedBy = p.EmpID
      ORDER BY r.RequestedAt DESC
    `);
    
    return result.recordset.map(row => ({
      ...row,
      requestedData: JSON.parse(row.requestedData)
    }));
  },

  processRequest: async (requestId, status, reason, adminEmpId) => {
    if (!['Approved', 'Rejected'].includes(status)) {
      throw new Error('Invalid status. Must be Approved or Rejected.');
    }

    const pool = await connectDB();

    // 1. Get the request
    const reqResult = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT EmpID, RequestedData, Status 
        FROM dbo.EmployeeProfileChangeRequests 
        WHERE RequestID = @requestId
      `);

    if (reqResult.recordset.length === 0) {
      throw new Error('Profile change request not found.');
    }

    const request = reqResult.recordset[0];
    if (request.Status !== 'Pending') {
      throw new Error('Request has already been processed.');
    }

    const targetEmpId = request.EmpID;

    if (status === 'Approved') {
      const parsedData = JSON.parse(request.RequestedData);

      // Begin transaction to apply changes
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Update EmployeeMaster fields (FirstName, LastName) if provided
        if (parsedData.firstName !== undefined || parsedData.lastName !== undefined) {
          const reqMaster = transaction.request()
            .input('empId', sql.Int, targetEmpId)
            .input('firstName', sql.VarChar, parsedData.firstName || null)
            .input('lastName', sql.VarChar, parsedData.lastName || null);
          
          await reqMaster.query(`
            UPDATE dbo.EmployeeMaster
            SET FirstName = COALESCE(@firstName, FirstName),
                LastName = COALESCE(@lastName, LastName)
            WHERE EmpID = @empId
          `);
        }

        // Update EmployeeDetails fields if provided
        const detailsFields = [
          'fullName', 'dob', 'gender', 'address', 'phone', 'email', 'personalEmail',
          'maritalStatus', 'nationality', 'employmentType',
          'aadharNo', 'panNo', 'uanNo', 'emergencyContactName', 'emergencyContactPhone',
          'bankName', 'bankAccountNo', 'ifscCode'
        ];

        // Construct dynamic UPDATE statement for EmployeeDetails
        let setClauses = [];
        const reqDetails = transaction.request().input('empId', sql.Int, targetEmpId);

        if (parsedData.firstName !== undefined || parsedData.lastName !== undefined) {
          // If name changes, update fullName as well
          const nameResult = await transaction.request()
            .input('empId', sql.Int, targetEmpId)
            .query('SELECT FirstName, LastName FROM dbo.EmployeeMaster WHERE EmpID = @empId');
          const emp = nameResult.recordset[0];
          const fName = parsedData.firstName !== undefined ? parsedData.firstName : emp.FirstName;
          const lName = parsedData.lastName !== undefined ? parsedData.lastName : emp.LastName;
          parsedData.fullName = `${fName || ''} ${lName || ''}`.trim();
        }

        for (const field of detailsFields) {
          if (parsedData[field] !== undefined) {
            // Map camelCase fields to SQL Server columns
            let colName = field;
            if (field === 'email') colName = 'EmailID';
            else if (field === 'ifscCode') colName = 'IFSCCode';
            else if (field === 'dob') colName = 'DOB';
            else {
              // Capitalize first letter (e.g. phone -> Phone, aadharNo -> AadharNo)
              colName = field.charAt(0).toUpperCase() + field.slice(1);
            }
            reqDetails.input(field, parsedData[field] || null);
            setClauses.push(`${colName} = @${field}`);
          }
        }

        if (setClauses.length > 0) {
          await reqDetails.query(`
            UPDATE dbo.EmployeeDetails
            SET ${setClauses.join(', ')}
            WHERE EmpID = @empId
          `);
        }

        // If email or status is changed, check if credentials table needs update
        const emailVal = parsedData.email;
        if (emailVal) {
          await transaction.request()
            .input('empId', sql.Int, targetEmpId)
            .input('username', sql.VarChar, emailVal)
            .query(`
              -- Update AdminLogins if exists
              UPDATE dbo.AdminLogins SET Username = @username WHERE EmpID = @empId;
              -- Update EmployeeLogins if exists
              UPDATE dbo.EmployeeLogins SET Username = @username WHERE EmpID = @empId;
            `);
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }

    // 2. Update the Request status
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('status', sql.VarChar, status)
      .input('reason', sql.VarChar, reason || null)
      .input('adminEmpId', sql.Int, adminEmpId)
      .query(`
        UPDATE dbo.EmployeeProfileChangeRequests
        SET Status = @status,
            Reason = @reason,
            ProcessedBy = @adminEmpId,
            ProcessedAt = GETDATE()
        WHERE RequestID = @requestId
      `);

    // 3. Log to AuditLogs
    await pool.request()
      .input('adminEmpId', sql.Int, adminEmpId)
      .input('requestId', sql.Int, requestId)
      .input('status', sql.VarChar, status)
      .input('targetEmpId', sql.Int, targetEmpId)
      .query(`
        INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
        VALUES (@adminEmpId, 'PROFILE_REQ_RESOLVE', 'Resolved change request ID ' + CAST(@requestId AS VARCHAR) + ' to ' + @status + ' for employee ID ' + CAST(@targetEmpId AS VARCHAR))
      `);

    // 4. Send notification to employee
    await pool.request()
      .input('targetEmpId', sql.Int, targetEmpId)
      .input('title', sql.VarChar, `Profile Update Request ${status}`)
      .input('message', sql.VarChar, `Your profile change request has been ${status.toLowerCase()}.${reason ? ' Remarks: ' + reason : ''}`)
      .query(`
        INSERT INTO dbo.Notifications (EmpID, Title, Message)
        VALUES (@targetEmpId, @title, @message)
      `);

    return true;
  }
};
