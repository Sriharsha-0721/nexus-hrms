import { motion } from 'framer-motion';
import { Shield, Bell, Database, Building } from 'lucide-react';
import { useState } from 'react';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building },
    { id: 'security', label: 'Security & Roles', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Database },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Manage organizational preferences, security, and global configurations.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* Settings Sidebar */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem', width: '100%',
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  textAlign: 'left', fontSize: '0.9rem', fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          {activeTab === 'company' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Company Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Company Name</label>
                  <input type="text" defaultValue="Nexus Solutions Ltd." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Registration Number</label>
                  <input type="text" defaultValue="REG-9923847-X" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Registered Address</label>
                  <input type="text" defaultValue="Hitech city, CyberGateway, Block-A" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 500 }}>
                Save Changes
              </button>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Security Policies</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Two-Factor Authentication (2FA)</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Require 2FA for all administrative accounts.</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Session Timeout</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automatically log users out after inactivity.</div>
                  </div>
                  <select style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option>15 Minutes</option>
                    <option>30 Minutes</option>
                    <option selected>1 Hour</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Placeholders for other tabs just show a generic message */}
          {(activeTab === 'notifications' || activeTab === 'integrations') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', textTransform: 'capitalize' }}>{activeTab} Settings</h2>
              <p style={{ color: 'var(--text-secondary)' }}>This configuration section is currently under construction.</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSettings;
