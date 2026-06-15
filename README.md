# Nexus HRMS - Enterprise Payroll & HR Ecosystem

Nexus HRMS is a modern, enterprise-grade human resources and payroll management ecosystem. It provides comprehensive modules for employee directory management, automated leave tracking, dynamic payroll engine runs, audit trails, secure notifications, and structured salary revisions. It is built to support side-by-side execution with both Microsoft SQL Server and Supabase PostgreSQL.

---

## 🚀 Key Features

* **Dual-Database Support**: Seamless switching between Local Microsoft SQL Server and cloud-based Supabase PostgreSQL using connection pooling and translation compatibility layers.
* **Dynamic Payroll Engine**: Automated calculation of base salary, allowances, deductions, PF, ESIC, professional tax, and net payslips.
* **Leave Management System**: Fully interactive leave application, approval pipeline, and automatic balance tracking.
* **Secure Profile Requests**: Admin-guided profile changes for address, banking information, and critical details.
* **Interactive Dashboard**: Comprehensive analytics highlighting employee status, active leave lists, total payroll metrics, and attendance averages.
* **Flexible OTP Verification Modes**: Supported by a local developer fallback for seamless staging/testing or complete SMTP integration.
* **Audit Trails & Notifications**: Automatic tracking of admin/employee actions and real-time in-app notification dispatches.

---

## 📁 System Architecture

The codebase is organized into three major layers:

* 💻 **`nexus-hrms/`**: The frontend UI. A single-page application built on **React**, **Vite**, and **Vanilla CSS** for premium custom styling and fast performance.
* ⚙️ **`nexus-server/`**: The backend REST API. Built on **Node.js**, **Express**, and custom database queries. Connects dynamically to the specified database provider.
* 🗄️ **`database/`**: Contains table schemas (`schema_pg.sql`), seed data scripts (`seed_data_pg.sql`), corrective scripts, and SQL procedures.

---

## 🛠️ Installation & Setup

### Prerequisites
* **Node.js** (version 18.x or later)
* **npm** (comes packaged with Node)
* Either a running instance of **Microsoft SQL Server** (supporting SQL Auth) OR a **Supabase PostgreSQL** instance.

### Step 1: Environment Setup
Create a `.env` file in the `nexus-server/` directory and configure the environment variables:

```env
PORT=5000
DB_PROVIDER=mssql # Set to 'mssql' or 'postgres'
DB_SERVER=localhost
DB_DATABASE=NexusHRMS
DB_USER=sa
DB_PASSWORD=YourSecurePassword123
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# OTP Configuration Mode
OTP_MODE=local # 'local' to use developer logs / 'email' to use SMTP
SHOW_DEVELOPER_OTP=true
```

### Step 2: Database Provisioning

#### Option A: Setting up Microsoft SQL Server (Default)
1. Ensure your local SQL Server instance has SQL Authentication enabled.
2. Run the SQL scripts located inside the `database/` folder sequentially against your database:
   * Execute the table definitions and core schemas.
   * Run the seed scripts to populate initial departments, designations, and company admin logins.

#### Option B: Setting up Supabase PostgreSQL
1. Create a project on Supabase and grab your transaction connection pool string or connection details.
2. If using Supabase, set the connection details in `nexus-server/.env`:
   ```env
   DB_PROVIDER=postgres
   PG_USER=postgres.your-ref-id
   PG_HOST=aws-0-us-east-1.pooler.supabase.com
   PG_DATABASE=postgres
   PG_PASSWORD=YourPostgresPassword
   PG_PORT=6543
   ```
3. Run the PostgreSQL schema scripts:
   * Execute `database/schema_pg.sql`
   * Execute `database/seed_data_pg.sql`
   * Execute `database/03_phase4_corrections.sql`

---

## 🏃 Running the Application

### Automated Quickstart
The repository contains an automated service runner script at the root directory. To spin up both the React frontend and Node.js backend simultaneously:

```bash
# Simply run the batch file in command prompt:
start-services.bat
```

### Manual Quickstart
If you prefer starting services manually in separate terminals:

1. **Start Backend Engine:**
   ```bash
   cd nexus-server
   npm install
   npm run dev
   ```
2. **Start React Frontend Client:**
   ```bash
   cd nexus-hrms
   npm install
   npm run dev
   ```

---

## 🔍 Health Diagnostics & Verification

### Database Health Endpoint
The backend includes a dedicated database health check route that returns information about the database connection provider, status, active schema, and database engine version:

* **Endpoint**: `GET /api/health/database`
* **Response format**:
  ```json
  {
    "provider": "postgres",
    "connectionStatus": "Connected",
    "databaseVersion": "PostgreSQL 15.6 on x86_64-pc-linux-gnu...",
    "activeSchema": "public"
  }
  ```

### Side-by-Side Database Validation
To compare data consistency, active configurations, and validation stats between MSSQL and PostgreSQL, run the automated validation suite:

```bash
cd nexus-server
npm run validate:postgres
```

The script will query table row counts, active employee counts, leave summaries, dashboard statistics, and verify authentication capability on both providers, compiling a comparison report inside `postgres_validation_report.md`.

---

## 🔒 Security Note: Why Email OTPs Were Removed & How to Use Them

> [!IMPORTANT]
> **Critical Security Warning: Purge of Cleartext SMTP Secrets**
> 
> In previous versions of the codebase, default credentials for SMTP servers (Gmail addresses and Gmail app passwords) were hardcoded directly in fallback configurations inside `passwordController.js` and database seed scripts.
> 
> Committing cleartext secrets, API keys, or application passwords into Git-tracked source control exposes the application and associated email addresses to:
> 1. **Malicious Actor Exploitation**: Automated scanners constantly monitor public and private commits to extract cleartext passwords.
> 2. **Spam & Phishing Abuse**: Compromised email accounts can be hijacked to dispatch spam or run targeted phishing campaigns.
> 3. **Data Loss & IP Ban**: Sending domains can get blacklisted, impacting the entire organization's email deliverability.
> 4. **Compliance Violations**: Storing secrets in plain text violates basic regulatory standards (GDPR, ISO 27001, SOC 2).
> 
> For these reasons, **all hardcoded credentials have been completely removed and purged** from the source files.

### How to Safely Re-Enable Email OTP Delivery

The system retains complete support for automated email delivery of OTPs (for both Forgot Password resets and Payroll approval validations) without changing a single line of code. To use email-based OTPs securely in staging or production environments, follow these steps:

1. **Configure OTP Mode**:
   Set `OTP_MODE` to `email` and disable frontend developer output inside `nexus-server/.env`:
   ```env
   OTP_MODE=email
   SHOW_DEVELOPER_OTP=false
   ```

2. **Supply SMTP Secrets Securely**:
   Add the following environment variables directly in the environment config (ensure `.env` is listed in your `.gitignore` file so it is never committed):
   ```env
   SMTP_HOST=smtp.gmail.com   # Or your enterprise SMTP host
   SMTP_PORT=587               # Secure TLS/STARTTLS port
   SMTP_USER=your-verified-email-address@domain.com
   SMTP_PASSWORD=your-secret-app-specific-password
   ```

3. **How It Works Under the Hood**:
   * **Verification Flow**: On startup, the server dynamically validates that all SMTP credentials exist.
   * **API Payload Isolation**: When `OTP_MODE=email` is active, the system no longer returns the generated OTP inside the API responses (`developerOtp` is omitted). This prevents users from inspecting network requests in developer tools to bypass the verification.
   * **Nodemailer Dispatch**: Nodemailer establishes a secure connection to the specified SMTP server and delivers the 6-digit OTP directly to the registered personal email of the administrator or employee.
