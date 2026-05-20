// Login.jsx
export default function Login() {
  return (
    <div style={styles.container}>
      {/* Left Side - Quote Section */}
      <div style={styles.leftPanel}>
        <div style={styles.overlay}>
          <div style={styles.quoteContainer}>
            <div style={styles.quoteHeader}>A WISE QUOTE</div>
            <h1 style={styles.mainQuote}>Build Better.<br/>Manage Smarter.</h1>
            <p style={styles.quoteText}>
              "The art of building is not just about structures; it's about creating spaces where communities thrive. DomusEA handles the details so you can focus on the home."
            </p>
            <div style={styles.branding}>
              <div style={styles.logo}>🏠 DomusEA</div>
              <div style={styles.tagline}>Property Management Redefined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={styles.rightPanel}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.contactInfo}>
            <span style={styles.contactItem}>
              <span style={styles.phoneIcon}>📞</span>
              0711 333 436
            </span>
            <span style={styles.contactItem}>
              <span style={styles.whatsappIcon}>💬</span>
              <span style={styles.whatsappText}>WhatsApp</span>
            </span>
          </div>
          <div style={styles.developerInfo}>
            © 2026 DomusEA | Developed by <span style={styles.developer}>Elizon Tech</span>
          </div>
        </div>

        {/* Login Container */}
        <div style={styles.loginContainer}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logoSmall}>🏠 DomusEA</div>
            <h2 style={styles.welcomeTitle}>Welcome Back</h2>
            <p style={styles.welcomeSubtitle}>Enter your credentials to access your account</p>
          </div>

          {/* Login Form */}
          <form style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📧</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.rememberRow}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" style={styles.checkbox} />
                <span>Remember me for 30 days</span>
              </label>
              <a href="/forgot-password" style={styles.forgotLink}>Forgot password?</a>
            </div>

            <button type="submit" style={styles.signInButton}>
              <span>Sign In</span>
              <span style={styles.arrow}>→</span>
            </button>
          </form>
        </div>

        {/* Footer - Now at the bottom */}
        <div style={styles.footer}>
          <div style={styles.securityBadge}>
            <span style={styles.lockIcon}>🔐</span>
            <span>Restricted Access • Authorized Personnel Only</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Updated Styling
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '60px',
    animation: 'slideIn 0.8s ease-out'
  },
  
  overlay: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '500px'
  },
  
  quoteContainer: {
    color: 'white'
  },
  
  quoteHeader: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '20px',
    opacity: 0.9
  },
  
  mainQuote: {
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '1.2',
    marginBottom: '30px',
    letterSpacing: '-1px'
  },
  
  quoteText: {
    fontSize: '16px',
    lineHeight: '1.8',
    opacity: 0.9,
    marginBottom: '40px',
    fontStyle: 'italic'
  },
  
  branding: {
    marginTop: '40px'
  },
  
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px'
  },
  
  tagline: {
    fontSize: '14px',
    opacity: 0.8
  },
  
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    position: 'relative'
  },
  
  topBar: {
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
    flexShrink: 0
  },
  
  contactInfo: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center'
  },
  
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500'
  },
  
  phoneIcon: {
    fontSize: '16px'
  },
  
  whatsappIcon: {
    fontSize: '16px'
  },
  
  whatsappText: {
    color: '#10b981',
    fontWeight: '600'
  },
  
  developerInfo: {
    fontSize: '13px',
    color: '#6b7280'
  },
  
  developer: {
    color: '#667eea',
    fontWeight: '600'
  },
  
  loginContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 40px',
    maxWidth: '450px',
    margin: '0 auto',
    width: '100%'
  },
  
  header: {
    marginBottom: '40px'
  },
  
  logoSmall: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#667eea',
    marginBottom: '20px'
  },
  
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    letterSpacing: '-0.5px'
  },
  
  welcomeSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.5'
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    letterSpacing: '0.3px'
  },
  
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  
  inputIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '18px',
    zIndex: 1,
    opacity: 0.5
  },
  
  input: {
    width: '100%',
    padding: '14px 16px 14px 48px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
    background: '#f9fafb',
    fontFamily: 'inherit',
    ':focus': {
      borderColor: '#667eea',
      background: '#ffffff',
      boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.1)'
    }
  },
  
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
  },
  
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#6b7280',
    cursor: 'pointer'
  },
  
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#667eea'
  },
  
  forgotLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  
  signInButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.2)',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
    },
    ':active': {
      transform: 'translateY(0)'
    }
  },
  
  arrow: {
    fontSize: '18px',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateX(4px)'
    }
  },
  
  footer: {
    padding: '24px 40px',
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb',
    flexShrink: 0
  },
  
  securityBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: '500'
  },
  
  lockIcon: {
    fontSize: '16px'
  }
};