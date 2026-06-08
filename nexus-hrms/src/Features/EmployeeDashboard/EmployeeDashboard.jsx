import { motion } from 'framer-motion';
import { Calendar, Clock, FileText, Bell, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome back, John! 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Here is what's happening with your attendance and benefits today.</p>
      </div>

      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Attendance Summary */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Attendance (This Month)</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>21 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ 22 Days</span></h3>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> 20 On Time</span>
            <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14} /> 1 Late</span>
          </div>
        </div>

        {/* Leave Balance */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Available Leave</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>14 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Days</span></h3>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', background: 'var(--accent-primary)', borderRadius: '3px' }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>6 days used out of 20</p>
        </div>

        {/* Latest Payslip */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Latest Payslip</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>September 2023</h3>
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
            {[
              { title: 'Company Townhall Meeting', date: 'Oct 15, 2023', type: 'Announcement', color: 'var(--accent-primary)' },
              { title: 'Leave Request Approved', date: 'Oct 12, 2023', type: 'HR', color: 'var(--success)' },
              { title: 'Q3 Performance Review Pending', date: 'Oct 10, 2023', type: 'Action Required', color: 'var(--warning)' },
            ].map((note, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${note.color}` }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>{note.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{note.date}</span>
                    <span style={{ padding: '0.1rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '99px' }}>{note.type}</span>
                  </div>
                </div>
              </div>
            ))}
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
