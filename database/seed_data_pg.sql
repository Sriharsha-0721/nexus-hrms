-- ==================================================
-- NEXUS HRMS: TARGET DATABASE SEED DATA SCRIPT (POSTGRESQL)
-- ==================================================

-- 1. SEED COMPANY SETTINGS (SINGLETON)
INSERT INTO dbo.CompanySettings (CompanyName, CompanyAddress, CompanyPAN, CompanyGST, PFNumber, ESINumber, PayrollProcessingDay, SalaryCreditDay, ContactNumber, SupportEmail, CompanyLogo)
SELECT 'Nexus Software Solutions Private Limited', 
       'Plot No. 12, Hitech City Main Rd, Cyber Gateway, Hyderabad, Telangana 500081',
       'AAACN1234F',
       '36AAACN1234F1Z0',
       'AP/HYD/0099887/000',
       '51000998870001001',
       25, 
       1,  
       '+914066554433',
       'support@nexus.com',
       '/assets/images/logo.png'
WHERE NOT EXISTS (SELECT 1 FROM dbo.CompanySettings);

-- 2. SEED HOLIDAY MASTER
INSERT INTO dbo.HolidayMaster (HolidayName, HolidayDate, HolidayType, IsOptional)
SELECT name, date::date, type, opt::boolean FROM (VALUES
    ('New Year Day', '2026-01-01', 'Regional', true),
    ('Makar Sankranti', '2026-01-14', 'Regional', false),
    ('Republic Day', '2026-01-26', 'National', false),
    ('Holi', '2026-03-06', 'Regional', true),
    ('Good Friday', '2026-04-03', 'National', false),
    ('Independence Day', '2026-08-15', 'National', false),
    ('Gandhi Jayanti', '2026-10-02', 'National', false),
    ('Vijayadashami (Dussehra)', '2026-10-11', 'National', false),
    ('Diwali (Deepavali)', '2026-11-12', 'National', false),
    ('Christmas Day', '2026-12-25', 'National', false)
) AS v(name, date, type, opt)
WHERE NOT EXISTS (SELECT 1 FROM dbo.HolidayMaster WHERE HolidayDate = v.date::date);

-- 3. SEED PAYROLL CALENDAR (12 MONTHS)
INSERT INTO dbo.PayrollCalendar (PayrollMonth, PayrollYear, AttendanceCutoffDate, PayrollProcessingDate, SalaryCreditDate, LockDate, IsActive)
SELECT month, year, cutoff::date, proc::date, credit::date, lock::date, active::boolean FROM (VALUES
    (6, 2026, '2026-06-30', '2026-07-04', '2026-07-05', '2026-07-07', true),
    (7, 2026, '2026-07-31', '2026-08-04', '2026-08-05', '2026-08-07', true),
    (8, 2026, '2026-08-31', '2026-09-04', '2026-09-05', '2026-09-07', true),
    (9, 2026, '2026-09-30', '2026-10-04', '2026-10-05', '2026-10-07', true),
    (10, 2026, '2026-10-31', '2026-11-04', '2026-11-05', '2026-11-07', true),
    (11, 2026, '2026-11-30', '2026-12-04', '2026-12-05', '2026-12-07', true),
    (12, 2026, '2026-12-31', '2027-01-04', '2027-01-05', '2027-01-07', true),
    (1, 2027, '2027-01-31', '2027-02-04', '2027-02-05', '2027-02-07', true),
    (2, 2027, '2027-02-28', '2027-03-04', '2027-03-05', '2027-03-07', true),
    (3, 2027, '2027-03-31', '2027-04-04', '2027-04-05', '2027-04-07', true),
    (4, 2027, '2027-04-30', '2027-05-04', '2027-05-05', '2027-05-07', true),
    (5, 2027, '2027-05-31', '2027-06-04', '2027-06-05', '2027-06-07', true)
) AS v(month, year, cutoff, proc, credit, lock, active)
WHERE NOT EXISTS (SELECT 1 FROM dbo.PayrollCalendar WHERE PayrollMonth = v.month AND PayrollYear = v.year);

