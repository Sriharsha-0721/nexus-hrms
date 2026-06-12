import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './Layouts/AuthLayout';
import MainLayout from './Layouts/MainLayout';
import Login from './Features/Auth/Login';
import ForgotPassword from './Features/Auth/ForgotPassword';
import ResetPassword from './Features/Auth/ResetPassword';

// Admin Features
import Dashboard from './Features/Dashboard/Dashboard';
import EmployeeList from './Features/Employee/EmployeeList';
import Payroll from './Features/Payroll/Payroll';
import Attendance from './Features/Attendance/Attendance';
import Leave from './Features/Leave/Leave';
import Reports from './Features/Reports/Reports';
import AdminSettings from './Features/Admin/AdminSettings';
import AdminManagement from './Features/Admin/AdminManagement';

// Employee Features
import Profile from './Features/Profile/Profile';
import EmployeeDashboard from './Features/EmployeeDashboard/EmployeeDashboard';
import EmployeeAttendance from './Features/Attendance/EmployeeAttendance';
import EmployeeLeave from './Features/Leave/EmployeeLeave';
import EmployeePayroll from './Features/Payroll/EmployeePayroll';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Admin Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<AdminSettings />} />
          <Route path="/admin-management" element={<AdminManagement />} />
          
          {/* Employee Routes */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-dashboard" element={<EmployeeDashboard />} />
          <Route path="/my-attendance" element={<EmployeeAttendance />} />
          <Route path="/my-leave" element={<EmployeeLeave />} />
          <Route path="/my-payroll" element={<EmployeePayroll />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
