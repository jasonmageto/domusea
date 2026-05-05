import { useState } from 'react';

export default function PasswordInput({ 
  value, 
  onChange, 
  placeholder = "Enter password", 
  required = false,
  label = "Password",
  name = "password"
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      {label && (
        <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>
          {label} {required && '*'}
        </label>
      )}
      <div style={{position: 'relative'}}>
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{
            width: '100%',
            padding: '8px 40px 8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            fontSize: 14,
            boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--gray)',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          tabIndex={-1}
        >
          {showPassword ? (
            // Eye Off Icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            // Eye Icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}