-- 4. SEED LEAVE POLICIES
INSERT INTO dbo.LeavePolicies (LeaveType, MaxAllowedDays, IsCarryForward)
SELECT type, allowed, carry::boolean FROM (VALUES
    ('Sick Leave', 10, false),
    ('Casual Leave', 12, false),
    ('Earned Leave', 15, true),
    ('Maternity Leave', 90, false),
    ('Paternity Leave', 10, false),
    ('Unpaid Leave', 365, false)
) AS v(type, allowed, carry)
WHERE NOT EXISTS (SELECT 1 FROM dbo.LeavePolicies WHERE LeaveType = v.type);

-- 5. SEED DEPARTMENTS
INSERT INTO dbo.Departments (DepartmentName)
SELECT name FROM (VALUES
    ('Human Resources'), ('Engineering'), ('Finance'), ('Operations'), ('Sales'), ('Research')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Departments WHERE DepartmentName = v.name);

-- 6. SEED DESIGNATIONS
INSERT INTO dbo.Designations (DesignationName, Description)
SELECT name, descr FROM (VALUES
    ('HR Manager', 'Manages HR operations'),
    ('Software Engineer', 'Core software developer'),
    ('Senior Software Engineer', 'Experienced software developer'),
    ('Tech Lead', 'Technical team lead'),
    ('Director of Engineering', 'Oversees engineering division'),
    ('Finance Analyst', 'Handles payroll and accounting'),
    ('Sales Associate', 'Enterprise sales executive'),
    ('Research Scientist', 'Performs core R&D activities')
) AS v(name, descr)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Designations WHERE DesignationName = v.name);

-- 7. SEED ADMIINISTRATORS & EMPLOYEES USING PL/pgSQL
DO $$
DECLARE
    dept_hr INT; dept_eng INT; dept_finance INT; dept_ops INT; dept_sales INT; dept_research INT;
    desig_hr_mgr INT; desig_se INT; desig_sse INT; desig_tl INT; desig_dir INT; desig_finance INT; desig_sales INT; desig_research INT;
    super_admin_id INT; hr_admin_1_id INT; hr_admin_2_id INT; payroll_admin_id INT;
    new_emp_id INT;
    emp_rec RECORD;
    idx INT := 0;
