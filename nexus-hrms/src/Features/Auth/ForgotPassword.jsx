import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../Services/authService.js';
import Logo from '../../Shared/Logo.jsx';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const resp = await authService.forgotPassword(email);
      setMessage(resp.message || 'OTP sent to your personal email.');
      // Optionally navigate to reset page with email param
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
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
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(0,210,255,0.15), transparent 50%)',
      padding: '2rem'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(0,210,255,0.1)', marginBottom: '1.5rem' }}>
            <Logo size={40} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            NEXUS <span style={{ color: 'var(--accent-primary)' }}>HRMS</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Forgot your password? Enter your official email to receive an OTP.
          </p>
        </div>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--danger)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>{error}</div>
        )}
        {message && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            color: 'var(--success)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>{message}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Official Email</label>
            <input
              type="email"
              placeholder="employee@nexus.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: loading ? 'var(--border-color)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'; }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; }}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, textDecoration: 'none' }}>Back to Login</Link>
            <span style={{ color: 'var(--border-color)', fontSize: '0.85rem' }}>|</span>
            <Link to="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500, textDecoration: 'none' }}>Cancel (Dashboard)</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
