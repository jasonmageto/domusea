// CustomNotification.jsx
import { useState, useEffect } from 'react';

export default function CustomNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: { background: '#10B981', icon: '✅' },
    error: { background: '#EF4444', icon: '❌' },
    warning: { background: '#F59E0B', icon: '⚠️' },
    info: { background: '#3B82F6', icon: 'ℹ️' }
  };

  const style = styles[type] || styles.info;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: style.background,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease',
      minWidth: '300px',
      maxWidth: '500px'
    }}>
      <span style={{ fontSize: '20px' }}>{style.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          {type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification'}
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>{message}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
}