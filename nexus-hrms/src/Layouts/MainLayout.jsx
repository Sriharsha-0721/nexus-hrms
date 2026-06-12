import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../Shared/Logo.jsx';
import authService from '../Services/authService.js';
import api from '../Services/api.js';
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
  User,
  Key,
  Shield
} from 'lucide-react';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [theme, setTheme] = useState('light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userRole, setUserRole] = useState('employee');
  const profileRef = useRef(null);
  const bellRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic user details resolution
  const currentUserData = authService.getCurrentUser();
  const isAdmin = ['SuperAdmin', 'HRAdmin', 'PayrollAdmin'].includes(userRole);
  const currentUser = {
    name: currentUserData ? `${currentUserData.firstName} ${currentUserData.lastName}` : (isAdmin ? 'Admin User' : 'Employee User'),
    title: currentUserData ? currentUserData.designation : (userRole === 'SuperAdmin' ? 'Super Administrator' : userRole === 'HRAdmin' ? 'HR Administrator' : userRole === 'PayrollAdmin' ? 'Payroll Administrator' : 'Staff Employee'),
    email: currentUserData ? currentUserData.email : (isAdmin ? 'admin@nexus.com' : 'employee@nexus.com'),
    initials: currentUserData ? `${currentUserData.firstName[0] || ''}${currentUserData.lastName[0] || ''}` : (userRole === 'SuperAdmin' ? 'SA' : userRole === 'HRAdmin' ? 'HR' : userRole === 'PayrollAdmin' ? 'PA' : 'EE')
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load user role on mount
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'employee';
    if (role !== userRole) {
      setTimeout(() => {
        setUserRole(role);
      }, 0);
    }
  }, [location.pathname, userRole]); // Re-check if path changes

  // Close profile and notification dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [location.pathname]);

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
    } catch (err) {
      console.error('Clear all error:', err);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getNavItems = () => {
    if (userRole === 'SuperAdmin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/employees', label: 'Employees', icon: Users },
        { path: '/attendance', label: 'Attendance', icon: Clock },
        { path: '/payroll', label: 'Payroll', icon: CreditCard },
        { path: '/reports', label: 'Reports', icon: FileText },
        { path: '/admin', label: 'Settings', icon: Settings },
        { path: '/admin-management', label: 'Admins', icon: Shield }
      ];
    } else if (userRole === 'HRAdmin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/employees', label: 'Employees', icon: Users },
        { path: '/attendance', label: 'Attendance', icon: Clock },
        { path: '/admin', label: 'Settings', icon: Settings }
      ];
    } else if (userRole === 'PayrollAdmin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/payroll', label: 'Payroll', icon: CreditCard },
        { path: '/reports', label: 'Reports', icon: FileText },
        { path: '/admin', label: 'Settings', icon: Settings }
      ];
    } else {
      return [
        { path: '/my-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { path: '/my-attendance', label: 'My Attendance', icon: Clock },
        { path: '/my-leave', label: 'My Leave', icon: Calendar },
        { path: '/my-payroll', label: 'My Payslip', icon: CreditCard },
      ];
    }
  };

  const navItems = getNavItems();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Backdrop for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 140,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <aside className="glass" style={{
        width: isMobile ? '280px' : (isSidebarOpen ? '260px' : '80px'),
        transform: isMobile ? (isSidebarOpen ? 'translateX(0)' : 'translateX(-280px)') : 'none',
        transition: 'width 0.3s ease, transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 150
      }}>
        <div style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: (isMobile || isSidebarOpen) ? 'space-between' : 'center',
          padding: (isMobile || isSidebarOpen) ? '0 1.5rem' : '0',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {(isMobile || isSidebarOpen) ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Logo size={28} style={{ flexShrink: 0 }} />
                <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
                  NEXUS
                </h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Menu size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: 'var(--radius-md)', transition: 'background 0.2s', width: '40px', height: '40px' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: (isMobile || isSidebarOpen) ? 'flex-start' : 'center',
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
                    {(isMobile || isSidebarOpen) && <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => {
              handleLogout();
              if (isMobile) setIsSidebarOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: (isMobile || isSidebarOpen) ? 'flex-start' : 'center',
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
            {(isMobile || isSidebarOpen) && <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Logout</span>}
          </button>
          {(isMobile || isSidebarOpen) ? (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              NXS
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? '0px' : (isSidebarOpen ? '260px' : '80px'),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 0
      }}>
        {/* Top Header */}
        <header className="glass" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 1rem' : '0 2rem',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flex: 1 }}>
            {isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Menu size={20} />
              </button>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-lg)',
              width: isMobile ? '130px' : '300px',
              border: '1px solid var(--border-color)',
              transition: 'width 0.3s ease'
            }}>
              <Search size={18} color="var(--text-tertiary)" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem' }}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div style={{ position: 'relative' }} ref={bellRef}>
              <button 
                onClick={toggleNotifications}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: 'var(--danger)',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 2px var(--bg-secondary)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.75rem',
                      width: '320px',
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllAsRead}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem 0' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            style={{ 
                              padding: '0.75rem 1rem', 
                              borderBottom: '1px solid var(--border-light)', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '0.25rem',
                              background: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                              transition: 'background 0.2s',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => { 
                              const del = e.currentTarget.querySelector('.delete-btn');
                              if (del) del.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => { 
                              const del = e.currentTarget.querySelector('.delete-btn');
                              if (del) del.style.opacity = '0';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: n.isRead ? 600 : 700, color: 'var(--text-primary)', textAlign: 'left' }}>
                                {n.title}
                              </span>
                              
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteNotification(n.id)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--danger)', 
                                  fontSize: '0.9rem', 
                                  opacity: 0, 
                                  transition: 'opacity 0.2s',
                                  cursor: 'pointer',
                                  padding: '0 0.25rem',
                                  position: 'absolute',
                                  right: '0.5rem',
                                  top: '0.5rem',
                                  fontWeight: 700
                                }}
                              >
                                &times;
                              </button>
                            </div>
                            
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3, textAlign: 'left' }}>
                              {n.message}
                            </p>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                {timeAgo(n.createdAt)}
                              </span>
                              
                              {!n.isRead && (
                                <button 
                                  onClick={() => handleMarkAsRead(n.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', background: 'var(--bg-primary)' }}>
                        <button 
                          onClick={handleClearAllNotifications}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={profileRef}>
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}
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
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {currentUser.initials}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{currentUser.title}</span>
                  </div>
                )}
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
                      {['SuperAdmin', 'HRAdmin', 'PayrollAdmin'].includes(userRole) && (
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
        <main style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
