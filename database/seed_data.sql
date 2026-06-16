-- ==================================================
-- NEXUS HRMS: TARGET DATABASE SEED DATA SCRIPT
-- ==================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. SEED COMPANY SETTINGS (SINGLETON)
IF NOT EXISTS (SELECT * FROM dbo.CompanySettings)
BEGIN
    INSERT INTO dbo.CompanySettings (CompanyName, CompanyAddress, CompanyPAN, CompanyGST, PFNumber, ESINumber, PayrollProcessingDay, SalaryCreditDay, ContactNumber, SupportEmail, CompanyLogo)
    VALUES (
        'Nexus Software Solutions Private Limited', 
        'Plot No. 12, Hitech City Main Rd, Cyber Gateway, Hyderabad, Telangana 500081',
        'AAACN1234F',
        '36AAACN1234F1Z0',
        'AP/HYD/0099887/000',
        '51000998870001001',
        25, -- payroll processing day
        1,  -- salary credit day (1st of next month)
        '+914066554433',
        'support@nexus.com',
        '/assets/images/logo.png'
    );
END
GO

-- 2. SEED HOLIDAY MASTER
IF NOT EXISTS (SELECT * FROM dbo.HolidayMaster)
BEGIN
    INSERT INTO dbo.HolidayMaster (HolidayName, HolidayDate, HolidayType, IsOptional) VALUES
    ('New Year Day', '2026-01-01', 'Regional', 1),
    ('Makar Sankranti', '2026-01-14', 'Regional', 0),
    ('Republic Day', '2026-01-26', 'National', 0),
    ('Holi', '2026-03-06', 'Regional', 1),
    ('Good Friday', '2026-04-03', 'National', 0),
    ('Independence Day', '2026-08-15', 'National', 0),
    ('Gandhi Jayanti', '2026-10-02', 'National', 0),
    ('Vijayadashami (Dussehra)', '2026-10-11', 'National', 0),
    ('Diwali (Deepavali)', '2026-11-12', 'National', 0),
    ('Christmas Day', '2026-12-25', 'National', 0);
END
GO

-- 3. SEED PAYROLL CALENDAR (12 MONTHS)
IF NOT EXISTS (SELECT * FROM dbo.PayrollCalendar)
BEGIN
    INSERT INTO dbo.PayrollCalendar (PayrollMonth, PayrollYear, AttendanceCutoffDate, PayrollProcessingDate, SalaryCreditDate, LockDate, IsActive) VALUES
    (6, 2026, '2026-06-30', '2026-07-04', '2026-07-05', '2026-07-07', 1),
    (7, 2026, '2026-07-31', '2026-08-04', '2026-08-05', '2026-08-07', 1),
    (8, 2026, '2026-08-31', '2026-09-04', '2026-09-05', '2026-09-07', 1),
    (9, 2026, '2026-09-30', '2026-10-04', '2026-10-05', '2026-10-07', 1),
    (10, 2026, '2026-10-31', '2026-11-04', '2026-11-05', '2026-11-07', 1),
    (11, 2026, '2026-11-30', '2026-12-04', '2026-12-05', '2026-12-07', 1),
    (12, 2026, '2026-12-31', '2027-01-04', '2027-01-05', '2027-01-07', 1),
    (1, 2027, '2027-01-31', '2027-02-04', '2027-02-05', '2027-02-07', 1),
    (2, 2027, '2027-02-28', '2027-03-04', '2027-03-05', '2027-03-07', 1),
    (3, 2027, '2027-03-31', '2027-04-04', '2027-04-05', '2027-04-07', 1),
    (4, 2027, '2027-04-30', '2027-05-04', '2027-05-05', '2027-05-07', 1),
    (5, 2027, '2027-05-31', '2027-06-04', '2027-06-05', '2027-06-07', 1);
END
GO

-- 3. SEED LEAVE POLICIES
IF NOT EXISTS (SELECT * FROM dbo.LeavePolicies)
BEGIN
    INSERT INTO dbo.LeavePolicies (LeaveType, MaxAllowedDays, IsCarryForward) VALUES
    ('Sick Leave', 10, 0),
    ('Casual Leave', 12, 0),
    ('Earned Leave', 15, 1),
    ('Maternity Leave', 90, 0),
    ('Paternity Leave', 10, 0),
    ('Unpaid Leave', 365, 0);
END
GO

