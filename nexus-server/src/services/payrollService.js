import { connectDB, sql } from '../config/db.js';

// Helper to determine base salary profile based on role/designation
const getEmployeeSalaryDetails = (employee) => {
  const designation = (employee.designation || '').toLowerCase();
  const role = (employee.role_name || '').toLowerCase();

  let basicSalary = 50000.00;
  let hra = 15000.00;
  let specialAllowance = 5000.00;
  let compOffEncashment = 2000.00;

  if (designation.includes('director') || designation.includes('manager') || role === 'admin') {
    basicSalary = 90000.00;
    hra = 27000.00;
    specialAllowance = 9000.00;
    compOffEncashment = 4000.00;
  } else if (designation.includes('senior') || designation.includes('lead') || designation.includes('warden')) {
    basicSalary = 75000.00;
    hra = 22500.00;
    specialAllowance = 7500.00;
    compOffEncashment = 3000.00;
  } else if (designation.includes('paleontologist') || designation.includes('engineer')) {
    basicSalary = 60000.00;
    hra = 18000.00;
    specialAllowance = 6000.00;
    compOffEncashment = 2500.00;
  }

  return { basicSalary, hra, specialAllowance, compOffEncashment };
};

export const payrollService = {
  /**
   * Run and calculate monthly payroll for all active employees
   */
  calculateMonthlyPayroll: async (month, year) => {
    const pool = await connectDB();
    const stats = {
      month,
      year,
      totalProcessed: 0,
      totalNetSalary: 0.0,
      details: []
    };

    // 1. Get all active employees
    const employeesResult = await pool.request().query(`
      SELECT m.EmpID AS employee_id, m.FirstName AS first_name, m.LastName AS last_name, m.Designation AS designation, a.Role AS role_name,
             d.BankName AS bank_name, d.BankAccountNo AS bank_account_no, d.IFSCCode AS ifsc, d.UPPID AS legacy_emp_id
      FROM dbo.EmployeeMaster m
      LEFT JOIN dbo.EmployeeDetails d ON m.EmpID = d.EmpID
      LEFT JOIN dbo.AdminLogins a ON m.EmpID = a.EmpID
      WHERE m.EmpStatus = 'Active'
    `);
    const employees = employeesResult.recordset;

    // 2. Fetch approved unpaid leaves that overlap with the target month/year
    const leavesResult = await pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .query(`
        SELECT EmpID AS employee_id, FromDate AS start_date, ToDate AS end_date
        FROM dbo.EmployeeLeaveDetails
        WHERE LeaveStatus = 'Approved' 
          AND LeaveType = 'Unpaid Leave'
          AND (
            (YEAR(FromDate) = @year AND MONTH(FromDate) = @month) OR
            (YEAR(ToDate) = @year AND MONTH(ToDate) = @month) OR
            (FromDate < DATEFROMPARTS(@year, @month, 1) AND ToDate > EOMONTH(DATEFROMPARTS(@year, @month, 1)))
          )
      `);
    const leaves = leavesResult.recordset;

    // 3. Process payroll for each employee
    for (const emp of employees) {
      const { basicSalary, hra, specialAllowance, compOffEncashment } = getEmployeeSalaryDetails(emp);
      const allowances = hra + specialAllowance + compOffEncashment;

      // Find overlapping unpaid leave days
      let unpaidDays = 0;
      const empLeaves = leaves.filter(l => l.employee_id === emp.employee_id);

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0); // last day of month

      empLeaves.forEach(leave => {
        let overlapStart = new Date(leave.start_date);
        let overlapEnd = new Date(leave.end_date);

        if (overlapStart < startOfMonth) overlapStart = startOfMonth;
        if (overlapEnd > endOfMonth) overlapEnd = endOfMonth;

        const days = Math.max(0, Math.floor((overlapEnd - overlapStart) / (1000 * 3600 * 24)) + 1);
        unpaidDays += days;
      });

      // Calculate working days & total earnings
      const monthlyWorkingDays = endOfMonth.getDate();
      const employeeWorkingDays = Math.max(0, monthlyWorkingDays - unpaidDays);
      const totalEarnings = basicSalary + hra + specialAllowance + compOffEncashment;

      // Legacy Formulas:
      // PF = TotalEarnings * 12%
      // PT = TotalEarnings * 0.4%
      // LOP = (MonthlyWorkingDays - EmployeeWorkingDays) * (TotalEarnings / MonthlyWorkingDays)
      const pf = parseFloat((totalEarnings * 0.12).toFixed(2));
      const pt = parseFloat((totalEarnings * 0.004).toFixed(2));
      const lop = parseFloat(((monthlyWorkingDays - employeeWorkingDays) * (totalEarnings / monthlyWorkingDays)).toFixed(2));
      const totalDeductions = parseFloat((pf + pt + lop).toFixed(2));
      const netSalary = Math.max(0, parseFloat((totalEarnings - totalDeductions).toFixed(2)));

      // Check if payroll already exists for this period
      const checkResult = await pool.request()
        .input('employeeId', sql.Int, emp.employee_id)
        .input('month', sql.VarChar, String(month))
        .input('year', sql.Int, year)
        .query('SELECT SalaryID FROM dbo.EmployeeSalarysDetails WHERE EmpID = @employeeId AND SalaryMonth = @month AND SalaryYear = @year');

      let payrollId;
      if (checkResult.recordset.length > 0) {
        payrollId = checkResult.recordset[0].SalaryID;
        // Update existing record
        await pool.request()
          .input('payrollId', sql.Int, payrollId)
          .input('basic', sql.Decimal(10, 2), basicSalary)
          .input('hra', sql.Decimal(10, 2), hra)
          .input('specialAllowance', sql.Decimal(10, 2), specialAllowance)
          .input('compOffEncashment', sql.Decimal(10, 2), compOffEncashment)
          .input('totalEarnings', sql.Decimal(10, 2), totalEarnings)
          .input('pf', sql.Decimal(10, 2), pf)
          .input('pt', sql.Decimal(10, 2), pt)
          .input('lop', sql.Decimal(10, 2), lop)
          .input('monthlyDays', sql.Int, monthlyWorkingDays)
          .input('employeeDays', sql.Int, employeeWorkingDays)
          .input('deductions', sql.Decimal(10, 2), totalDeductions)
          .input('net', sql.Decimal(10, 2), netSalary)
          .input('bankName', sql.VarChar, emp.bank_name || null)
          .input('bankAccountNo', sql.VarChar, emp.bank_account_no || null)
          .input('ifsc', sql.VarChar, emp.ifsc || null)
          .query(`
            UPDATE dbo.EmployeeSalarysDetails
            SET BasicSalary = @basic, 
                HouseRentAllowance = @hra,
                SpecialAllowance = @specialAllowance,
                CompOffEncashment = @compOffEncashment,
                TotalEarnings = @totalEarnings,
                ProvidentFund = @pf, 
                ProfessionalTax = @pt, 
                LossOfPay = CAST(@lop AS INT), 
                DaysInMonth = @monthlyDays, 
                DaysPaid = @employeeDays, 
                TotalDeductions = @deductions, 
                NetSalaryPaid = @net,
                BankName = @bankName,
                BankAccountNo = @bankAccountNo,
                IFSC = @ifsc
            WHERE SalaryID = @payrollId
          `);
      } else {
        // Insert new record
        const insertResult = await pool.request()
          .input('employeeId', sql.Int, emp.employee_id)
          .input('month', sql.VarChar, String(month))
          .input('year', sql.Int, year)
          .input('basic', sql.Decimal(10, 2), basicSalary)
          .input('hra', sql.Decimal(10, 2), hra)
          .input('specialAllowance', sql.Decimal(10, 2), specialAllowance)
          .input('compOffEncashment', sql.Decimal(10, 2), compOffEncashment)
          .input('totalEarnings', sql.Decimal(10, 2), totalEarnings)
          .input('pf', sql.Decimal(10, 2), pf)
          .input('pt', sql.Decimal(10, 2), pt)
          .input('lop', sql.Decimal(10, 2), lop)
          .input('monthlyDays', sql.Int, monthlyWorkingDays)
          .input('employeeDays', sql.Int, employeeWorkingDays)
          .input('deductions', sql.Decimal(10, 2), totalDeductions)
          .input('net', sql.Decimal(10, 2), netSalary)
          .input('bankName', sql.VarChar, emp.bank_name || null)
          .input('bankAccountNo', sql.VarChar, emp.bank_account_no || null)
          .input('ifsc', sql.VarChar, emp.ifsc || null)
          .query(`
            INSERT INTO dbo.EmployeeSalarysDetails (
              EmpID, DaysPaid, DaysInMonth, LossOfPay, SalaryMonth, SalaryYear,
              BasicSalary, HouseRentAllowance, SpecialAllowance, ProvidentFund, ProfessionalTax,
              TotalEarnings, TotalDeductions, NetSalaryPaid, BankName, BankAccountNo, IFSC,
              CompOffEncashment, PaymentStatus
            )
            OUTPUT inserted.SalaryID
            VALUES (
              @employeeId, @employeeDays, @monthlyDays, CAST(@lop AS INT), @month, @year,
              @basic, @hra, @specialAllowance, @pf, @pt,
              @totalEarnings, @deductions, @net, @bankName, @bankAccountNo, @ifsc,
              @compOffEncashment, 'Unpaid'
            )
          `);
        payrollId = insertResult.recordset[0].SalaryID;
      }

      stats.totalProcessed++;
      stats.totalNetSalary += netSalary;
      stats.details.push({
        employeeId: emp.employee_id,
        name: `${emp.first_name} ${emp.last_name}`,
        basicSalary,
        allowances,
        hra,
        specialAllowance,
        compOffEncashment,
        totalEarnings,
        pf,
        pt,
        lop,
        monthlyWorkingDays,
        employeeWorkingDays,
        deductions: totalDeductions,
        unpaidDays,
        netSalary,
        payrollId
      });
    }

    return stats;
  },

  /**
   * Get payroll history (filtered by employeeId if requested, or all for admin)
   */
  getPayrollHistory: async (employeeId, month, year) => {
    const pool = await connectDB();
    let query = `
      SELECT p.SalaryID AS payroll_id, p.EmpID AS employee_id, CAST(p.SalaryMonth AS INT) AS month, p.SalaryYear AS year,
             p.BasicSalary AS basic_salary, (p.HouseRentAllowance + p.SpecialAllowance + p.CompOffEncashment) AS allowances, 
             p.HouseRentAllowance AS hra, p.SpecialAllowance AS special_allowance, p.CompOffEncashment AS comp_off_encashment, p.TotalEarnings AS total_earnings,
             p.ProvidentFund AS pf, p.ProfessionalTax AS pt, CAST(p.LossOfPay AS DECIMAL(10,2)) AS lop, p.DaysInMonth AS monthly_working_days, p.DaysPaid AS employee_working_days,
             p.TotalDeductions AS deductions, p.NetSalaryPaid AS net_salary, p.PaymentStatus AS payment_status, p.PaymentDate AS payment_date,
             e.FirstName AS first_name, e.LastName AS last_name, d.UPPID AS legacy_emp_id, e.Designation AS designation, e.Department AS department
      FROM dbo.EmployeeSalarysDetails p
      JOIN dbo.EmployeeMaster e ON p.EmpID = e.EmpID
      LEFT JOIN dbo.EmployeeDetails d ON e.EmpID = d.EmpID
    `;

    const request = pool.request();
    const clauses = [];

    if (employeeId) {
      clauses.push(`p.EmpID = @employeeId`);
      request.input('employeeId', sql.Int, employeeId);
    }
    if (month) {
      clauses.push(`p.SalaryMonth = @month`);
      request.input('month', sql.VarChar, String(month));
    }
    if (year) {
      clauses.push(`p.SalaryYear = @year`);
      request.input('year', sql.Int, year);
    }

    if (clauses.length > 0) {
      query += ` WHERE ` + clauses.join(' AND ');
    }

    query += ` ORDER BY p.SalaryYear DESC, CAST(p.SalaryMonth AS INT) DESC, e.LastName ASC`;
    const result = await request.query(query);
    return result.recordset;
  },

  /**
   * Get single payslip details (with ownership checks)
   */
  getPayslip: async (payrollId, employeeId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('payrollId', sql.Int, payrollId)
      .query(`
        SELECT p.SalaryID AS payroll_id, p.EmpID AS employee_id, CAST(p.SalaryMonth AS INT) AS month, p.SalaryYear AS year,
               p.BasicSalary AS basic_salary, (p.HouseRentAllowance + p.SpecialAllowance + p.CompOffEncashment) AS allowances, 
               p.HouseRentAllowance AS hra, p.SpecialAllowance AS special_allowance, p.CompOffEncashment AS comp_off_encashment, p.TotalEarnings AS total_earnings,
               p.ProvidentFund AS pf, p.ProfessionalTax AS pt, CAST(p.LossOfPay AS DECIMAL(10,2)) AS lop, p.DaysInMonth AS monthly_working_days, p.DaysPaid AS employee_working_days,
               p.TotalDeductions AS deductions, p.NetSalaryPaid AS net_salary, p.PaymentStatus AS payment_status, p.PaymentDate AS payment_date,
               e.FirstName AS first_name, e.LastName AS last_name, d.UPPID AS legacy_emp_id, e.Designation AS designation, e.Department AS department, d.Phone AS phone, e.DOJ AS join_date,
               p.PFNo AS pf_no, p.IFSC AS ifsc, p.BankName AS bank_name, p.BankAccountNo AS bank_account_no, p.ITPAN AS pan
        FROM dbo.EmployeeSalarysDetails p
        JOIN dbo.EmployeeMaster e ON p.EmpID = e.EmpID
        LEFT JOIN dbo.EmployeeDetails d ON e.EmpID = d.EmpID
        WHERE p.SalaryID = @payrollId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Payslip not found.');
    }

    const payslip = result.recordset[0];

    // Enforce ownership if employeeId is passed
    if (employeeId && payslip.employee_id !== employeeId) {
      throw new Error('Unauthorized access to this payslip.');
    }

    // Retrieve approved unpaid leave count for transparency
    const leaveResult = await pool.request()
      .input('employeeId', sql.Int, payslip.employee_id)
      .input('month', sql.Int, payslip.month)
      .input('year', sql.Int, payslip.year)
      .query(`
        SELECT SUM(DATEDIFF(day, FromDate, ToDate) + 1) AS approved_days
        FROM dbo.EmployeeLeaveDetails
        WHERE EmpID = @employeeId 
          AND LeaveStatus = 'Approved' 
          AND LeaveType = 'Unpaid Leave'
          AND (
            (YEAR(FromDate) = @year AND MONTH(FromDate) = @month) OR
            (YEAR(ToDate) = @year AND MONTH(ToDate) = @month)
          )
      `);

    payslip.unpaidDays = leaveResult.recordset[0].approved_days || 0;
    return payslip;
  },

  /**
   * Update payment status of a payroll record (Admin only)
   */
  updatePaymentStatus: async (payrollId, status) => {
    if (status !== 'Paid' && status !== 'Unpaid' && status !== 'Processing') {
      throw new Error('Invalid payment status.');
    }

    const pool = await connectDB();
    const result = await pool.request()
      .input('payrollId', sql.Int, payrollId)
      .input('status', sql.VarChar, status)
      .input('paymentDate', sql.Date, status === 'Paid' ? new Date() : null)
      .query(`
        UPDATE dbo.EmployeeSalarysDetails
        SET PaymentStatus = @status,
            PaymentDate = @paymentDate
        OUTPUT inserted.SalaryID AS payroll_id, inserted.PaymentStatus AS payment_status, inserted.PaymentDate AS payment_date
        WHERE SalaryID = @payrollId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Payroll record not found.');
    }

    return result.recordset[0];
  }
};
