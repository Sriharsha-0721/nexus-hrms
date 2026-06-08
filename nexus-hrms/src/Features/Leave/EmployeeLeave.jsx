import { motion, AnimatePresence } from 'framer-motion';
import { FilePlus, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';

const EmployeeLeave = () => {
  const [balances, setBalances] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balancesData, historyData] = await Promise.all([
        api.get('/leaves/balances'),
        api.get('/leaves/requests')
      ]);
      setBalances(balancesData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await api.post('/leaves/apply', { leaveType, startDate, endDate, reason });
      setIsApplyModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    const date = new Date(dateVal);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e - s) / (1000 * 3600 * 24)) + 1;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Leave</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Apply for time off and track your leave balances.</p>
        </div>
        <button 
          onClick={() => {
            setIsApplyModalOpen(true);
            setSubmitError(null);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          <FilePlus size={18} /> Apply for Leave
        </button>
      </div>

      {/* Leave Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {Object.keys(balances).map((type, i) => {
          const leave = balances[type];
          const colors = ['var(--accent-primary)', 'var(--warning)', 'var(--success)', 'var(--info)'];
          const color = colors[i % colors.length];
          return (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '1rem' }}>{type}</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {leave.remaining} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Available</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: ((leave.taken / leave.allowed) * 100) + '%', height: '100%', background: color, borderRadius: '3px' }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{leave.taken} days used out of {leave.allowed}</p>
            </div>
          );
        })}
      </div>

      {/* Leave History */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Leave History</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Leave Type</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Days</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reason</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading history...</td>
                </tr>
              ) : history.map((record, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{record.leave_type}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{formatDate(record.start_date)} - {formatDate(record.end_date)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{calculateDays(record.start_date, record.end_date)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{record.reason || '-'}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: record.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : record.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: record.status === 'Approved' ? 'var(--success)' : record.status === 'Pending' ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {record.status === 'Approved' ? <CheckCircle size={12} /> : record.status === 'Pending' ? <Clock size={12} /> : <XCircle size={12} />}
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No leave history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                width: '100%',
                maxWidth: '450px',
                boxShadow: 'var(--shadow-lg)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Apply for Leave</h3>
                <button 
                  onClick={() => setIsApplyModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {submitError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1rem'
                }}>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Leave Type</label>
                  <select 
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    {Object.keys(balances).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Start Date</label>
                    <input 
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>End Date</label>
                    <input 
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Reason</label>
                  <textarea 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Enter reason for leave..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', height: '80px', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsApplyModalOpen(false)}
                    style={{ padding: '0.65rem 1.25rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitLoading}
                    style={{ padding: '0.65rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: submitLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default EmployeeLeave;
