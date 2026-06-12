-- Seed Historical Data (Jan 2024 to May 2024)
USE NexusHRMS;
GO

SET NOCOUNT ON;

DECLARE @Months TABLE (Id INT IDENTITY(1,1), M INT, Y INT);
INSERT INTO @Months (M, Y) VALUES (1, 2024), (2, 2024), (3, 2024), (4, 2024), (5, 2024);

DECLARE @TotalMonths INT = 5;
DECLARE @CurrentMonthIdx INT = 1;

DECLARE @Month INT, @Year INT;
DECLARE @RunID INT;
DECLARE @EmpID INT, @Basic DECIMAL(10,2), @Dept VARCHAR(100);
DECLARE @Net DECIMAL(10,2);
DECLARE @AdminID INT = (SELECT TOP 1 EmpID FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active');

WHILE @CurrentMonthIdx <= @TotalMonths
BEGIN
    SELECT @Month = M, @Year = Y FROM @Months WHERE Id = @CurrentMonthIdx;

    -- Check if run exists
    IF NOT EXISTS(SELECT 1 FROM dbo.PayrollRuns WHERE SalaryMonth = @Month AND SalaryYear = @Year AND Status = 'Released')
    BEGIN
        INSERT INTO dbo.PayrollRuns (SalaryMonth, SalaryYear, GeneratedBy, ApprovedBy, ReleasedBy, RunDate, ApprovedDate, ReleasedAt, Status, Version)
        VALUES (@Month, @Year, @AdminID, @AdminID, @AdminID, DATEFROMPARTS(@Year, @Month, 28), DATEFROMPARTS(@Year, @Month, 28), DATEFROMPARTS(@Year, @Month, 28), 'Released', 1);

        SET @RunID = SCOPE_IDENTITY();

        -- Add salaries
        DECLARE emp_cursor CURSOR FOR 
        SELECT EmpID, Department FROM dbo.EmployeeMaster WHERE EmpStatus = 'Active';

        OPEN emp_cursor;
        FETCH NEXT FROM emp_cursor INTO @EmpID, @Dept;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Generate fake attendance (just insert 20 "Present" days)
            DECLARE @Day INT = 1;
            WHILE @Day <= 20
            BEGIN
                IF NOT EXISTS(SELECT 1 FROM dbo.EmployeeAttendance WHERE EmpID = @EmpID AND AttendanceDate = DATEFROMPARTS(@Year, @Month, @Day))
                BEGIN
                    INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, TotalHours)
                    VALUES (@EmpID, DATEFROMPARTS(@Year, @Month, @Day), 'Present', 8);
                END
                SET @Day = @Day + 1;
            END

            -- Get base salary from EmployeeSalarys if exists or use a default
            SET @Basic = NULL;
            SET @Basic = 50000;

            SET @Net = @Basic + (@Basic * 0.4) + (@Basic * 0.1) - (@Basic * 0.12) - 200;

            INSERT INTO dbo.EmployeeSalarysDetails (
                EmpID, RunID, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance,
                ConveyanceAllowance, OtherAllowance, TotalEarnings, ProvidentFund, ProfessionalTax, TDS,
                TotalDeductions, NetSalaryPaid, PaymentStatus, PaymentDate,
                DaysInMonth, DaysPaid, LossOfPay, SalaryMonth, SalaryYear
            )
            VALUES (
                @EmpID, @RunID, @Basic, @Basic * 0.4, @Basic * 0.1, 0,
                0, 0, @Basic + (@Basic * 0.4) + (@Basic * 0.1), @Basic * 0.12, 200, 0,
                (@Basic * 0.12) + 200, @Net, 'Paid', DATEFROMPARTS(@Year, @Month, 28),
                30, 28, 2, CAST(@Month AS VARCHAR(10)), CAST(@Year AS VARCHAR(10))
            );

            FETCH NEXT FROM emp_cursor INTO @EmpID, @Dept;
        END

        CLOSE emp_cursor;
        DEALLOCATE emp_cursor;

        -- Add Summary
        DECLARE @TotalEmp INT = (SELECT COUNT(*) FROM dbo.EmployeeSalarysDetails WHERE RunID = @RunID);
        DECLARE @TotalPay DECIMAL(18,2) = (SELECT SUM(NetSalaryPaid) FROM dbo.EmployeeSalarysDetails WHERE RunID = @RunID);
        DECLARE @TotalGross DECIMAL(18,2) = (SELECT SUM(TotalEarnings) FROM dbo.EmployeeSalarysDetails WHERE RunID = @RunID);
        DECLARE @TotalPF DECIMAL(18,2) = (SELECT SUM(ProvidentFund) FROM dbo.EmployeeSalarysDetails WHERE RunID = @RunID);

        INSERT INTO dbo.PayrollRunSummary (RunID, TotalEmployees, EmployeesProcessed, EmployeesSkipped, GrossAmount, TotalPF, TotalPT, TotalTDS, TotalLOP, NetPayable, ExceptionsCount)
        VALUES (@RunID, @TotalEmp, @TotalEmp, 0, @TotalGross, @TotalPF, 200 * @TotalEmp, 0, 0, @TotalPay, 0);
    END

    SET @CurrentMonthIdx = @CurrentMonthIdx + 1;
END

PRINT 'Historical data seeded successfully!';
GO
