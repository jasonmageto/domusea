// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: '#111827',
      color: '#f3f4f6',
      padding: '24px 20px',
      textAlign: 'center',
      borderTop: '1px solid #374151',
      marginTop: 'auto',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.8 }}>
          © {new Date().getFullYear()} DomusEA Platform. All rights reserved. | Developed by <strong>Elizon Tech.</strong>
        </p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          flexWrap: 'wrap',
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📞</span>
            <a 
              href="tel:0711333436" 
              style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}
            >
              Call Support: 0711 333 436
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💬</span>
            <a 
              href="https://wa.me/254711333436" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#25D366', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}
            >
              WhatsApp Us
            </a>
          </div>
        </div>
        <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
          Authorized Personnel Only • Secure Property Management
        </p>
      </div>
    </footer>
  );
};

export default Footer;
