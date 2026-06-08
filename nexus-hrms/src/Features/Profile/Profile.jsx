import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Save, Upload, Trash2, Key, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const profiles = {
  admin: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@nexus.com',
    phone: '+1 (555) 123-4567',
    address: '42 Silicon Valley Road, Apt 4B, San Francisco, CA',
    username: 'johndoe_admin',
    password: '',
    confirmPassword: '',
    avatarUrl: null,
    jobTitle: 'Human Resources Manager',
    roleBadge: 'Administrator',
    empId: 'EMP-10024',
    department: 'Human Resources',
    joiningDate: 'March 15, 2021',
    manager: 'Sarah Connor (CEO)'
  },
  employee: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@nexus.com',
    phone: '+1 (555) 987-6543',
    address: '742 Evergreen Terrace, Seattle, WA',
    username: 'janesmith_emp',
    password: '',
    confirmPassword: '',
    avatarUrl: null,
    jobTitle: 'Senior Software Engineer',
    roleBadge: 'Employee',
    empId: 'EMP-10086',
    department: 'Engineering',
    joiningDate: 'June 10, 2022',
    manager: 'John Doe (HR Manager)'
  }
};

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  // Read role from local storage
  const userRole = localStorage.getItem('userRole') || 'employee';

  const initialProfile = profiles[userRole] || profiles.employee;

  // Profile Data State
  const [profileData, setProfileData] = useState(initialProfile);

  // Sync profile data if userRole changes
  useEffect(() => {
    const nextProfile = profiles[userRole] || profiles.employee;
    if (profileData.email !== nextProfile.email) {
      setTimeout(() => {
        setProfileData(nextProfile);
      }, 0);
    }
  }, [userRole, profileData.email]);

  // Handle URL query parameters for actions (edit)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === 'true') {
      setTimeout(() => {
        setIsEditing(true);
      }, 0);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Mock save logic
    setIsEditing(false);
    // Clear URL search params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleRemovePhoto = () => {
    setProfileData(prev => ({ ...prev, avatarUrl: null }));
    setIsAvatarMenuOpen(false);
  };

  const handleUploadPhoto = () => {
    // Mock upload by setting a dummy image URL
    setProfileData(prev => ({ 
      ...prev, 
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
    }));
    setIsAvatarMenuOpen(false);
  };

  // Close avatar menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            View and manage your personal and professional details.
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
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          {isEditing ? <Save size={18} /> : <Briefcase size={18} />}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Left Column - Avatar & Quick Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }} ref={avatarMenuRef}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700,
                boxShadow: 'var(--shadow-md)', overflow: 'hidden'
              }}>
                {profileData.avatarUrl ? (
                  <img src={profileData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  `${profileData.firstName[0]}${profileData.lastName[0]}`
                )}
              </div>
              
              <button 
                onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                style={{
                  position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <Camera size={18} />
              </button>

              <AnimatePresence>
                {isAvatarMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                      width: '180px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 10, overflow: 'hidden'
                    }}
                  >
                    <button onClick={handleUploadPhoto} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Upload size={16} /> Upload Photo
                    </button>
                    <button onClick={handleRemovePhoto} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Trash2 size={16} /> Remove Photo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{profileData.firstName} {profileData.lastName}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{profileData.jobTitle}</p>
            
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: userRole === 'admin' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', color: userRole === 'admin' ? 'var(--success)' : 'var(--accent-primary)', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Shield size={14} /> {profileData.roleBadge}
            </span>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Mail size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> 
                <span style={{ wordBreak: 'break-all' }}>{profileData.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Phone size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} /> 
                {profileData.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <MapPin size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} /> 
                <span>{profileData.address}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Professional Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Briefcase size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Employee ID</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.empId}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Shield size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Department</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.department}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Calendar size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Joining Date</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.joiningDate}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <User size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Reporting Manager</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profileData.manager}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Single "Edit Profile" Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--accent-primary)" /> Edit Profile
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    name="username"
                    value={profileData.username}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Home Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={profileData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="password" 
                    name="password"
                    placeholder={isEditing ? "Enter new password" : "••••••••"}
                    value={profileData.password}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="password" 
                    name="confirmPassword"
                    placeholder={isEditing ? "Confirm new password" : "••••••••"}
                    value={profileData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: isEditing ? 'var(--bg-primary)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} 
                  />
                </div>
              </div>
            </div>
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