BEGIN
    SELECT DepartmentID INTO dept_hr FROM dbo.Departments WHERE DepartmentName = 'Human Resources';
    SELECT DepartmentID INTO dept_eng FROM dbo.Departments WHERE DepartmentName = 'Engineering';
    SELECT DepartmentID INTO dept_finance FROM dbo.Departments WHERE DepartmentName = 'Finance';
    SELECT DepartmentID INTO dept_ops FROM dbo.Departments WHERE DepartmentName = 'Operations';
    SELECT DepartmentID INTO dept_sales FROM dbo.Departments WHERE DepartmentName = 'Sales';
    SELECT DepartmentID INTO dept_research FROM dbo.Departments WHERE DepartmentName = 'Research';

    SELECT DesignationID INTO desig_hr_mgr FROM dbo.Designations WHERE DesignationName = 'HR Manager';
    SELECT DesignationID INTO desig_se FROM dbo.Designations WHERE DesignationName = 'Software Engineer';
    SELECT DesignationID INTO desig_sse FROM dbo.Designations WHERE DesignationName = 'Senior Software Engineer';
    SELECT DesignationID INTO desig_tl FROM dbo.Designations WHERE DesignationName = 'Tech Lead';
    SELECT DesignationID INTO desig_dir FROM dbo.Designations WHERE DesignationName = 'Director of Engineering';
    SELECT DesignationID INTO desig_finance FROM dbo.Designations WHERE DesignationName = 'Finance Analyst';
    SELECT DesignationID INTO desig_sales FROM dbo.Designations WHERE DesignationName = 'Sales Associate';
    SELECT DesignationID INTO desig_research FROM dbo.Designations WHERE DesignationName = 'Research Scientist';

    -- 7.1 SuperAdmin: Harsha Reddy
    IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeDetails WHERE EmailID = 'harsha.r@nexus.com') THEN
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
        VALUES ('Harsha', 'Reddy', '2022-01-01', 'Director of Engineering', 'Engineering', 'Active', dept_eng, desig_dir)
        RETURNING EmpID INTO super_admin_id;
        
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
        VALUES (super_admin_id, 'Harsha Reddy', '1980-04-12', 'Male', 'Jubilee Hills, Hyderabad', '+919988771122', 'harsha.r@nexus.com', 'State Bank of India', '10294857201', 'SBIN0001234', 'LEGACY_ADM01', '998877665544', 'AAAAA9999A', '100987654321', 'Full-time', 'Married', 'Indian');
        
        INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
        VALUES (super_admin_id, 'superadmin@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'SuperAdmin', 'Active');
    ELSE
        SELECT EmpID INTO super_admin_id FROM dbo.EmployeeDetails WHERE EmailID = 'harsha.r@nexus.com';
    END IF;

    -- 7.2 HRAdmin 1: Sneha Iyer
    IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeDetails WHERE EmailID = 'sneha.iyer@nexus.com') THEN
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
        VALUES ('Sneha', 'Iyer', '2023-05-15', 'HR Manager', 'Human Resources', 'Active', dept_hr, desig_hr_mgr)
        RETURNING EmpID INTO hr_admin_1_id;
        
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
        VALUES (hr_admin_1_id, 'Sneha Iyer', '1988-12-04', 'Female', 'Banjara Hills, Hyderabad', '+919876543210', 'sneha.iyer@nexus.com', 'HDFC Bank', '50294857102', 'HDFC0000123', 'LEGACY_ADM02', '987654321098', 'ABCDE1234B', '100987654323', 'Full-time', 'Married', 'Indian');
        
        INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
        VALUES (hr_admin_1_id, 'sneha.iyer@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'HRAdmin', 'Active');
    ELSE
        SELECT EmpID INTO hr_admin_1_id FROM dbo.EmployeeDetails WHERE EmailID = 'sneha.iyer@nexus.com';
    END IF;

    -- 7.3 HRAdmin 2: Rajesh Kumar
    IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeDetails WHERE EmailID = 'rajesh.k@nexus.com') THEN
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
        VALUES ('Rajesh', 'Kumar', '2024-01-10', 'HR Executive', 'Human Resources', 'Active', dept_hr, desig_hr_mgr)
        RETURNING EmpID INTO hr_admin_2_id;
        
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
        VALUES (hr_admin_2_id, 'Rajesh Kumar', '1982-08-15', 'Male', 'Madhapur, Hyderabad', '+919988776655', 'rajesh.k@nexus.com', 'State Bank of India', '30294857201', 'SBIN0001234', 'LEGACY_ADM03', '123456789012', 'ABCDE1234A', '100987654322', 'Full-time', 'Married', 'Indian');
        
        INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
        VALUES (hr_admin_2_id, 'rajesh.k@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'HRAdmin', 'Active');
    ELSE
        SELECT EmpID INTO hr_admin_2_id FROM dbo.EmployeeDetails WHERE EmailID = 'rajesh.k@nexus.com';
    END IF;

    -- 7.4 PayrollAdmin: Priya Sharma
    IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeDetails WHERE EmailID = 'priya.s@nexus.com') THEN
        INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
        VALUES ('Priya', 'Sharma', '2023-08-20', 'Payroll Specialist', 'Finance', 'Active', dept_finance, desig_finance)
        RETURNING EmpID INTO payroll_admin_id;
        
        INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
        VALUES (payroll_admin_id, 'Priya Sharma', '1990-10-10', 'Female', 'Kondapur, Hyderabad', '+919988998899', 'priya.s@nexus.com', 'ICICI Bank', '60294857103', 'ICIC0000111', 'LEGACY_ADM04', '887766554433', 'ABCDE1234C', '100987654324', 'Full-time', 'Single', 'Indian');
        
        INSERT INTO dbo.AdminLogins (EmpID, Username, Password, Role, UserStatus)
        VALUES (payroll_admin_id, 'priya.s@nexus.com', '$2a$10$UpjFFPeMIoipNKfM/Le3WudPIxdd4JKLpfy36zYDT6evHO70XqUvS', 'PayrollAdmin', 'Active');
    ELSE
        SELECT EmpID INTO payroll_admin_id FROM dbo.EmployeeDetails WHERE EmailID = 'priya.s@nexus.com';
    END IF;

    -- 7.5 Seed Mappings for Admin Logins
    INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID)
    VALUES (hr_admin_1_id, super_admin_id),
           (hr_admin_2_id, super_admin_id),
           (payroll_admin_id, super_admin_id)
    ON CONFLICT (EmployeeEmpID) DO NOTHING;

    -- 7.6 Create Temp Employee List for bulk load
    CREATE TEMP TABLE temp_employees (
        first_name VARCHAR(50), last_name VARCHAR(50), email VARCHAR(100), phone VARCHAR(20), gender VARCHAR(10),
        doj DATE, dob DATE, address VARCHAR(250), bank VARCHAR(50), acc VARCHAR(30), ifsc VARCHAR(20),
        pan VARCHAR(10), aadhar VARCHAR(12), uan VARCHAR(12), dept_id INT, desig_id INT
    ) ON COMMIT DROP;

    INSERT INTO temp_employees VALUES
    ('Amit', 'Patel', 'amit.patel@nexus.com', '+919812345678', 'Male', '2025-06-01', '1992-04-14', 'Gachibowli, Hyderabad', 'ICICI Bank', '10293847561', 'ICIC0000111', 'ABCDE2234C', '223456789012', '100987654331', dept_eng, desig_se),
    ('Sunil', 'Rao', 'sunil.rao@nexus.com', '+919812345679', 'Male', '2025-06-01', '1990-11-20', 'Jayanagar, Bangalore', 'HDFC Bank', '10293847562', 'HDFC0000222', 'ABCDE3234D', '323456789012', '100987654332', dept_eng, desig_sse),
    ('Ananya', 'Reddy', 'ananya.reddy@nexus.com', '+919812345680', 'Female', '2025-06-01', '1995-07-25', 'Banjara Hills, Hyderabad', 'Axis Bank', '10293847563', 'UTIB0000333', 'ABCDE4234E', '423456789012', '100987654333', dept_eng, desig_tl),
    ('Sneha', 'Reddy', 'sneha.reddy@nexus.com', '+919812345681', 'Female', '2025-06-15', '1993-02-18', 'Adyar, Chennai', 'Canara Bank', '10293847564', 'CNRB0000444', 'ABCDE5234F', '523456789012', '100987654334', dept_hr, desig_hr_mgr),
    ('Rohan', 'Desai', 'rohan.desai@nexus.com', '+919812345682', 'Male', '2025-06-15', '1989-09-30', 'Kondapur, Hyderabad', 'State Bank of India', '10293847565', 'SBIN0000555', 'ABCDE6234G', '623456789012', '100987654335', dept_sales, desig_sales),
    ('Neha', 'Sharma', 'neha.sharma@nexus.com', '+919812345683', 'Female', '2025-07-01', '1994-05-12', 'Miyapur, Hyderabad', 'Punjab National Bank', '10293847566', 'PUNB0000666', 'ABCDE7234H', '723456789012', '100987654336', dept_finance, desig_finance),
    ('Vijay', 'Verma', 'vijay.verma@nexus.com', '+919812345684', 'Male', '2025-07-01', '1991-03-05', 'Malviya Nagar, Jaipur', 'Bank of Baroda', '10293847567', 'BARB0000777', 'ABCDE8234I', '823456789012', '100987654337', dept_ops, desig_tl),
    ('Sandeep', 'Nair', 'sandeep.nair@nexus.com', '+919812345685', 'Male', '2025-07-15', '1987-10-22', 'Kochi, Kerala', 'Federal Bank', '10293847568', 'FDRL0000888', 'ABCDE9234J', '923456789012', '100987654338', dept_research, desig_research),
    ('Manoj', 'Mishra', 'manoj.mishra@nexus.com', '+919812345686', 'Male', '2025-08-01', '1986-12-15', 'Noida, Uttar Pradesh', 'State Bank of India', '10293847569', 'SBIN0000999', 'ABCDA1234A', '123456789013', '100987654339', dept_ops, desig_finance),
    ('Divya', 'Choudhary', 'divya.c@nexus.com', '+919812345687', 'Female', '2025-08-01', '1996-08-08', 'Kothrud, Pune', 'HDFC Bank', '10293847570', 'HDFC0000100', 'ABCDA1234B', '223456789013', '100987654340', dept_eng, desig_se),
    ('Vikram', 'Singh', 'vikram.s@nexus.com', '+919812345688', 'Male', '2025-08-15', '1992-06-19', 'C Scheme, Jaipur', 'ICICI Bank', '10293847571', 'ICIC0000101', 'ABCDA1234C', '323456789013', '100987654341', dept_sales, desig_sales),
    ('Pooja', 'Joshi', 'pooja.j@nexus.com', '+919812345689', 'Female', '2025-09-01', '1993-01-30', 'Dehradun, Uttarakhand', 'Axis Bank', '10293847572', 'UTIB0000102', 'ABCDA1234D', '423456789013', '100987654342', dept_hr, desig_se),
    ('Karan', 'Mehta', 'karan.m@nexus.com', '+919812345690', 'Male', '2025-09-01', '1994-10-10', 'Andheri West, Mumbai', 'Kotak Mahindra Bank', '10293847573', 'KKBK0000103', 'ABCDA1234E', '523456789013', '100987654343', dept_eng, desig_se),
    ('Aishwarya', 'Sen', 'aishwarya.s@nexus.com', '+919812345691', 'Female', '2025-09-15', '1991-04-20', 'Lake Road, Kolkata', 'HDFC Bank', '10293847574', 'HDFC0000104', 'ABCDA1234F', '623456789013', '100987654344', dept_research, desig_research),
    ('Arjun', 'Bose', 'arjun.b@nexus.com', '+919812345692', 'Male', '2025-10-01', '1988-02-14', 'Ballygunge, Kolkata', 'ICICI Bank', '10293847575', 'ICIC0000105', 'ABCDA1234G', '723456789013', '100987654345', dept_eng, desig_tl),
    ('Swati', 'Deshmukh', 'swati.d@nexus.com', '+919812345693', 'Female', '2025-10-01', '1990-09-15', 'Deccan Gymkhana, Pune', 'Bank of India', '10293847576', 'BKID0000106', 'ABCDA1234H', '823456789013', '100987654346', dept_finance, desig_finance),
    ('Deepak', 'Verma', 'deepak.v@nexus.com', '+919812345694', 'Male', '2025-10-15', '1995-11-11', 'Rohini, New Delhi', 'State Bank of India', '10293847577', 'SBIN0000107', 'ABCDA1234I', '923456789013', '100987654347', dept_ops, desig_sales),
    ('Harsh', 'Vardhan', 'harsh.v@nexus.com', '+919812345695', 'Male', '2025-11-01', '1985-05-24', 'Civil Lines, Delhi', 'HDFC Bank', '10293847578', 'HDFC0000108', 'ABCDA1234J', '123456789014', '100987654348', dept_eng, desig_dir),
    ('Shalini', 'Nair', 'shalini.n@nexus.com', '+919812345696', 'Female', '2025-11-01', '1993-07-02', 'Vyttila, Kochi', 'Federal Bank', '10293847579', 'FDRL0000109', 'ABCDB1234A', '223456789014', '100987654349', dept_hr, desig_se),
    ('Pranav', 'Reddy', 'pranav.r@nexus.com', '+919812345697', 'Male', '2025-11-15', '1992-12-12', 'Banjara Hills, Hyderabad', 'Axis Bank', '10293847580', 'UTIB0000110', 'ABCDB1234B', '323456789014', '100987654350', dept_eng, desig_sse),
    ('Preeti', 'Desai', 'preeti.d@nexus.com', '+919812345698', 'Female', '2025-12-01', '1994-08-19', 'Navrangpura, Ahmedabad', 'ICICI Bank', '10293847581', 'ICIC0000112', 'ABCDB1234C', '423456789014', '100987654351', dept_sales, desig_sales),
    ('Rahul', 'Sharma', 'rahul.s@nexus.com', '+919812345699', 'Male', '2025-12-01', '1989-10-04', 'Lajpat Nagar, New Delhi', 'Federal Bank', '10293847582', 'FDRL0000113', 'ABCDB1234D', '523456789014', '100987654352', dept_ops, desig_tl),
    ('Meera', 'Pillai', 'meera.p@nexus.com', '+919812345700', 'Female', '2025-12-15', '1991-03-14', 'Kalamassery, Kochi', 'State Bank of India', '10293847583', 'SBIN0000114', 'ABCDB1234E', '623456789014', '100987654353', dept_research, desig_research),
    ('Sanjay', 'Dutt', 'sanjay.d@nexus.com', '+919812345701', 'Male', '2026-01-01', '1993-07-29', 'Bandra West, Mumbai', 'HDFC Bank', '10293847584', 'HDFC0000115', 'ABCDB1234F', '723456789014', '100987654354', dept_sales, desig_sales),
    ('Shruti', 'Menon', 'shruti.m@nexus.com', '+919812345702', 'Female', '2026-01-01', '1995-04-05', 'Jayanagar, Bangalore', 'Axis Bank', '10293847585', 'UTIB0000116', 'ABCDB1234G', '823456789014', '100987654355', dept_eng, desig_se),
    ('Aditya', 'Roy', 'aditya.r@nexus.com', '+919812345703', 'Male', '2026-01-15', '1992-02-28', 'Salt Lake, Kolkata', 'ICICI Bank', '10293847586', 'ICIC0000117', 'ABCDB1234H', '923456789014', '100987654356', dept_eng, desig_sse),
    ('Kavita', 'Rao', 'kavita.r@nexus.com', '+919812345704', 'Female', '2026-02-01', '1990-10-12', 'Malleswaram, Bangalore', 'HDFC Bank', '10293847587', 'HDFC0000118', 'ABCDB1234I', '123456789015', '100987654357', dept_finance, desig_finance),
    ('Gaurav', 'Sen', 'gaurav.s@nexus.com', '+919812345705', 'Male', '2026-02-15', '1987-05-19', 'Park Street, Kolkata', 'State Bank of India', '10293847588', 'SBIN0000119', 'ABCDB1234J', '223456789015', '100987654358', dept_research, desig_tl),
    ('Prema', 'Nair', 'prema.n@nexus.com', '+919812345706', 'Female', '2026-02-20', '1992-11-12', 'Vyttila, Kochi', 'Federal Bank', '10293847589', 'FDRL0000120', 'ABCDB1234K', '323456789015', '100987654359', dept_hr, desig_se),
    ('Suresh', 'Pillai', 'suresh.p@nexus.com', '+919812345707', 'Male', '2026-02-25', '1989-08-08', 'Kaloor, Kochi', 'State Bank of India', '10293847590', 'SBIN0000121', 'ABCDB1234L', '423456789015', '100987654360', dept_ops, desig_tl);

    -- Loop to insert 30 employees
    FOR emp_rec IN (SELECT * FROM temp_employees) LOOP
        IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeDetails WHERE EmailID = emp_rec.email) THEN
            INSERT INTO dbo.EmployeeMaster (FirstName, LastName, DOJ, Designation, Department, EmpStatus, DepartmentID, DesignationID)
            VALUES (emp_rec.first_name, emp_rec.last_name, emp_rec.doj, '', '', 'Active', emp_rec.dept_id, emp_rec.desig_id)
            RETURNING EmpID INTO new_emp_id;

            INSERT INTO dbo.EmployeeDetails (EmpID, FullName, DOB, Gender, Address, Phone, EmailID, BankName, BankAccountNo, IFSCCode, UPPID, AadharNo, PANNo, UANNo, EmploymentType, MaritalStatus, Nationality)
            VALUES (new_emp_id, emp_rec.first_name || ' ' || emp_rec.last_name, emp_rec.dob, emp_rec.gender, emp_rec.address, emp_rec.phone, emp_rec.email, emp_rec.bank, emp_rec.acc, emp_rec.ifsc, 'EMP' || new_emp_id, emp_rec.aadhar, emp_rec.pan, emp_rec.uan, 'Full-time', 'Single', 'Indian');

            INSERT INTO dbo.EmployeeLogins (EmpID, Username, Password, UserStatus)
            VALUES (new_emp_id, emp_rec.email, '$2a$10$CmqqcesWd9EWQeUjMm4BJecdCwvp8rzTSMb1DpB3gMvxz.999d00m', 'Active');

            -- HR Admin mapping
            IF idx < 15 THEN
                INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID)
                VALUES (hr_admin_1_id, new_emp_id);
            ELSE
                INSERT INTO dbo.AdminEmployeeMapping (AdminEmpID, EmployeeEmpID)
                VALUES (hr_admin_2_id, new_emp_id);
            END IF;

            -- Reporting Hierarchy
            INSERT INTO dbo.EmployeeReporting (EmployeeEmpID, ManagerEmpID)
            VALUES (new_emp_id, super_admin_id);

            idx := idx + 1;
        END IF;
    END LOOP;

    -- 7.7 Seed Initial Salary Revisions
    FOR emp_rec IN (SELECT EmpID, DesignationID FROM dbo.EmployeeMaster) LOOP
        IF NOT EXISTS (SELECT 1 FROM dbo.SalaryRevisions WHERE EmpID = emp_rec.EmpID) THEN
            IF emp_rec.DesignationID = desig_dir THEN
                INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                VALUES (emp_rec.EmpID, '2025-06-01', 90000.00, 27000.00, 9000.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Initial Setup', true);
            ELSIF emp_rec.DesignationID IN (desig_tl, desig_hr_mgr) THEN
                INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                VALUES (emp_rec.EmpID, '2025-06-01', 75000.00, 22500.00, 7500.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Initial Setup', true);
            ELSE
                INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                VALUES (emp_rec.EmpID, '2025-06-01', 50000.00, 15000.00, 5000.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Initial Setup', true);
            END IF;

            -- 10% performance hike starting Jan 2026 for EmpID % 5 = 0
            IF emp_rec.EmpID % 5 = 0 THEN
                UPDATE dbo.SalaryRevisions SET IsActive = false WHERE EmpID = emp_rec.EmpID AND EffectiveDate = '2025-06-01';

                IF emp_rec.DesignationID = desig_dir THEN
                    INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                    VALUES (emp_rec.EmpID, '2026-01-01', 99000.00, 29700.00, 9900.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Annual Performance Increment', true);
                ELSIF emp_rec.DesignationID IN (desig_tl, desig_hr_mgr) THEN
                    INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                    VALUES (emp_rec.EmpID, '2026-01-01', 82500.00, 24750.00, 8250.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Annual Performance Increment', true);
                ELSE
                    INSERT INTO dbo.SalaryRevisions (EmpID, EffectiveDate, BasicSalary, HouseRentAllowance, SpecialAllowance, MedicalAllowance, ConveyanceAllowance, OtherAllowance, ProvidentFundPercent, ProfessionalTaxPercent, TDS, Remarks, IsActive)
                    VALUES (emp_rec.EmpID, '2026-01-01', 55000.00, 16500.00, 5500.00, 1250.00, 1600.00, 2500.00, 12.00, 0.40, 0.00, 'Annual Performance Increment', true);
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 7.8 Seed Leaves History
    FOR emp_rec IN (SELECT EmpID FROM dbo.EmployeeMaster WHERE EmpID >= 1005) LOOP
        -- Approved Unpaid Leave in Nov 2025 (Nov 12 - Nov 14)
        IF emp_rec.EmpID % 4 = 0 THEN
            INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
            VALUES (emp_rec.EmpID, 'Unpaid Leave', '2025-11-12', '2025-11-14', 'Approved', '2025-11-01', 'Personal emergency', 3, 3, 'no', 'Active');
        END IF;

        -- Approved Casual Leave in Jan 2026 (Jan 15 - Jan 16)
        IF emp_rec.EmpID % 3 = 0 THEN
            INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
            VALUES (emp_rec.EmpID, 'Casual Leave', '2026-01-15', '2026-01-16', 'Approved', '2026-01-05', 'Family function', 2, 2, 'yes', 'Active');
        END IF;

        -- Approved Sick Leave in Mar 2026 (Mar 09)
        IF emp_rec.EmpID % 5 = 0 THEN
            INSERT INTO dbo.EmployeeLeaveDetails (EmpID, LeaveType, FromDate, ToDate, LeaveStatus, LeaveDate, LeaveReason, LeaveDays, TotalDays, IsPaidLeave, EmpStatus)
            VALUES (emp_rec.EmpID, 'Sick Leave', '2026-03-09', '2026-03-09', 'Approved', '2026-03-09', 'Fever', 1, 1, 'yes', 'Active');
        END IF;
    END LOOP;

    -- 7.9 Seed 12 Months of Attendance History
    DECLARE
        start_date DATE := '2025-06-01';
        end_date DATE := '2026-05-31';
        current_date_val DATE := start_date;
        random_val INT;
    BEGIN
        WHILE current_date_val <= end_date LOOP
            -- Skip weekends (0=Sunday, 6=Saturday)
            IF EXTRACT(DOW FROM current_date_val) NOT IN (0, 6) THEN
                FOR emp_rec IN (SELECT EmpID FROM dbo.EmployeeMaster WHERE EmpID >= 1005) LOOP
                    IF EXISTS (SELECT 1 FROM dbo.EmployeeLeaveDetails WHERE EmpID = emp_rec.EmpID AND LeaveStatus = 'Approved' AND current_date_val BETWEEN FromDate AND ToDate) THEN
                        INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                        VALUES (emp_rec.EmpID, current_date_val, 'On Leave', NULL, NULL, NULL, NULL, NULL)
                        ON CONFLICT (EmpID, AttendanceDate) DO NOTHING;
                    ELSE
                        -- Random seed simulation
                        random_val := floor(random() * 100);
                        IF random_val < 94 THEN
                            INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                            VALUES (emp_rec.EmpID, current_date_val, 'Present', (current_date_val || ' 09:00:00')::TIMESTAMP, 18.00, '09:00:00', '18:00:00', 9.00)
                            ON CONFLICT (EmpID, AttendanceDate) DO NOTHING;
                        ELSIF random_val < 98 THEN
                            INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                            VALUES (emp_rec.EmpID, current_date_val, 'Late', (current_date_val || ' 10:15:00')::TIMESTAMP, 18.00, '10:15:00', '18:00:00', 7.75)
                            ON CONFLICT (EmpID, AttendanceDate) DO NOTHING;
                        ELSE
                            INSERT INTO dbo.EmployeeAttendance (EmpID, AttendanceDate, AttendanceStatus, CheckInTime, CheckOutTime, ClockIn, ClockOut, TotalHours)
                            VALUES (emp_rec.EmpID, current_date_val, 'Absent', NULL, NULL, NULL, NULL, 0.00)
                            ON CONFLICT (EmpID, AttendanceDate) DO NOTHING;
                        END IF;
                    END IF;
                END LOOP;
            END IF;
            current_date_val := current_date_val + 1;
        END LOOP;
    END;
END $$;

-- 8. SEED MOCK SYSTEM NOTIFICATIONS & AUDIT LOGS
INSERT INTO dbo.Notifications (EmpID, Title, Message, IsRead, CreatedAt)
VALUES
(NULL, 'System Migration Completed', 'Nexus HRMS has been successfully migrated to Phase 1 Target Architecture.', false, CURRENT_TIMESTAMP),
(NULL, 'Upcoming Holidays List Updated', 'Corporate Holiday Master schedule for 2026 has been loaded in Settings.', false, CURRENT_TIMESTAMP),
(1005, 'Leave Request approved', 'Your Casual Leave application has been approved.', true, CURRENT_TIMESTAMP);

INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc, ActionTime)
VALUES
(1001, 'DATABASE_MIGRATION', 'Executed target database schema transformations.', '2026-06-09 10:00:00'::timestamp),
(1001, 'ROLE_RESTRUCTURING', 'Migrated login credentials to isolated role-based logins.', CURRENT_TIMESTAMP),
(1001, 'SEED_DATA', 'Generated 12 months history logs and employee roster (Excluding payroll history).', CURRENT_TIMESTAMP);
