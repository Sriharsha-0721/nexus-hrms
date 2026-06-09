import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../Services/authService.js';
import Logo from '../../Shared/Logo.jsx';

const Login = () => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('employee'); // 'employee' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Lockout State Management
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('failed_attempts') || '0', 10);
  });
  const [lockUntil, setLockUntil] = useState(() => {
    return parseInt(localStorage.getItem('lock_until') || '0', 10);
  });
  const [remainingLockTime, setRemainingLockTime] = useState(0);

  // Force dark theme for login page to match the premium dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Lockout Countdown Timer
  useEffect(() => {
    const checkLock = () => {
      const now = Date.now();
      if (lockUntil > now) {
        const secondsLeft = Math.ceil((lockUntil - now) / 1000);
        setRemainingLockTime(secondsLeft);
      } else {
        if (remainingLockTime > 0) {
          setRemainingLockTime(0);
          setFailedAttempts(0);
          localStorage.removeItem('failed_attempts');
          localStorage.removeItem('lock_until');
        }
      }
    };

    checkLock();
    let interval;
    if (lockUntil > Date.now()) {
      interval = setInterval(() => {
        const now = Date.now();
        if (lockUntil > now) {
          setRemainingLockTime(Math.ceil((lockUntil - now) / 1000));
        } else {
          setRemainingLockTime(0);
          setFailedAttempts(0);
          localStorage.removeItem('failed_attempts');
          localStorage.removeItem('lock_until');
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockUntil]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Prevent login if locked
    if (remainingLockTime > 0) {
      setError(`Too many failed attempts. Login is locked. Please wait ${remainingLockTime} seconds.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      // Reset failed attempts on success
      localStorage.removeItem('failed_attempts');
      localStorage.removeItem('lock_until');
      setFailedAttempts(0);
      setLockUntil(0);

      // Redirect to respective dashboard
      if (data.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/my-dashboard');
      }
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('failed_attempts', newAttempts.toString());

      if (newAttempts >= 3) {
        const lockoutPeriod = Date.now() + 60 * 1000; // 1 minute lock
        setLockUntil(lockoutPeriod);
        localStorage.setItem('lock_until', lockoutPeriod.toString());
        setError('Too many failed attempts. Login is locked for 1 minute.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(0, 210, 255, 0.15), transparent 50%)',
      padding: '2rem'
    }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(0, 210, 255, 0.1)', marginBottom: '1.5rem' }}>
            <Logo size={40} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            NEXUS <span style={{ color: 'var(--accent-primary)' }}>HRMS</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Type Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '2rem' }}>
          <button 
            type="button"
            disabled={remainingLockTime > 0}
            onClick={() => setLoginType('employee')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem',
              background: loginType === 'employee' ? 'var(--bg-secondary)' : 'transparent',
              color: loginType === 'employee' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: loginType === 'employee' ? '1px solid var(--border-color)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              boxShadow: loginType === 'employee' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              cursor: remainingLockTime > 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Users size={18} /> Employee
          </button>
          <button 
            type="button"
            disabled={remainingLockTime > 0}
            onClick={() => setLoginType('admin')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem',
              background: loginType === 'admin' ? 'var(--bg-secondary)' : 'transparent',
              color: loginType === 'admin' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: loginType === 'admin' ? '1px solid var(--border-color)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              boxShadow: loginType === 'admin' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              cursor: remainingLockTime > 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Shield size={18} /> Administrator
          </button>
        </div>

        {error && (
          <div style={{
            background: remainingLockTime > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: remainingLockTime > 0 ? 'var(--warning)' : 'var(--danger)',
            border: remainingLockTime > 0 ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {loginType === 'admin' ? 'Admin ID / Email' : 'Employee ID / Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                placeholder={loginType === 'admin' ? 'admin@nexus.com' : 'employee@nexus.com'}
                required
                disabled={remainingLockTime > 0}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 45px',
                  background: remainingLockTime > 0 ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  cursor: remainingLockTime > 0 ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••"
                required
                disabled={remainingLockTime > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 45px 0.85rem 45px',
                  background: remainingLockTime > 0 ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  cursor: remainingLockTime > 0 ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
              <button
                type="button"
                disabled={remainingLockTime > 0}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  height: '100%',
                  width: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: remainingLockTime > 0 ? 'not-allowed' : 'pointer',
                  outline: 'none'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: remainingLockTime > 0 ? 'not-allowed' : 'pointer' }}>
              <input 
                type="checkbox" 
                disabled={remainingLockTime > 0}
                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} 
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remember me</span>
            </label>
            <a href="#" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500, pointerEvents: remainingLockTime > 0 ? 'none' : 'auto', opacity: remainingLockTime > 0 ? 0.5 : 1 }}>Forgot Password?</a>
          </div>

          <button 
            type="submit"
            disabled={loading || remainingLockTime > 0}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.85rem',
              background: (loading || remainingLockTime > 0) ? 'var(--border-color)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: (loading || remainingLockTime > 0) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => { if (!loading && remainingLockTime === 0) e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'; }}
            onMouseOut={(e) => { if (!loading && remainingLockTime === 0) e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; }}
            onMouseDown={(e) => { if (!loading && remainingLockTime === 0) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { if (!loading && remainingLockTime === 0) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {remainingLockTime > 0 ? `Locked (${remainingLockTime}s)` : 'Sign In'} <ArrowRight size={18} />
          </button>

        </form>
      </motion.div>
    </div>
  );
};

export default Login;
