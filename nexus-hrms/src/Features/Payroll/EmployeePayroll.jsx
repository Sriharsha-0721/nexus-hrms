import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, IndianRupee, X, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';
import { useToast } from '../../Shared/ToastContext';

const numberToWords = (num) => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n) => {
    if (n === 0) return '';
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) {
          str += ' ' + a[n % 10];
        }
      }
    }
    return str.trim();
  };

  let n = Math.floor(num);
  if (n === 0) return 'Rupees Zero Only';

  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  let remaining = n;

  let result = '';
  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    result += convertLessThanOneThousand(remaining);
  }

  return 'Rupees ' + result.trim().replace(/\s+/g, ' ') + ' Only';
};

const EmployeePayroll = () => {
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const rawLop = selectedSlip?.lop ?? 0;
  const lopAmount = rawLop > 31 ? rawLop : 0;
  const lopDays = rawLop > 31 ? ((selectedSlip?.absent_days || 0) + (selectedSlip?.unpaid_leave_days || 0)) : rawLop;

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/payroll/history?personal=true');
      setHistory(data);
    } catch (err) {
      console.error('Failed to load payroll history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[m - 1] || 'Unknown';
  };

  const handleViewPayslip = async (payrollId) => {
    try {
      const data = await api.get(`/payroll/payslip/${payrollId}`);
      setSelectedSlip(data);
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to fetch payslip details.', 'error');
    }
  };

  const handleDownloadPayslip = async () => {
    if (!selectedSlip) return;
    setDownloading(true);
    try {
      const blob = await api.download(`/payroll/payslips/${selectedSlip.payroll_id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${getMonthName(selectedSlip.month)}_${selectedSlip.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || 'Failed to download payslip PDF.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const latestSlip = history[0] || {
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
    net_salary: 0
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Payslip</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>View your salary structure, tax deductions, and download official PDF statements.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

        {/* Left Column: Current Salary Structure */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: 'var(--radius-md)' }}><Briefcase size={20} /></div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Salary Structure</h2>
          </div>

          <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border-color)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Latest Net Pay</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {formatINR(latestSlip.net_salary)}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Basic Pay</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatINR(latestSlip.basic_salary)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Allowances</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatINR(latestSlip.allowances)}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IndianRupee size={14} color="var(--danger)" /> Deductions</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--danger)' }}>-{formatINR(latestSlip.deductions)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Payslip History */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Payslip History</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Loading payslips...</div>
              ) : history.map((slip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{getMonthName(slip.month)} {slip.year}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {slip.payment_status === 'Paid' ? `Paid on ${new Date(slip.payment_date).toLocaleDateString()}` : 'Payment Pending'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatINR(slip.net_salary)}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: slip.payment_status === 'Paid' ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>{slip.payment_status}</div>
                    </div>
                    <button
                      onClick={() => handleViewPayslip(slip.payroll_id)}
                      style={{
                        padding: '0.6rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    >
                      View Payslip
                    </button>
                  </div>
                </div>
              ))}
              {!loading && history.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No payslips generated yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payslip View Modal */}
      <AnimatePresence>
        {isModalOpen && selectedSlip && (
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
                padding: '1.5rem',
                width: '95%',
                maxWidth: '600px',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Payslip Summary</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Period: {getMonthName(selectedSlip.month)} {selectedSlip.year}</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Payslip details */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.65rem 1.25rem', 
                marginBottom: '1.5rem', 
                fontSize: '0.85rem',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '1rem'
              }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Employee Name:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.employee_name}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Employee ID:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.legacy_emp_id || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Designation:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.designation || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Department:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.department || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Date of Joining:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.join_date ? new Date(selectedSlip.join_date).toLocaleDateString('en-GB') : '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Employee Status:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.employee_status || 'Active'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Official Email:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.official_email || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Reporting Manager:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.manager_name || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>PAN:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.pan || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>UAN:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.uan_no || '-'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Payroll Month:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getMonthName(selectedSlip.month)}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Payroll Year:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.year}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Payroll Version:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.payroll_version ? `v${selectedSlip.payroll_version}` : 'v1'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Payment Status:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.payment_status || 'Paid'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Bank Account:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedSlip.bank_name || '-'} (A/C: {selectedSlip.bank_account_no || '-'})</span>
                </div>
              </div>

              {/* Attendance Summary */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>Attendance Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Calendar Days</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedSlip.monthly_working_days ?? 30}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Present Days</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedSlip.employee_working_days ?? 30}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Absent Days</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{lopDays}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>LOP Days</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{lopDays}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Paid Days</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedSlip.employee_working_days ?? 30}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Attendance %</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedSlip.monthly_working_days ? (((selectedSlip.employee_working_days ?? 30) / selectedSlip.monthly_working_days) * 100).toFixed(2) : '100.00'}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-tertiary)', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>Earnings & Deductions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Basic Pay</span>
                    <span>{formatINR(selectedSlip.basic_salary)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>HRA</span>
                    <span>+{formatINR(selectedSlip.hra ?? 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Special Allowance</span>
                    <span>+{formatINR(selectedSlip.special_allowance ?? 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Other Allowances</span>
                    <span>+{formatINR(selectedSlip.allowances ?? 0)}</span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed var(--border-light)', margin: '0.25rem 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Gross Salary</span>
                    <span>{formatINR(selectedSlip.total_earnings)}</span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.25rem 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>PF</span>
                    <span>-{formatINR(selectedSlip.pf)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>PT</span>
                    <span>-{formatINR(selectedSlip.pt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>LOP Deductions</span>
                    <span>-{formatINR(lopAmount)}</span>
                  </div>
                  {selectedSlip.tds > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span>TDS</span>
                      <span>-{formatINR(selectedSlip.tds)}</span>
                    </div>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px dashed var(--border-light)', margin: '0.25rem 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Total Deductions</span>
                    <span>-{formatINR(selectedSlip.deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Salary Summary (Net Pay Derivation) */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>Salary Summary (Net Pay Derivation)</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>(A) Gross Earnings:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatINR(selectedSlip.total_earnings)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>(B) Total Deductions:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>-{formatINR(selectedSlip.deductions)}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Net Salary Paid (A - B):</span>
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 800 }}>{formatINR(selectedSlip.net_salary)}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Net Salary is derived by subtracting Total Deductions from Gross Earnings.
                </div>
              </div>

              {/* Net Salary in Words */}
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--border-light)'
              }}>
                <strong>Amount in Words:</strong> <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{numberToWords(selectedSlip.net_salary)}</span>
              </div>

              {/* System generated Footer */}
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                marginBottom: '1.5rem',
                background: 'var(--bg-tertiary)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)'
              }}>
                <div><strong>Generated By:</strong> System Admin</div>
                <div><strong>Payroll Version:</strong> {selectedSlip.payroll_version ? `v${selectedSlip.payroll_version}` : 'v1'}</div>
                <div><strong>Release Date:</strong> {selectedSlip.release_date ? new Date(selectedSlip.release_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</div>
                <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>
                  This is a system generated payslip preview and does not require a signature.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={handleDownloadPayslip}
                  disabled={downloading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  <Download size={16} /> {downloading ? 'Downloading...' : 'Download Official PDF'}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
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

export default EmployeePayroll;
