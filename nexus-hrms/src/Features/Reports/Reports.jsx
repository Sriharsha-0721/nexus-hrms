import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Users, PieChart, RefreshCw, Calendar, Clock, TrendingUp, UserMinus, Filter } from 'lucide-react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('payroll-monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterDept) params.append('department', filterDept);
      
      const data = await api.get(`/payroll/reports/${activeTab}?${params.toString()}`);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterDept) params.append('department', filterDept);
      
      const response = await api.download(`/payroll/reports/${activeTab}/export?${params.toString()}`);
      const url = window.URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_${activeTab}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Failed to export ${format}`);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const getMonthName = (m) => {
    if (!m) return '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Unknown';
  };

  const REPORT_TYPES = [
    { id: 'payroll-monthly', title: 'Monthly Payroll', desc: 'Month-over-month trend', icon: BarChart2 },
    { id: 'payroll-yearly', title: 'Yearly Payroll', desc: 'Annual aggregates', icon: Calendar },
    { id: 'payroll-dept', title: 'Department Payroll', desc: 'Aggregates by dept', icon: Users },
    { id: 'attendance', title: 'Attendance Report', desc: 'Present/Absent/Half days', icon: Clock },
    { id: 'leaves', title: 'Leaves Report', desc: 'Leave requests and counts', icon: PieChart },
    { id: 'revisions', title: 'Salary Revisions', desc: 'Revision history', icon: TrendingUp },
    { id: 'inactive', title: 'Inactive Employees', desc: 'Former employees', icon: UserMinus },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>View real-time aggregated reports for organization, leave, and payroll performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>PDF</button>
          <button onClick={() => handleExport('excel')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>Excel</button>
          <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>CSV</button>
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
      </div>

      {/* Report Category Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {REPORT_TYPES.map(cat => {
          const Icon = cat.icon;
          const isSelected = activeTab === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.2s', display: 'flex', gap: '0.75rem', alignItems: 'center'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-tertiary)', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{cat.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{cat.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Filter size={16} /> Filters:
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Month</label>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Year</label>
          <input type="number" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="e.g. 2024" style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '100px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Department</label>
          <input type="text" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} placeholder="e.g. Engineering" style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '150px' }} />
        </div>
        <button onClick={fetchReportData} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
          Apply Filters
        </button>
        <button onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterDept(''); setTimeout(fetchReportData, 0); }} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* Report Grid Panel */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Aggregating analytics report...</div>
        ) : reportData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No data found for this report and filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeTab === 'payroll-monthly' && (
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

            {activeTab === 'payroll-yearly' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Year</th>
                    <th style={{ padding: '0.75rem' }}>Total Basic</th>
                    <th style={{ padding: '0.75rem' }}>Gross Earnings</th>
                    <th style={{ padding: '0.75rem' }}>Total Deductions</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Total Net Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{row.year}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalBasic)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalEarnings)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatINR(row.totalDeductions)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(row.totalNetPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payroll-dept' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Employee Count</th>
                    <th style={{ padding: '0.75rem' }}>Total Basic</th>
                    <th style={{ padding: '0.75rem' }}>Gross Earnings</th>
                    <th style={{ padding: '0.75rem' }}>Total Deductions</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Total Net Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{row.departmentName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.employeeCount}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalBasic)}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.totalEarnings)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatINR(row.totalDeductions)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(row.totalNetPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'attendance' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Employee Name</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Total Days</th>
                    <th style={{ padding: '0.75rem' }}>Present Days</th>
                    <th style={{ padding: '0.75rem' }}>Absent Days</th>
                    <th style={{ padding: '0.75rem' }}>Half Days</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.employeeName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.departmentName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.totalDays}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--success)' }}>{row.presentDays}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{row.absentDays}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--warning)' }}>{row.halfDays}</td>
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

            {activeTab === 'revisions' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Employee Name</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Effective Date</th>
                    <th style={{ padding: '0.75rem' }}>Basic Salary</th>
                    <th style={{ padding: '0.75rem' }}>Allowances</th>
                    <th style={{ padding: '0.75rem' }}>Deductions</th>
                    <th style={{ padding: '0.75rem', fontWeight: 700 }}>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.employeeName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.departmentName}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(row.EffectiveDate).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>{formatINR(row.BasicSalary)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--info)' }}>{formatINR(row.TotalAllowance)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{formatINR(row.TotalDeduction)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(row.NetSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'inactive' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem' }}>Employee Name</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Designation</th>
                    <th style={{ padding: '0.75rem' }}>Personal Email</th>
                    <th style={{ padding: '0.75rem' }}>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{row.employeeName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.departmentName}</td>
                      <td style={{ padding: '0.75rem' }}>{row.Designation || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{row.personalEmail || 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(row.lastUpdated).toLocaleDateString()}</td>
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
