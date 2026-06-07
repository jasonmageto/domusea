import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [rentInfo, setRentInfo] = useState(null);

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch tenant details with admin info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          admins (
            name,
            email,
            phone
          )
        `)
        .eq('id', userProfile.id)
        .single();

      if (tenantError) throw tenantError;
      setRentInfo(tenantData);

      // Fetch admin's payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('admin_id', tenantData.admin_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (methodsError) throw methodsError;
      setPaymentMethods(methodsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getMethodIcon = (type) => {
    const icons = {
      mpesa_personal: '📱',
      mpesa_till: '🏪',
      mpesa_paybill: '🏦',
      airtel_money: '📲',
      t_kash: '💰',
      bank_account: '🏛️',
      sasa_pay: '💳',
      pesapal: '🌐',
      cash: '💵'
    };
    return icons[type] || '💳';
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Welcome, {userProfile?.name}! 👋</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Unit: {rentInfo?.house || 'N/A'} | Property: {rentInfo?.property || 'N/A'}
        </p>
      </div>

      {/* Rent Summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Monthly Rent</div>
              <div className="stat-value">KSh {parseInt(rentInfo?.rent || 0).toLocaleString()}</div>
            </div>
            <div className="stat-icon blue">💰</div>
          </div>
          <div className="stat-subtitle">Due date: {rentInfo?.due_date ? new Date(rentInfo.due_date).toLocaleDateString() : 'N/A'}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Payment Status</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {rentInfo?.status === 'good' ? '✅' : rentInfo?.status === 'pending' ? '⚠️' : '❌'}
              </div>
            </div>
            <div className="stat-icon green">📊</div>
          </div>
          <div className="stat-subtitle">{rentInfo?.status?.toUpperCase() || 'UNKNOWN'}</div>
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: 18 }}>💳 How to Pay Rent</h3>
          <span className="badge badge-muted">
            {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''} available
          </span>
        </div>
        <div className="card-body">
          {paymentMethods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p>Payment methods are being configured by your property admin.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Please check back later or contact your admin.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {paymentMethods.map((method) => (
                <div 
                  key={method.id}
                  style={{
                    padding: 20,
                    border: method.is_default ? '2px solid var(--primary)' : '1px solid var(--border-primary)',
                    borderRadius: 12,
                    background: method.is_default ? 'var(--primary-bg)' : 'var(--bg-faint)',
                    position: 'relative'
                  }}
                >
                  {method.is_default && (
                    <span className="badge badge-success" style={{ position: 'absolute', top: 12, right: 12 }}>
                      ✓ RECOMMENDED
                    </span>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 32 }}>{getMethodIcon(method.method_type)}</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16 }}>{method.method_name}</h4>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {method.method_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {method.phone_number && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>📱 Phone:</strong> {method.phone_number}
                      </div>
                    )}
                    {method.account_number && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>🔢 Account/Till:</strong> {method.account_number}
                      </div>
                    )}
                    {method.account_name && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>👤 Account Name:</strong> {method.account_name}
                      </div>
                    )}
                    {method.bank_name && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>🏦 Bank:</strong> {method.bank_name}{method.branch ? ` - ${method.branch}` : ''}
                      </div>
                    )}
                    {method.instructions && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: 12, 
                        background: 'var(--bg-white)',
                        borderRadius: 8,
                        fontSize: 13,
                        fontStyle: 'italic'
                      }}>
                        <strong>💡 Instructions:</strong> {method.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <a href="#/pay-rent" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
            <h4 style={{ margin: '0 0 4px 0' }}>Pay Rent</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Make a payment now</p>
          </div>
        </a>
        
        <a href="#/payment-history" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📜</div>
            <h4 style={{ margin: '0 0 4px 0' }}>Payment History</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>View past payments</p>
          </div>
        </a>
        
        <a href="#/tenant-requests" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📮</div>
            <h4 style={{ margin: '0 0 4px 0' }}>Submit Request</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Maintenance & more</p>
          </div>
        </a>
      </div>
    </div>
  );
}