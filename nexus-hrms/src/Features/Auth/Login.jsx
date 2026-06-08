import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Shield, Users } from 'lucide-react';
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

  // Force dark theme for login page to match the premium dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      // Redirect to respective dashboard
      if (data.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/my-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
              cursor: 'pointer'
            }}
          >
            <Users size={18} /> Employee
          </button>
          <button 
            type="button"
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
              cursor: 'pointer'
            }}
          >
            <Shield size={18} /> Administrator
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 45px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
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
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 45px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remember me</span>
            </label>
            <a href="#" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}>Forgot Password?</a>
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.85rem',
              background: loading ? 'var(--border-color)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'; }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; }}
            onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Sign In <ArrowRight size={18} />
          </button>

        </form>
      </motion.div>
    </div>
  );
};

export default Login;
