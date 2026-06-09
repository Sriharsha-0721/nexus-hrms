-- ==================================================
-- NEXUS HRMS: TARGET DATABASE SCHEMA DEFINITIONS
-- ==================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. DROP ALL FOREIGN KEY CONSTRAINTS TO PREVENT CIRCULAR DEPENDENCY ISSUES
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'
ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
FROM sys.foreign_keys;
EXEC sp_executesql @sql;
GO

-- 2. DROP TABLES
IF OBJECT_ID('dbo.EmployeeReporting', 'U') IS NOT NULL DROP TABLE dbo.EmployeeReporting;
IF OBJECT_ID('dbo.PayrollCalendar', 'U') IS NOT NULL DROP TABLE dbo.PayrollCalendar;
IF OBJECT_ID('dbo.ImportAuditLogs', 'U') IS NOT NULL DROP TABLE dbo.ImportAuditLogs;
IF OBJECT_ID('dbo.PayslipDispatchLogs', 'U') IS NOT NULL DROP TABLE dbo.PayslipDispatchLogs;
IF OBJECT_ID('dbo.PayrollApprovalOtp', 'U') IS NOT NULL DROP TABLE dbo.PayrollApprovalOtp;
IF OBJECT_ID('dbo.EmployeeSalarysDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeSalarysDetails;
IF OBJECT_ID('dbo.PayrollRuns', 'U') IS NOT NULL DROP TABLE dbo.PayrollRuns;
IF OBJECT_ID('dbo.AdminEmployeeMapping', 'U') IS NOT NULL DROP TABLE dbo.AdminEmployeeMapping;
IF OBJECT_ID('dbo.EmployeeProfileChangeRequests', 'U') IS NOT NULL DROP TABLE dbo.EmployeeProfileChangeRequests;
IF OBJECT_ID('dbo.SalaryRevisions', 'U') IS NOT NULL DROP TABLE dbo.SalaryRevisions;
IF OBJECT_ID('dbo.EmployeeLogins', 'U') IS NOT NULL DROP TABLE dbo.EmployeeLogins;
IF OBJECT_ID('dbo.AdminLogins', 'U') IS NOT NULL DROP TABLE dbo.AdminLogins;
IF OBJECT_ID('dbo.EmployeeDocuments', 'U') IS NOT NULL DROP TABLE dbo.EmployeeDocuments;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
IF OBJECT_ID('dbo.EmployeeLogDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeLogDetails;
IF OBJECT_ID('dbo.EmployeeLeaveDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeLeaveDetails;
IF OBJECT_ID('dbo.EmployeeAttendance', 'U') IS NOT NULL DROP TABLE dbo.EmployeeAttendance;
IF OBJECT_ID('dbo.EmployeeDetails', 'U') IS NOT NULL DROP TABLE dbo.EmployeeDetails;
IF OBJECT_ID('dbo.EmployeeMaster', 'U') IS NOT NULL DROP TABLE dbo.EmployeeMaster;
IF OBJECT_ID('dbo.LeavePolicies', 'U') IS NOT NULL DROP TABLE dbo.LeavePolicies;
IF OBJECT_ID('dbo.Departments', 'U') IS NOT NULL DROP TABLE dbo.Departments;
IF OBJECT_ID('dbo.Designations', 'U') IS NOT NULL DROP TABLE dbo.Designations;
IF OBJECT_ID('dbo.CompanySettings', 'U') IS NOT NULL DROP TABLE dbo.CompanySettings;
IF OBJECT_ID('dbo.HolidayMaster', 'U') IS NOT NULL DROP TABLE dbo.HolidayMaster;
IF OBJECT_ID('dbo.Staging_Employees', 'U') IS NOT NULL DROP TABLE dbo.Staging_Employees;
GO

-- 2. CREATE LOOKUP & MASTER TABLES

-- CompanySettings Table
CREATE TABLE dbo.CompanySettings (
    SettingID INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName VARCHAR(150) NOT NULL,
    CompanyAddress VARCHAR(250) NULL,
    CompanyPAN VARCHAR(20) NULL,
    CompanyGST VARCHAR(20) NULL,
    PFNumber VARCHAR(30) NULL,
    ESINumber VARCHAR(30) NULL,
    PayrollProcessingDay INT NOT NULL DEFAULT 25,
    SalaryCreditDay INT NOT NULL DEFAULT 1,
    ContactNumber VARCHAR(30) NULL,
    SupportEmail VARCHAR(100) NULL,
    CompanyLogo VARCHAR(255) NULL
);
GO

-- HolidayMaster Table
CREATE TABLE dbo.HolidayMaster (
    HolidayID INT IDENTITY(1,1) PRIMARY KEY,
    HolidayName VARCHAR(100) NOT NULL,
    HolidayDate DATE NOT NULL UNIQUE,
    HolidayType VARCHAR(30) NOT NULL CHECK (HolidayType IN ('National', 'Regional', 'Optional')),
    IsOptional BIT NOT NULL DEFAULT 0
);
GO

-- PayrollCalendar Table
CREATE TABLE dbo.PayrollCalendar (
    PayrollCalendarID INT IDENTITY(1,1) PRIMARY KEY,
    PayrollMonth INT NOT NULL,
    PayrollYear INT NOT NULL,
    AttendanceCutoffDate DATE NOT NULL,
    PayrollProcessingDate DATE NOT NULL,
    SalaryCreditDate DATE NOT NULL,
    LockDate DATE NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_PayrollCalendar_Month_Year UNIQUE (PayrollMonth, PayrollYear)
);
GO

-- Departments Table
CREATE TABLE dbo.Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName VARCHAR(100) NOT NULL UNIQUE,
    ManagerEmpID INT NULL
);
GO

-- Designations Table
CREATE TABLE dbo.Designations (
    DesignationID INT IDENTITY(1,1) PRIMARY KEY,
    DesignationName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(255) NULL
);
GO

-- LeavePolicies Table
CREATE TABLE dbo.LeavePolicies (
    PolicyID INT IDENTITY(1,1) PRIMARY KEY,
    LeaveType VARCHAR(50) NOT NULL UNIQUE CHECK (LeaveType IN ('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave')),
    MaxAllowedDays INT NOT NULL DEFAULT 0,
    IsCarryForward BIT NOT NULL DEFAULT 0
);
GO


-- 3. CREATE ROSTER TABLES

-- EmployeeMaster Table
CREATE TABLE dbo.EmployeeMaster (
    EmpID INT IDENTITY(1001,1) PRIMARY KEY,
    FirstName VARCHAR(40) NOT NULL,
    LastName VARCHAR(40) NOT NULL,
    DOJ DATE NOT NULL DEFAULT GETDATE(),
    Designation VARCHAR(200) NULL, -- Kept for compatibility with legacy systems
    Department VARCHAR(100) NULL,  -- Kept for compatibility with legacy systems
    EmpStatus VARCHAR(20) NOT NULL DEFAULT 'Active' 
        CHECK (EmpStatus IN ('Active', 'Inactive', 'On Notice', 'Resigned', 'Terminated', 'Retired')),
    DepartmentID INT NULL FOREIGN KEY REFERENCES dbo.Departments(DepartmentID),
    DesignationID INT NULL FOREIGN KEY REFERENCES dbo.Designations(DesignationID)
);
GO

-- EmployeeDetails Table
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
    UPPID VARCHAR(100) NULL,
    MaritalStatus VARCHAR(20) NULL,
    Nationality VARCHAR(50) NULL,
    EmploymentType VARCHAR(50) NULL DEFAULT 'Full-time',
    AadharNo VARCHAR(20) NULL,
    PANNo VARCHAR(20) NULL,
    UANNo VARCHAR(20) NULL,
    EmergencyContactName VARCHAR(100) NULL,
    EmergencyContactPhone VARCHAR(30) NULL
);
GO

-- Indexes on Govt ID fields
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_EmailID ON dbo.EmployeeDetails(EmailID) WHERE EmailID IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_UPPID ON dbo.EmployeeDetails(UPPID) WHERE UPPID IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_AadharNo ON dbo.EmployeeDetails(AadharNo) WHERE AadharNo IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_PANNo ON dbo.EmployeeDetails(PANNo) WHERE PANNo IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_UANNo ON dbo.EmployeeDetails(UANNo) WHERE UANNo IS NOT NULL;
GO

-- AdminLogins Table
CREATE TABLE dbo.AdminLogins (
    AppUserID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NULL,
    Role VARCHAR(50) NOT NULL CHECK (Role IN ('SuperAdmin', 'HRAdmin', 'PayrollAdmin')),
    LastLogin DATETIME NULL,
    UserStatus VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (UserStatus IN ('Active', 'Inactive'))
);
GO

-- EmployeeLogins Table
CREATE TABLE dbo.EmployeeLogins (
    EmployeeUserID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NULL,
    LastLogin DATETIME NULL,
    UserStatus VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (UserStatus IN ('Active', 'Inactive'))
);
GO


-- 4. CREATE LOGS & TRANSACTION TABLES

-- EmployeeAttendance Table
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

-- EmployeeLeaveDetails Table
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

-- EmployeeLogDetails Table (Optional, kept for Progress parity)
CREATE TABLE dbo.EmployeeLogDetails (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    LogDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    TotalHours DECIMAL(5,2) NULL,
    LoginTime VARCHAR(20) NULL,
    LogoutTime VARCHAR(20) NULL
);
GO

-- SalaryRevisions Table
CREATE TABLE dbo.SalaryRevisions (
    RevisionID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    EffectiveDate DATE NOT NULL,
    BasicSalary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    HouseRentAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    SpecialAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    MedicalAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ConveyanceAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    OtherAllowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ProvidentFundPercent DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    ProfessionalTaxPercent DECIMAL(5,2) NOT NULL DEFAULT 0.40,
    TDS DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Remarks VARCHAR(255) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- EmployeeProfileChangeRequests Table
CREATE TABLE dbo.EmployeeProfileChangeRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    RequestedData VARCHAR(MAX) NOT NULL, -- JSON string of profile properties
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
    Reason VARCHAR(255) NULL,
    RequestedAt DATETIME NOT NULL DEFAULT GETDATE(),
    ProcessedBy INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    ProcessedAt DATETIME NULL
);
GO

-- AdminEmployeeMapping Table
CREATE TABLE dbo.AdminEmployeeMapping (
    MappingID INT IDENTITY(1,1) PRIMARY KEY,
    AdminEmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    EmployeeEmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    CONSTRAINT UQ_Admin_Employee UNIQUE (AdminEmpID, EmployeeEmpID)
);
GO

-- EmployeeReporting Table
CREATE TABLE dbo.EmployeeReporting (
    ReportingID INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeEmpID INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    ManagerEmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID)
);
GO


