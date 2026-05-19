// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: '#0f172a',
      color: '#94a3b8',
      padding: '8px 15px',
      textAlign: 'center',
      borderTop: '1px solid #1e293b',
      width: '100%',
      boxSizing: 'border-box',
      fontSize: '11px',
      zIndex: 100
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <span>© {new Date().getFullYear()} DomusEA | Developed by <strong>Elizon Tech.</strong></span>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="tel:0711333436" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>
            📞 0711 333 436
          </a>
          <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: '500' }}>
            💬 WhatsApp
          </a>
        </div>

        <span style={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase' }}>Authorized Only</span>
      </div>
    </footer>
  );
};

export default Footer;
