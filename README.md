# Nexus HRMS - Enterprise Payroll & HR Ecosystem

Nexus HRMS is a modern, enterprise-grade human resources and payroll management ecosystem. It provides modules for employee management, leave tracking, dynamic payroll run generation, audit logs, and salary revisions.

---

## 1. System Architecture

The project is structured into three main directories:

* **`nexus-hrms/`**: A React single-page application (SPA) styling with vanilla CSS, powered by Vite.
* **`nexus-server/`**: A Node.js and Express API server handling authentication, payroll calculation engines, database integration, and notifications.
* **`database/`**: Contains database schema definitions, seeding scripts, migration scripts, and database corrections for both **Microsoft SQL Server (MSSQL)** and **PostgreSQL (Supabase)**.

---

## 2. Setup & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **Local Microsoft SQL Server** (configured with SQL authentication) or **Supabase PostgreSQL**

### Environment Configuration
Configure your backend environment by editing/creating a `.env` file inside `nexus-server/`:
```env
PORT=5000
DB_PROVIDER=mssql # or postgres
DB_SERVER=localhost
DB_DATABASE=NexusHRMS
DB_USER=sa
DB_PASSWORD=YourPassword123
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OTP Mode Configuration
OTP_MODE=local # 'local' for development/POC, 'email' for production SMTP
SHOW_DEVELOPER_OTP=true
```

---

## 3. Running the Application

You can start both backend and frontend services concurrently using the automated runner script in the repository root:

```bash
# Double-click or run from command prompt in root directory:
start-services.bat
```

Alternatively, launch them manually:

1. **Start Backend Server:**
   ```bash
   cd nexus-server
   npm install
   npm run dev
   ```
2. **Start Frontend Client:**
   ```bash
   cd nexus-hrms
   npm install
   npm run dev
   ```

---

## 4. Security Notes: Purged Secrets & Email OTP configuration

### Why Hardcoded Credentials Were Removed
During a security audit, hardcoded Gmail accounts and App Passwords (`sriharshabobbi52@gmail.com` / `mqia tysi lgcr kbmo`) were discovered in the codebase fallbacks. **Committing cleartext credentials to Git repositories is a critical security vulnerability.** Exposed credentials allow unauthorized actors to:
* Gain access to your email servers.
* Send unauthorized mail/phishing campaigns on behalf of your domain.
* Violate data privacy standards (such as GDPR or ISO 27001).

These credentials have been entirely purged from the source code, seed scripts, and SQL corrections. All SMTP variables now rely strictly on secure environment variables.

### How to Use Email-Based OTPs Securely
To re-enable email delivery of OTPs (for password resets and payroll approvals) in staging or production:

1. Change the configuration in `nexus-server/.env`:
   ```env
   OTP_MODE=email
   SHOW_DEVELOPER_OTP=false
   ```
2. Set the actual SMTP credentials in `nexus-server/.env` (ensure this file is **never** committed to Git):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-verified-email@domain.com
   SMTP_PASSWORD=your-secure-app-password
   ```
3. When `OTP_MODE=email` is active:
   * The system will dynamically validate SMTP environment variables on startup.
   * OTP codes will no longer be returned in the API payloads or displayed in the UI frontend modals.
   * OTP delivery will be dispatched securely over TLS/SSL using Nodemailer to the registered employee's Personal Email.