-- 4. SEED DEPARTMENTS
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Human Resources')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Human Resources');
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Engineering')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Engineering');
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Finance')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Finance');
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Operations')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Operations');
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Sales')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Sales');
IF NOT EXISTS (SELECT * FROM dbo.Departments WHERE DepartmentName = 'Research')
    INSERT INTO dbo.Departments (DepartmentName) VALUES ('Research');
GO

-- 5. SEED DESIGNATIONS
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'HR Manager')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('HR Manager', 'Manages HR operations');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Software Engineer')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Software Engineer', 'Core software developer');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Senior Software Engineer')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Senior Software Engineer', 'Experienced software developer');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Tech Lead')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Tech Lead', 'Technical team lead');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Director of Engineering')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Director of Engineering', 'Oversees engineering division');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Finance Analyst')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Finance Analyst', 'Handles payroll and accounting');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Sales Associate')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Sales Associate', 'Enterprise sales executive');
IF NOT EXISTS (SELECT * FROM dbo.Designations WHERE DesignationName = 'Research Scientist')
    INSERT INTO dbo.Designations (DesignationName, Description) VALUES ('Research Scientist', 'Performs core R&D activities');
GO

-- Retrieve IDs for alignment references
DECLARE @DeptHR INT, @DeptEng INT, @DeptFinance INT, @DeptOps INT, @DeptSales INT, @DeptResearch INT;
SELECT @DeptHR = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Human Resources';
SELECT @DeptEng = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Engineering';
SELECT @DeptFinance = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Finance';
SELECT @DeptOps = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Operations';
SELECT @DeptSales = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Sales';
SELECT @DeptResearch = DepartmentID FROM dbo.Departments WHERE DepartmentName = 'Research';

DECLARE @DesigHRMgr INT, @DesigSE INT, @DesigSSE INT, @DesigTL INT, @DesigDir INT, @DesigFinance INT, @DesigSales INT, @DesigResearch INT;
SELECT @DesigHRMgr = DesignationID FROM dbo.Designations WHERE DesignationName = 'HR Manager';
SELECT @DesigSE = DesignationID FROM dbo.Designations WHERE DesignationName = 'Software Engineer';
SELECT @DesigSSE = DesignationID FROM dbo.Designations WHERE DesignationName = 'Senior Software Engineer';
SELECT @DesigTL = DesignationID FROM dbo.Designations WHERE DesignationName = 'Tech Lead';
SELECT @DesigDir = DesignationID FROM dbo.Designations WHERE DesignationName = 'Director of Engineering';
SELECT @DesigFinance = DesignationID FROM dbo.Designations WHERE DesignationName = 'Finance Analyst';
SELECT @DesigSales = DesignationID FROM dbo.Designations WHERE DesignationName = 'Sales Associate';
SELECT @DesigResearch = DesignationID FROM dbo.Designations WHERE DesignationName = 'Research Scientist';


-- 6. SEED ADMIINISTRATORS (ROLE-BASED CODES)
-- Passwords set to 'admin123' (hash: $2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS)

