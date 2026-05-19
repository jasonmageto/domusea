// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      padding: '16px 40px',
      borderTop: '1px solid #e5e7eb',
      background: '#f9fafb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
          <span>📞</span> 0711 333 436
        </span>
        <a 
          href="https://wa.me/254711333436" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#10b981', fontWeight: '600', textDecoration: 'none' }}
        >
          <span>💬</span> WhatsApp
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔐</span> Restricted Access
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          © 2026 DomusEA | Developed by <span style={{ color: '#667eea', fontWeight: '600' }}>Elizon Tech</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
