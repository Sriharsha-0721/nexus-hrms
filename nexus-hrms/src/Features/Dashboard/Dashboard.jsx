import { motion } from 'framer-motion';
import { Users, CreditCard, Clock, Calendar, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue }) => (
  <div style={{
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
      <div style={{ 
        width: '40px', height: '40px', 
        borderRadius: 'var(--radius-md)', 
        background: 'var(--bg-tertiary)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-primary)'
      }}>
        <Icon size={20} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{value}</h3>
      <span style={{ 
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.8rem', fontWeight: 600,
        color: trend === 'up' ? 'var(--success)' : 'var(--danger)'
      }}>
        {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {trendValue}
      </span>
    </div>
  </div>
);

const Dashboard = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Welcome back, John. Here's what's happening today.</p>
        </div>
        <button style={{
          padding: '0.5rem 1rem',
          background: 'var(--accent-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 500,
          fontSize: '0.9rem'
        }}>
          Download Report
        </button>
      </div>

      <div className="grid-layout" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <motion.div variants={itemVariants}>
          <StatCard title="Total Employees" value="1,245" icon={Users} trend="up" trendValue="12%" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="Payroll Processed" value="₹3,75,00,000" icon={CreditCard} trend="up" trendValue="4.2%" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="On Leave Today" value="28" icon={Calendar} trend="down" trendValue="2%" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard title="Avg. Attendance" value="96.5%" icon={Clock} trend="up" trendValue="1.1%" />
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <motion.div variants={itemVariants} style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Payroll Summary (YTD)</h2>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)' }}><MoreVertical size={18} /></button>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '2rem' }}>
            {/* Mock Chart */}
            {[45, 55, 40, 60, 50, 75, 65, 80, 70, 85, 75, 90].map((val, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${val}%`, 
                  background: idx === 11 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 1s ease'
                }}></div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Pending Approvals</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { type: 'Leave Request', name: 'Sarah Connor', desc: 'Sick Leave (2 days)', time: '2 hrs ago' },
              { type: 'Expense Claim', name: 'James Smith', desc: 'Travel - ₹37,500', time: '5 hrs ago' },
              { type: 'Profile Update', name: 'Mike Johnson', desc: 'Address change', time: '1 day ago' },
              { type: 'Timesheet', name: 'Emily Davis', desc: 'Overtime approval', time: '1 day ago' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', paddingBottom: '1rem', borderBottom: idx < 3 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ 
                  width: '36px', height: '36px', 
                  borderRadius: '50%', background: 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent-primary)'
                }}>
                  {item.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.time}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.type}: {item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default Dashboard;