-- 5. CREATE PAYROLL LIFECYCLE TABLES

-- PayrollRuns Table
CREATE TABLE dbo.PayrollRuns (
    RunID INT IDENTITY(1,1) PRIMARY KEY,
    SalaryMonth INT NOT NULL,
    SalaryYear INT NOT NULL,
    Version INT NOT NULL DEFAULT 1,
    Status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (Status IN ('Draft', 'Reviewed', 'Approved', 'Released')),
    RunDate DATETIME NOT NULL DEFAULT GETDATE(),
    ApprovedBy INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    ApprovedDate DATETIME NULL,
    CONSTRAINT UQ_Payroll_Period_Version UNIQUE (SalaryMonth, SalaryYear, Version)
);
GO

-- PayrollApprovalOtp Table
CREATE TABLE dbo.PayrollApprovalOtp (
    OtpID INT IDENTITY(1,1) PRIMARY KEY,
    RunID INT NOT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
    OtpCode VARCHAR(10) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    IsVerified BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- EmployeeSalarysDetails Table
CREATE TABLE dbo.EmployeeSalarysDetails (
    SalaryID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    RunID INT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
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

-- PayslipDispatchLogs Table
CREATE TABLE dbo.PayslipDispatchLogs (
    DispatchID INT IDENTITY(1,1) PRIMARY KEY,
    SalaryID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeSalarysDetails(SalaryID) ON DELETE CASCADE,
    RecipientEmail VARCHAR(100) NOT NULL,
    DispatchStatus VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (DispatchStatus IN ('Pending', 'Sent', 'Failed')),
    ErrorMessage VARCHAR(MAX) NULL,
    DispatchedAt DATETIME NULL
);
GO


-- 6. SYSTEM LOGGING & EXTRA SCHEMAS

-- AuditLogs Table
CREATE TABLE dbo.AuditLogs (
    AuditID INT IDENTITY(1,1) PRIMARY KEY,
    ActorEmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    ActionType VARCHAR(50) NOT NULL,
    ActionDesc VARCHAR(500) NOT NULL,
    ActionTime DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ImportAuditLogs Table
CREATE TABLE dbo.ImportAuditLogs (
    ImportID INT IDENTITY(1,1) PRIMARY KEY,
    FileType VARCHAR(50) NOT NULL, -- e.g. 'Master', 'Details', 'Attendance', 'Leaves', 'Salary'
    UploadedBy INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    UploadedDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalRows INT NOT NULL DEFAULT 0,
    SuccessRows INT NOT NULL DEFAULT 0,
    FailedRows INT NOT NULL DEFAULT 0,
    Status VARCHAR(20) NOT NULL DEFAULT 'Success' CHECK (Status IN ('Success', 'Partial', 'Failed'))
);
GO

-- Notifications Table
CREATE TABLE dbo.Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    Title VARCHAR(200) NOT NULL,
    Message VARCHAR(500) NOT NULL,
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- EmployeeDocuments Table
CREATE TABLE dbo.EmployeeDocuments (
    DocID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
    DocName VARCHAR(100) NOT NULL,
    DocType VARCHAR(50) NOT NULL, -- e.g. Aadhar, PAN, PayslipPDF, Contract
    FilePath VARCHAR(255) NOT NULL,
    UploadedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Staging Employees Table for CSV Import Validation
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

-- 7. FOREIGN KEY MANAGER TO DEPARTMENTS
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') AND type in (N'U'))
BEGIN
    ALTER TABLE dbo.Departments ADD CONSTRAINT FK_Departments_EmployeeMaster FOREIGN KEY (ManagerEmpID) REFERENCES dbo.EmployeeMaster(EmpID);
END
GO
