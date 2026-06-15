import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Calendar, FileText, IndianRupee, Plus, X, ArrowRight, Check,
  Lock, RefreshCw, AlertTriangle, ChevronRight, ChevronLeft, History,
  Users, Send, Eye, Download, Trash
} from 'lucide-react';
import api from '../../Services/api.js';
import { formatINR } from '../../Services/formatters.js';
import EmployeePayroll from './EmployeePayroll.jsx';
import { useToast } from '../../Shared/ToastContext';

// ──────────────────────────────────────────────────────────────────────────────
// Inline status banner (replaces all alert() calls)
// ──────────────────────────────────────────────────────────────────────────────
const Banner = ({ type, message, onClose }) => {
  if (!message) return null;
  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'var(--success)', color: 'var(--success)' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'var(--danger)', color: 'var(--danger)' },
    info: { bg: 'rgba(59,130,246,0.12)', border: 'var(--info)', color: 'var(--info)' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'var(--warning)', color: 'var(--warning)' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: '0.88rem', fontWeight: 500, marginBottom: '1rem'
    }}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer' }}><X size={16} /></button>}
    </div>
  );
};

const Payroll = () => {
  const { showToast } = useToast();
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownloadPdf = async (payrollId) => {
    try {
      setDownloadLoading(true);
      const blob = await api.download(`/payroll/payslips/${payrollId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${payrollId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      // optionally show a banner
    } finally {
      setDownloadLoading(false);
    }
  };
  const [activeSubTab, setActiveSubTab] = useState('runs');

  // ── Runs list ──
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);

  // ── 6-step wizard ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [confirmData, setConfirmData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generatedRun, setGeneratedRun] = useState(null);
  const [wizardBanner, setWizardBanner] = useState({ type: '', message: '' });

  // ── OTP ──
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [displayedOtp, setDisplayedOtp] = useState('');

  // ── Panel Approval OTP Modal ──
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalOtpCode, setApprovalOtpCode] = useState('');
  const [approvalOtpError, setApprovalOtpError] = useState('');
  const [approvalOtpLoading, setApprovalOtpLoading] = useState(false);
  const [approvalOtpSuccess, setApprovalOtpSuccess] = useState(false);
  const [approvalDisplayedOtp, setApprovalDisplayedOtp] = useState('');

  // ── Selected run details ──
  const [selectedRun, setSelectedRun] = useState(null);
  const [runDetails, setRunDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailViewTab, setDetailViewTab] = useState('employees');
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState({ type: '', message: '' });

  // ── Salary Revisions ──
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    effectiveDate: new Date().toISOString().split('T')[0],
    basicSalary: '', hra: '', specialAllowance: '', medicalAllowance: '',
    conveyanceAllowance: '', otherAllowance: '', pfPercent: 12, ptPercent: 0.40, tds: '', remarks: ''
  });
  const [revisionBanner, setRevisionBanner] = useState({ type: '', message: '' });

  // ────────────────────────────────────────────────────────────────────────────
  const fetchReportData = async () => {
    // existing implementation remains unchanged
  };



  const fetchRuns = async () => {
    try {
      setRunsLoading(true);
      const data = await api.get('/payroll/runs');
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchRuns(); fetchEmployees(); }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // WIZARD helpers
  // ────────────────────────────────────────────────────────────────────────────
  const openWizard = () => {
    setWizardStep(1);
    setConfirmData(null);
    setGeneratedRun(null);
    setOtpCode(''); setOtpError(''); setOtpSuccess(false); setDisplayedOtp('');
    setWizardBanner({ type: '', message: '' });
    setWizardOpen(true);
  };

  // Step 1 → Step 2: load confirmation data
  const handleFetchConfirmation = async () => {
    setConfirmLoading(true);
    setWizardBanner({ type: '', message: '' });
    try {
      const data = await api.get(`/payroll/confirm?month=${runMonth}&year=${runYear}`);
      setConfirmData(data);
      setWizardStep(2);
    } catch (err) {
      setWizardBanner({ type: 'error', message: err.message || 'Failed to load confirmation data.' });
    } finally {
      setConfirmLoading(false);
    }
  };

  // Step 2 -> 3: Request OTP instead of Generating
  const handleRequestOtp = async () => {
    setGenerateLoading(true); setOtpError(''); setDisplayedOtp('');
    try {
      const res = await api.post(`/payroll/otp-request`);
      if (res.developerOtp) setDisplayedOtp(res.developerOtp);
      setWizardStep(3);
    } catch (err) {
      setWizardBanner({ type: 'error', message: err.message || 'Failed to generate OTP.' });
    } finally {
      setGenerateLoading(false);
    }
  };

  // Step 3 -> 4: Verify OTP then Generate Draft
  const handleVerifyOtpAndGenerate = async (e) => {
    e.preventDefault();
    if (!otpCode) return;
    setOtpLoading(true); setOtpError('');
    try {
      await api.post(`/payroll/otp-verify`, { otpCode });
      setOtpSuccess(true);
      // Wait for success animation then generate
      setTimeout(async () => {
        setOtpSuccess(false);
        try {
          const res = await api.post('/payroll/run', { month: runMonth, year: runYear });
          setGeneratedRun(res.stats || res);
          // Automatically mark it as Approved since admin already verified via OTP
          const runId = (res.stats || res).runId;
          await api.put(`/payroll/runs/${runId}/status`, { status: 'Approved' });
          setWizardStep(4);
          fetchRuns();
        } catch (genErr) {
          setWizardBanner({ type: 'error', message: genErr.message || 'Payroll generation failed.' });
          setWizardStep(4);
        }
      }, 900);
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 4 -> 5: Release payroll
  const handleReleasePayroll = async () => {
    const runId = generatedRun?.runId || confirmData?.existingRun?.runId;
    setGenerateLoading(true);
    try {
      await api.post(`/payroll/runs/${runId}/release`);
      setWizardStep(6);
      fetchRuns();
    } catch (err) {
      setWizardBanner({ type: 'error', message: err.message });
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDownloadSummary = async (runId, format) => {
    setDownloadLoading(true);
    try {
      const endpoint = format === 'pdf' 
        ? `/payroll/summary/${runId}/download` 
        : `/payroll/summary/${runId}/download/${format}`;
      const response = await api.download(endpoint);
      const url = window.URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll_Summary_Run_${runId}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      showToast(`Failed to download summary ${format}`, 'error');
    } finally {
      setDownloadLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Status transitions from detail panel
  // ────────────────────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (runId, newStatus) => {
    try {
      await api.put(`/payroll/runs/${runId}/status`, { status: newStatus });
      setActionBanner({ type: 'success', message: `Payroll status updated to ${newStatus}.` });
      fetchRuns();
      if (selectedRun?.id === runId) setSelectedRun(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      setActionBanner({ type: 'error', message: err.message || 'Status update failed.' });
    }
  };

  const handleDeleteRun = async (runId) => {
    if (!window.confirm('Are you sure you want to permanently delete this payroll run? This will erase all associated payslips and records.')) return;
    try {
      await api.delete(`/payroll/runs/${runId}`);
      setActionBanner({ type: 'success', message: 'Payroll run deleted successfully.' });
      fetchRuns();
      if (selectedRun?.id === runId) setSelectedRun(null);
    } catch (err) {
      setActionBanner({ type: 'error', message: err.message || 'Failed to delete payroll run.' });
    }
  };

  const handleReleaseFromPanel = async (runId) => {
    try {
      const res = await api.post(`/payroll/runs/${runId}/release`);
      setActionBanner({ type: 'success', message: res.message });
      fetchRuns();
      if (selectedRun?.id === runId) setSelectedRun(prev => ({ ...prev, status: 'Released' }));
    } catch (err) {
      setActionBanner({ type: 'error', message: err.message });
    }
  };

  const handleRequestApprovalOtp = async (runId) => {
    setApprovalModalOpen(true);
    setApprovalOtpCode('');
    setApprovalOtpError('');
    setApprovalOtpSuccess(false);
    setApprovalDisplayedOtp('');
    setApprovalOtpLoading(true);
    try {
      const res = await api.post(`/payroll/otp-request`);
      if (res.developerOtp) {
        setApprovalDisplayedOtp(res.developerOtp);
      }
    } catch (err) {
      setApprovalOtpError(err.message || 'Failed to request OTP.');
    } finally {
      setApprovalOtpLoading(false);
    }
  };

  const handleVerifyApprovalOtp = async (e) => {
    e.preventDefault();
    if (!approvalOtpCode) return;
    setApprovalOtpLoading(true);
    setApprovalOtpError('');
    try {
      await api.post(`/payroll/otp-verify`, { otpCode: approvalOtpCode, runId: selectedRun.id });
      setApprovalOtpSuccess(true);
      setTimeout(() => {
        setApprovalModalOpen(false);
        fetchRuns();
        if (selectedRun?.id === selectedRun.id) {
          setSelectedRun(prev => ({ ...prev, status: 'Approved' }));
        }
        showToast('Payroll run approved successfully.', 'success');
      }, 900);
    } catch (err) {
      setApprovalOtpError(err.message || 'Invalid or expired OTP.');
    } finally {
      setApprovalOtpLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Run details
  // ────────────────────────────────────────────────────────────────────────────
  const handleViewDetails = async (run) => {
    setSelectedRun(run);
    setDetailsLoading(true);
    setDetailViewTab('employees');
    setActionBanner({ type: '', message: '' });
    try {
      const data = await api.get(`/payroll/history?runId=${run.id}`);
      setRunDetails(data);
      fetchReconciliation(run.id);
    } catch (err) { console.error(err); }
    finally { setDetailsLoading(false); }
  };

  const fetchReconciliation = async (runId) => {
    setReconciliationLoading(true);
    try {
      const data = await api.get(`/payroll/runs/${runId}/reconciliation`);
      setReconciliation(data);
    } catch (err) { console.error(err); }
    finally { setReconciliationLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Salary revisions
  // ────────────────────────────────────────────────────────────────────────────
  const handleSelectEmployee = async (empId) => {
    setSelectedEmpId(empId);
    if (!empId) { setRevisionHistory([]); return; }
    try {
      const data = await api.get(`/payroll/revisions/${empId}`);
      setRevisionHistory(data);
    } catch (err) { console.error(err); }
  };

  const handleCreateRevision = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/revisions', {
        empId: parseInt(selectedEmpId),
        effectiveDate: revisionForm.effectiveDate,
        basicSalary: parseFloat(revisionForm.basicSalary),
        hra: parseFloat(revisionForm.hra || 0),
        specialAllowance: parseFloat(revisionForm.specialAllowance || 0),
        medicalAllowance: parseFloat(revisionForm.medicalAllowance || 0),
        conveyanceAllowance: parseFloat(revisionForm.conveyanceAllowance || 0),
        otherAllowance: parseFloat(revisionForm.otherAllowance || 0),
        pfPercent: parseFloat(revisionForm.pfPercent),
        ptPercent: parseFloat(revisionForm.ptPercent),
        tds: parseFloat(revisionForm.tds || 0),
        remarks: revisionForm.remarks
      });
      setShowRevisionModal(false);
      setRevisionBanner({ type: 'success', message: 'Salary revision logged successfully.' });
      handleSelectEmployee(selectedEmpId);
    } catch (err) {
      setRevisionBanner({ type: 'error', message: err.message || 'Failed to create revision.' });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const getMonthName = (m) => MONTHS[m - 1] || 'Unknown';

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'var(--text-secondary)';
      case 'Reviewed': return 'var(--info)';
      case 'Approved': return 'var(--warning)';
      case 'Released': return 'var(--success)';
      default: return 'var(--text-tertiary)';
    }
  };

  // Smart confirmation message based on existing run status
  const getConfirmationMessage = () => {
    if (!confirmData) return null;
    const { existingRun, isBlocked, calendarConfigured } = confirmData;
    if (!calendarConfigured) return { type: 'error', text: `No active payroll calendar configured for ${getMonthName(runMonth)} ${runYear}. Please set up the calendar first.` };
    if (isBlocked) return { type: 'warning', text: `Payroll processing for ${getMonthName(runMonth)} ${runYear} is not yet unlocked. Processing date has not been reached.` };
    if (!existingRun) return { type: 'info', text: `No payroll run exists for ${getMonthName(runMonth)} ${runYear}. A new Version 1 Draft will be created. Calculating and overwriting it. No new version will be created.` };
    if (existingRun.status === 'Draft') return { type: 'warning', text: `A Draft payroll already exists (v${existingRun.version}). Generating will recalculate and overwrite it. No new version will be created.` };
    if (existingRun.status === 'Reviewed') return { type: 'warning', text: `A Reviewed payroll exists (v${existingRun.version}). Regenerating will overwrite the existing run. No new version will be created.` };
    if (existingRun.status === 'Approved') return { type: 'warning', text: `An Approved payroll exists (v${existingRun.version}). Recalculation is allowed but requires PayrollAdmin/SuperAdmin authorization.` };
    if (existingRun.status === 'Released') return { type: 'info', text: `The payroll for this period was Released (v${existingRun.version}). A new version (v${existingRun.version + 1}) will be created preserving historical records.` };
    return null;
  };

  const canProceed = () => {
    if (!confirmData) return false;
    if (!confirmData.calendarConfigured || confirmData.isBlocked) return false;
    return true;
  };

  // Wizard step labels
  const STEPS = ['Select Period', 'Confirm', 'Generate Draft', 'Review & OTP', 'Release', 'Done'];

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payroll Generation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Manage payroll batch lifecycle, calculate pay lines, and configure salary revisions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={openWizard}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', background: 'var(--accent-primary)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <CreditCard size={18} /> New Payroll Run
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem' }}>
        {['runs', 'revisions', 'my_payslip'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              padding: '0.75rem 1rem', border: 'none', background: 'transparent',
              borderBottom: activeSubTab === tab ? '2px solid var(--accent-primary)' : 'none',
              color: activeSubTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeSubTab === tab ? 600 : 400, fontSize: '0.95rem', cursor: 'pointer'
            }}
          >
            {tab === 'runs' ? 'Payroll Batches' : tab === 'revisions' ? 'Salary Revisions' : 'My Payslip'}
          </button>
        ))}
      </div>

      {/* ─── RUNS TAB ─── */}
      {activeSubTab === 'runs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Banner type={actionBanner.type} message={actionBanner.message} onClose={() => setActionBanner({ type: '', message: '' })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.8fr', gap: '1.5rem' }}>

            {/* Runs list */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Calculated Batches</h2>
              {runsLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading batches...</div>
              ) : runs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                  <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.9rem' }}>No batches calculated yet.<br />Click "New Payroll Run" to begin.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {runs.map(run => (
                    <div
                      key={run.id}
                      onClick={() => handleViewDetails(run)}
                      style={{
                        padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', background: selectedRun?.id === run.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        transition: 'all 0.2s', borderLeft: `4px solid ${getStatusColor(run.status)}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{getMonthName(run.month)} {run.year}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: getStatusColor(run.status), textTransform: 'uppercase' }}>{run.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>v{run.version || 1}</span>
                        <span>{new Date(run.runDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Details Panel */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              {selectedRun ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                        {getMonthName(selectedRun.month)} {selectedRun.year} — v{selectedRun.version || 1}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                        Status: <strong style={{ color: getStatusColor(selectedRun.status) }}>{selectedRun.status}</strong>
                        {selectedRun.approvedByName && ` • Approved by: ${selectedRun.approvedByName}`}
                      </p>
                    </div>

                    {/* Transition buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedRun.status === 'Draft' && (
                        <button onClick={() => handleUpdateStatus(selectedRun.id, 'Reviewed')}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', background: 'var(--info)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
                          <Check size={13} /> Mark Reviewed
                        </button>
                      )}
                      {selectedRun.status === 'Reviewed' && (
                        <button onClick={() => handleRequestApprovalOtp(selectedRun.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
                          <Lock size={13} /> Get OTP
                        </button>
                      )}
                      {selectedRun.status === 'Approved' && (
                        <button onClick={() => handleReleaseFromPanel(selectedRun.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
                          <Send size={13} /> Release Payroll
                        </button>
                      )}
                      {selectedRun.status === 'Released' && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={13} /> Released & Paid
                        </span>
                      )}
                      <button onClick={() => handleDeleteRun(selectedRun.id)}
                        title="Permanently delete this payroll run and all associated data"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.45rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', marginLeft: '1rem' }}>
                        <Trash size={13} /> Delete Run
                      </button>
                    </div>
                  </div>

                  {/* Summary Download Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Download Summary Reports:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleDownloadSummary(selectedRun.id, 'pdf')} disabled={downloadLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', background: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{downloadLoading ? '...' : 'PDF'}</button>
                      <button onClick={() => handleDownloadSummary(selectedRun.id, 'excel')} disabled={downloadLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', background: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{downloadLoading ? '...' : 'Excel'}</button>
                      <button onClick={() => handleDownloadSummary(selectedRun.id, 'csv')} disabled={downloadLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', background: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{downloadLoading ? '...' : 'CSV'}</button>
                    </div>
                  </div>

                  {/* Detail tabs */}
                  <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                    {['employees', 'reconciliation', 'exceptions'].map(t => (
                      <button key={t} onClick={() => setDetailViewTab(t)}
                        style={{
                          background: 'transparent', border: 'none', padding: '0.45rem 0.75rem', fontSize: '0.83rem',
                          color: detailViewTab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          borderBottom: detailViewTab === t ? '2px solid var(--accent-primary)' : 'none',
                          cursor: 'pointer', fontWeight: detailViewTab === t ? 600 : 400
                        }}>
                        {t === 'employees' ? `Pay Lines (${runDetails.length})` : t === 'reconciliation' ? 'Reconciliation' : `Exceptions (${reconciliation?.exceptions?.length || 0})`}
                      </button>
                    ))}
                  </div>

                  {detailsLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
                  ) : (
                    <>
                      {/* EMPLOYEES */}
                      {detailViewTab === 'employees' && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Employee</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Gross</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Deductions</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Net Salary</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Download</th>
                              </tr>
                            </thead>
                            <tbody>
                              {runDetails.map(detail => (
                                <tr key={detail.payroll_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{detail.employee_name}</td>
                                  <td style={{ padding: '0.6rem 0.75rem' }}>{formatINR(detail.total_earnings)}</td>
                                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--danger)' }}>{formatINR(detail.deductions)}</td>
                                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{formatINR(detail.net_salary)}</td>
                                  <td style={{ padding: '0.6rem 0.75rem' }}>
                                    <span style={{
                                      padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600,
                                      background: detail.payment_status === 'Paid' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                                      color: detail.payment_status === 'Paid' ? 'var(--success)' : 'var(--danger)'
                                    }}>{detail.payment_status}</span>
                                  </td>
                                  <td style={{ padding: '0.6rem 0.75rem' }}>
                                    <button
                                      onClick={() => handleDownloadPdf(detail.payroll_id)}
                                      disabled={downloadLoading}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                                      <Download size={12} /> PDF
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {runDetails.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                              No pay lines found. Check the Exceptions tab.
                            </div>
                          )}
                        </div>
                      )}

                      {/* RECONCILIATION */}
                      {detailViewTab === 'reconciliation' && (
                        <div>
                          {reconciliationLoading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
                            : reconciliation?.summary ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                  {[
                                    { label: 'Total Eligible', val: reconciliation.summary.TotalEmployees, color: '' },
                                    { label: 'Processed', val: reconciliation.summary.EmployeesProcessed, color: 'var(--success)' },
                                    { label: 'Skipped', val: reconciliation.summary.EmployeesSkipped, color: 'var(--warning)' },
                                    { label: 'Exceptions', val: reconciliation.summary.ExceptionsCount, color: 'var(--danger)' },
                                  ].map(item => (
                                    <div key={item.label} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: item.color ? `4px solid ${item.color}` : 'none' }}>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
                                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Financial Summary</h3>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                                    {[
                                      { label: 'Gross Earnings', val: formatINR(reconciliation.summary.GrossAmount) },
                                      { label: 'Provident Fund (PF)', val: `-${formatINR(reconciliation.summary.TotalPF)}` },
                                      { label: 'Professional Tax (PT)', val: `-${formatINR(reconciliation.summary.TotalPT)}` },
                                      { label: 'TDS', val: `-${formatINR(reconciliation.summary.TotalTDS)}` },
                                      { label: 'Loss of Pay (LOP)', val: `-${formatINR(reconciliation.summary.TotalLOP)}` },
                                    ].map(r => (
                                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                                        <span>{r.val}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
                                    <span>Net Payable</span>
                                    <span style={{ color: 'var(--accent-primary)' }}>{formatINR(reconciliation.summary.NetPayable)}</span>
                                  </div>
                                </div>
                              </div>
                            ) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No summary available.</div>}
                        </div>
                      )}

                      {/* EXCEPTIONS */}
                      {detailViewTab === 'exceptions' && (
                        <div>
                          {reconciliation?.exceptions?.length > 0 ? (
                            <div>
                              <div style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <AlertTriangle size={15} /> Employees were skipped due to missing data. Resolve these before next payroll.
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                <thead>
                                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '0.5rem 0.75rem' }}>Employee</th>
                                    <th style={{ padding: '0.5rem 0.75rem' }}>Exception Type</th>
                                    <th style={{ padding: '0.5rem 0.75rem' }}>Message</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reconciliation.exceptions.map(exc => (
                                    <tr key={exc.ExceptionID} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{exc.EmployeeName}</td>
                                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--danger)' }}>{exc.ExceptionType}</td>
                                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{exc.ExceptionMessage}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)' }}>
                              <Check size={32} style={{ marginBottom: '0.5rem' }} />
                              <p style={{ fontSize: '0.88rem' }}>No exceptions! All eligible employees processed successfully.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <Eye size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
                  <p style={{ fontSize: '0.9rem' }}>Select a batch from the left to view details,<br />progress its lifecycle, or download payslips.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── REVISIONS TAB ─── */}
      {activeSubTab === 'revisions' && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
          <Banner type={revisionBanner.type} message={revisionBanner.message} onClose={() => setRevisionBanner({ type: '', message: '' })} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Employee:</span>
              <select value={selectedEmpId} onChange={e => handleSelectEmployee(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '260px' }}>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{`${emp.firstName} ${emp.lastName}`}</option>
                ))}
              </select>
            </div>
            {selectedEmpId && (
              <button onClick={() => { setRevisionForm({ effectiveDate: new Date().toISOString().split('T')[0], basicSalary: '', hra: '', specialAllowance: '', medicalAllowance: '', conveyanceAllowance: '', otherAllowance: '', pfPercent: 12, ptPercent: 0.40, tds: '', remarks: '' }); setShowRevisionModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={15} /> Log Salary Revision
              </button>
            )}
          </div>

          {selectedEmpId ? (
            revisionHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No salary revisions yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {['Effective Date', 'Basic', 'HRA', 'Special', 'PF%', 'PT%', 'Status', 'Remarks'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revisionHistory.map(rev => (
                    <tr key={rev.RevisionID} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{new Date(rev.EffectiveDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{formatINR(rev.BasicSalary)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{formatINR(rev.HouseRentAllowance)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{formatINR(rev.SpecialAllowance)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{rev.ProvidentFundPercent}%</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{rev.ProfessionalTaxPercent}%</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: rev.IsActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: rev.IsActive ? 'var(--success)' : 'var(--danger)' }}>
                          {rev.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{rev.Remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Select an employee to view their salary structure.</div>
          )}
        </div>
      )}

      {/* ─── MY PAYSLIP TAB ─── */}
      {activeSubTab === 'my_payslip' && (
        <EmployeePayroll />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          6-STEP WIZARD MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {wizardOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '560px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
            >
              {/* Wizard header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>New Payroll Run</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Step {wizardStep} of {STEPS.length}: {STEPS[wizardStep - 1]}</p>
                </div>
                <button onClick={() => setWizardOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {/* Step indicator */}
              <div style={{ display: 'flex', padding: '0.75rem 1.5rem', gap: '0.35rem', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                {STEPS.map((label, i) => (
                  <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < wizardStep ? 'var(--accent-primary)' : 'var(--border-color)', transition: 'background 0.3s' }} />
                ))}
              </div>

              {/* Step content */}
              <div style={{ padding: '1.75rem 1.5rem' }}>
                <Banner type={wizardBanner.type} message={wizardBanner.message} onClose={() => setWizardBanner({ type: '', message: '' })} />

                {/* ── STEP 1: Select Period ── */}
                {wizardStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.5rem' }}>Month</label>
                        <select value={runMonth} onChange={e => setRunMonth(parseInt(e.target.value))}
                          style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, marginBottom: '0.5rem' }}>Year</label>
                        <input type="number" value={runYear} onChange={e => setRunYear(parseInt(e.target.value))}
                          style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <button onClick={handleFetchConfirmation} disabled={confirmLoading}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', opacity: confirmLoading ? 0.7 : 1 }}>
                      {confirmLoading ? 'Loading...' : <><ArrowRight size={16} /> Continue</>}
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Confirm ── */}
                {wizardStep === 2 && confirmData && (() => {
                  const msg = getConfirmationMessage();
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        Payroll for {getMonthName(runMonth)} {runYear}
                      </h4>

                      {/* Employee counts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {[
                          { label: 'Eligible Employees', val: confirmData.eligibleCount, color: 'var(--success)' },
                          { label: 'On Notice', val: confirmData.onNoticeCount, color: 'var(--warning)' },
                          { label: 'On Leave', val: confirmData.onLeaveCount, color: 'var(--info)' },
                          { label: 'Inactive', val: confirmData.inactiveCount, color: 'var(--danger)' },
                        ].map(item => (
                          <div key={item.label} style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${item.color}` }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Status message */}
                      {msg && (
                        <div style={{
                          background: msg.type === 'error' ? 'rgba(239,68,68,0.1)' : msg.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                          border: `1px solid ${msg.type === 'error' ? 'var(--danger)' : msg.type === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
                          color: msg.type === 'error' ? 'var(--danger)' : msg.type === 'warning' ? 'var(--warning)' : 'var(--info)',
                          borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.85rem'
                        }}>
                          <strong>Note:</strong> {msg.text}
                        </div>
                      )}

                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Do you want to generate payroll for <strong>{getMonthName(runMonth)} {runYear}</strong>?
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setWizardStep(1)} style={{ padding: '0.65rem 1.1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ChevronLeft size={15} /> Back
                        </button>
                        <button onClick={handleRequestOtp} disabled={!canProceed() || generateLoading}
                          style={{ padding: '0.65rem 1.25rem', background: canProceed() ? 'var(--accent-primary)' : 'var(--border-color)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: canProceed() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {generateLoading ? <RefreshCw size={15} className="spin" /> : <Check size={15} />}
                          {generateLoading ? 'Requesting OTP...' : 'Generate Draft'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── STEP 3: OTP Approval ── */}
                {wizardStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Lock size={24} />
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>OTP Approval Required</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: 0 }}>Generate an OTP, then enter it below to securely generate the payroll run.</p>
                    </div>

                    {displayedOtp && (
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Your OTP (valid 15 min):</p>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '6px', color: 'var(--success)' }}>{displayedOtp}</span>
                      </div>
                    )}

                    {!displayedOtp && (
                      <button onClick={handleRequestOtp} disabled={generateLoading}
                        style={{ padding: '0.7rem', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                        {generateLoading ? 'Generating...' : 'Generate Approval OTP'}
                      </button>
                    )}

                    {otpError && <Banner type="error" message={otpError} />}

                    <form onSubmit={handleVerifyOtpAndGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input type="text" required placeholder="Enter 6-digit OTP" value={otpCode} maxLength={6}
                        onChange={e => setOtpCode(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontWeight: 700, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                      <button type="submit" disabled={otpLoading || otpSuccess}
                        style={{ padding: '0.75rem', background: otpSuccess ? 'var(--success)' : 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                        {otpSuccess ? '✓ Verified!' : otpLoading ? 'Verifying & Generating Draft...' : 'Verify & Generate Payroll'}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── STEP 4: Generated ── */}
                {wizardStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Check size={28} />
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Draft Generated Successfully!</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                        {generatedRun?.employeesProcessed ?? '—'} employees processed, {generatedRun?.employeesSkipped ?? 0} skipped.
                      </p>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.85rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Run ID: <strong>#{generatedRun?.runId}</strong></p>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Version: <strong>v{generatedRun?.version}</strong></p>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Review the pay lines in the batches panel, then proceed to Release.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setWizardOpen(false)} style={{ padding: '0.65rem 1.1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Done (Review Later)
                      </button>
                      <button onClick={() => setWizardStep(5)}
                        style={{ padding: '0.65rem 1.25rem', background: 'var(--info)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ArrowRight size={15} /> Continue to Release
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 5: Release ── */}
                {wizardStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Send size={24} />
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Release Payroll</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: 0 }}>
                        Approving release will mark all salary records as <strong>Paid</strong>, send payslip notifications to employees, and create dispatch logs.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setWizardOpen(false)} style={{ padding: '0.65rem 1.1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Cancel
                      </button>
                      <button onClick={handleReleasePayroll} disabled={generateLoading}
                        style={{ padding: '0.65rem 1.5rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Send size={15} /> {generateLoading ? 'Releasing...' : 'Confirm Release'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 6: Done ── */}
                {wizardStep === 6 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--success))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={32} color="#fff" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>Payroll Released! 🎉</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                        Salary records marked paid. Payslip notifications sent to all employees.
                      </p>
                    </div>
                    <button onClick={() => { setWizardOpen(false); fetchRuns(); }}
                      style={{ padding: '0.75rem 2rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Salary Revision Modal */}
      <AnimatePresence>
        {showRevisionModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Log Salary Revision</h3>
                <button onClick={() => setShowRevisionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateRevision} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { label: 'Effective Date', key: 'effectiveDate', type: 'date', required: true },
                  { label: 'Basic Salary (₹)', key: 'basicSalary', type: 'number', required: true },
                  { label: 'HRA (₹)', key: 'hra', type: 'number' },
                  { label: 'Special Allowance (₹)', key: 'specialAllowance', type: 'number' },
                  { label: 'Medical Allowance (₹)', key: 'medicalAllowance', type: 'number' },
                  { label: 'Conveyance Allowance (₹)', key: 'conveyanceAllowance', type: 'number' },
                  { label: 'Other Allowance (₹)', key: 'otherAllowance', type: 'number' },
                  { label: 'PF %', key: 'pfPercent', type: 'number', step: '0.01', required: true },
                  { label: 'PT %', key: 'ptPercent', type: 'number', step: '0.01', required: true },
                  { label: 'TDS (₹)', key: 'tds', type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>{field.label}</label>
                    <input type={field.type} step={field.step} required={field.required} value={revisionForm[field.key]}
                      onChange={e => setRevisionForm({ ...revisionForm, [field.key]: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Remarks</label>
                  <input type="text" value={revisionForm.remarks} onChange={e => setRevisionForm({ ...revisionForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowRevisionModal(false)} style={{ padding: '0.65rem 1.1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
                  <button type="submit" style={{ padding: '0.65rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>Save Revision</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Panel Run Approval OTP Modal */}
      <AnimatePresence>
        {approvalModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Verify Payroll Approval OTP</h3>
                <button onClick={() => setApprovalModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Lock size={24} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    Enter the 6-digit OTP code to verify and approve the payroll run.
                  </p>
                </div>

                {approvalDisplayedOtp && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Local Developer OTP (valid 15 min):</p>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '6px', color: 'var(--success)' }}>{approvalDisplayedOtp}</span>
                  </div>
                )}

                {approvalOtpError && <Banner type="error" message={approvalOtpError} />}

                <form onSubmit={handleVerifyApprovalOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input type="text" required placeholder="Enter 6-digit OTP" value={approvalOtpCode} maxLength={6}
                    onChange={e => setApprovalOtpCode(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem', textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontWeight: 700, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  <button type="submit" disabled={approvalOtpLoading || approvalOtpSuccess}
                    style={{ padding: '0.75rem', background: approvalOtpSuccess ? 'var(--success)' : 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                    {approvalOtpSuccess ? '✓ Approved & Verified!' : approvalOtpLoading ? 'Verifying & Approving...' : 'Verify & Approve Payroll'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );

}
export default Payroll;
