import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../../Services/api.js';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('');

  // Dropdown lookups
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [admins, setAdmins] = useState([]);

  // Staging CSV Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState('master');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // CSV Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('roster');
  const [exportLoading, setExportLoading] = useState(false);

  // Add/Edit Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('personal');
  const [form, setForm] = useState({
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    legacyEmpId: '',
    role: 'employee',
    designationId: '',
    departmentId: '',
    joinDate: '',
    dob: '',
    gender: 'Male',
    address: '',
    bankName: '',
    bankAccountNo: '',
    ifscCode: '',
    maritalStatus: 'Single',
    nationality: 'Indian',
    employmentType: 'Full-time',
    aadharNo: '',
    panNo: '',
    uanNo: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    managerId: '',
    hrAdminId: ''
  });

  // Assign Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignAdminId, setAssignAdminId] = useState('');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState([]);

  const userRole = localStorage.getItem('userRole') || 'employee';

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const url = selectedAdminFilter ? `/employees?adminId=${selectedAdminFilter}` : '/employees';
      const data = await api.get(url);
      setEmployees(data);

      // Extract admin list for assignments from the dedicated endpoint
      const adminsData = await api.get('/employees/admins');
      // Map empId to id since the rest of the frontend uses admin.id as EmpID
      const adminList = adminsData.map(a => ({
        ...a,
        id: a.empId
      }));
      setAdmins(adminList);
    } catch (err) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const depts = await api.get('/departments');
      const desigs = await api.get('/designations');
      setDepartments(depts);
      setDesignations(desigs);
    } catch (err) {
      console.error('Failed to fetch lookups:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedAdminFilter]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/import/${importType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to import CSV');
      }

      setImportResult(resData.stats);
      fetchEmployees();
    } catch (err) {
      setImportError(err.message || 'An error occurred during CSV import.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async (e) => {
    e.preventDefault();
    setExportLoading(true);
    try {
      const blob = await api.download(`/export/${exportType}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Export_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setIsExportModalOpen(false);
    } catch (err) {
      alert(err.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setForm({
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      legacyEmpId: '',
      role: 'employee',
      designationId: designations[0]?.id || '',
      departmentId: departments[0]?.id || '',
      joinDate: new Date().toISOString().split('T')[0],
      dob: '',
      gender: 'Male',
      address: '',
      bankName: '',
      bankAccountNo: '',
      ifscCode: '',
      maritalStatus: 'Single',
      nationality: 'Indian',
      employmentType: 'Full-time',
      aadharNo: '',
      panNo: '',
      uanNo: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      managerId: '',
      hrAdminId: ''
    });
    setModalTab('personal');
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditModal = async (empId) => {
    try {
      const data = await api.get(`/employees/${empId}`);
      setForm({
        id: data.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        password: '',
        legacyEmpId: data.legacyEmpId || '',
        role: data.role || 'employee',
        designationId: data.designationId || '',
        departmentId: data.departmentId || '',
        joinDate: data.joinDate ? new Date(data.joinDate).toISOString().split('T')[0] : '',
        dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
        gender: data.gender || 'Male',
        address: data.address || '',
        bankName: data.bankName || '',
        bankAccountNo: data.bankAccountNo || '',
        ifscCode: data.ifscCode || '',
        maritalStatus: data.maritalStatus || 'Single',
        nationality: data.nationality || 'Indian',
        employmentType: data.employmentType || 'Full-time',
        aadharNo: data.aadharNo || '',
        panNo: data.panNo || '',
        uanNo: data.uanNo || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        managerId: data.managerId || '',
        hrAdminId: data.hrAdminId || ''
      });
      setModalTab('personal');
      setIsEmployeeModalOpen(true);
    } catch (err) {
      alert('Failed to load employee details');
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.id) {
        delete payload.id;
      }
      if (payload.id) {
        await api.put(`/employees/${payload.id}`, payload);
        alert('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        alert('Employee created successfully');
      }
      setIsEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!confirm('Are you sure you want to delete/inactivate this employee? This will change their status to Inactive.')) return;
    try {
      await api.delete(`/employees/${empId}`);
      alert('Employee status changed to Inactive');
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to inactivate');
    }
  };

  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    setAssignAdminId('');
    setSelectedAssignedIds([]);
  };

  const handleLoadAssignments = async (adminId) => {
    setAssignAdminId(adminId);
    if (!adminId) {
      setSelectedAssignedIds([]);
      return;
    }
    try {
      const assigned = await api.get(`/employees/assigned/${adminId}`);
      setSelectedAssignedIds(assigned);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAssignments = async () => {
    if (!assignAdminId) return;
    try {
      await api.post(`/employees/assign/${assignAdminId}`, { employeeIds: selectedAssignedIds });
      setIsAssignModalOpen(false);
      alert('Admin assignments updated successfully');
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to update assignments');
    }
  };

  const toggleAssignCheckbox = (empId) => {
    setSelectedAssignedIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const term = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (emp.legacyEmpId && emp.legacyEmpId.toLowerCase().includes(term)) ||
      (emp.designation && emp.designation.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term))
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employee Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Manage your workforce, track employee profiles, and assign employee mappings.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['SuperAdmin', 'HRAdmin'].includes(userRole) && (
            <>
              <button 
                onClick={handleOpenAssignModal}
                style={{
                  padding: '0.75rem 1.25rem', background: 'transparent', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                Assign Mappings
              </button>
              <button 
                onClick={() => {
                  setIsImportModalOpen(true);
                  setSelectedFile(null);
                  setImportError(null);
                  setImportResult(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem', background: 'transparent', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                <Upload size={18} />
                Import CSV
              </button>
              <button 
                onClick={() => {
                  setIsExportModalOpen(true);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem', background: 'transparent', color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                <Download size={18} />
                Export CSV
              </button>
              <button 
                onClick={handleOpenAddModal}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem', background: 'var(--accent-primary)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                <Plus size={18} />
                Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            flex: 1,
            border: '1px solid var(--border-color)'
          }}>
            <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search by name, employee ID, designation or department..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          
          {/* Admin Filtering */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Admin Roster:</span>
            <select
              value={selectedAdminFilter}
              onChange={e => setSelectedAdminFilter(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">All Employees</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{`${admin.firstName} ${admin.lastName}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading employee directory...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No employee records found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Employee ID</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Department</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Join Date</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                          {emp.firstName ? `${emp.firstName[0]}${emp.lastName[0] || ''}` : 'E'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{`${emp.firstName} ${emp.lastName}`}</div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{emp.designation || 'Staff'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {emp.legacyEmpId ? (
                        <span>
                          <strong style={{ color: 'var(--accent-primary)' }}>{emp.legacyEmpId}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>({emp.id})</span>
                        </span>
                      ) : (
                        <span>{emp.id}</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>{emp.department || 'N/A'}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: emp.status === 'Active' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      {['SuperAdmin', 'HRAdmin'].includes(userRole) && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button onClick={() => handleOpenEditModal(emp.id)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Edit size={18} /></button>
                          <button onClick={() => handleDeleteEmployee(emp.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {isEmployeeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{form.id ? 'Edit Employee Details' : 'Add New Employee'}</h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Modal Tabs: 5 distinct tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', overflowX: 'auto' }}>
              {[
                { id: 'personal', label: 'Personal' },
                { id: 'employment', label: 'Employment' },
                { id: 'government', label: 'Government' },
                { id: 'bank', label: 'Bank Details' },
                { id: 'contact', label: 'Emergency & Contact' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id)}
                  style={{
                    flex: 1, padding: '1rem', border: 'none', minWidth: '100px',
                    background: modalTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                    borderBottom: modalTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
                    fontWeight: modalTab === tab.id ? 600 : 400,
                    color: modalTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                
                {modalTab === 'personal' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>First Name</label>
                      <input type="text" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Name</label>
                      <input type="text" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Date of Birth</label>
                      <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Gender</label>
                      <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Marital Status</label>
                      <select value={form.maritalStatus} onChange={e => setForm({...form, maritalStatus: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option>Single</option>
                        <option>Married</option>
                        <option>Divorced</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nationality</label>
                      <input type="text" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

                {modalTab === 'employment' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Legacy Emp ID (UPPID)</label>
                      <input type="text" disabled={!!form.id} placeholder={form.id ? "" : "Auto-generated as EMP[ID]"} value={form.legacyEmpId} onChange={e => setForm({...form, legacyEmpId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'not-allowed' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Employment Type</label>
                      <select value={form.employmentType} onChange={e => setForm({...form, employmentType: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option>Full-time</option>
                        <option>Contract</option>
                        <option>Intern</option>
                        <option>Part-time</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Department</label>
                      <select value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Designation</label>
                      <select value={form.designationId} onChange={e => setForm({...form, designationId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Reporting Manager</label>
                      <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option value="">-- No Reporting Manager --</option>
                        {employees.filter(emp => emp.id !== form.id).map(emp => (
                          <option key={emp.id} value={emp.id}>{`${emp.firstName} ${emp.lastName}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned HR Admin</label>
                      <select value={form.hrAdminId} onChange={e => setForm({...form, hrAdminId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        <option value="">-- Unassigned --</option>
                        {admins.map(adm => (
                          <option key={adm.id} value={adm.id}>{`${adm.firstName} ${adm.lastName}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Date of Joining</label>
                      <input type="date" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    {form.id && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Status</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="On Notice">On Notice</option>
                          <option value="Resigned">Resigned</option>
                          <option value="Terminated">Terminated</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'government' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Aadhar Number</label>
                      <input type="text" value={form.aadharNo} onChange={e => setForm({...form, aadharNo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PAN Card Number</label>
                      <input type="text" value={form.panNo} onChange={e => setForm({...form, panNo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>UAN Number (PF)</label>
                      <input type="text" value={form.uanNo} onChange={e => setForm({...form, uanNo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

                {modalTab === 'bank' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Bank Name</label>
                      <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Number</label>
                      <input type="text" value={form.bankAccountNo} onChange={e => setForm({...form, bankAccountNo: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>IFSC Code</label>
                      <input type="text" value={form.ifscCode} onChange={e => setForm({...form, ifscCode: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

                {modalTab === 'contact' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Official Email Address</label>
                      <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mobile Number</label>
                      <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Residential Address</label>
                      <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Emergency Contact Name</label>
                      <input type="text" value={form.emergencyContactName} onChange={e => setForm({...form, emergencyContactName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Emergency Contact Phone</label>
                      <input type="text" value={form.emergencyContactPhone} onChange={e => setForm({...form, emergencyContactPhone: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

              </div>
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-tertiary)' }}>
                <button type="button" onClick={() => setIsEmployeeModalOpen(false)} style={{ padding: '0.65rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.65rem 1.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Assignment Mapping Modal */}
      {isAssignModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Assign Employees to Admins</h3>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Select Admin Account:</label>
                <select
                  value={assignAdminId}
                  onChange={e => handleLoadAssignments(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- Choose Admin --</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{`${admin.firstName} ${admin.lastName}`}</option>
                  ))}
                </select>
              </div>

              {assignAdminId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Select Assigned Employees:</label>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-primary)', padding: '0.5rem' }}>
                    {employees.filter(emp => !['SuperAdmin', 'HRAdmin', 'PayrollAdmin'].includes(emp.role)).map(emp => (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedAssignedIds.includes(emp.id)}
                          onChange={() => toggleAssignCheckbox(emp.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ fontSize: '0.9rem' }}>{`${emp.firstName} ${emp.lastName}`} <small style={{ color: 'var(--text-tertiary)' }}>({emp.legacyEmpId || emp.id})</small></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-tertiary)' }}>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ padding: '0.65rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveAssignments} disabled={!assignAdminId} style={{ padding: '0.65rem 1.25rem', background: assignAdminId ? 'var(--accent-primary)' : 'var(--border-color)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: assignAdminId ? 'pointer' : 'not-allowed' }}>Save Mappings</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '100%', maxWidth: '550px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', padding: '2rem',
              boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Upload size={22} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Import CSV Database Pipeline</h3>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleImport}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Select Import Type:</label>
                <select
                  value={importType}
                  onChange={e => {
                    setImportType(e.target.value);
                    setSelectedFile(null);
                    setImportResult(null);
                    setImportError(null);
                  }}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="master">Employee Master & Roles</option>
                  <option value="details">Employee Contact & Banking Details</option>
                  <option value="attendance">Employee Daily Attendance</option>
                  <option value="leaves">Employee Leave Applications</option>
                  <option value="salary">Employee Salary Structures</option>
                </select>
              </div>

              <div style={{ 
                border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', 
                padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer',
                background: selectedFile ? 'rgba(0, 210, 255, 0.02)' : 'transparent'
              }}>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={e => setSelectedFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <Upload size={36} color="var(--text-tertiary)" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {selectedFile ? selectedFile.name : 'Choose CSV File'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Click to select CSV file'}
                  </span>
                </label>
              </div>

              {importError && (
                <div style={{
                  display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                  background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem', fontSize: '0.85rem', marginBottom: '1.5rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{importError}</div>
                </div>
              )}

              {importResult && (
                <div style={{
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={16} />
                    Import Completed!
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <div>Total Processed: <strong>{importResult.totalProcessed}</strong></div>
                    <div>Success Count: <strong>{importResult.successCount}</strong></div>
                    <div>Failed Count/Errors: <strong>{importResult.failedCount}</strong></div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div style={{ marginTop: '0.5rem', maxHeight: '100px', overflowY: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>Validation Errors:</strong>
                      {importResult.errors.map((err, i) => (
                        <div key={i} style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button 
                  type="submit"
                  disabled={importLoading || !selectedFile}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    background: importLoading || !selectedFile ? 'var(--border-color)' : 'var(--accent-primary)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                    fontWeight: 500, fontSize: '0.9rem',
                    cursor: importLoading || !selectedFile ? 'not-allowed' : 'pointer'
                  }}
                >
                  {importLoading ? 'Uploading & Processing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CSV Export Modal */}
      {isExportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '100%', maxWidth: '500px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', padding: '2rem',
              boxShadow: 'var(--shadow-lg)', color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Download size={22} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Export CSV Database Pipeline</h3>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExport}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Select Data Stream to Export:</label>
                <select
                  value={exportType}
                  onChange={e => setExportType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="roster">Employee Directory Roster</option>
                  <option value="attendance">Daily Attendance Logs</option>
                  <option value="leaves">Leave Applications History</option>
                  <option value="salary">Salary Payout Records</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button 
                  type="submit"
                  disabled={exportLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    background: 'var(--accent-primary)',
                    color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                    fontWeight: 500, fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {exportLoading ? 'Generating file...' : 'Download CSV'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default EmployeeList;