-- SuperAdmin: Harsha Reddy
IF NOT EXISTS (SELECT * FROM dbo.EmployeeDetails WHERE EmailID = 'harsha.r@nexus.com')
BEGIN
    DECLARE @SuperAdminID INT;
    INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
    VALUES ('Harsha', 'Reddy', '2022-01-01', 'Director of Engineering', 'Engineering', 'Active', @DeptEng, @DesigDir);
    SET @SuperAdminID = SCOPE_IDENTITY();
    
    INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
    VALUES (@SuperAdminID, 'Harsha Reddy', '1980-04-12', 'Male', 'Jubilee Hills, Hyderabad', '+919988771122', 'harsha.r@nexus.com', 'State Bank of India', '10294857201', 'SBIN0001234', 'LEGACY_ADM01', '998877665544', 'AAAAA9999A', '100987654321', 'Full-time', 'Married', 'Indian');
    
    INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
    VALUES (@SuperAdminID, 'harsha.r@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'SuperAdmin', 'Active');
END

-- HRAdmin 1: Sneha Iyer
IF NOT EXISTS (SELECT * FROM dbo.EmployeeDetails WHERE EmailID = 'sneha.iyer@nexus.com')
BEGIN
    DECLARE @HRAdmin1ID INT;
    INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
    VALUES ('Sneha', 'Iyer', '2023-05-15', 'HR Manager', 'Human Resources', 'Active', @DeptHR, @DesigHRMgr);
    SET @HRAdmin1ID = SCOPE_IDENTITY();
    
    INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
    VALUES (@HRAdmin1ID, 'Sneha Iyer', '1988-12-04', 'Female', 'Banjara Hills, Hyderabad', '+919876543210', 'sneha.iyer@nexus.com', 'HDFC Bank', '50294857102', 'HDFC0000123', 'LEGACY_ADM02', '987654321098', 'ABCDE1234B', '100987654323', 'Full-time', 'Married', 'Indian');
    
    INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
    VALUES (@HRAdmin1ID, 'sneha.iyer@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'HRAdmin', 'Active');
END

-- HRAdmin 2: Rajesh Kumar
IF NOT EXISTS (SELECT * FROM dbo.EmployeeDetails WHERE EmailID = 'rajesh.k@nexus.com')
BEGIN
    DECLARE @HRAdmin2ID INT;
    INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
    VALUES ('Rajesh', 'Kumar', '2024-01-10', 'HR Executive', 'Human Resources', 'Active', @DeptHR, @DesigHRMgr);
    SET @HRAdmin2ID = SCOPE_IDENTITY();
    
    INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
    VALUES (@HRAdmin2ID, 'Rajesh Kumar', '1982-08-15', 'Male', 'Madhapur, Hyderabad', '+919988776655', 'rajesh.k@nexus.com', 'State Bank of India', '30294857201', 'SBIN0001234', 'LEGACY_ADM03', '123456789012', 'ABCDE1234A', '100987654322', 'Full-time', 'Married', 'Indian');
    
    INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
    VALUES (@HRAdmin2ID, 'rajesh.k@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'HRAdmin', 'Active');
END

-- PayrollAdmin: Priya Sharma
IF NOT EXISTS (SELECT * FROM dbo.EmployeeDetails WHERE EmailID = 'priya.s@nexus.com')
BEGIN
    DECLARE @PayrollAdminID INT;
    INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
    VALUES ('Priya', 'Sharma', '2023-08-20', 'Payroll Specialist', 'Finance', 'Active', @DeptFinance, @DesigFinance);
    SET @PayrollAdminID = SCOPE_IDENTITY();
    
    INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
    VALUES (@PayrollAdminID, 'Priya Sharma', '1990-10-10', 'Female', 'Kondapur, Hyderabad', '+919988998899', 'priya.s@nexus.com', 'ICICI Bank', '60294857103', 'ICIC0000111', 'LEGACY_ADM04', '887766554433', 'ABCDE1234C', '100987654324', 'Full-time', 'Single', 'Indian');
    
    INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
    VALUES (@PayrollAdminID, 'priya.s@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'PayrollAdmin', 'Active');
END


-- 7. SEED 30 REGISTERED EMPLOYEES
-- Passwords set to 'employee123' (hash: $2a$10$CmqqcesWd9EWQeUjMm4BJecdCwvp8rzTSMb1DpB3gMvxz.999d00m)
CREATE TABLE #SeedList (
    ID INT IDENTITY(1,1),
    First VARCHAR(50), Last VARCHAR(50),
    Email VARCHAR(100), Phone VARCHAR(20),
    Gender VARCHAR(10), DOJ DATE, DOB DATE,
    Address VARCHAR(250), Bank VARCHAR(50), AccNo VARCHAR(30), IFSC VARCHAR(20),
    PAN VARCHAR(10), Aadhar VARCHAR(12), UAN VARCHAR(12),
    DeptID INT, DesigID INT,
    Basic DECIMAL(10,2)
);

INSERT INTO #SeedList (First, Last, Email, Phone, Gender, DOJ, DOB, Address, Bank, AccNo, IFSC, PAN, Aadhar, UAN, DeptID, DesigID, Basic)
VALUES
('Amit', 'Patel', 'amit.patel@nexus.com', '+919812345678', 'Male', '2025-06-01', '1992-04-14', 'Gachibowli, Hyderabad', 'ICICI Bank', '10293847561', 'ICIC0000111', 'ABCDE2234C', '223456789012', '100987654331', @DeptEng, @DesigSE, 62000.00),
('Sunil', 'Rao', 'sunil.rao@nexus.com', '+919812345679', 'Male', '2025-06-01', '1990-11-20', 'Jayanagar, Bangalore', 'HDFC Bank', '10293847562', 'HDFC0000222', 'ABCDE3234D', '323456789012', '100987654332', @DeptEng, @DesigSSE, 78000.00),
('Ananya', 'Reddy', 'ananya.reddy@nexus.com', '+919812345680', 'Female', '2025-06-01', '1995-07-25', 'Banjara Hills, Hyderabad', 'Axis Bank', '10293847563', 'UTIB0000333', 'ABCDE4234E', '423456789012', '100987654333', @DeptEng, @DesigTL, 92000.00),
('Sneha', 'Reddy', 'sneha.reddy@nexus.com', '+919812345681', 'Female', '2025-06-15', '1993-02-18', 'Adyar, Chennai', 'Canara Bank', '10293847564', 'CNRB0000444', 'ABCDE5234F', '523456789012', '100987654334', @DeptHR, @DesigHRMgr, 70000.00),
('Rohan', 'Desai', 'rohan.desai@nexus.com', '+919812345682', 'Male', '2025-06-15', '1989-09-30', 'Kondapur, Hyderabad', 'State Bank of India', '10293847565', 'SBIN0000555', 'ABCDE6234G', '623456789012', '100987654335', @DeptSales, @DesigSales, 55000.00),
('Neha', 'Sharma', 'neha.sharma@nexus.com', '+919812345683', 'Female', '2025-07-01', '1994-05-12', 'Miyapur, Hyderabad', 'Punjab National Bank', '10293847566', 'PUNB0000666', 'ABCDE7234H', '723456789012', '100987654336', @DeptFinance, @DesigFinance, 60000.00),
('Vijay', 'Verma', 'vijay.verma@nexus.com', '+919812345684', 'Male', '2025-07-01', '1991-03-05', 'Malviya Nagar, Jaipur', 'Bank of Baroda', '10293847567', 'BARB0000777', 'ABCDE8234I', '823456789012', '100987654337', @DeptOps, @DesigTL, 88000.00),
('Sandeep', 'Nair', 'sandeep.nair@nexus.com', '+919812345685', 'Male', '2025-07-15', '1987-10-22', 'Kochi, Kerala', 'Federal Bank', '10293847568', 'FDRL0000888', 'ABCDE9234J', '923456789012', '100987654338', @DeptResearch, @DesigResearch, 85000.00),
('Manoj', 'Mishra', 'manoj.mishra@nexus.com', '+919812345686', 'Male', '2025-08-01', '1986-12-15', 'Noida, Uttar Pradesh', 'State Bank of India', '10293847569', 'SBIN0000999', 'ABCDA1234A', '123456789013', '100987654339', @DeptOps, @DesigFinance, 58000.00),
('Divya', 'Choudhary', 'divya.c@nexus.com', '+919812345687', 'Female', '2025-08-01', '1996-08-08', 'Kothrud, Pune', 'HDFC Bank', '10293847570', 'HDFC0000100', 'ABCDA1234B', '223456789013', '100987654340', @DeptEng, @DesigSE, 61000.00),
('Vikram', 'Singh', 'vikram.s@nexus.com', '+919812345688', 'Male', '2025-08-15', '1992-06-19', 'C Scheme, Jaipur', 'ICICI Bank', '10293847571', 'ICIC0000101', 'ABCDA1234C', '323456789013', '100987654341', @DeptSales, @DesigSales, 52000.00),
('Pooja', 'Joshi', 'pooja.j@nexus.com', '+919812345689', 'Female', '2025-09-01', '1993-01-30', 'Dehradun, Uttarakhand', 'Axis Bank', '10293847572', 'UTIB0000102', 'ABCDA1234D', '423456789013', '100987654342', @DeptHR, @DesigSE, 50000.00),
('Karan', 'Mehta', 'karan.m@nexus.com', '+919812345690', 'Male', '2025-09-01', '1994-10-10', 'Andheri West, Mumbai', 'Kotak Mahindra Bank', '10293847573', 'KKBK0000103', 'ABCDA1234E', '523456789013', '100987654343', @DeptEng, @DesigSE, 63000.00),
('Aishwarya', 'Sen', 'aishwarya.s@nexus.com', '+919812345691', 'Female', '2025-09-15', '1991-04-20', 'Lake Road, Kolkata', 'HDFC Bank', '10293847574', 'HDFC0000104', 'ABCDA1234F', '623456789013', '100987654344', @DeptResearch, @DesigResearch, 82000.00),
('Arjun', 'Bose', 'arjun.b@nexus.com', '+919812345692', 'Male', '2025-10-01', '1988-02-14', 'Ballygunge, Kolkata', 'ICICI Bank', '10293847575', 'ICIC0000105', 'ABCDA1234G', '723456789013', '100987654345', @DeptEng, @DesigTL, 95000.00),
('Swati', 'Deshmukh', 'swati.d@nexus.com', '+919812345693', 'Female', '2025-10-01', '1990-09-15', 'Deccan Gymkhana, Pune', 'Bank of India', '10293847576', 'BKID0000106', 'ABCDA1234H', '823456789013', '100987654346', @DeptFinance, @DesigFinance, 62000.00),
('Deepak', 'Verma', 'deepak.v@nexus.com', '+919812345694', 'Male', '2025-10-15', '1995-11-11', 'Rohini, New Delhi', 'State Bank of India', '10293847577', 'SBIN0000107', 'ABCDA1234I', '923456789013', '100987654347', @DeptOps, @DesigSales, 48000.00),
('Harsh', 'Vardhan', 'harsh.v@nexus.com', '+919812345695', 'Male', '2025-11-01', '1985-05-24', 'Civil Lines, Delhi', 'HDFC Bank', '10293847578', 'HDFC0000108', 'ABCDA1234J', '123456789014', '100987654348', @DeptEng, @DesigDir, 160000.00),
('Shalini', 'Nair', 'shalini.n@nexus.com', '+919812345696', 'Female', '2025-11-01', '1993-07-02', 'Vyttila, Kochi', 'Federal Bank', '10293847579', 'FDRL0000109', 'ABCDB1234A', '223456789014', '100987654349', @DeptHR, @DesigSE, 55000.00),
('Pranav', 'Reddy', 'pranav.r@nexus.com', '+919812345697', 'Male', '2025-11-15', '1992-12-12', 'Banjara Hills, Hyderabad', 'Axis Bank', '10293847580', 'UTIB0000110', 'ABCDB1234B', '323456789014', '100987654350', @DeptEng, @DesigSSE, 75000.00),
('Preeti', 'Desai', 'preeti.d@nexus.com', '+919812345698', 'Female', '2025-12-01', '1994-08-19', 'Navrangpura, Ahmedabad', 'ICICI Bank', '10293847581', 'ICIC0000112', 'ABCDB1234C', '423456789014', '100987654351', @DeptSales, @DesigSales, 51000.00),
('Rahul', 'Sharma', 'rahul.s@nexus.com', '+919812345699', 'Male', '2025-12-01', '1989-10-04', 'Lajpat Nagar, New Delhi', 'Federal Bank', '10293847582', 'FDRL0000113', 'ABCDB1234D', '523456789014', '100987654352', @DeptOps, @DesigTL, 84000.00),
('Meera', 'Pillai', 'meera.p@nexus.com', '+919812345700', 'Female', '2025-12-15', '1991-03-14', 'Kalamassery, Kochi', 'State Bank of India', '10293847583', 'SBIN0000114', 'ABCDB1234E', '623456789014', '100987654353', @DeptResearch, @DesigResearch, 80000.00),
('Sanjay', 'Dutt', 'sanjay.d@nexus.com', '+919812345701', 'Male', '2026-01-01', '1993-07-29', 'Bandra West, Mumbai', 'HDFC Bank', '10293847584', 'HDFC0000115', 'ABCDB1234F', '723456789014', '100987654354', @DeptSales, @DesigSales, 53000.00),
('Shruti', 'Menon', 'shruti.m@nexus.com', '+919812345702', 'Female', '2026-01-01', '1995-04-05', 'Jayanagar, Bangalore', 'Axis Bank', '10293847585', 'UTIB0000116', 'ABCDB1234G', '823456789014', '100987654355', @DeptEng, @DesigSE, 60000.00),
('Aditya', 'Roy', 'aditya.r@nexus.com', '+919812345703', 'Male', '2026-01-15', '1992-02-28', 'Salt Lake, Kolkata', 'ICICI Bank', '10293847586', 'ICIC0000117', 'ABCDB1234H', '923456789014', '100987654356', @DeptEng, @DesigSSE, 77000.00),
('Kavita', 'Rao', 'kavita.r@nexus.com', '+919812345704', 'Female', '2026-02-01', '1990-10-12', 'Malleswaram, Bangalore', 'HDFC Bank', '10293847587', 'HDFC0000118', 'ABCDB1234I', '123456789015', '100987654357', @DeptFinance, @DesigFinance, 63000.00),
('Gaurav', 'Sen', 'gaurav.s@nexus.com', '+919812345705', 'Male', '2026-02-15', '1987-05-19', 'Park Street, Kolkata', 'State Bank of India', '10293847588', 'SBIN0000119', 'ABCDB1234J', '223456789015', '100987654358', @DeptResearch, @DesigTL, 96000.00),
('Prema', 'Nair', 'prema.n@nexus.com', '+919812345706', 'Female', '2026-02-20', '1992-11-12', 'Vyttila, Kochi', 'Federal Bank', '10293847589', 'FDRL0000120', 'ABCDB1234K', '323456789015', '100987654359', @DeptHR, @DesigSE, 56000.00),
('Suresh', 'Pillai', 'suresh.p@nexus.com', '+919812345707', 'Male', '2026-02-25', '1989-08-08', 'Kaloor, Kochi', 'State Bank of India', '10293847590', 'SBIN0000121', 'ABCDB1234L', '423456789015', '100987654360', @DeptOps, @DesigTL, 82000.00);

-- Loop insert employees
DECLARE @LoopCount INT = 1;
DECLARE @TotalSeeds INT = 30;
DECLARE @First VARCHAR(50), @Last VARCHAR(50), @Email VARCHAR(100), @Phone VARCHAR(20), @Gender VARCHAR(10);
DECLARE @DOJ DATE, @DOB DATE, @Address VARCHAR(250), @Bank VARCHAR(50), @AccNo VARCHAR(30), @IFSC VARCHAR(20);
DECLARE @PAN VARCHAR(10), @Aadhar VARCHAR(12), @UAN VARCHAR(12), @DeptID INT, @DesigID INT, @Basic DECIMAL(10,2);
DECLARE @NewEmpID INT;

WHILE @LoopCount <= @TotalSeeds
BEGIN
    SELECT 
        @First = First, @Last = Last, @Email = Email, @Phone = Phone, @Gender = Gender,
        @DOJ = DOJ, @DOB = DOB, @Address = Address, @Bank = Bank, @AccNo = AccNo, @IFSC = IFSC,
        @PAN = PAN, @Aadhar = Aadhar, @UAN = UAN, @DeptID = DeptID, @DesigID = DesigID, @Basic = Basic
    FROM #SeedList
    WHERE ID = @LoopCount;
    
    IF NOT EXISTS (SELECT * FROM dbo.EmployeeDetails WHERE EmailID = @Email)
    BEGIN
        -- Insert Master
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
        VALUES (@First, @Last, @DOJ, '', '', 'Active', @DeptID, @DesigID);
        SET @NewEmpID = SCOPE_IDENTITY();
        
        -- Insert Details
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
        VALUES (@NewEmpID, @First + ' ' + @Last, @DOB, @Gender, @Address, @Phone, @Email, @Bank, @AccNo, @IFSC, 'EMP' + CAST(@NewEmpID AS VARCHAR), @Aadhar, @PAN, @UAN, 'Full-time', 'Single', 'Indian');
        
        -- Insert EmployeeLogin (default pass: employee123)
        INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
        VALUES (@NewEmpID, @Email, '$2a$10$CmqqcesWd9EWQeUjMm4BJecdCwvp8rzTSMb1DpB3gMvxz.999d00m', 'Active');
    END
    
    SET @LoopCount = @LoopCount + 1;
END

DROP TABLE #SeedList;
GO


-- 8. SEED ADMIN TO EMPLOYEE MAPPINGS & EMPLOYEE REPORTING
-- HR assignment model:
-- We have 2 HR Admins: Sneha Iyer (EmpID 1002), Rajesh Kumar (EmpID 1003)
-- Map 15 employees to each HR Admin mapping.
-- We have 1 SuperAdmin: Harsha Reddy (EmpID 1001) who serves as the Reporting Manager.

DECLARE @HRAdmin1 INT, @HRAdmin2 INT, @PayrollAdmin INT, @SuperAdmin INT;
SELECT @SuperAdmin = EmpID FROM dbo.EmployeeDetails WHERE EmailID = 'harsha.r@nexus.com';
SELECT @HRAdmin1 = EmpID FROM dbo.EmployeeDetails WHERE EmailID = 'sneha.iyer@nexus.com';
SELECT @HRAdmin2 = EmpID FROM dbo.EmployeeDetails WHERE EmailID = 'rajesh.k@nexus.com';
SELECT @PayrollAdmin = EmpID FROM dbo.EmployeeDetails WHERE EmailID = 'priya.s@nexus.com';

-- Seed Admin logins reporting hierarchy (they report to SuperAdmin)
INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID) VALUES
(@HRAdmin1, @SuperAdmin),
(@HRAdmin2, @SuperAdmin),
(@PayrollAdmin, @SuperAdmin);

-- HRAdmin assignments (15 employees per HR Admin)
-- General employees start from EmpID 1005 to 1034 (Total 30)
DECLARE @CursorEmpID INT;
DECLARE MappingCursor CURSOR FOR
SELECT EmpID FROM dbo.EmployeeMaster WHERE EmpID >= 1005 AND EmpID <= 1034;

OPEN MappingCursor;
FETCH NEXT FROM MappingCursor INTO @CursorEmpID;

DECLARE @Index INT = 0;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @TargetAdmin INT;
    IF @Index < 15 SET @TargetAdmin = @HRAdmin1;
    ELSE SET @TargetAdmin = @HRAdmin2;

    -- Add HRAdmin mapping (only HRAdmins have employee assignments)
    INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID)
    VALUES (@TargetAdmin, @CursorEmpID);

    -- Add ReportingManager mapping (to SuperAdmin Harsha Reddy)
    INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID)
    VALUES (@CursorEmpID, @SuperAdmin);

    SET @Index = @Index + 1;
    FETCH NEXT FROM MappingCursor INTO @CursorEmpID;
