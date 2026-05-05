import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import PasswordInput from './PasswordInput';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFrozenScreen, setShowFrozenScreen] = useState(false);
  const { login } = useAuth();

  // Check URL for frozen parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('frozen') === 'admin') {
      setShowFrozenScreen(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err.message);
      
      if (err.message === 'ACCOUNT_FROZEN_BY_ADMIN') {
        // Redirect with frozen parameter
        window.location.href = '/?frozen=admin';
      } else if (err.message === 'SUBSCRIPTION_FROZEN') {
        window.location.href = '/?frozen=subscription';
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FROZEN ADMIN SCREEN
  if (showFrozenScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 40,
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
          <h2 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
            Account Temporarily Unavailable
          </h2>
          
          <p style={{ 
            margin: '0 0 24px 0', 
            color: '#6b7280',
            lineHeight: 1.6
          }}>
            Your property manager's account is currently inactive due to a subscription issue.
          </p>

          <div style={{
            padding: 16,
            background: '#fef3c7',
            borderRadius: 8,
            marginBottom: 24,
            textAlign: 'left'
          }}>
            <strong style={{ color: '#92400e' }}>What to do:</strong>
            <ul style={{ 
              margin: '8px 0 0 0', 
              paddingLeft: 20,
              color: '#92400e',
              lineHeight: 1.8
            }}>
              <li>Contact your property manager</li>
              <li>They need to renew their subscription</li>
              <li>You'll regain access immediately after</li>
            </ul>
          </div>

          <button
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ✅ DEFAULT LOGIN FORM
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 40,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, color: '#1f2937' }}>
          Welcome Back
        </h1>
        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: 14 }}>
          Enter your credentials to access your account
        </p>

        {error && (
          <div style={{
            padding: 12,
            background: '#fee2e2',
            borderRadius: 6,
            color: '#dc2626',
            fontSize: 14,
            marginBottom: 16
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 500,
              color: '#374151'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 15
              }}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: loading ? '#9ca3af' : '#111827',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 13,
          color: '#6b7280'
        }}>
          Restricted Access • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}