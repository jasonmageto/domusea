// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: '#111827',
      color: '#f3f4f6',
      padding: '20px 15px',
      textAlign: 'center',
      borderTop: '1px solid #374151',
      width: '100%',
      boxSizing: 'border-box',
      zIndex: 100,
      position: 'relative'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <p style={{ 
          margin: 0, 
          fontSize: '13px', 
          opacity: 0.8,
          lineHeight: '1.4'
        }}>
          © {new Date().getFullYear()} DomusEA Platform. All rights reserved. | Developed by <strong>Elizon Tech.</strong>
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px', 
          flexWrap: 'wrap',
          alignItems: 'center' 
        }}>
          <a 
            href="tel:0711333436" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: '#10b981', 
              textDecoration: 'none', 
              fontWeight: '600', 
              fontSize: '14px',
              padding: '6px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '6px'
            }}
          >
            <span>📞</span> 0711 333 436
          </a>
          
          <a 
            href="https://wa.me/254711333436" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: '#25D366', 
              textDecoration: 'none', 
              fontWeight: '600', 
              fontSize: '14px',
              padding: '6px 12px',
              background: 'rgba(37, 211, 102, 0.1)',
              borderRadius: '6px'
            }}
          >
            <span>💬</span> WhatsApp
          </a>
        </div>
        
        <p style={{ 
          margin: 0, 
          fontSize: '11px', 
          color: '#9ca3af',
          letterSpacing: '0.5px'
        }}>
          AUTHORIZED PERSONNEL ONLY • SECURE PROPERTY MANAGEMENT
        </p>
      </div>
    </footer>
  );
};

export default Footer;