END

CLOSE MappingCursor;
DEALLOCATE MappingCursor;
GO


-- 9. SEED SALARY REVISIONS (INITIAL & INCREMENTS)
DECLARE @CursorEmpID INT, @CursorDOJ DATE, @CursorDesignation VARCHAR(200), @CursorDesignationID INT;
DECLARE @BasicPay DECIMAL(10,2), @HRA DECIMAL(10,2), @Special DECIMAL(10,2), @Medical DECIMAL(10,2), @Conveyance DECIMAL(10,2), @Other DECIMAL(10,2);

DECLARE SalaryCursor CURSOR FOR
SELECT EmpID, DOJ, DesignationID FROM dbo.EmployeeMaster;

OPEN SalaryCursor;
FETCH NEXT FROM SalaryCursor INTO @CursorEmpID, @CursorDOJ, @CursorDesignationID;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Medical = 1250.00;
    SET @Conveyance = 1600.00;
    SET @Other = 2500.00;

    -- Determine salaries based on DesignationID
    IF @CursorDesignationID IN (5) -- Director of Engineering
    BEGIN
        SET @BasicPay = 90000.00;
        SET @HRA = 27000.00;
        SET @Special = 9000.00;
    END
    ELSE IF @CursorDesignationID IN (4, 1) -- Tech Lead or HR Manager
    BEGIN
        SET @BasicPay = 75000.00;
        SET @HRA = 22500.00;
        SET @Special = 7500.00;
    END
    ELSE
    BEGIN
        SET @BasicPay = 50000.00;
        SET @HRA = 15000.00;
        SET @Special = 5000.00;
    END

    -- Insert Initial Revision (Effective June 1, 2025)
    INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
    VALUES (@CursorEmpID, '2025-06-01', @BasicPay, @HRA, @Special, @Medical, @Conveyance, @Other, 12.00, 0.40, 0.00, 'Initial Setup', 1);

    -- Mid-year performance hike (10% hike) starting Jan 2026 for EmpID % 5 = 0
    IF @CursorEmpID % 5 = 0
    BEGIN
        -- Set old one to inactive
        UPDATE dbo.SalaryRevisions SET IsActive = 0 WHERE EmpID = @CursorEmpID AND EffectiveDate = '2025-06-01';
        
        -- Insert increment
        INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
        VALUES (@CursorEmpID, '2026-01-01', @BasicPay * 1.10, @HRA * 1.10, @Special * 1.10, @Medical, @Conveyance, @Other, 12.00, 0.40, 0.00, 'Annual Performance Increment', 1);
    END

    FETCH NEXT FROM SalaryCursor INTO @CursorEmpID, @CursorDOJ, @CursorDesignationID;
