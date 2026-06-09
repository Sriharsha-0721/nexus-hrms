import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Users, PieChart, RefreshCw } from 'lucide-react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('payroll');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let data = [];
      if (activeTab === 'payroll') {
        data = await api.get('/payroll/reports/payroll');
      } else if (activeTab === 'leaves') {
        data = await api.get('/payroll/reports/leaves');
      } else if (activeTab === 'employees') {
        data = await api.get('/payroll/reports/employees');
      }
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>View real-time aggregated reports for organization, leave, and payroll performance.</p>
        </div>
        <button
          onClick={fetchReportData}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem'
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Report Category Selector */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { id: 'payroll', title: 'Monthly Payroll Aggregates', desc: 'Net payouts, taxes, PF, and LOP summaries.', icon: BarChart2 },
          { id: 'leaves', title: 'Leaves Analytics', desc: 'Approved and rejected leaves by department.', icon: PieChart },
          { id: 'employees', title: 'Workforce Headcount', desc: 'Active & inactive headcount by department.', icon: Users },
        ].map(cat => {
          const Icon = cat.icon;
          const isSelected = activeTab === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                flex: 1, padding: '1.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'center'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-tertiary)', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{cat.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cat.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Grid Panel */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Aggregating analytics report...</div>
        ) : reportData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No data found for this report.</div>
        ) : (
          <div>
            {activeTab === 'payroll' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Period</th>
                    <th style={{ padding: '0.75rem' }}>Basic Total</th>
                    <th style={{ padding: '0.75rem' }}>Gross Earnings</th>
                    <th style={{ padding: '0.75rem' }}>Total PF</th>
                    <th style={{ padding: '0.75rem' }}>Total PT</th>
                    <th style={{ padding: '0.75rem' }}>Total LOP</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Total Net Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{getMonthName(row.month)} {row.year}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalBasic)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalEarnings)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatINR(row.totalPF)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatINR(row.totalPT)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{formatINR(row.totalLOP)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(row.totalNetPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'leaves' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Leave Type</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Total Requests</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Days Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.departmentName || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{row.leaveType}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: row.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: row.status === 'Approved' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{row.count}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{row.totalDays} Days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'employees' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Active Headcount</th>
                    <th style={{ padding: '0.75rem' }}>Inactive Headcount</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Total Headcount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{row.departmentName || 'Unassigned'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--success)' }}>{row.activeHeadcount}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{row.inactiveHeadcount}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{row.totalHeadcount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default Reports;
