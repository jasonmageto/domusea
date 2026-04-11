import { useAuth } from '../AuthContext';

export default function SubscriptionExpired() {
  const { userProfile, logout } = useAuth();

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
        borderRadius: 16,
        padding: 40,
        maxWidth: 500,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: 80,
          height: 80,
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 40
        }}>
          ⚠️
        </div>

        <h1 style={{ margin: '0 0 16px 0', color: '#111', fontSize: 28 }}>
          Subscription Expired
        </h1>

        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Your DomusEA admin account has been frozen due to an overdue subscription. 
          To restore access to your property management dashboard, please renew your subscription.
        </p>

        <div style={{
          background: '#f3f4f6',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          textAlign: 'left'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#111', fontSize: 16 }}>
            📋 Account Details
          </h3>
          <div style={{ fontSize: 14, color: '#374151' }}>
            <p style={{ margin: '8px 0' }}>
              <strong>Name:</strong> {userProfile?.name}
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>Email:</strong> {userProfile?.email}
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>Subscription Due:</strong>{' '}
              {userProfile?.subscription_due 
                ? new Date(userProfile.subscription_due).toLocaleDateString('en-GB')
                : 'Overdue'
              }
            </p>
          </div>
        </div>

        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: 16 }}>
            📞 How to Renew
          </h3>
          <p style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: 14 }}>
            Contact the Supreme Administrator to renew your subscription:
          </p>
          <div style={{ fontSize: 14, color: '#1e40af' }}>
            <p style={{ margin: '8px 0' }}>
              <strong>Email:</strong> sa@domusea.com
            </p>
            <p style={{ margin: '8px 0' }}>
              <strong>Phone:</strong> +254 XXX XXX XXX
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center'
        }}>
          <button
            onClick={logout}
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
          <button
            onClick={() => window.location.href = 'mailto:sa@domusea.com?subject=Subscription Renewal Request'}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📧 Contact Now
          </button>
        </div>

        <p style={{
          margin: '24px 0 0 0',
          fontSize: 12,
          color: '#9ca3af'
        }}>
          Once your subscription is renewed, you'll regain full access to your dashboard.
        </p>
      </div>
    </div>
  );
}