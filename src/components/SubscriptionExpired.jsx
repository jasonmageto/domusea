import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import { supabase } from '../supabaseClient';

export default function SubscriptionExpired() {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [processing, setProcessing] = useState(false);

  // 💳 Payment Plans
  const plans = [
    { 
      id: 'monthly', 
      name: 'Monthly', 
      price: 2000, 
      description: 'Billed every month',
      popular: false 
    },
    { 
      id: 'quarterly', 
      name: 'Quarterly', 
      price: 5500, 
      description: 'Save 10% • Billed every 3 months',
      popular: true 
    },
    { 
      id: 'annual', 
      name: 'Annual', 
      price: 20000, 
      description: 'Save 17% • Billed yearly',
      popular: false 
    }
  ];

  // Handle successful payment
  const handlePaymentSuccess = async (paymentDetails) => {
    try {
      setProcessing(true);
      
      // Calculate new end date
      const now = new Date();
      let endDate = new Date(now);
      
      if (selectedPlan === 'monthly') endDate.setMonth(now.getMonth() + 1);
      else if (selectedPlan === 'quarterly') endDate.setMonth(now.getMonth() + 3);
      else if (selectedPlan === 'annual') endDate.setFullYear(now.getFullYear() + 1);

      // Update admin record in Supabase
      const { error } = await supabase
        .from('admins')
        .update({
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString(),
          frozen: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      // Unfreeze all tenants under this admin
      await supabase
        .from('tenants')
        .update({ frozen: false })
        .eq('admin_id', userProfile.id);

      // Update local auth context
      updateUserProfile({
        ...userProfile,
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        frozen: false
      });

      // Show success message
      alert('✅ Payment successful! Your account has been reactivated.');
      
      // Redirect to dashboard
      navigate('/admin/dashboard', { replace: true });
      
    } catch (error) {
      console.error('Error activating subscription:', error);
      alert('⚠️ Payment received but there was an issue activating your account. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

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
        maxWidth: 550,
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
          Renew now to restore access instantly.
        </p>

        {/* Account Details */}
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
              <strong>Status:</strong>{' '}
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Expired / Frozen</span>
            </p>
          </div>
        </div>

        {/* 💳 Payment Plans */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#111', fontSize: 16 }}>
            💳 Select Renewal Plan
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                disabled={processing}
                style={{
                  padding: '16px',
                  background: selectedPlan === plan.id 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'white',
                  color: selectedPlan === plan.id ? 'white' : '#111',
                  border: `2px solid ${selectedPlan === plan.id ? '#667eea' : '#e5e7eb'}`,
                  borderRadius: 12,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.2s',
                  opacity: processing ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!processing && selectedPlan !== plan.id) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processing && selectedPlan !== plan.id) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {/* Popular Badge */}
                {plan.popular && selectedPlan !== plan.id && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    right: 12,
                    background: '#10b981',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    textTransform: 'uppercase'
                  }}>
                    Popular
                  </span>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                    <div style={{ fontSize: 13, opacity: selectedPlan === plan.id ? 0.9 : 0.7 }}>
                      {plan.description}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    KSh {plan.price.toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 24
        }}>
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={processing}
            style={{
              width: '100%',
              padding: '16px',
              background: processing 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.2s',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!processing) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              if (!processing) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {processing ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
                Processing...
              </>
            ) : (
              <>
                💳 Pay KSh {plans.find(p => p.id === selectedPlan).price.toLocaleString()} Now
              </>
            )}
          </button>

          <button
            onClick={() => window.location.href = 'mailto:sa@domusea.com?subject=Subscription Renewal Request'}
            disabled={processing}
            style={{
              width: '100%',
              padding: '14px',
              background: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            📧 Prefer to contact support?
          </button>
        </div>

        {/* Support Info */}
        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          textAlign: 'left',
          fontSize: 14,
          color: '#1e40af'
        }}>
          <strong>💡 Payment Info:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>✅ M-Pesa supported</li>
            <li>✅ Instant activation after payment</li>
            <li>✅ Secure & encrypted transactions</li>
            <li>✅ Receipt sent to your email</li>
          </ul>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={logout}
            disabled={processing}
            style={{
              padding: '10px 20px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            Logout
          </button>
          <button
            onClick={() => navigate('/login')}
            disabled={processing}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            ← Back to Login
          </button>
        </div>

        <p style={{
          margin: '24px 0 0 0',
          fontSize: 12,
          color: '#9ca3af'
        }}>
          🔒 Your payment is secured with bank-level encryption.
        </p>
      </div>

      {/* 💳 Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          admin={userProfile}
          amount={plans.find(p => p.id === selectedPlan).price}
          frequency={selectedPlan}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}