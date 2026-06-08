import { motion } from 'framer-motion';
import { Download, FileText, Filter, Calendar, BarChart2, Users, PieChart } from 'lucide-react';

const Reports = () => {
  const reportTypes = [
    { title: 'Monthly Payroll Summary', category: 'Finance', icon: BarChart2, date: 'Generated: Nov 01, 2023', size: '2.4 MB' },
    { title: 'Employee Attendance Log', category: 'HR', icon: Calendar, date: 'Generated: Oct 31, 2023', size: '1.8 MB' },
    { title: 'Department wise Headcount', category: 'HR', icon: Users, date: 'Generated: Oct 15, 2023', size: '0.9 MB' },
    { title: 'Leave Balance Report', category: 'HR', icon: PieChart, date: 'Generated: Oct 01, 2023', size: '1.2 MB' },
    { title: 'Tax Deductions Q3', category: 'Finance', icon: FileText, date: 'Generated: Sep 30, 2023', size: '3.1 MB' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Generate, view, and export company reports.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}>
            <Filter size={18} /> Filter
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}>
            <FileText size={18} /> Generate New
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {reportTypes.map((report, idx) => {
          const Icon = report.icon;
          return (
            <div key={idx} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={24} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '999px', color: 'var(--text-secondary)' }}>
                  {report.category}
                </span>
              </div>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{report.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem', flex: 1 }}>{report.date}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{report.size} • PDF</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  <Download size={16} /> Export
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Powered by Nexus Badge */}
      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
        Powered by <span className="text-gradient" style={{ fontWeight: 700 }}>Nexus HRMS</span> — Enterprise-grade human resources ecosystem.
      </div>
    </motion.div>
  );
};

export default Reports;
