import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function TenantDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [rentInfo, setRentInfo] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      console.log('🔍 Fetching data for tenant:', userProfile.id);
      
      // Fetch tenant details with admin info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          admins (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('id', userProfile.id)
        .single();

      if (tenantError) {
        console.error('❌ Tenant fetch error:', tenantError);
        toast.error('Failed to load tenant data');
        throw tenantError;
      }
      
      console.log('✅ Tenant data loaded:', tenantData);
      console.log('✅ Linked Admin ID:', tenantData.admin_id);
      console.log('✅ Admin Details:', tenantData.admins);
      
      setRentInfo(tenantData);
      setAdminInfo(tenantData.admins);

      // Fetch admin's payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('admin_id', tenantData.admin_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (methodsError) {
        console.error('❌ Payment methods error:', methodsError);
        throw methodsError;
      }
      
      console.log('✅ Payment methods found:', methodsData?.length || 0);
      console.log('📋 Methods:', methodsData);
      
      setPaymentMethods(methodsData || []);
      
      if (!methodsData || methodsData.length === 0) {
        console.warn('⚠️ No active payment methods found for admin:', tenantData.admin_id);
        toast('No payment methods configured yet', { icon: '⏳' });
      }
      
    } catch (error) {
      console.error('❌ Error in fetchData:', error);
      toast.error('Failed to load dashboard');
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

  const getMethodLabel = (type) => {
    const labels = {
      mpesa_personal: 'M-Pesa (Personal)',
      mpesa_till: 'M-Pesa (Buy Goods)',
      mpesa_paybill: 'M-Pesa (Paybill)',
      airtel_money: 'Airtel Money',
      t_kash: 'T-Kash',
      bank_account: 'Bank Account',
      sasa_pay: 'SasaPay',
      pesapal: 'Pesapal',
      cash: 'Cash'
    };
    return labels[type] || type;
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
        {adminInfo && (
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Property Admin: <strong>{adminInfo.name}</strong>
          </p>
        )}
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
          <div className="stat-subtitle">
            Due: {rentInfo?.due_date ? new Date(rentInfo.due_date).toLocaleDateString() : 'N/A'}
          </div>
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
            {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {paymentMethods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p style={{ margin: '0 0 8px 0' }}>Payment methods are being configured.</p>
              <p style={{ fontSize: 13, margin: 0 }}>
                Please contact {adminInfo?.name || 'your admin'} for payment details.
              </p>
              {adminInfo?.phone && (
                <a 
                  href={`tel:${adminInfo.phone}`}
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                >
                  📞 Call {adminInfo.name}
                </a>
              )}
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
                        {getMethodLabel(method.method_type)}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {method.phone_number && (
                      <div style={{ marginBottom: 6 }}>
                        <strong>📱 Phone:</strong>{' '}
                        <a href={`tel:${method.phone_number}`} style={{ color: 'var(--primary)' }}>
                          {method.phone_number}
                        </a>
                      </div>
                    )}
                    {method.account_number && (
                      <div style={{ marginBottom: 6 }}>
                        <strong>🔢 {method.method_type.includes('mpesa') ? 'Till/Paybill' : 'Account'}:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>
                          {method.account_number}
                        </span>
                      </div>
                    )}
                    {method.account_name && (
                      <div style={{ marginBottom: 6 }}>
                        <strong>👤 Account Name:</strong> {method.account_name}
                      </div>
                    )}
                    {method.bank_name && (
                      <div style={{ marginBottom: 6 }}>
                        <strong>🏦 Bank:</strong> {method.bank_name}{method.branch ? ` - ${method.branch}` : ''}
                      </div>
                    )}
                    {method.instructions && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: 12, 
                        background: 'var(--bg-card)',
                        borderRadius: 8,
                        fontSize: 13,
                        border: '1px dashed var(--border-primary)'
                      }}>
                        <strong>💡 Instructions:</strong>
                        <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>{method.instructions}</p>
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

      {/* Debug Button (Remove in production) */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button 
          onClick={fetchData}
          className="btn btn-sm btn-ghost"
          style={{ fontSize: 11 }}
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
}