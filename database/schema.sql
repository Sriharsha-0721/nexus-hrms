-- ==================================================
-- DROP TABLES IN CORRECT REVERSE ORDER OF DEPENDENCY
-- ==================================================
IF OBJECT_ID('dbo.Staging_Employees', 'U') IS NOT NULL DROP TABLE dbo.Staging_Employees;
IF OBJECT_ID('dbo.EmployeeSalarysDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeSalarysDetails;
IF OBJECT_ID('dbo.EmployeeLogDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeLogDetails;
IF OBJECT_ID('dbo.EmployeeLeaveDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeLeaveDetails;
IF OBJECT_ID('dbo.EmployeeAttendance', 'U') IS NOT NULL DROP TABLE dbo.EmployeeAttendance;
IF OBJECT_ID('dbo.AdminLogins', 'U') IS NOT NULL DROP TABLE dbo.AdminLogins;
IF OBJECT_ID('dbo.EmployeeDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeDetails;
IF OBJECT_ID('dbo.EmployeeMaster', 'U') IS NOT NULL DROP TABLE dbo.EmployeeMaster;
-- Also drop old tables if they exist
IF OBJECT_ID('dbo.Payroll', 'U') IS NOT NULL DROP TABLE dbo.Payroll;
IF OBJECT_ID('dbo.Leaves', 'U') IS NOT NULL DROP TABLE dbo.Leaves;
IF OBJECT_ID('dbo.Attendance', 'U') IS NOT NULL DROP TABLE dbo.Attendance;
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL DROP TABLE dbo.Employees;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

-- 1. EmployeeMaster Table
CREATE TABLE dbo.EmployeeMaster (
    EmpID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName VARCHAR(40) NOT NULL,
    LastName VARCHAR(40) NOT NULL,
    DOJ DATE NOT NULL DEFAULT GETDATE(),
    Designation VARCHAR(200) NULL,
    Department VARCHAR(100) NULL,
    EmpStatus VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (EmpStatus IN ('Active', 'Inactive'))
);
GO

-- 2. EmployeeDetails Table
CREATE TABLE dbo.EmployeeDetails (
    EmpID INT PRIMARY KEY FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    FullName VARCHAR(100) NULL,
    DOB DATE NULL,
    Gender VARCHAR(20) NULL,
    Address VARCHAR(200) NULL,
    Phone VARCHAR(30) NULL,
    EmailID VARCHAR(100) NULL,
    BankName VARCHAR(100) NULL,
    BankAccountNo VARCHAR(40) NULL,
    IFSCCode VARCHAR(40) NULL,
    UPPID VARCHAR(100) NULL
);
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Create index on EmailID to allow quick lookup
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_EmailID
ON dbo.EmployeeDetails(EmailID)
WHERE EmailID IS NOT NULL;
GO

-- Create index on UPPID to allow quick lookup
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_UPPID
ON dbo.EmployeeDetails(UPPID)
WHERE UPPID IS NOT NULL;
GO

-- 3. AdminLogins Table
CREATE TABLE dbo.AdminLogins (
    AppUserID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NULL,
    Role VARCHAR(50) NOT NULL DEFAULT 'employee',
    LastLogin DATETIME NULL,
    UserStatus VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (UserStatus IN ('Active', 'Inactive'))
);
GO

-- 4. EmployeeAttendance Table
CREATE TABLE dbo.EmployeeAttendance (
    AttendanceID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    AttendanceDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    AttendanceStatus VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (AttendanceStatus IN ('Present', 'Absent', 'Late', 'Half Day', 'On Leave')),
    CheckInTime DATETIME NULL,
    CheckOutTime DECIMAL(5,2) NULL,
    ClockIn TIME NULL,
    ClockOut TIME NULL,
    TotalHours DECIMAL(5,2) NULL,
    CONSTRAINT UQ_Employee_Attendance_Date UNIQUE (EmpID, AttendanceDate)
);
GO

-- 5. EmployeeLeaveDetails Table
CREATE TABLE dbo.EmployeeLeaveDetails (
    LeaveID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    LeaveType VARCHAR(50) NOT NULL CHECK (LeaveType IN ('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave')),
    FromDate DATE NOT NULL,
    ToDate DATE NOT NULL,
    LeaveStatus VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (LeaveStatus IN ('Pending', 'Approved', 'Rejected')),
    LeaveDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    LeaveReason VARCHAR(500) NULL,
    LeaveDays INT NULL,
    LeaveStartDate DATE NULL,
    LeaveEndDate DATE NULL,
    TotalDays INT NULL,
    IsPaidLeave VARCHAR(20) NULL,
    EmpStatus VARCHAR(20) NULL,
    ApprovedBy INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    CONSTRAINT CK_Leave_Dates CHECK (FromDate <= ToDate)
);
GO

-- 6. EmployeeLogDetails Table
CREATE TABLE dbo.EmployeeLogDetails (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    LogDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    TotalHours DECIMAL(5,2) NULL,
    LoginTime VARCHAR(20) NULL,
    LogoutTime VARCHAR(20) NULL
);
GO

-- 7. EmployeeSalarysDetails Table
CREATE TABLE dbo.EmployeeSalarysDetails (
    SalaryID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    DaysPaid INT NOT NULL DEFAULT 30 CHECK (DaysPaid >= 0),
    DaysInMonth INT NOT NULL DEFAULT 30 CHECK (DaysInMonth > 0),
    LossOfPay INT NOT NULL DEFAULT 0 CHECK (LossOfPay >= 0),
    ITPAN VARCHAR(20) NULL,
    SalaryMonth VARCHAR(20) NOT NULL,
    SalaryYear INT NOT NULL,
    BasicSalary DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (BasicSalary >= 0),
    HouseRentAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (HouseRentAllowance >= 0),
    SpecialAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (SpecialAllowance >= 0),
    MedicalAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (MedicalAllowance >= 0),
    ConveyanceAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (ConveyanceAllowance >= 0),
    OtherAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (OtherAllowance >= 0),
    ProvidentFund DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (ProvidentFund >= 0),
    HealthInsurance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (HealthInsurance >= 0),
    ProfessionalTax DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (ProfessionalTax >= 0),
    TDS DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (TDS >= 0),
    TotalEarnings DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (TotalEarnings >= 0),
    TotalDeductions DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (TotalDeductions >= 0),
    NetSalaryPaid DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (NetSalaryPaid >= 0),
    PaymentMode VARCHAR(20) NULL,
    TransactionRef VARCHAR(50) NULL,
    PaymentDate DATE NULL,
    PFNo VARCHAR(20) NULL,
    IFSC VARCHAR(20) NULL,
    BankName VARCHAR(100) NULL,
    BankAccountNo VARCHAR(40) NULL,
    CompOffEncashment DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (CompOffEncashment >= 0),
    PaymentStatus VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (PaymentStatus IN ('Paid', 'Unpaid', 'Processing')),
    CONSTRAINT UQ_Employee_Salary_Period UNIQUE (EmpID, SalaryMonth, SalaryYear)
);
GO

-- 8. Staging Employees Table for CSV Import Validation
CREATE TABLE dbo.Staging_Employees (
    staging_id INT IDENTITY(1,1) PRIMARY KEY,
    import_session_id UNIQUEIDENTIFIER NOT NULL,
    raw_legacy_emp_id VARCHAR(100) NULL,
    raw_email VARCHAR(255) NULL,
    raw_first_name VARCHAR(100) NULL,
    raw_last_name VARCHAR(100) NULL,
    raw_designation VARCHAR(100) NULL,
    raw_department VARCHAR(100) NULL,
    raw_join_date VARCHAR(50) NULL,
    raw_phone VARCHAR(50) NULL,
    raw_role VARCHAR(50) NULL,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Valid', 'Invalid', 'Imported')),
    validation_error VARCHAR(MAX) NULL,
    imported_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ==========================================
-- SEED DATA
-- ==========================================

-- Insert Seed Admin (John Doe)
-- password hash for 'admin123' using bcrypt (rounds=10) is:
-- $2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS
DECLARE @AdminEmpID INT;
INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
VALUES ('John', 'Doe', '2025-01-15', 'HR Manager', 'Human Resources', 'Active');
SET @AdminEmpID = SCOPE_IDENTITY();

INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID)
VALUES (@AdminEmpID, 'John Doe', '1985-05-20', 'Male', '123 Main St, Springfield', '+1234567890', 'admin@nexus.com', 'State Bank of India', '12345678901', 'SBIN0001234', 'LEGACY_ADM01');

INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
VALUES (@AdminEmpID, 'admin@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'admin', 'Active');

-- Insert Seed Employee (Jane Smith)
-- password hash for 'employee123' using bcrypt (rounds=10) is:
-- $2a$10$CmqqcesWd9EWQeUjMm4BJecdCwvp8rzTSMb1DpB3gMvxz.999d00m
DECLARE @EmpEmpID INT;
INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus)
VALUES ('Jane', 'Smith', '2025-03-01', 'Senior Software Engineer', 'Engineering', 'Active');
SET @EmpEmpID = SCOPE_IDENTITY();

INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID)
VALUES (@EmpEmpID, 'Jane Smith', '1990-11-10', 'Female', '456 Oak Ave, Springfield', '+1987654321', 'employee@nexus.com', 'HDFC Bank', '98765432109', 'HDFC0004567', 'employee');

INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
VALUES (@EmpEmpID, 'employee@nexus.com', '$2a$10$CmqqcesWd9EWQeUjMm4BJecdCwvp8rzTSMb1DpB3gMvxz.999d00m', 'employee', 'Active');
GO
