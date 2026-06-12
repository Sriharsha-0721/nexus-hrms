import { motion } from 'framer-motion';
import { Camera, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Save, Key, User, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../Services/api.js';
import authService from '../../Services/authService.js';
import { useToast } from '../../Shared/ToastContext';

const Profile = () => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password Change State
  const [passwordState, setPasswordState] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userRole = localStorage.getItem('userRole') || 'employee';

  // Profile Data State
  const [profileData, setProfileData] = useState({
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    phone: '',
    address: '',
    legacyEmpId: '',
    designation: '',
    department: '',
    joinDate: '',
    status: '',
    dob: '',
    gender: 'Male',
    maritalStatus: 'Single',
    nationality: 'Indian',
    employmentType: 'Full-time',
    aadharNo: '',
    panNo: '',
    uanNo: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankName: '',
    bankAccountNo: '',
    ifscCode: ''
  });

  const fetchProfile = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await api.get(`/employees/${currentUser.id}`);
      setProfileData(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (userRole === 'admin') {
        // Admins can update their own profile directly
        await api.put(`/employees/${profileData.id}`, profileData);
        showToast('Profile updated successfully.', 'success');
      } else {
        // Employees submit a change request
        // Identify edited fields to only submit changes, or submit all for simple comparison
        const requestedFields = {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          personalEmail: profileData.personalEmail,
          phone: profileData.phone,
          address: profileData.address,
          dob: profileData.dob,
          gender: profileData.gender,
          maritalStatus: profileData.maritalStatus,
          nationality: profileData.nationality,
          bankName: profileData.bankName,
          bankAccountNo: profileData.bankAccountNo,
          ifscCode: profileData.ifscCode,
          aadharNo: profileData.aadharNo,
          panNo: profileData.panNo,
          uanNo: profileData.uanNo,
          emergencyContactName: profileData.emergencyContactName,
          emergencyContactPhone: profileData.emergencyContactPhone
        };
        await api.post('/profile-requests', requestedFields);
        showToast('Profile update request has been submitted to the administrator for approval.', 'success');
      }
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to process request', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      showToast('New password and confirm password do not match.', 'error');
      return;
    }
    try {
      setIsChangingPassword(true);
      await api.post('/auth/change-password', {
        newPassword: passwordState.newPassword
      });
      showToast('Password has been changed successfully.', 'success');
      setPasswordState({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading profile details...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Profile</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            {isEditing ? 'Modify your profile fields below.' : 'View your personal, professional, and financial profile details.'}
          </p>
        </div>
        <button 
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: isEditing ? 'var(--success)' : 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isEditing ? <Save size={18} /> : <Briefcase size={18} />}
          {isEditing ? (userRole === 'admin' ? 'Save Changes' : 'Submit Change Request') : 'Edit Profile'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Left Column - Quick Info & Identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700,
              boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem'
            }}>
              {profileData.firstName ? `${profileData.firstName[0]}${profileData.lastName[0] || ''}` : 'E'}
            </div>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{profileData.firstName} {profileData.lastName}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{profileData.designation || 'Staff Member'}</p>
            
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: userRole === 'admin' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', color: userRole === 'admin' ? 'var(--success)' : 'var(--accent-primary)', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Shield size={14} /> {userRole.toUpperCase()}
            </span>
          </div>

          {/* Contact Quick card */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Contact Quick Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Mail size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> 
                <span style={{ wordBreak: 'break-all' }}>{profileData.email}</span>
              </div>
              {profileData.personalEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Mail size={18} color="var(--accent-primary)" style={{ flexShrink: 0, opacity: 0.7 }} /> 
                  <span style={{ wordBreak: 'break-all' }}>{profileData.personalEmail} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(Personal)</span></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Phone size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> 
                {profileData.phone || 'N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <MapPin size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} /> 
                <span>{profileData.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Employment Quick card */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Employment Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Briefcase size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Employee ID</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.legacyEmpId || profileData.id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Shield size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Department</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.department || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Calendar size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Joining Date</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Comprehensive Profile Section Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Personal Details */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Personal Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>First Name</label>
                <input type="text" name="firstName" value={profileData.firstName} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Name</label>
                <input type="text" name="lastName" value={profileData.lastName} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Date of Birth</label>
                <input type="date" name="dob" value={profileData.dob ? new Date(profileData.dob).toISOString().split('T')[0] : ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Gender</label>
                <select name="gender" value={profileData.gender} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Marital Status</label>
                <select name="maritalStatus" value={profileData.maritalStatus || 'Single'} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nationality</label>
                <input type="text" name="nationality" value={profileData.nationality || 'Indian'} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Emergency Details */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact & Emergency Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
                <input type="email" name="email" value={profileData.email} onChange={handleInputChange} disabled={!isEditing || userRole !== 'admin'} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: (isEditing && userRole === 'admin') ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', cursor: (isEditing && userRole === 'admin') ? 'text' : 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Personal Email (For Recovery)</label>
                <input type="email" name="personalEmail" value={profileData.personalEmail || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Phone Number</label>
                <input type="tel" name="phone" value={profileData.phone} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Home Address</label>
                <input type="text" name="address" value={profileData.address} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Emergency Contact Name</label>
                <input type="text" name="emergencyContactName" value={profileData.emergencyContactName || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Emergency Contact Phone</label>
                <input type="text" name="emergencyContactPhone" value={profileData.emergencyContactPhone || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
          </div>

          {/* Section 3: Government Identifications */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Government Identifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Aadhar Card Number</label>
                <input type="text" name="aadharNo" value={profileData.aadharNo || ''} onChange={handleInputChange} disabled={!isEditing || userRole !== 'admin'} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: (isEditing && userRole === 'admin') ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', cursor: (isEditing && userRole === 'admin') ? 'text' : 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PAN Card Number</label>
                <input type="text" name="panNo" value={profileData.panNo || ''} onChange={handleInputChange} disabled={!isEditing || userRole !== 'admin'} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: (isEditing && userRole === 'admin') ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', cursor: (isEditing && userRole === 'admin') ? 'text' : 'not-allowed' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Universal Account Number (UAN)</label>
                <input type="text" name="uanNo" value={profileData.uanNo || ''} onChange={handleInputChange} disabled={!isEditing || userRole !== 'admin'} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: (isEditing && userRole === 'admin') ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', cursor: (isEditing && userRole === 'admin') ? 'text' : 'not-allowed' }} />
              </div>
            </div>
          </div>

          {/* Section 4: Banking Information */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Banking Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Bank Name</label>
                <input type="text" name="bankName" value={profileData.bankName || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Bank Account Number</label>
                <input type="text" name="bankAccountNo" value={profileData.bankAccountNo || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>IFSC Code</label>
                <input type="text" name="ifscCode" value={profileData.ifscCode || ''} onChange={handleInputChange} disabled={!isEditing} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
          </div>

          {/* Section 5: Change Password */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} /> Change Password
            </h3>
            <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>New Password</label>
                <input type="password" required value={passwordState.newPassword} onChange={(e) => setPasswordState(prev => ({ ...prev, newPassword: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Confirm New Password</label>
                <input type="password" required value={passwordState.confirmPassword} onChange={(e) => setPasswordState(prev => ({ ...prev, confirmPassword: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <button 
                type="submit" 
                disabled={isChangingPassword || !passwordState.newPassword || !passwordState.confirmPassword}
                style={{
                  padding: '0.75rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: (isChangingPassword || !passwordState.newPassword || !passwordState.confirmPassword) ? 'not-allowed' : 'pointer', opacity: (isChangingPassword || !passwordState.newPassword || !passwordState.confirmPassword) ? 0.7 : 1
                }}
              >
                {isChangingPassword ? 'Changing Password...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </div>
      
      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default Profile;
