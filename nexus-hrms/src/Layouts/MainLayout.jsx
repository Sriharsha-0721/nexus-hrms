import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../Shared/Logo.jsx';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  Search,
  Moon,
  Sun,
  User
} from 'lucide-react';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userRole, setUserRole] = useState('employee');
  const profileRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const userProfiles = {
    admin: {
      name: 'John Doe',
      title: 'HR Manager',
      email: 'john.doe@nexus.com',
      initials: 'JD'
    },
    employee: {
      name: 'Jane Smith',
      title: 'Senior Software Engineer',
      email: 'jane.smith@nexus.com',
      initials: 'JS'
    }
  };
  const currentUser = userProfiles[userRole] || userProfiles.employee;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load user role on mount
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'employee';
    if (role !== userRole) {
      setTimeout(() => {
        setUserRole(role);
      }, 0);
    }
  }, [location.pathname, userRole]); // Re-check if path changes

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/employees', label: 'Employees', icon: Users },
    { path: '/attendance', label: 'Attendance', icon: Clock },
    { path: '/payroll', label: 'Payroll', icon: CreditCard },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/admin', label: 'Settings', icon: Settings },
  ];

  const employeeNavItems = [
    { path: '/my-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { path: '/my-attendance', label: 'My Attendance', icon: Clock },
    { path: '/my-leave', label: 'My Leave', icon: Calendar },
    { path: '/my-payroll', label: 'My Payslip', icon: CreditCard },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : employeeNavItems;

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="glass" style={{
        width: isSidebarOpen ? '260px' : '80px',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100
      }}>
        <div style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarOpen ? 'space-between' : 'center',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {isSidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Logo size={28} style={{ flexShrink: 0 }} />
              <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
                NEXUS
              </h1>
            </div>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Logo size={28} />
            </button>
          )}
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path} style={{ margin: '0.25rem 1rem' }}>
                  <button
                    onClick={() => navigate(item.path)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                      padding: '0.75rem 1rem',
                      background: isActive ? 'var(--accent-primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s',
                      gap: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={20} />
                    {isSidebarOpen && <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              padding: '0.75rem 1rem',
              background: 'transparent',
              color: 'var(--danger)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s',
              gap: '1rem',
              cursor: 'pointer'
            }}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Logout</span>}
          </button>
          {isSidebarOpen ? (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              NXS
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: isSidebarOpen ? '260px' : '80px',
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header */}
        <header className="glass" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-lg)',
              width: '300px',
              border: '1px solid var(--border-color)'
            }}>
              <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  width: '100%',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', position: 'relative', cursor: 'pointer' }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                background: 'var(--danger)',
                borderRadius: '50%'
              }}></span>
            </button>
            
            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  {currentUser.initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{currentUser.title}</span>
                </div>
              </div>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 10px)',
                      right: 0,
                      width: '220px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      overflow: 'hidden',
                      zIndex: 100
                    }}
                  >
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{currentUser.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{currentUser.email}</div>
                    </div>
                    
                    <div style={{ padding: '0.5rem' }}>
                      <button 
                        onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <User size={16} /> View Profile
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => { setIsProfileOpen(false); navigate('/admin'); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem' }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Settings size={16} /> Settings
                        </button>
                      )}
                    </div>

                    <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      <button 
                        onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--danger)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
