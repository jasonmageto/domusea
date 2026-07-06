import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Moon, Sun, Smartphone, Mail, Lock, Eye, EyeOff, ArrowRight, Building2, Phone, MessageCircle, Shield, AlertTriangle } from "lucide-react";

function Logo({ size = 20 }) {
  return (
    <span
      className="dea-login-logo-badge"
      style={{
        width: size + 16,
        height: size + 16,
        background: "linear-gradient(135deg, #34D399 0%, #0B2545 55%, #F59E0B 100%)",
      }}
    >
      <Building2 size={size} strokeWidth={2.25} color="#ffffff" />
    </span>
  );
}

export default function LoginScreen({ isDark, toggleTheme }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      setIsAppInstalled(true);
      setDeferredPrompt(null);
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
    <div className={`dea-login-screen ${isDark ? 'dea-login-dark' : ''}`}>
      {/* Persistent top-left brand mark */}
      <div className="dea-login-brand-bar">
        <Logo size={18} />
        <span className="dea-login-brand-text">DomusEA</span>
      </div>

      {/* Top-right controls */}
      <div className="dea-login-top-controls">
        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className="dea-login-pill-btn"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            <span className="dea-login-hide-mobile">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}
        {!isAppInstalled && (
          <button onClick={handleInstallApp} className="dea-login-pill-btn" aria-label="Download DomusEA App">
            <Smartphone size={17} />
            <span className="dea-login-hide-mobile">Download App</span>
          </button>
        )}
      </div>

      <div className="dea-login-main">
        {/* Condensed hero — mobile/tablet only */}
        <div className="dea-login-hero-mobile">
          <p className="dea-login-quote-header">A WISE QUOTE</p>
          <h1 className="dea-login-mobile-quote">Build Better. Manage Smarter.</h1>
          <p className="dea-login-mobile-tagline">Property Management Redefined</p>
        </div>

        {/* Full hero — desktop only */}
        <div className="dea-login-hero">
          <p className="dea-login-quote-header">A WISE QUOTE</p>
          <h1 className="dea-login-main-quote">Build Better.<br />Manage Smarter.</h1>
          <p className="dea-login-quote-text">
            "The art of building is not just about structures; it's about creating spaces
            where communities thrive. DomusEA handles the details so you can focus on the home."
          </p>

          {!isAppInstalled && (
            <button onClick={handleInstallApp} className="dea-login-download-btn">
              <Smartphone size={19} />
              <span>Download App</span>
              <ArrowRight size={17} />
            </button>
          )}

          <div className="dea-login-branding">
            <Logo size={20} />
            <div>
              <div className="dea-login-branding-name">DomusEA</div>
              <div className="dea-login-branding-tagline">Property Management Redefined</div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="dea-login-right-panel">
          <div className="dea-login-card">
            <div className="dea-login-card-header">
              <h2 className="dea-login-welcome-title">Welcome Back</h2>
              <p className="dea-login-welcome-subtitle">Enter your credentials to access your account</p>
            </div>

            {(error || authError) && (
              <div className="dea-login-error">
                <AlertTriangle size={16} />
                <span>{error || authError}</span>
              </div>
            )}

            <form className="dea-login-form" onSubmit={handleSubmit}>
              <div className="dea-login-field">
                <label className="dea-login-label">Email Address</label>
                <div className="dea-login-input-wrap">
                  <Mail size={17} className="dea-login-input-icon" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="dea-login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="dea-login-field">
                <label className="dea-login-label">Password</label>
                <div className="dea-login-input-wrap">
                  <Lock size={17} className="dea-login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="dea-login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="dea-login-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="dea-login-remember-row">
                <label className="dea-login-checkbox-label">
                  <input type="checkbox" className="dea-login-checkbox" />
                  <span>Remember me for 30 days</span>
                </label>
                <a href="/forgot-password" className="dea-login-forgot-link">Forgot password?</a>
              </div>

              <button type="submit" className="dea-login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="dea-login-spinner" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="dea-login-footer">
              <div className="dea-login-footer-row">
                <div className="dea-login-footer-contact">
                  <a href="tel:0711333436" className="dea-login-contact-link">
                    <Phone size={15} />
                    <span className="dea-login-hide-mobile">0711 333 436</span>
                  </a>
                  <a href="https://wa.me/254711333436" target="_blank" rel="noopener noreferrer" className="dea-login-contact-link dea-login-whatsapp">
                    <MessageCircle size={15} />
                    <span className="dea-login-hide-mobile">WhatsApp</span>
                  </a>
                </div>
                <p className="dea-login-copyright">© 2026 DomusEA • <span className="dea-login-developer">Elizon Tech</span></p>
              </div>
              <div className="dea-login-security">
                <Shield size={15} />
                <span>Restricted Access • Authorized Personnel Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dea-login-screen, .dea-login-screen * {
          box-sizing: border-box;
        }

        .dea-login-screen {
          position: relative;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

          --dea-page-1: #EAF1F8;
          --dea-page-2: #DCE8F2;
          --dea-page-3: #E7EEE9;
          --dea-glow-emerald: rgba(16, 185, 129, 0.14);
          --dea-glow-amber: rgba(245, 158, 11, 0.16);
          --dea-grid-line: rgba(11, 37, 69, 0.05);

          --dea-emerald: #10B981;
          --dea-emerald-light: #34D399;
          --dea-amber: #F59E0B;

          --dea-card-bg: rgba(255, 255, 255, 0.9);
          --dea-card-border: rgba(255, 255, 255, 0.6);
          --dea-card-shadow: 0 25px 60px -15px rgba(11, 37, 69, 0.25);

          --dea-text-primary: #0B2545;
          --dea-text-secondary: #33455e;
          --dea-text-muted: #6b7a8f;
          --dea-input-bg: rgba(255, 255, 255, 0.8);
          --dea-input-border: rgba(11, 37, 69, 0.15);
          --dea-pill-bg: rgba(255, 255, 255, 0.7);
          --dea-pill-border: rgba(11, 37, 69, 0.1);
          --dea-pill-text: #0B2545;
          --dea-footer-border: rgba(11, 37, 69, 0.1);
          --dea-footer-text: #8592a3;

          background-image:
            radial-gradient(1100px 600px at 12% 8%, var(--dea-glow-emerald), transparent 60%),
            radial-gradient(900px 700px at 92% 88%, var(--dea-glow-amber), transparent 55%),
            linear-gradient(150deg, var(--dea-page-1) 0%, var(--dea-page-2) 45%, var(--dea-page-3) 100%),
            linear-gradient(var(--dea-grid-line) 1px, transparent 1px),
            linear-gradient(90deg, var(--dea-grid-line) 1px, transparent 1px);
          background-size: auto, auto, auto, 44px 44px, 44px 44px;
        }

        .dea-login-screen.dea-login-dark {
          --dea-page-1: #071427;
          --dea-page-2: #0B2545;
          --dea-page-3: #0E2F52;
          --dea-glow-emerald: rgba(16, 185, 129, 0.18);
          --dea-glow-amber: rgba(245, 158, 11, 0.14);
          --dea-grid-line: rgba(255, 255, 255, 0.05);

          --dea-card-bg: rgba(11, 37, 69, 0.6);
          --dea-card-border: rgba(255, 255, 255, 0.1);
          --dea-card-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5);

          --dea-text-primary: #f1f5f9;
          --dea-text-secondary: #cbd5e1;
          --dea-text-muted: #94a3b8;
          --dea-input-bg: rgba(255, 255, 255, 0.06);
          --dea-input-border: rgba(255, 255, 255, 0.15);
          --dea-pill-bg: rgba(255, 255, 255, 0.08);
          --dea-pill-border: rgba(255, 255, 255, 0.15);
          --dea-pill-text: #e2e8f0;
          --dea-footer-border: rgba(255, 255, 255, 0.1);
          --dea-footer-text: #64748b;
        }

        .dea-login-logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .dea-login-brand-bar {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dea-login-brand-text {
          font-weight: 700;
          font-size: 17px;
          color: var(--dea-text-primary);
        }

        .dea-login-top-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .dea-login-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          background: var(--dea-pill-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--dea-pill-border);
          border-radius: 999px;
          color: var(--dea-pill-text);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          min-height: 40px;
          min-width: 40px;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .dea-login-pill-btn:hover {
          transform: translateY(-2px);
        }

        .dea-login-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 130px 20px 48px;
          min-height: 100vh;
          justify-content: center;
        }

        .dea-login-quote-header {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--dea-emerald);
          margin: 0 0 12px;
        }

        .dea-login-hero-mobile {
          display: block;
          text-align: center;
          width: 100%;
        }

        .dea-login-mobile-quote {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.15;
          color: var(--dea-text-primary);
          margin: 0 0 10px;
        }

        .dea-login-mobile-tagline {
          font-size: 14px;
          color: var(--dea-text-secondary);
          margin: 0;
        }

        .dea-login-hero {
          display: none;
        }

        .dea-login-right-panel {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .dea-login-card {
          width: 100%;
          max-width: 440px;
          background: var(--dea-card-bg);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid var(--dea-card-border);
          border-radius: 28px;
          box-shadow: var(--dea-card-shadow);
          padding: 36px 28px;
        }

        .dea-login-card-header {
          margin-bottom: 28px;
          text-align: center;
        }

        .dea-login-welcome-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--dea-text-primary);
          margin: 0 0 6px;
        }

        .dea-login-welcome-subtitle {
          font-size: 14px;
          color: var(--dea-text-secondary);
          margin: 0;
        }

        .dea-login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .dea-login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .dea-login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dea-login-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--dea-text-primary);
        }

        .dea-login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .dea-login-input-icon {
          position: absolute;
          left: 14px;
          color: var(--dea-text-muted);
          pointer-events: none;
        }

        .dea-login-input {
          width: 100%;
          padding: 13px 42px 13px 42px;
          border: 1.5px solid var(--dea-input-border);
          border-radius: 12px;
          font-size: 14px;
          background: var(--dea-input-bg);
          color: var(--dea-text-primary);
          outline: none;
          font-family: inherit;
          display: block;
        }

        .dea-login-input:focus {
          border-color: var(--dea-emerald);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        }

        .dea-login-password-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--dea-text-muted);
          display: flex;
        }

        .dea-login-remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 13px;
        }

        .dea-login-checkbox-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--dea-text-secondary);
          cursor: pointer;
        }

        .dea-login-checkbox {
          width: 15px;
          height: 15px;
          accent-color: var(--dea-emerald);
        }

        .dea-login-forgot-link {
          color: var(--dea-amber);
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
        }

        .dea-login-forgot-link:hover {
          text-decoration: underline;
        }

        .dea-login-submit {
          width: 100%;
          padding: 15px;
          background: linear-gradient(90deg, var(--dea-emerald-light) 0%, var(--dea-amber) 100%);
          color: #0B2545;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          margin-top: 4px;
        }

        .dea-login-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .dea-login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(11,37,69,0.3);
          border-top-color: #0B2545;
          border-radius: 50%;
          animation: dea-login-spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes dea-login-spin { to { transform: rotate(360deg); } }

        .dea-login-footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid var(--dea-footer-border);
        }

        .dea-login-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .dea-login-footer-contact {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dea-login-contact-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--dea-text-secondary);
          text-decoration: none;
        }

        .dea-login-contact-link.dea-login-whatsapp {
          color: var(--dea-emerald);
        }

        .dea-login-copyright {
          font-size: 11px;
          color: var(--dea-footer-text);
          margin: 0;
        }

        .dea-login-developer {
          color: var(--dea-amber);
          font-weight: 600;
        }

        .dea-login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid var(--dea-footer-border);
          color: var(--dea-emerald);
          font-size: 11px;
          text-align: center;
        }

        .dea-login-hide-mobile { display: none; }

        /* ===== Desktop layout ===== */
        @media (min-width: 1024px) {
          .dea-login-main {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 48px;
            padding: 40px 60px;
          }

          .dea-login-hero-mobile { display: none; }

          .dea-login-hero {
            display: flex;
            flex-direction: column;
            justify-content: center;
            width: 50%;
          }

          .dea-login-main-quote {
            font-size: 52px;
            font-weight: 800;
            line-height: 1.1;
            color: var(--dea-text-primary);
            margin: 0 0 24px;
          }

          .dea-login-quote-text {
            font-style: italic;
            font-size: 17px;
            line-height: 1.6;
            color: var(--dea-text-secondary);
            max-width: 460px;
            margin: 0 0 32px;
          }

          .dea-login-download-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            align-self: flex-start;
            padding: 14px 26px;
            border: none;
            border-radius: 999px;
            background: linear-gradient(90deg, #F5C451 0%, var(--dea-amber) 100%);
            color: #0B2545;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            margin-bottom: 32px;
          }

          .dea-login-branding {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .dea-login-branding-name {
            font-weight: 700;
            font-size: 18px;
            color: var(--dea-text-primary);
          }

          .dea-login-branding-tagline {
            font-size: 13px;
            color: var(--dea-text-secondary);
          }

          .dea-login-right-panel { width: 50%; justify-content: flex-end; }
          .dea-login-card { padding: 44px 40px; }
          .dea-login-welcome-title { font-size: 32px; }
          .dea-login-hide-mobile { display: inline; }
        }
      `}</style>
    </div>
  );
}
