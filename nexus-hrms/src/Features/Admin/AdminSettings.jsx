import { motion } from 'framer-motion';
import { Shield, Bell, Building, Check, X, Edit, Trash, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';
import { useToast } from '../../Shared/ToastContext';

const AdminSettings = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  
  // State for Departments
  const [departments, setDepartments] = useState([]);
  const [deptForm, setDeptForm] = useState({ id: null, name: '', managerId: '' });
  const [showDeptModal, setShowDeptModal] = useState(false);

  // State for Designations
  const [designations, setDesignations] = useState([]);
  const [desigForm, setDesigForm] = useState({ id: null, name: '', description: '' });
  const [showDesigModal, setShowDesigModal] = useState(false);

  // State for Leave Policies
  const [policies, setPolicies] = useState([]);
  const [editingPolicy, setEditingPolicy] = useState(null);

  // State for Profile Change Requests
  const [requests, setRequests] = useState([]);
  const [processReason, setProcessReason] = useState({});

  // Fetch data on mount & tab changes
  useEffect(() => {
    fetchTabContent();
  }, [activeTab]);

  const fetchTabContent = async () => {
    try {
      if (activeTab === 'departments') {
        const data = await api.get('/departments');
        setDepartments(data);
      } else if (activeTab === 'designations') {
        const data = await api.get('/designations');
        setDesignations(data);
      } else if (activeTab === 'leavepolicies') {
        const data = await api.get('/leaves/policies');
        setPolicies(data);
      } else if (activeTab === 'profilerequests') {
        const data = await api.get('/profile-requests/pending');
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  // --- Department CRUD ---
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      if (deptForm.id) {
        await api.put(`/departments/${deptForm.id}`, { name: deptForm.name, managerId: deptForm.managerId ? parseInt(deptForm.managerId) : null });
        showToast('Department updated successfully!', 'success');
      } else {
        await api.post('/departments', { name: deptForm.name, managerId: deptForm.managerId ? parseInt(deptForm.managerId) : null });
        showToast('Department created successfully!', 'success');
      }
      setShowDeptModal(false);
      setDeptForm({ id: null, name: '', managerId: '' });
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDeptDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      showToast('Department deleted successfully!', 'success');
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // --- Designation CRUD ---
  const handleDesigSubmit = async (e) => {
    e.preventDefault();
    try {
      if (desigForm.id) {
        await api.put(`/designations/${desigForm.id}`, { name: desigForm.name, description: desigForm.description });
        showToast('Designation updated successfully!', 'success');
      } else {
        await api.post('/designations', { name: desigForm.name, description: desigForm.description });
        showToast('Designation created successfully!', 'success');
      }
      setShowDesigModal(false);
      setDesigForm({ id: null, name: '', description: '' });
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDesigDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;
    try {
      await api.delete(`/designations/${id}`);
      showToast('Designation deleted successfully!', 'success');
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // --- Leave Policies Update ---
  const handlePolicyUpdate = async (id, maxDays, isCarryForward) => {
    try {
      await api.put(`/leaves/policies/${id}`, { maxAllowedDays: parseInt(maxDays), isCarryForward });
      showToast('Leave policy updated successfully!', 'success');
      setEditingPolicy(null);
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Failed to update policy', 'error');
    }
  };

  // --- Profile Change Approval Workflow ---
  const handleProcessRequest = async (id, status) => {
    try {
      const reason = processReason[id] || '';
      await api.post(`/profile-requests/${id}/process`, { status, reason });
      showToast(`Profile request ${status.toLowerCase()} successfully!`, 'success');
      setProcessReason(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchTabContent();
    } catch (err) {
      showToast(err.message || 'Failed to process change request', 'error');
    }
  };

  const userRole = localStorage.getItem('userRole') || 'employee';
  const allTabs = [
    { id: 'company', label: 'Company Profile', icon: Building, roles: ['SuperAdmin', 'HRAdmin', 'PayrollAdmin'] },
    { id: 'departments', label: 'Departments', icon: Building, roles: ['SuperAdmin', 'HRAdmin'] },
    { id: 'designations', label: 'Designations', icon: Shield, roles: ['SuperAdmin', 'HRAdmin'] },
    { id: 'leavepolicies', label: 'Leave Policies', icon: Bell, roles: ['SuperAdmin', 'HRAdmin', 'PayrollAdmin'] },
    { id: 'profilerequests', label: 'Profile Requests', icon: Shield, roles: ['SuperAdmin', 'HRAdmin'] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Manage organizational preferences, lookups, and profile approvals.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Settings Sidebar */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem', width: '100%',
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  textAlign: 'left', fontSize: '0.9rem', fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          {activeTab === 'company' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Company Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Company Name</label>
                  <input type="text" defaultValue="Nexus Solutions Ltd." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Registration Number</label>
                  <input type="text" defaultValue="REG-9923847-X" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Registered Address</label>
                  <input type="text" defaultValue="Hitech city, CyberGateway, Block-A" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500 }}>
                Save Changes
              </button>
            </motion.div>
          )}

          {activeTab === 'departments' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Departments Master</h2>
                <button
                  onClick={() => {
                    setDeptForm({ id: null, name: '', managerId: '' });
                    setShowDeptModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500 }}
                >
                  <Plus size={16} /> Add Department
                </button>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Department Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{d.id}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{d.name}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setDeptForm({ id: d.id, name: d.name, managerId: d.managerId || '' });
                              setShowDeptModal(true);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', padding: '0.25rem' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeptDelete(d.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '0.25rem' }}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showDeptModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{deptForm.id ? 'Edit' : 'Add'} Department</h3>
                    <form onSubmit={handleDeptSubmit}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Name</label>
                        <input
                          type="text"
                          required
                          value={deptForm.name}
                          onChange={e => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => setShowDeptModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>Cancel</button>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)' }}>Save</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'designations' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Designations Master</h2>
                <button
                  onClick={() => {
                    setDesigForm({ id: null, name: '', description: '' });
                    setShowDesigModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500 }}
                >
                  <Plus size={16} /> Add Designation
                </button>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ID</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Designation Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designations.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{d.id}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{d.name}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{d.description || 'N/A'}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setDesigForm({ id: d.id, name: d.name, description: d.description || '' });
                              setShowDesigModal(true);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', padding: '0.25rem' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDesigDelete(d.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', padding: '0.25rem' }}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showDesigModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{desigForm.id ? 'Edit' : 'Add'} Designation</h3>
                    <form onSubmit={handleDesigSubmit}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Name</label>
                        <input
                          type="text"
                          required
                          value={desigForm.name}
                          onChange={e => setDesigForm(prev => ({ ...prev, name: e.target.value }))}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                          value={desigForm.description}
                          onChange={e => setDesigForm(prev => ({ ...prev, description: e.target.value }))}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', height: '80px', resize: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => setShowDesigModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>Cancel</button>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)' }}>Save</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'leavepolicies' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Leave Policies & Allowances</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {policies.map(p => {
                  const isEditing = editingPolicy === p.id;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.leaveType}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Carry Forward: {p.isCarryForward ? 'Yes' : 'No'}
                        </div>
                      </div>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            id={`policy-input-${p.id}`}
                            defaultValue={p.maxAllowedDays}
                            style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                          <button
                            onClick={() => {
                              const val = document.getElementById(`policy-input-${p.id}`).value;
                              handlePolicyUpdate(p.id, val, p.isCarryForward);
                            }}
                            style={{ padding: '0.5rem 1rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPolicy(null)}
                            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{p.maxAllowedDays} Days Allowed</div>
                          <button
                            onClick={() => setEditingPolicy(p.id)}
                            style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)', fontSize: '0.8rem' }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profilerequests' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Pending Profile Approvals</h2>
              {requests.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No pending change requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {requests.map(req => (
                    <div key={req.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{req.employeeName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.employeeEmail} | Requested on {new Date(req.requestedAt).toLocaleDateString()}</div>
                        </div>
                        <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--warning)', color: '#fff', borderRadius: '12px', fontWeight: 500 }}>Pending</span>
                      </div>

                      {/* Display Differences */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Requested Updates:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.keys(req.requestedData).map(key => (
                            <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{key}:</span>
                              <span style={{ color: 'var(--success)', fontWeight: 500 }}>{String(req.requestedData[key])}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Input for remarks */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Rejection reason or remarks (optional)..."
                          value={processReason[req.id] || ''}
                          onChange={e => setProcessReason(prev => ({ ...prev, [req.id]: e.target.value }))}
                          style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        />
                        <button
                          onClick={() => handleProcessRequest(req.id, 'Approved')}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 500 }}
                        >
                          <Check size={16} /> Approve
                        </button>
                        <button
                          onClick={() => handleProcessRequest(req.id, 'Rejected')}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1rem', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 500 }}
                        >
                          <X size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSettings;
