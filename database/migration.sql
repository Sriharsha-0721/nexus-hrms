-- ==========================================
-- PHASE 4 DATABASE MIGRATION SCRIPT
-- ==========================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. Create Departments Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Departments (
        DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentName VARCHAR(100) NOT NULL UNIQUE,
        ManagerEmpID INT NULL
    );
END
GO

-- 2. Create Designations Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Designations]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Designations (
        DesignationID INT IDENTITY(1,1) PRIMARY KEY,
        DesignationName VARCHAR(100) NOT NULL UNIQUE,
        Description VARCHAR(255) NULL
    );
END
GO

-- 3. Alter EmployeeMaster to add FK mappings
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeMaster]') AND name = N'DepartmentID')
BEGIN
    ALTER TABLE dbo.EmployeeMaster ADD DepartmentID INT NULL FOREIGN KEY REFERENCES dbo.Departments(DepartmentID);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeMaster]') AND name = N'DesignationID')
BEGIN
    ALTER TABLE dbo.EmployeeMaster ADD DesignationID INT NULL FOREIGN KEY REFERENCES dbo.Designations(DesignationID);
END
GO

-- 4. Alter EmployeeDetails to expand Profile sections
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeDetails]') AND name = N'MaritalStatus')
BEGIN
    ALTER TABLE dbo.EmployeeDetails ADD 
        MaritalStatus VARCHAR(20) NULL,
        Nationality VARCHAR(50) NULL,
        EmploymentType VARCHAR(50) NULL DEFAULT 'Full-time',
        AadharNo VARCHAR(20) NULL,
        PANNo VARCHAR(20) NULL,
        UANNo VARCHAR(20) NULL,
        EmergencyContactName VARCHAR(100) NULL,
        EmergencyContactPhone VARCHAR(30) NULL;
END
GO

-- Create unique indexes on Govt ID fields
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UX_EmployeeDetails_AadharNo')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_AadharNo ON dbo.EmployeeDetails(AadharNo) WHERE AadharNo IS NOT NULL;
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UX_EmployeeDetails_PANNo')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_PANNo ON dbo.EmployeeDetails(PANNo) WHERE PANNo IS NOT NULL;
END
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UX_EmployeeDetails_UANNo')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_EmployeeDetails_UANNo ON dbo.EmployeeDetails(UANNo) WHERE UANNo IS NOT NULL;
END
GO

-- 5. Create EmployeeLogins Table (Separate Login System)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeLogins]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.EmployeeLogins (
        EmployeeUserID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        Username VARCHAR(100) NOT NULL UNIQUE,
        Password VARCHAR(255) NULL,
        LastLogin DATETIME NULL,
        UserStatus VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (UserStatus IN ('Active', 'Inactive'))
    );
END
GO

-- Data Migration: Migrate existing employee users from AdminLogins to EmployeeLogins
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[AdminLogins]') AND name = N'Role')
BEGIN
    INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, LastLogin, UserStatus)
    SELECT EmpID, Username, Password, LastLogin, UserStatus
    FROM dbo.AdminLogins
    WHERE Role = 'employee'
      AND EmpID NOT IN (SELECT EmpID FROM dbo.EmployeeLogins);
      
    DELETE FROM dbo.AdminLogins
    WHERE Role = 'employee';
END
GO

-- 6. Create LeavePolicies Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LeavePolicies]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.LeavePolicies (
        PolicyID INT IDENTITY(1,1) PRIMARY KEY,
        LeaveType VARCHAR(50) NOT NULL UNIQUE CHECK (LeaveType IN ('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave')),
        MaxAllowedDays INT NOT NULL DEFAULT 0,
        IsCarryForward BIT NOT NULL DEFAULT 0
    );
    
    -- Insert Default Policy Values
    INSERT INTO dbo.LeavePolicies (LeaveType, MaxAllowedDays, IsCarryForward) VALUES
    ('Sick Leave', 10, 0),
    ('Casual Leave', 12, 0),
    ('Earned Leave', 15, 1),
    ('Maternity Leave', 90, 0),
    ('Paternity Leave', 10, 0),
    ('Unpaid Leave', 365, 0);
END
GO

-- 7. Create SalaryRevisions Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalaryRevisions]') AND type in (N'U'))
BEGIN
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
END
GO

-- 8. Create EmployeeProfileChangeRequests Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeProfileChangeRequests]') AND type in (N'U'))
BEGIN
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
END
GO

-- 9. Create AdminEmployeeMapping Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AdminEmployeeMapping]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.AdminEmployeeMapping (
        MappingID INT IDENTITY(1,1) PRIMARY KEY,
        AdminEmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        EmployeeEmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        CONSTRAINT UQ_Admin_Employee UNIQUE (AdminEmpID, EmployeeEmpID)
    );
END
GO

-- 10. Create PayrollRuns Table (Lifecycle Management)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PayrollRuns]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.PayrollRuns (
        RunID INT IDENTITY(1,1) PRIMARY KEY,
        SalaryMonth INT NOT NULL,
        SalaryYear INT NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (Status IN ('Draft', 'Reviewed', 'Approved', 'Locked')),
        RunDate DATETIME NOT NULL DEFAULT GETDATE(),
        ApprovedBy INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        ApprovedDate DATETIME NULL,
        CONSTRAINT UQ_Payroll_Period UNIQUE (SalaryMonth, SalaryYear)
    );
END
GO

