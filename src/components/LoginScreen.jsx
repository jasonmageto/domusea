import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginScreen({ isDark, toggleTheme }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    } else {
      console.log('❌ User dismissed the install prompt');
    }
  };

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
    <div className={`login-screen-container ${isDark ? 'dark' : ''}`}>
      {/* Theme Toggle - Top Right */}
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

      {/* Left Side - Quote Section */}
      <div className="left-panel">
        <div className="overlay">
          <div className="quote-container">
            <div className="quote-header">A WISE QUOTE</div>
            <h1 className="main-quote">Build Better.<br/>Manage Smarter.</h1>
            <p className="quote-text">
              "The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."
            </p>
            
            {/* ✅ DOWNLOAD APP BUTTON - Left Panel */}
            {!isAppInstalled && (
              <button 
                onClick={handleInstallApp}
                className="download-app-btn"
                aria-label="Download DomusEA App"
              >
                <i className="fas fa-mobile-alt"></i>
                <span>Download App</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            )}
            
            <div className="branding">
              <div className="logo">🏠 DomusEA</div>
              <div className="tagline">Property Management Redefined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="right-panel">
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

          {/* Slim Professional Footer */}
          <div className="login-footer">
            <div className="footer-content">
              <div className="footer-contact">
                <a href="tel:0711333436" className="contact-link">
                  <i className="fas fa-phone"></i>
                  <span>0711 333 436</span>
                </a>
                <span className="footer-divider">•</span>
                <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" className="contact-link whatsapp">
                  <i className="fab fa-whatsapp"></i>
                  <span>WhatsApp</span>
                </a>
              </div>
              <p className="copyright">
                © 2026 DomusEA • Developed by <span className="developer">Elizon Tech</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-screen-container {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          transition: background-color 0.3s ease;
        }
        
        /* ===== THEME VARIABLES ===== */
        .login-screen-container {
          --bg-right: #ffffff;
          --text-primary: #111827;
          --text-secondary: #374151;
          --text-muted: #6b7280;
          --text-inverse: #ffffff;
          --border-color: #e5e7eb;
          --border-light: #f3f4f6;
          --input-bg: #f9fafb;
          --input-border: #d1d5db;
          --error-bg: #fee2e2;
          --error-border: #fecaca;
          --error-text: #b91c1c;
          --footer-border: #e5e7eb;
          --footer-text: #9ca3af;
          --contact-text: #4b5563;
          --whatsapp-color: #059669;
          --theme-btn-bg: rgba(255, 255, 255, 0.95);
          --theme-btn-text: #1f2937;
          --theme-btn-border: #e5e7eb;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .login-screen-container.dark {
          --bg-right: #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-muted: #94a3b8;
          --text-inverse: #0f172a;
          --border-color: #334155;
          --border-light: #475569;
          --input-bg: #334155;
          --input-border: #475569;
          --error-bg: rgba(239, 68, 68, 0.15);
          --error-border: rgba(239, 68, 68, 0.3);
          --error-text: #fca5a5;
          --footer-border: #334155;
          --footer-text: #64748b;
          --contact-text: #94a3b8;
          --whatsapp-color: #34d399;
          --theme-btn-bg: rgba(30, 41, 59, 0.95);
          --theme-btn-text: #e2e8f0;
          --theme-btn-border: #475569;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        
        /* Theme Toggle Button */
        .theme-toggle-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 1000;
          padding: 10px 20px;
          background: var(--theme-btn-bg);
          border: 1px solid var(--theme-btn-border);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--theme-btn-text);
          box-shadow: var(--shadow-sm);
          transition: all 0.2s;
        }
        
        .theme-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
        
        /* ✅ DOWNLOAD APP BUTTON - Left Panel */
        .download-app-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 28px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          animation: pulse-download 2s ease-in-out infinite;
        }
        
        .download-app-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .download-app-btn:active {
          transform: translateY(-1px);
        }
        
        .download-app-btn i:first-child {
          font-size: 20px;
        }
        
        .download-app-btn i:last-child {
          font-size: 14px;
          transition: transform 0.3s ease;
        }
        
        .download-app-btn:hover i:last-child {
          transform: translateX(4px);
        }
        
        @keyframes pulse-download {
          0%, 100% { 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          50% { 
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
          }
        }
        
        /* Left Panel */
        .left-panel {
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          animation: slideIn 0.8s ease-out;
          transition: opacity 0.3s ease;
        }
        
        .login-screen-container.dark .left-panel {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }
        
        .left-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(255,255,255,0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .overlay {
          position: relative;
          z-index: 2;
          max-width: 500px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .quote-container {
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .quote-header {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 20px;
          opacity: 0.95;
        }
        
        .main-quote {
          font-size: 42px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 24px;
          letter-spacing: -1px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .quote-text {
          font-size: 16px;
          line-height: 1.6;
          opacity: 0.95;
          margin-bottom: 10px;
          font-style: italic;
        }
        
        .branding {
          margin-top: auto;
          padding-top: 20px;
        }
        
        .logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .tagline {
          font-size: 14px;
          opacity: 0.9;
        }
        
        /* Right Panel */
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-right);
          position: relative;
          transition: background-color 0.3s ease;
        }
        
        .login-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 40px;
          max-width: 480px;
          margin: 0 auto;
          width: 100%;
        }
        
        .header {
          margin-bottom: 40px;
          text-align: center;
        }
        
        .logo-small {
          font-size: 32px;
          margin-bottom: 16px;
          color: var(--text-primary);
          transition: color 0.3s ease;
        }
        
        .welcome-title {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
          transition: color 0.3s ease;
        }
        
        .welcome-subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
          transition: color 0.3s ease;
        }
        
        .error-message {
          padding: 12px 16px;
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 8px;
          color: var(--error-text);
          font-size: 14px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        
        .error-icon {
          font-size: 16px;
        }
        
        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0.3px;
          transition: color 0.3s ease;
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
          opacity: 0.6;
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }
        
        .input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid var(--input-border);
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.2s;
          outline: none;
          background: var(--input-bg);
          font-family: inherit;
          box-sizing: border-box;
          color: var(--text-primary);
        }
        
        .input::placeholder {
          color: var(--text-muted);
          opacity: 0.8;
        }
        
        .input:focus {
          border-color: #667eea;
          background: var(--bg-right);
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--text-secondary);
          font-size: 16px;
          transition: color 0.2s;
        }
        
        .password-toggle:hover {
          color: #667eea;
        }
        
        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          margin-top: 8px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.3s ease;
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
          box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);
          transition: all 0.2s;
          cursor: pointer;
          margin-top: 8px;
        }
        
        .sign-in-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
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
        
        /* Slim Professional Footer */
        .login-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid var(--footer-border);
          transition: border-color 0.3s ease;
        }
        
        .footer-content {
          text-align: center;
        }
        
        .footer-contact {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }
        
        .contact-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--contact-text);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .contact-link:hover {
          color: #667eea;
          transform: translateY(-1px);
        }
        
        .contact-link.whatsapp {
          color: var(--whatsapp-color);
        }
        
        .contact-link.whatsapp:hover {
          color: #047857;
        }
        
        .contact-link i {
          font-size: 14px;
        }
        
        .footer-divider {
          color: var(--border-light);
          font-size: 12px;
        }
        
        .copyright {
          font-size: 12px;
          color: var(--footer-text);
          margin: 0;
          line-height: 1.4;
          transition: color 0.3s ease;
        }
        
        .developer {
          color: #667eea;
          font-weight: 600;
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @media (max-width: 968px) {
          .left-panel {
            display: none;
          }
        }
        
        @media (max-width: 480px) {
          .login-container {
            padding: 40px 24px;
          }
          
          .welcome-title {
            font-size: 28px;
          }
          
          .main-quote {
            font-size: 32px;
          }
          
          .theme-toggle-btn span {
            display: none;
          }
          
          .footer-contact {
            flex-direction: column;
            gap: 8px;
          }
          
          .footer-divider {
            display: none;
          }
          
          .download-app-btn {
            padding: 12px 24px;
            font-size: 14px;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}