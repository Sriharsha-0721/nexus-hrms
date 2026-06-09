-- Phase 3 Schema Upgrades

-- 1. Snapshot column additions to dbo.EmployeeSalarysDetails
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.EmployeeSalarysDetails') AND name = 'EmployeeName')
BEGIN
    ALTER TABLE dbo.EmployeeSalarysDetails ADD 
        EmployeeName VARCHAR(150) NULL,
        Designation VARCHAR(100) NULL,
        Department VARCHAR(100) NULL,
        UANNo VARCHAR(20) NULL,
        AbsentDays INT NOT NULL DEFAULT 0,
        UnpaidLeaveDays INT NOT NULL DEFAULT 0;
END
GO

-- 2. PayrollRunSummary Table (Includes Reconciliation Report metrics)
IF OBJECT_ID('dbo.PayrollRunSummary', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PayrollRunSummary (
        SummaryID INT IDENTITY(1,1) PRIMARY KEY,
        RunID INT NOT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
        TotalEmployees INT NOT NULL,
        EmployeesProcessed INT NOT NULL DEFAULT 0,
        EmployeesSkipped INT NOT NULL DEFAULT 0,
        GrossAmount DECIMAL(18,2) NOT NULL,
        TotalPF DECIMAL(18,2) NOT NULL,
        TotalPT DECIMAL(18,2) NOT NULL,
        TotalTDS DECIMAL(18,2) NOT NULL,
        TotalLOP DECIMAL(18,2) NOT NULL,
        NetPayable DECIMAL(18,2) NOT NULL,
        ExceptionsCount INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 3. PayrollRunEmployees Table (Relational run linking mapping)
IF OBJECT_ID('dbo.PayrollRunEmployees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PayrollRunEmployees (
        RunEmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        RunID INT NOT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        SalaryID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeSalarysDetails(SalaryID),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 4. Re-create PayrollApprovalOtp to support GeneratedForAdminID
IF OBJECT_ID('dbo.PayrollApprovalOtp', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.PayrollApprovalOtp;
END
GO

CREATE TABLE dbo.PayrollApprovalOtp (
    OtpID INT IDENTITY(1,1) PRIMARY KEY,
    RunID INT NOT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
    GeneratedForAdminID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    OtpCode VARCHAR(10) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    IsVerified BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- 5. Re-create PayslipDispatchLogs to map EmpID and CreatedAt explicitly
IF OBJECT_ID('dbo.PayslipDispatchLogs', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.PayslipDispatchLogs;
END
GO

CREATE TABLE dbo.PayslipDispatchLogs (
    DispatchID INT IDENTITY(1,1) PRIMARY KEY,
    EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
    SalaryID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeSalarysDetails(SalaryID) ON DELETE CASCADE,
    EmailAddress VARCHAR(100) NOT NULL,
    DispatchStatus VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (DispatchStatus IN ('Pending', 'Sent', 'Failed')),
    ErrorMessage VARCHAR(MAX) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    DispatchedAt DATETIME NULL
);
GO

-- 6. PayrollExceptions Table (Non-blocking calculation failures)
IF OBJECT_ID('dbo.PayrollExceptions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PayrollExceptions (
        ExceptionID INT IDENTITY(1,1) PRIMARY KEY,
        RunID INT NOT NULL FOREIGN KEY REFERENCES dbo.PayrollRuns(RunID) ON DELETE CASCADE,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID) ON DELETE CASCADE,
        ExceptionType VARCHAR(50) NOT NULL, -- e.g. 'Missing Salary Revision', 'Missing PAN', 'Missing Bank Details'
        ExceptionMessage VARCHAR(500) NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        ResolvedBy INT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        ResolvedAt DATETIME NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (Status IN ('Open', 'Resolved', 'Ignored'))
    );
END
GO
