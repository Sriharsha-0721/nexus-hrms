import { motion } from 'framer-motion';
import { Check, X, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';

const Leave = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/leaves/requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveReject = async (leaveId, status) => {
    try {
      await api.post('/leaves/approve', { leaveId, status });
      alert(`Leave request has been ${status.toLowerCase()} successfully.`);
      fetchRequests();
    } catch (err) {
      alert(err.message || 'Operation failed.');
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    return new Date(dateVal).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e - s) / (1000 * 3600 * 24)) + 1;
  };

  // Calculate statistics
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const rejected = requests.filter(r => r.status === 'Rejected').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Leave Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Review applications, approve requests, and manage employee leave balances.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Statistics Card */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Request Summary</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Applied</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{total}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--warning)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={16} /> Pending</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--warning)' }}>{pending}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--success)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle size={16} /> Approved</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>{approved}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--danger)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><AlertCircle size={16} /> Rejected</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>{rejected}</span>
          </div>
        </div>

        {/* Requests Table */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Requests</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading leave requests...</div>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No leave requests found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Leave Type</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Duration</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Reason</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{req.employeeName}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{req.type}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>
                        <div>{formatDate(req.startDate)} - {formatDate(req.endDate)}</div>
                        <small style={{ color: 'var(--text-tertiary)' }}>({calculateDays(req.startDate, req.endDate)} Days)</small>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason || 'No reason specified'}>
                        {req.reason || 'No reason specified'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                          background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: req.status === 'Approved' ? 'var(--success)' : req.status === 'Pending' ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        {req.status === 'Pending' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleApproveReject(req.id, 'Approved')}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              title="Approve Request"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => handleApproveReject(req.id, 'Rejected')}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              title="Reject Request"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

export default Leave;
