import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map(toast => {
            let bgColor = 'var(--bg-secondary)';
            let borderColor = 'var(--border-color)';
            let textColor = 'var(--text-primary)';
            let Icon = Info;
            let iconColor = 'var(--accent-primary)';

            if (toast.type === 'success') {
              bgColor = 'rgba(16, 185, 129, 0.15)';
              borderColor = 'rgba(16, 185, 129, 0.3)';
              textColor = '#10b981';
              Icon = CheckCircle;
              iconColor = '#10b981';
            } else if (toast.type === 'error') {
              bgColor = 'rgba(239, 68, 68, 0.15)';
              borderColor = 'rgba(239, 68, 68, 0.3)';
              textColor = '#ef4444';
              Icon = AlertCircle;
              iconColor = '#ef4444';
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  backdropFilter: 'blur(12px)',
                  color: textColor,
                  minWidth: '320px',
                  maxWidth: '450px'
                }}
              >
                <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', textAlign: 'left' }}>
                  {toast.message}
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
