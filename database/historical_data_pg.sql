-- ==================================================
-- NEXUS HRMS: SEED HISTORICAL DATA (POSTGRESQL)
-- ==================================================

DO $$
DECLARE
    month_val INT;
    year_val INT;
    run_id_val INT;
    admin_id_val INT;
    emp_rec RECORD;
    basic_val DECIMAL(10,2);
    net_val DECIMAL(10,2);
    total_emp INT;
    total_pay DECIMAL(18,2);
    total_gross DECIMAL(18,2);
    total_pf DECIMAL(18,2);
    day_val INT;
    run_date_val DATE;
    current_idx INT;
BEGIN
    -- Get first active employee to act as admin
    SELECT EmpID INTO admin_id_val FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active' LIMIT 1;

    -- Loop through Jan 2024 to May 2024
    FOR current_idx IN 1..5 LOOP
        year_val := 2024;
        month_val := current_idx;
        run_date_val := (year_val || '-' || month_val || '-28')::DATE;

        -- Check if run exists
        IF NOT EXISTS (SELECT 1 FROM dbo.PayrollRuns WHERE SalaryMonth = month_val AND SalaryYear = year_val AND Status = 'Released') THEN
            
            -- Insert Payroll Run
            INSERT INTO dbo.PayrollRuns (SalaryMonth, SalaryYear, GeneratedBy, ApprovedBy, ReleasedBy, RunDate, ApprovedDate, ReleasedAt, Status, Version)
            VALUES (month_val, year_val, admin_id_val, admin_id_val, admin_id_val, run_date_val::TIMESTAMP, run_date_val::TIMESTAMP, run_date_val::TIMESTAMP, 'Released', 1)
            RETURNING RunID INTO run_id_val;

            -- Loop through active employees
            FOR emp_rec IN (SELECT EmpID, Department FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active') LOOP
                
                -- Generate 20 days of present attendance
                FOR day_val IN 1..20 LOOP
                    IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeAttendance WHERE EmpID = emp_rec.EmpID AND AttendanceDate = (year_val || '-' || month_val || '-' || day_val)::DATE) THEN
                        INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, TotalHours)
                        VALUES (emp_rec.EmpID, (year_val || '-' || month_val || '-' || day_val)::DATE, 'Present', 8.00);
                    END IF;
                END LOOP;

                -- Fixed basic salary for historical data simulation
                basic_val := 50000.00;
                net_val := basic_val + (basic_val * 0.4) + (basic_val * 0.1) - (basic_val * 0.12) - 200.00;

                -- Insert Salary Detail
                INSERT INTO dbo.EmployeeSalarysDetails (
                    EmpID, RunID, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance,
                    ConveyanceAllowance, OtherAllowance, TotalEarnings, ProvidentFund, ProfessionalTax, TDS,
                    TotalDeductions, NetSalaryPaid, PaymentStatus, PaymentDate,
                    DaysInMonth, DaysPaid, LossOfPay, SalaryMonth, SalaryYear
                )
                VALUES (
                    emp_rec.EmpID, run_id_val, basic_val, basic_val * 0.40, basic_val * 0.10, 0.00,
                    0.00, 0.00, basic_val + (basic_val * 0.40) + (basic_val * 0.10), basic_val * 0.12, 200.00, 0.00,
                    (basic_val * 0.12) + 200.00, net_val, 'Paid', run_date_val,
                    30, 28, 2, month_val::VARCHAR, year_val
                );

            END LOOP;

            -- Calculate summary numbers
            SELECT COUNT(*) INTO total_emp FROM dbo.EmployeeSalarysDetails WHERE RunID = run_id_val;
            SELECT SUM(NetSalaryPaid) INTO total_pay FROM dbo.EmployeeSalarysDetails WHERE RunID = run_id_val;
            SELECT SUM(TotalEarnings) INTO total_gross FROM dbo.EmployeeSalarysDetails WHERE RunID = run_id_val;
            SELECT SUM(ProvidentFund) INTO total_pf FROM dbo.EmployeeSalarysDetails WHERE RunID = run_id_val;

            -- Insert Summary record
            INSERT INTO dbo.PayrollRunSummary (RunID, TotalEmployees, EmployeesProcessed, EmployeesSkipped, GrossAmount, TotalPF, TotalPT, TotalTDS, TotalLOP, NetPayable, ExceptionsCount)
            VALUES (run_id_val, total_emp, total_emp, 0, total_gross, total_pf, 200.00 * total_emp, 0.00, 0.00, total_pay, 0);

        END IF;
    END LOOP;
END $$;
