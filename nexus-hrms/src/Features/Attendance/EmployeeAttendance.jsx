import { motion } from 'framer-motion';
import { Clock, AlertCircle, Play, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';
import { useToast } from '../../Shared/ToastContext';

const EmployeeAttendance = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const data = await api.get(`/attendance/logs?month=${month}&year=${year}`);
      setLogs(data);

      // Check if there is an entry for today
      const todayStr = now.toISOString().split('T')[0];
      const todayEntry = data.find(log => {
        const logDateStr = new Date(log.date).toISOString().split('T')[0];
        return logDateStr === todayStr;
      });

      if (todayEntry) {
        setTodayRecord(todayEntry);
        if (todayEntry.clock_in && !todayEntry.clock_out) {
          setIsClockedIn(true);
          setClockInTime(formatTime(todayEntry.clock_in));
        } else {
          setIsClockedIn(false);
          setClockInTime(null);
        }
      } else {
        setIsClockedIn(false);
        setClockInTime(null);
        setTodayRecord(null);
      }
    } catch (err) {
      console.error('Failed to fetch attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClockToggle = async () => {
    try {
      if (!isClockedIn) {
        // Clock In
        await api.post('/attendance/clock-in');
        showToast('Clocked in successfully!', 'success');
      } else {
        // Clock Out
        await api.post('/attendance/clock-out');
        showToast('Clocked out successfully!', 'success');
      }
      await fetchLogs();
    } catch (err) {
      showToast(err.message || 'Clock toggle failed', 'error');
    }
  };

  const formatTime = (timeVal) => {
    if (!timeVal) return '-';
    const date = new Date(timeVal);
    if (!isNaN(date.getTime())) {
      // Formats the Date object (extracted from SQL TIME) to HH:MM AM/PM
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeVal;
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    const date = new Date(dateVal);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate stats
  const totalHoursThisMonth = logs.reduce((sum, log) => sum + (log.total_hours || 0), 0);
  const lateDays = logs.filter(log => log.status === 'Late').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Attendance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Track your daily work hours, overtime, and monthly attendance records.</p>
      </div>

      {/* Top Section - Clock In & Daily Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Clock In/Out Action */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Web Clock In</h2>
          
          <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <button 
            onClick={handleClockToggle}
            disabled={todayRecord && todayRecord.clock_in && todayRecord.clock_out}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 2rem',
              background: todayRecord && todayRecord.clock_in && todayRecord.clock_out 
                ? 'var(--border-color)' 
                : isClockedIn ? 'var(--danger)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '99px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: todayRecord && todayRecord.clock_in && todayRecord.clock_out ? 'not-allowed' : 'pointer',
              boxShadow: isClockedIn ? '0 10px 15px -3px rgba(239, 68, 68, 0.3)' : '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {isClockedIn ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            {todayRecord && todayRecord.clock_in && todayRecord.clock_out ? 'Completed Today' : isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
          
          {isClockedIn && (
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 500 }}>
              Clocked in since {clockInTime}
            </p>
          )}
        </div>

        {/* Weekly/Monthly Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-md)' }}><Clock size={20} /></div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Work Hours (This Month)</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{totalHoursThisMonth.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>hrs</span></div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (totalHoursThisMonth / 160) * 100)}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px' }} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: 'var(--radius-md)' }}><AlertCircle size={20} /></div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Late Clock-ins</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{lateDays} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>days</span></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>This calendar month</p>
          </div>

        </div>

      </div>

      {/* Attendance History */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Activity</h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Clock In</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Clock Out</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Hours</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading logs...</td>
                </tr>
              ) : logs.map((record, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(record.date)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{formatTime(record.clock_in)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{formatTime(record.clock_out)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{record.total_hours ? `${record.total_hours} hrs` : '-'}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: record.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : record.status === 'Late' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: record.status === 'Present' ? 'var(--success)' : record.status === 'Late' ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No attendance logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default EmployeeAttendance;