END

CLOSE SalaryCursor;
DEALLOCATE SalaryCursor;
GO


-- 10. SEED LEAVES HISTORY
DECLARE @EmpLoopID INT;
DECLARE LeaveSeedCursor CURSOR FOR
SELECT EmpID FROM dbo.EmployeeMaster WHERE EmpID >= 1005;

OPEN LeaveSeedCursor;
FETCH NEXT FROM LeaveSeedCursor INTO @EmpLoopID;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Approved Unpaid Leave in Nov 2025 (Nov 12 - Nov 14)
    IF @EmpLoopID % 4 = 0
    BEGIN
        INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
        VALUES (@EmpLoopID, 'Unpaid Leave', '2025-11-12', '2025-11-14', 'Approved', '2025-11-01', 'Personal emergency', 3, 3, 'no', 'Active');
    END

    -- Approved Casual Leave in Jan 2026 (Jan 15 - Jan 16)
    IF @EmpLoopID % 3 = 0
    BEGIN
        INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
        VALUES (@EmpLoopID, 'Casual Leave', '2026-01-15', '2026-01-16', 'Approved', '2026-01-05', 'Family function', 2, 2, 'yes', 'Active');
    END

    -- Approved Sick Leave in Mar 2026 (Mar 09)
    IF @EmpLoopID % 5 = 0
    BEGIN
        INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
        VALUES (@EmpLoopID, 'Sick Leave', '2026-03-09', '2026-03-09', 'Approved', '2026-03-09', 'Fever', 1, 1, 'yes', 'Active');
    END

    FETCH NEXT FROM LeaveSeedCursor INTO @EmpLoopID;
