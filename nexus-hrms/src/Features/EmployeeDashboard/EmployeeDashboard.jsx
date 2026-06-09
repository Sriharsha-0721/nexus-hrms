import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, FileText, Bell, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../Services/authService.js';
import api from '../../Services/api.js';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const welcomeName = currentUser ? currentUser.firstName : 'User';

  const [notifications, setNotifications] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, absent: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch notifications
        const notifs = await api.get('/notifications');
        setNotifications(notifs.slice(0, 3)); // top 3

        // Fetch leave balances
        const balances = await api.get('/leaves/balances');
        setLeaveBalances(balances);

        // Fetch payroll history
        const history = await api.get('/payroll/history');
        if (history && history.length > 0) {
          setLatestPayslip(history[0]);
        }

        // Fetch attendance logs for current month
        const logs = await api.get('/attendance/logs');
        if (Array.isArray(logs)) {
          const present = logs.filter(l => l.AttendanceStatus === 'Present' || l.AttendanceStatus === 'On Leave').length;
          const late = logs.filter(l => l.AttendanceStatus === 'Late' || l.AttendanceStatus === 'Half Day').length;
          const absent = logs.filter(l => l.AttendanceStatus === 'Absent').length;
          setAttendanceStats({
            present,
            late,
            absent,
            total: logs.length
          });
        }
      } catch (err) {
        console.error('Failed to load employee dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getRemainingLeavesCount = () => {
    if (!leaveBalances) return 14;
    const sick = leaveBalances['Sick Leave']?.remaining || 0;
    const casual = leaveBalances['Casual Leave']?.remaining || 0;
    const earned = leaveBalances['Earned Leave']?.remaining || 0;
    return sick + casual + earned;
  };
  
  const getAllowedLeavesCount = () => {
    if (!leaveBalances) return 37;
    const sick = leaveBalances['Sick Leave']?.allowed || 0;
    const casual = leaveBalances['Casual Leave']?.allowed || 0;
    const earned = leaveBalances['Earned Leave']?.allowed || 0;
    return sick + casual + earned;
  };

  const getTakenLeavesCount = () => {
    if (!leaveBalances) return 6;
    const sick = leaveBalances['Sick Leave']?.taken || 0;
    const casual = leaveBalances['Casual Leave']?.taken || 0;
    const earned = leaveBalances['Earned Leave']?.taken || 0;
    return sick + casual + earned;
  };

  const getLatestPayslipMonthName = () => {
    if (loading) return 'Loading...';
    if (!latestPayslip) return 'No payslips yet';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[latestPayslip.month - 1]} ${latestPayslip.year}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome back, {welcomeName}! 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Here is what's happening with your attendance and benefits today.</p>
      </div>

      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Attendance Summary */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Attendance (This Month)</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {loading ? '...' : (attendanceStats.present + attendanceStats.late)} 
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {loading ? '...' : attendanceStats.total} Days</span>
              </h3>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> {loading ? '...' : attendanceStats.present} On Time</span>
            <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14} /> {loading ? '...' : attendanceStats.late} Late</span>
          </div>
        </div>

        {/* Leave Balance */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Available Leave</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '...' : getRemainingLeavesCount()} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Days</span></h3>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${loading || getAllowedLeavesCount() === 0 ? 0 : (getTakenLeavesCount() / getAllowedLeavesCount()) * 100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{loading ? '...' : getTakenLeavesCount()} days used out of {loading ? '...' : getAllowedLeavesCount()}</p>
        </div>

        {/* Latest Payslip */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Latest Payslip</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{getLatestPayslipMonthName()}</h3>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: 'var(--radius-md)' }}>
              <FileText size={20} />
            </div>
          </div>
          <button 
            onClick={() => navigate('/my-payroll')}
            style={{ 
              marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-tertiary)', border: 'none', borderRadius: 'var(--radius-md)', 
              color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' 
            }}
          >
            View Details <ArrowRight size={14} />
          </button>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Recent Notifications / Announcements */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={18} color="var(--accent-primary)" /> Recent Notifications</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>No notifications yet 🎉</div>
            ) : (
              notifications.map((note, i) => {
                let color = 'var(--accent-primary)';
                let type = 'Info';
                if (note.title.toLowerCase().includes('approved') || note.title.toLowerCase().includes('success')) {
                  color = 'var(--success)';
                  type = 'HR / Leave';
                } else if (note.title.toLowerCase().includes('pending') || note.title.toLowerCase().includes('setup')) {
                  color = 'var(--warning)';
                  type = 'Action Required';
                } else if (note.title.toLowerCase().includes('reject')) {
                  color = 'var(--danger)';
                  type = 'Rejected';
                }
                return (
                  <div key={note.id || i} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${color}`, opacity: note.isRead ? 0.7 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem', textAlign: 'left' }}>{note.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0.5rem 0', lineHeight: 1.3, textAlign: 'left' }}>
                        {note.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <span>{timeAgo(note.createdAt)}</span>
                        <span style={{ padding: '0.1rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '99px' }}>{type}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upcoming Holidays</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Independence Day', date: 'Aug 15, 2026', day: 'Saturday' },
              { name: 'Gandhi Jayanti', date: 'Oct 02, 2026', day: 'Friday' },
              { name: 'Diwali', date: 'Nov 12, 2026', day: 'Thursday' },
              { name: 'Christmas Day', date: 'Dec 25, 2026', day: 'Friday' },
            ].map((holiday, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: i !== arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.25rem' }}>{holiday.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{holiday.day}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{holiday.date.split(',')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default EmployeeDashboard;
