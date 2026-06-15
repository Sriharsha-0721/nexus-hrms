USE NexusHRMS;
GO

-- 1. Rename EmailID to OfficialEmail if it exists and OfficialEmail doesn't
IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'EmailID' AND Object_ID = Object_ID(N'dbo.EmployeeDetails'))
BEGIN
    EXEC sp_rename 'dbo.EmployeeDetails.EmailID', 'OfficialEmail', 'COLUMN';
END
GO

-- 2. Add PersonalEmail to EmployeeDetails
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PersonalEmail' AND Object_ID = Object_ID(N'dbo.EmployeeDetails'))
BEGIN
    ALTER TABLE dbo.EmployeeDetails ADD PersonalEmail VARCHAR(100) NULL;
END
GO

-- 3. Set a default PersonalEmail for existing records so testing works
UPDATE dbo.EmployeeDetails 
SET PersonalEmail = 'employee@nexus.com' 
WHERE PersonalEmail IS NULL;
GO

-- 4. Create PasswordResetTokens table if missing
IF OBJECT_ID('dbo.PasswordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResetTokens (
        TokenID INT IDENTITY(1,1) PRIMARY KEY,
        EmpID INT NOT NULL FOREIGN KEY REFERENCES dbo.EmployeeMaster(EmpID),
        TokenHash VARCHAR(255) NOT NULL,
        ExpiresAt DATETIME NOT NULL,
        IsUsed BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 5. Drop old unique constraint on EmployeeSalarysDetails and add versioned unique constraint
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_Employee_Salary_Period' AND parent_object_id = OBJECT_ID('dbo.EmployeeSalarysDetails'))
BEGIN
    ALTER TABLE dbo.EmployeeSalarysDetails DROP CONSTRAINT UQ_Employee_Salary_Period;
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_Employee_Salary_Period_Run' AND parent_object_id = OBJECT_ID('dbo.EmployeeSalarysDetails'))
BEGIN
    ALTER TABLE dbo.EmployeeSalarysDetails ADD CONSTRAINT UQ_Employee_Salary_Period_Run UNIQUE (EmpID, SalaryMonth, SalaryYear, RunID);
END
GO
