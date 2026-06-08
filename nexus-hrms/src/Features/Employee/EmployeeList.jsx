import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Edit, Trash2, Eye, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../../Services/api.js';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Staging CSV Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.get('/employees');
      setEmployees(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
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
      const response = await fetch('http://localhost:5000/api/import/employees', {
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
      fetchEmployees(); // Refresh list on success
    } catch (err) {
      setImportError(err.message || 'An error occurred during CSV import.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employee Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Manage your workforce, track employee profiles, and import data logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => {
              setIsImportModalOpen(true);
              setSelectedFile(null);
              setImportError(null);
              setImportResult(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <Upload size={18} />
            Import Data
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}>
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          Error loading employees: {error}
        </div>
      )}

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
              placeholder="Search by name, employee ID, or role..." 
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1rem',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}>
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading employee directory...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No employee records found. Click "Import Data" to bulk upload employees.
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
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
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
                        background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : emp.status === 'On Leave' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: emp.status === 'Active' ? 'var(--success)' : emp.status === 'On Leave' ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Eye size={18} /></button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Edit size={18} /></button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {employees.length} entries
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', cursor: 'pointer' }}>Previous</button>
            <button style={{ padding: '0.5rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', cursor: 'pointer' }}>Next</button>
          </div>
        </div>
      </div>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '100%',
              maxWidth: '550px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Upload size={22} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Bulk Upload Employees</h3>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Upload an employee CSV file to validate and import profiles. The CSV must contain columns such as <code>employee_id</code>, <code>first_name</code>, and <code>last_name</code>.
            </p>

            <form onSubmit={handleImport}>
              <div style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '2rem 1.5rem', 
                textAlign: 'center',
                marginBottom: '1.5rem',
                cursor: 'pointer',
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
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Click to select CSV export file'}
                  </span>
                </label>
              </div>

              {importError && (
                <div style={{
                  display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{importError}</div>
                </div>
              )}

              {importResult && (
                <div style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={16} />
                    Import Completed!
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <div>Total Processed: <strong>{importResult.totalProcessed}</strong></div>
                    <div>Staged Rows: <strong>{importResult.stagingInserted}</strong></div>
                    <div>Created Employees: <strong>{importResult.importedCount}</strong></div>
                    <div>Updated Employees: <strong>{importResult.updatedCount}</strong></div>
                    <div style={{ gridColumn: 'span 2', color: importResult.errorsCount > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      Failed Rows/Errors: <strong>{importResult.errorsCount}</strong>
                    </div>
                  </div>

                  {importResult.details && importResult.details.some(d => d.error) && (
                    <div style={{ marginTop: '0.75rem', maxHeight: '100px', overflowY: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Errors Log:</div>
                      {importResult.details.filter(d => d.error).map((d, idx) => (
                        <div key={idx} style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Row {d.row}: {d.error}
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
                    padding: '0.65rem 1.25rem',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
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
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 500,
                    fontSize: '0.9rem',
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
    </motion.div>
  );
};

export default EmployeeList;
