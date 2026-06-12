import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, IndianRupee, Briefcase, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';

const EmployeePayroll = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
      alert(err.message || 'Failed to fetch payslip details.');
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
      alert(err.message || 'Failed to download payslip PDF.');
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
                width: '90%',
                maxWidth: '520px',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div>
                  <strong>Employee:</strong> {selectedSlip.employee_name}
                </div>
                <div>
                  <strong>Employee ID:</strong> {selectedSlip.legacy_emp_id || '-'}
                </div>
                <div>
                  <strong>Department:</strong> {selectedSlip.department || '-'}
                </div>
                <div>
                  <strong>Designation:</strong> {selectedSlip.designation || '-'}
                </div>
                <div>
                  <strong>Working Ratio:</strong> {selectedSlip.employee_working_days ?? 30} / {selectedSlip.monthly_working_days ?? 30} days
                </div>
                <div>
                  <strong>Payment Status:</strong> {selectedSlip.payment_status}
                </div>
                <div>
                  <strong>PAN:</strong> {selectedSlip.pan || 'N/A'}
                </div>
                <div>
                  <strong>UAN:</strong> {selectedSlip.uan_no || 'N/A'}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Bank:</strong> {selectedSlip.bank_name || 'N/A'} (A/C: {selectedSlip.bank_account_no || 'N/A'})
                </div>
              </div>

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
                    <span>-{formatINR(selectedSlip.lop)}</span>
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
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem' }}>
                    <span>Net Salary</span>
                    <span>{formatINR(selectedSlip.net_salary)}</span>
                  </div>
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
