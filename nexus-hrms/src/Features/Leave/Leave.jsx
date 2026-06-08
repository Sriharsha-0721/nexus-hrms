import { motion } from 'framer-motion';
import { Plus, Check, X } from 'lucide-react';

const Leave = () => {
  const leaveRequests = [
    { id: 'LR-001', empName: 'Mike Johnson', type: 'Sick Leave', duration: '2 Days (Nov 15 - Nov 16)', status: 'Pending', appliedOn: 'Nov 10, 2023' },
    { id: 'LR-002', empName: 'Sarah Connor', type: 'Annual Leave', duration: '5 Days (Nov 20 - Nov 24)', status: 'Approved', appliedOn: 'Nov 05, 2023' },
    { id: 'LR-003', empName: 'Emily Davis', type: 'Personal Leave', duration: '1 Day (Nov 18)', status: 'Rejected', appliedOn: 'Nov 08, 2023' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Leave Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Review applications and manage employee leave balances.</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          background: 'var(--accent-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 500,
          fontSize: '0.9rem'
        }}>
          <Plus size={18} />
          Apply for Leave
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Your Balances</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { type: 'Annual Leave', total: 20, used: 12 },
              { type: 'Sick Leave', total: 10, used: 2 },
              { type: 'Casual Leave', total: 5, used: 5 }
            ].map((bal, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>{bal.type}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{bal.total - bal.used} / {bal.total} remaining</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(bal.used / bal.total) * 100}%`, 
                    background: bal.used === bal.total ? 'var(--danger)' : 'var(--accent-primary)',
                    borderRadius: '4px' 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Requests</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Leave Type</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Duration</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((req, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{req.empName}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{req.type}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{req.duration}</td>
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
                          <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} /></button>
                          <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
