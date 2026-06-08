import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CreditCard, CheckCircle, FileText, Calendar, Plus, Settings, IndianRupee, X } from 'lucide-react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';

const Payroll = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/payroll/history');
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch payroll logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRunPayroll = async (e) => {
    e.preventDefault();
    setRunLoading(true);
    setRunResult(null);
    try {
      const res = await api.post('/payroll/run', { month, year });
      setRunResult(res.stats);
      await fetchHistory();
    } catch (err) {
      alert(err.message || 'Failed to run payroll calculation.');
    } finally {
      setRunLoading(false);
    }
  };

  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Unknown';
  };

  // Group individual records by month/year for history summary
  const groupedRunsMap = {};
  history.forEach(item => {
    const key = `${item.month}-${item.year}`;
    if (!groupedRunsMap[key]) {
      groupedRunsMap[key] = {
        key,
        id: `PAY-${item.year}-${String(item.month).padStart(2, '0')}`,
        month: item.month,
        year: item.year,
        totalProcessed: 0,
        employeesCount: 0,
        status: 'Processed'
      };
    }
    groupedRunsMap[key].totalProcessed += item.net_salary;
    groupedRunsMap[key].employeesCount++;
  });

  const groupedRuns = Object.values(groupedRunsMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const latestRun = groupedRuns[0] || { totalProcessed: 0, employeesCount: 0 };
  const totalYtdPayout = groupedRuns.reduce((sum, run) => sum + run.totalProcessed, 0);

  const salaryComponents = [
    { name: 'Basic Pay', type: 'Earnings', percentage: 'Designation Slab based', status: 'Active' },
    { name: 'Allowances', type: 'Earnings', percentage: 'Designation Slab based', status: 'Active' },
    { name: 'Deductions (Standard)', type: 'Deductions', percentage: 'Designation Slab based', status: 'Active' },
    { name: 'Loss of Pay (LOP)', type: 'Deductions', percentage: 'unpaid_days * (basic_pay / 30)', status: 'Active' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payroll Generation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Run payroll, manage salary structures, and view history.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => {
              setIsRunModalOpen(true);
              setRunResult(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--success)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <CreditCard size={18} />
            Run Payroll Engine
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { title: 'Last Processing Run', value: latestRun.month ? `${getMonthName(latestRun.month)} ${latestRun.year}` : 'None', icon: Calendar, color: 'var(--accent-primary)' },
          { title: 'Last Run Payout', value: formatINR(latestRun.totalProcessed), icon: IndianRupee, color: 'var(--warning)' },
          { title: 'Total Payout (YTD)', value: formatINR(totalYtdPayout), icon: FileText, color: 'var(--danger)' }
        ].map((stat, i) => {
          const Icon = stat.icon || CreditCard;
          return (
            <div key={i} style={{
              background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: `${stat.color}20`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{stat.title}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Payroll Runs */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Payroll Runs</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Batch ID</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Month</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Employees</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Total Payout</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading history...</td>
                  </tr>
                ) : groupedRuns.map((data, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{data.id}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{getMonthName(data.month)} {data.year}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{data.employeesCount}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{formatINR(data.totalProcessed)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle size={12} /> {data.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && groupedRuns.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No payroll batches calculated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Salary Components */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Global Salary Structure</h2>
          </div>
          <div style={{ padding: '1.5rem', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {salaryComponents.map((comp, idx) => (
                <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comp.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: comp.type === 'Earnings' ? 'var(--success)' : 'var(--danger)' }}>
                      {comp.type}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Calculation: {comp.percentage}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Run Payroll Dialog Modal */}
      <AnimatePresence>
        {isRunModalOpen && (
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Calculate Monthly Payroll</h3>
                <button 
                  onClick={() => setIsRunModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {runResult && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)',
                  padding: '1rem', fontSize: '0.85rem', marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Payroll Run Success!</div>
                  <div>Processed Employees: <strong>{runResult.totalProcessed}</strong></div>
                  <div>Total Net Payout: <strong>{formatINR(runResult.totalNetSalary)}</strong></div>
                </div>
              )}

              <form onSubmit={handleRunPayroll} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Month</label>
                  <select 
                    value={month}
                    onChange={e => setMonth(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Year</label>
                  <input 
                    type="number"
                    required
                    value={year}
                    onChange={e => setYear(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsRunModalOpen(false)}
                    style={{ padding: '0.65rem 1.25rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={runLoading}
                    style={{ padding: '0.65rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: runLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {runLoading ? 'Running...' : 'Execute Run'}
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

export default Payroll;
