import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginScreen({ isDark, toggleTheme }) {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-container">
      {/* Theme Toggle */}
      {toggleTheme && (
        <button 
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      )}

      {/* Left Side - Quote Section with Background Image */}
      <div className="left-panel">
        <div className="overlay">
          <div className="quote-container">
            <div className="quote-header">A WISE QUOTE</div>
            <h1 className="main-quote">Build Better.<br/>Manage Smarter.</h1>
            <p className="quote-text">
              "The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."
            </p>
            <div className="branding">
              <div className="logo">🏠 DomusEA</div>
              <div className="tagline">Property Management Redefined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="right-panel">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="contact-info">
            <span className="contact-item">
              <span className="phone-icon">📞</span>
              0711 333 436
            </span>
            <span className="contact-item">
              <span className="whatsapp-icon">💬</span>
              <span className="whatsapp-text">WhatsApp</span>
            </span>
          </div>
          <div className="developer-info">
            © 2026 DomusEA | Developed by <span className="developer">Elizon Tech</span>
          </div>
        </div>

        {/* Login Container */}
        <div className="login-container">
          {/* Header */}
          <div className="header">
            <div className="logo-small">🏠 DomusEA</div>
            <h2 className="welcome-title">Welcome Back</h2>
            <p className="welcome-subtitle">Enter your credentials to access your account</p>
          </div>

          {/* Error Message */}
          {(error || authError) && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error || authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="remember-row">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox" />
                <span>Remember me for 30 days</span>
              </label>
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="sign-in-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="arrow">→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="footer">
          <div className="security-badge">
            <span className="lock-icon">🔐</span>
            <span>Restricted Access • Authorized Personnel Only</span>
          </div>
        </div>
      </div>

      <style>{`
        .login-screen-container {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
        }
        
        .theme-toggle-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 100;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        
        .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .left-panel {
          flex: 1;
          background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          position: relative;
          display: flex;
          align-items: center;
          padding: 60px;
          animation: slideIn 0.8s ease-out;
        }
        
        .overlay {
          position: relative;
          z-index: 2;
          max-width: 500px;
        }
        
        .quote-container {
          color: white;
        }
        
        .quote-header {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 20px;
          opacity: 0.9;
        }
        
        .main-quote {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 30px;
          letter-spacing: -1px;
        }
        
        .quote-text {
          font-size: 16px;
          line-height: 1.8;
          opacity: 0.9;
          margin-bottom: 40px;
          font-style: italic;
        }
        
        .branding {
          margin-top: 40px;
        }
        
        .logo {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .tagline {
          font-size: 14px;
          opacity: 0.8;
        }
        
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          position: relative;
        }
        
        .top-bar {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          flex-shrink: 0;
        }
        
        .contact-info {
          display: flex;
          gap: 24px;
          align-items: center;
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        
        .phone-icon {
          font-size: 16px;
        }
        
        .whatsapp-icon {
          font-size: 16px;
        }
        
        .whatsapp-text {
          color: #10b981;
          font-weight: 600;
        }
        
        .developer-info {
          font-size: 13px;
          color: #6b7280;
        }
        
        .developer {
          color: #667eea;
          font-weight: 600;
        }
        
        .login-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 40px;
          max-width: 450px;
          margin: 0 auto;
          width: 100%;
        }
        
        .header {
          margin-bottom: 40px;
        }
        
        .logo-small {
          font-size: 20px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 20px;
        }
        
        .welcome-title {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .welcome-subtitle {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .error-message {
          padding: 12px 16px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #b91c1c;
          font-size: 14px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .error-icon {
          font-size: 16px;
        }
        
        .form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.3px;
        }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-icon {
          position: absolute;
          left: 16px;
          font-size: 18px;
          z-index: 1;
          opacity: 0.5;
        }
        
        .input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
          outline: none;
          background: #f9fafb;
          font-family: inherit;
          box-sizing: border-box;
        }
        
        .input:focus {
          border-color: #667eea;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
          font-size: 16px;
        }
        
        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          cursor: pointer;
        }
        
        .checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #667eea;
        }
        
        .forgot-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        
        .forgot-link:hover {
          text-decoration: underline;
        }
        
        .sign-in-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.2);
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .sign-in-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .sign-in-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .sign-in-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .arrow {
          font-size: 18px;
          transition: transform 0.2s;
        }
        
        .sign-in-button:hover:not(:disabled) .arrow {
          transform: translateX(4px);
        }
        
        .footer {
          padding: 24px 40px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          flex-shrink: 0;
        }
        
        .security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
        }
        
        .lock-icon {
          font-size: 16px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @media (max-width: 768px) {
          .left-panel {
            padding: 40px 30px;
            min-height: 250px;
          }
          
          .main-quote {
            font-size: 32px;
          }
          
          .theme-toggle-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}