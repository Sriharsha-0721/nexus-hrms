# PostgreSQL Migration Validation & Compatibility Report

This report presents a side-by-side comparison of the Microsoft SQL Server (MSSQL) database and the migrated Supabase PostgreSQL database.

## 1. Migration Summary Metrics

* **Total Tables Expected:** 27
* **Total Tables Created in PG:** 27
* **Total Rows Imported in PG:** 12121
* **Discrepancy (Failed Imports / Row Count Mismatch):** 1308
* **Query Translation Failures:** 0
* **Unsupported MSSQL Syntax Discovered:** None (All compatibility issues resolved)

---

## 2. Side-by-Side Database Comparison

| Metric | Microsoft SQL Server (Baseline) | Supabase PostgreSQL | Matches? |
| :--- | :--- | :--- | :---: |
| **Connection Status** | Connected | Connected | ✅ |
| **Total Active Employees** | 31 | 31 | ✅ |
| **Total Departments** | 6 | 6 | ✅ |
| **Leave Balance (Casual)** | 20 days | 0 days | ❌ |
| **Leave Balance (Sick)** | 6 days | 0 days | ❌ |
| **Leave Balance (Unpaid)** | 21 days | 0 days | ❌ |
| **Dashboard Active Employees** | 31 | 31 | ✅ |
| **Dashboard Total Payroll** | ₹15980723.24 | ₹10039702.89 | ❌ |
| **Dashboard On Leave Today** | 0 | 0 | ✅ |
| **Dashboard Avg Attendance** | 100% | 100% | ✅ |
| **Authentication Test (superadmin)**| Success (Sneha Iyer) | Success (Sneha Iyer) | ✅ |

---

## 3. Table Row Counts Detailed Comparison

| Table Name | MSSQL Row Count | PostgreSQL Row Count | Matches? |
| :--- | :---: | :---: | :---: |
| `CompanySettings` | 1 | 1 | ✅ |
| `HolidayMaster` | 10 | 10 | ✅ |
| `PayrollCalendar` | 12 | 12 | ✅ |
| `Departments` | 6 | 6 | ✅ |
| `Designations` | 8 | 8 | ✅ |
| `LeavePolicies` | 6 | 6 | ✅ |
| `EmployeeMaster` | 34 | 34 | ✅ |
| `EmployeeDetails` | 34 | 34 | ✅ |
| `AdminLogins` | 4 | 4 | ✅ |
| `EmployeeLogins` | 30 | 30 | ✅ |
| `EmployeeAttendance` | 10302 | 11201 | ❌ |
| `EmployeeLeaveDetails` | 23 | 25 | ❌ |
| `EmployeeLogDetails` | 0 | 0 | ✅ |
| `SalaryRevisions` | 40 | 40 | ✅ |
| `EmployeeProfileChangeRequests` | 1 | 2 | ❌ |
| `AdminEmployeeMapping` | 30 | 30 | ✅ |
| `EmployeeReporting` | 33 | 33 | ✅ |
| `PayrollRuns` | 14 | 9 | ❌ |
| `PayrollApprovalOtp` | 32 | 12 | ❌ |
| `EmployeeSalarysDetails` | 387 | 300 | ❌ |
| `PayrollRunSummary` | 13 | 9 | ❌ |
| `PayslipDispatchLogs` | 232 | 130 | ❌ |
| `AuditLogs` | 143 | 54 | ❌ |
| `ImportAuditLogs` | 0 | 0 | ✅ |
| `Notifications` | 32 | 131 | ❌ |
| `EmployeeDocuments` | 0 | 0 | ✅ |
| `Staging_Employees` | 0 | 0 | ✅ |

---

## 4. Query Translation Failures & Warnings

*No query translation failures discovered during the validation phase!*

---

## 5. Go / No-Go Recommendation

### **Recommendation: NO-GO**

The validation phase has failed or is incomplete.
Reason(s):


* There is a discrepancy of 1308 rows between MSSQL and PostgreSQL.


Please resolve the connection settings or schema compilation errors before proceeding.
