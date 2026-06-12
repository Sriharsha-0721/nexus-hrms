import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Check, 
  X, 
  BarChart2, 
  FileText, 
  FilePlus, 
  Download, 
  Plus
} from 'lucide-react';
import api from '../../Services/api.js';
import { useToast } from '../../Shared/ToastContext';

const Attendance = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic API states
  const [logs, setLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsData, leavesData] = await Promise.all([
        api.get(`/attendance/logs?month=${month}&year=${year}`),
        api.get('/leaves/requests')
      ]);
      setLogs(logsData);
      setLeaveRequests(leavesData);
    } catch (err) {
      console.error('Failed to load attendance/leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const handleStatusChange = async (leaveId, newStatus) => {
    try {
      await api.post('/leaves/approve', { leaveId, status: newStatus });
      showToast(`Leave request ${newStatus.toLowerCase()} successfully.`, 'success');
      await fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update leave request status.', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Attendance Overview', icon: Clock },
    { id: 'requests', label: 'Leave Requests', icon: FilePlus },
    { id: 'approvals', label: 'Leave Approvals', icon: CheckCircle },
    { id: 'analytics', label: 'Leave Analytics', icon: BarChart2 },
  ];

  // Filtering based on search query
  const filteredAttendance = logs.filter(d => {
    const fullName = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase();
    const legacyId = (d.legacy_emp_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || legacyId.includes(query);
  });

  const formatTime = (timeVal) => {
    if (!timeVal) return '-';
    const date = new Date(timeVal);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timeVal;
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    const date = new Date(dateVal);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate statistics
  const totalPresentToday = logs.filter(log => log.status === 'Present').length;
  const totalLateToday = logs.filter(log => log.status === 'Late').length;
  const totalOnLeaveToday = logs.filter(log => log.status === 'On Leave').length;
  const totalAbsentToday = logs.filter(log => log.status === 'Absent').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Attendance & Leave Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Oversee employee attendance tracking, process leave requests, and generate performance reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <Plus size={18} />
            Add Bulk Log
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        gap: '0.5rem', 
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Tab 1: Attendance Overview */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {[
                  { title: 'Total Employees Present', value: totalPresentToday, icon: CheckCircle, color: 'var(--success)' },
                  { title: 'Absent Today', value: totalAbsentToday, icon: AlertCircle, color: 'var(--danger)' },
                  { title: 'Late Arrivals Today', value: totalLateToday, icon: Clock, color: 'var(--warning)' },
                  { title: 'On Leave Today', value: totalOnLeaveToday, icon: CalendarIcon, color: 'var(--accent-primary)' }
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} style={{
                      background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{stat.title}</span>
                        <Icon size={20} color={stat.color} />
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Daily Attendance Log (Today)</h2>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <Search size={16} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
                      <input 
                        type="text" 
                        placeholder="Search employee..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                      />
                    </div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Employee ID</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Date</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Check In</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Check Out</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Work Hours</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading logs...</td>
                        </tr>
                      ) : filteredAttendance.map((data, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{data.first_name} {data.last_name}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{data.legacy_emp_id || '-'}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{formatDate(data.date)}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{formatTime(data.clock_in)}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{formatTime(data.clock_out)}</td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{data.total_hours ? `${data.total_hours} hrs` : '-'}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                              background: data.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : data.status === 'Late' ? 'rgba(245, 158, 11, 0.1)' : data.status === 'On Leave' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: data.status === 'Present' ? 'var(--success)' : data.status === 'Late' ? 'var(--warning)' : data.status === 'On Leave' ? 'var(--accent-primary)' : 'var(--danger)'
                            }}>
                              {data.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredAttendance.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No matching logs found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Leave Requests (Pending only) */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Pending Approval Applications</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Leave Type</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Duration</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Applied On</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading requests...</td>
                        </tr>
                      ) : leaveRequests.filter(req => req.status === 'Pending').map((req, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{req.first_name} {req.last_name}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{req.leave_type}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{formatDate(req.applied_date)}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                              background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)'
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleStatusChange(req.leave_id, 'Approved')}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(req.leave_id, 'Rejected')}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && leaveRequests.filter(req => req.status === 'Pending').length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            No pending leave requests. Excellent job!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Leave Approvals (Processed history) */}
          {activeTab === 'approvals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Processed Requests Log</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Leave Type</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Duration</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Applied On</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</td>
                        </tr>
                      ) : leaveRequests.filter(req => req.status !== 'Pending').map((req, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{req.first_name} {req.last_name}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{req.leave_type}</td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{formatDate(req.applied_date)}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                              background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: req.status === 'Approved' ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!loading && leaveRequests.filter(req => req.status !== 'Pending').length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No processed leave requests.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Leave Analytics */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Overall Leave Distribution</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[
                    { type: 'Annual Leave', total: 500, used: 320, color: 'var(--accent-primary)' },
                    { type: 'Sick Leave', total: 250, used: 80, color: 'var(--success)' },
                    { type: 'Casual Leave', total: 150, used: 120, color: 'var(--warning)' },
                    { type: 'Maternity/Paternity', total: 80, used: 40, color: 'var(--info)' }
                  ].map((bal, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 500 }}>{bal.type}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{bal.used} / {bal.total} Days used</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${(bal.used / bal.total) * 100}%`, 
                          background: bal.color,
                          borderRadius: '4px' 
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Monthly Time-Off Trends</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Average days off taken by employees per month.</p>
                <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', paddingTop: '1rem' }}>
                  {[25, 30, 45, 60, 80, 110, 140, 120, 95, 70, 55, 90].map((val, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '100%', 
                        height: `${(val / 150) * 100}%`, 
                        background: idx === 10 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        borderRadius: '4px 4px 0 0',
                      }}></div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Attendance Reports */}
          {activeTab === 'reports' && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Export Timesheets & Reports</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Generate customized spreadsheets containing clock logs, late percentages, and overtime reports.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Month</label>
                  <select style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>November 2023</option>
                    <option>October 2023</option>
                    <option>September 2023</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Department</label>
                  <select style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>All Departments</option>
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>Human Resources</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Report Format</label>
                  <select style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>Excel Worksheet (.xlsx)</option>
                    <option>Comma Separated Values (.csv)</option>
                    <option>PDF Document (.pdf)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}>
                  <Download size={18} />
                  Generate and Export Report
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default Attendance;