END

CLOSE LeaveSeedCursor;
DEALLOCATE LeaveSeedCursor;
GO


-- 11. SEED 12 MONTHS OF ATTENDANCE HISTORY (NO PAYROLL HISTORY PRE-SEEDED)
DECLARE @StartDate DATE = '2025-06-01';
DECLARE @EndDate DATE = '2026-05-31';
DECLARE @CurrentDate DATE = @StartDate;
DECLARE @DayOfWeek INT;
DECLARE @AttendanceEmpID INT;

WHILE @CurrentDate <= @EndDate
BEGIN
    DECLARE @DayName VARCHAR(20) = DATENAME(dw, @CurrentDate);

    IF @DayName <> 'Saturday' AND @DayName <> 'Sunday'
    BEGIN
        DECLARE AttSeedCursor CURSOR FOR
        SELECT EmpID FROM dbo.EmployeeMaster WHERE EmpID >= 1005;

        OPEN AttSeedCursor;
        FETCH NEXT FROM AttSeedCursor INTO @AttendanceEmpID;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Check if on approved leave
            IF EXISTS (SELECT * FROM dbo.EmployeeLeaveDetails WHERE EmpID = @AttendanceEmpID AND LeaveStatus = 'Approved' AND @CurrentDate BETWEEN FromDate AND ToDate)
            BEGIN
                INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                VALUES (@AttendanceEmpID, @CurrentDate, 'On Leave', NULL, NULL, NULL, NULL, NULL);
            END
            ELSE
            BEGIN
                -- Random simulation
                DECLARE @RandomVal INT = ABS(BINARY_CHECKSUM(@AttendanceEmpID, @CurrentDate)) % 100;

                IF @RandomVal < 94
                BEGIN
                    -- Present
                    INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                    VALUES (@AttendanceEmpID, @CurrentDate, 'Present', CAST(@CurrentDate AS DATETIME) + ' 09:00:00', 18.00, '09:00:00', '18:00:00', 9.00);
                END
                ELSE IF @RandomVal < 98
                BEGIN
                    -- Late
                    INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                    VALUES (@AttendanceEmpID, @CurrentDate, 'Late', CAST(@CurrentDate AS DATETIME) + ' 10:15:00', 18.00, '10:15:00', '18:00:00', 7.75);
                END
                ELSE
                BEGIN
                    -- Absent
                    INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                    VALUES (@AttendanceEmpID, @CurrentDate, 'Absent', NULL, NULL, NULL, NULL, 0.00);
                END
            END

            FETCH NEXT FROM AttSeedCursor INTO @AttendanceEmpID;
        END

        CLOSE AttSeedCursor;
        DEALLOCATE AttSeedCursor;
    END

    SET @CurrentDate = DATEADD(day, 1, @CurrentDate);
END
GO


-- 12. SEED MOCK SYSTEM NOTIFICATIONS & AUDIT LOGS
INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
VALUES
(NULL, 'System Migration Completed', 'Nexus HRMS has been successfully migrated to Phase 1 Target Architecture.', 0, GETDATE()),
(NULL, 'Upcoming Holidays List Updated', 'Corporate Holiday Master schedule for 2026 has been loaded in Settings.', 0, GETDATE()),
(1005, 'Leave Request approved', 'Your Casual Leave application has been approved.', 1, GETDATE());

INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc, ActionTime)
VALUES
(1001, 'DATABASE_MIGRATION', 'Executed target database schema transformations.', '2026-06-09 10:00:00'),
(1001, 'ROLE_RESTRUCTURING', 'Migrated login credentials to isolated role-based logins.', GETDATE()),
(1001, 'SEED_DATA', 'Generated 12 months history logs and employee roster (Excluding payroll history).', GETDATE());
GO
