// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      padding: '16px 40px',
      borderTop: '1px solid var(--border, #e5e7eb)',
      background: 'var(--footer-bg, #f9fafb)',
      color: 'var(--text, #111827)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      width: '100%',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'inherit', fontWeight: '500' }}>
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
        <div style={{ fontSize: '12px', color: 'var(--gray, #9ca3af)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔐</span> Restricted Access
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gray, #6b7280)' }}>
          © 2026 DomusEA | Developed by <span style={{ color: 'var(--blue, #667eea)', fontWeight: '600' }}>Elizon Tech</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