-- 11. Create PayrollOtpVerification Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PayrollOtpVerification]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.PayrollOtpVerification (
        OtpID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        OtpCode VARCHAR(10) NOT NULL,
        ExpiresAt DATETIME NOT NULL,
        IsVerified BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 12. Create AuditLogs Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.AuditLogs (
        AuditID INT IDENTITY(1,1) PRIMARY KEY,
        ActorEmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        ActionType VARCHAR(50) NOT NULL,
        ActionDesc VARCHAR(500) NOT NULL,
        ActionTime DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 13. Create Notifications Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Notifications (
        NotificationID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        Title VARCHAR(200) NOT NULL,
        Message VARCHAR(500) NOT NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 14. Create EmployeeDocuments Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeDocuments]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.EmployeeDocuments (
        DocID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        DocName VARCHAR(100) NOT NULL,
        DocType VARCHAR(50) NOT NULL, -- e.g. Aadhar, PAN, PayslipPDF, Contract
        FilePath VARCHAR(255) NOT NULL,
        UploadedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 15. Set Manager foreign key constraint on Departments
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_Departments_EmployeeMaster')
    BEGIN
        ALTER TABLE dbo.Departments ADD CONSTRAINT FK_Departments_EmployeeMaster FOREIGN KEY (ManagerEmpID) REFERENCES dbo.EmployeeMaster(EmpID);
    END
END
GO

-- ==========================================
-- PHASE 5 DATABASE MIGRATION SCRIPT
-- Payroll Workflow Corrections & UX Enhancements
-- ==========================================

-- P5-1. Add IsPayrollEligible to EmployeeMaster
-- Controls which employees receive payslips (includes admins when set to 1)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeMaster]') AND name = N'IsPayrollEligible')
BEGIN
    ALTER TABLE dbo.EmployeeMaster ADD IsPayrollEligible BIT NOT NULL DEFAULT 1;
    -- Default all existing employees and admins to eligible
    UPDATE dbo.EmployeeMaster SET IsPayrollEligible = 1;
END
GO

-- P5-2. Add Version column to PayrollRuns (if not already present from earlier phase)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PayrollRuns]') AND name = N'Version')
BEGIN
    ALTER TABLE dbo.PayrollRuns ADD Version INT NOT NULL DEFAULT 1;
END
GO

-- P5-3. Drop the old unique constraint that prevents multi-version payroll
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = N'UQ_Payroll_Period' AND parent_object_id = OBJECT_ID(N'[dbo].[PayrollRuns]'))
BEGIN
    ALTER TABLE dbo.PayrollRuns DROP CONSTRAINT UQ_Payroll_Period;
END
GO

-- P5-4. Add new version-aware unique constraint
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = N'UQ_Payroll_Period_Version')
BEGIN
    ALTER TABLE dbo.PayrollRuns ADD CONSTRAINT UQ_Payroll_Period_Version UNIQUE (SalaryMonth, SalaryYear, Version);
END
GO

-- P5-5. Fix Status CHECK constraint to include 'Released' (was missing 'Released', had 'Locked')
-- Drop old constraint and add corrected one
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK__PayrollRu__Statu__XXXXXXXX' AND parent_object_id = OBJECT_ID(N'[dbo].[PayrollRuns]'))
BEGIN
    ALTER TABLE dbo.PayrollRuns DROP CONSTRAINT CK__PayrollRu__Statu__XXXXXXXX;
END
GO
-- Apply a named check constraint
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = N'CK_PayrollRuns_Status')
BEGIN
    ALTER TABLE dbo.PayrollRuns ADD CONSTRAINT CK_PayrollRuns_Status 
        CHECK (Status IN ('Draft', 'Reviewed', 'Approved', 'Released'));
END
GO

-- P5-6. Add ReleasedBy and ReleasedAt to PayrollRuns for full release audit trail
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PayrollRuns]') AND name = N'ReleasedBy')
BEGIN
    ALTER TABLE dbo.PayrollRuns ADD 
        ReleasedBy INT NULL REFERENCES dbo.EmployeeMaster(EmpID),
        ReleasedAt DATETIME NULL;
END
GO

-- P5-7. Add GeneratedBy to PayrollRuns to track who triggered the run
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PayrollRuns]') AND name = N'GeneratedBy')
BEGIN
    ALTER TABLE dbo.PayrollRuns ADD GeneratedBy INT NULL REFERENCES dbo.EmployeeMaster(EmpID);
END
GO

-- P5-8. Add Category and RelatedID to Notifications for categorised notification center
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = N'Category')
BEGIN
    ALTER TABLE dbo.Notifications ADD 
        Category VARCHAR(20) NOT NULL DEFAULT 'System'
            CHECK (Category IN ('Payroll', 'Leave', 'Profile', 'Attendance', 'System')),
        RelatedID INT NULL;
    -- Backfill existing payslip notifications to Payroll category
    UPDATE dbo.Notifications SET Category = 'Payroll' WHERE Title LIKE '%payslip%' OR Title LIKE '%Payslip%' OR Title LIKE '%salary%';
    UPDATE dbo.Notifications SET Category = 'Leave'   WHERE Title LIKE '%leave%'   OR Title LIKE '%Leave%';
    UPDATE dbo.Notifications SET Category = 'Profile' WHERE Title LIKE '%profile%' OR Title LIKE '%Profile%' OR Title LIKE '%update%';
END
GO

-- P5-9. Create EmployeeReporting table (if not exists) for Reporting Manager hierarchy
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeReporting]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.EmployeeReporting (
        ReportingID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID       INT NOT NULL REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        ManagerID   INT NOT NULL REFERENCES dbo.EmployeeMaster(EmpID),
        CONSTRAINT UQ_EmployeeReporting_Emp UNIQUE (EmpID)
    );
END
GO

-- P5-10. Add an index on Notifications(EmpID, IsRead) for fast unread-count queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Notifications_EmpID_IsRead')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Notifications_EmpID_IsRead
        ON dbo.Notifications (EmpID, IsRead)
        INCLUDE (Category, CreatedAt);
END
GO
