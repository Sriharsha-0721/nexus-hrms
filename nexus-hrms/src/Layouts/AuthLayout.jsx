import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 50% -20%, var(--shadow-glow), transparent 60%)'
    }}>
      <Outlet />
    </div>
  );
};

export default AuthLayout;
