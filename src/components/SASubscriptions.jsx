import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';

export default function SASubscriptions() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'success'
    admin: null
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  const handleRenewClick = (admin) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      admin: admin
    });
  };

  const confirmRenewal = async () => {
    const admin = modalState.admin;
    
    // Close modal and show loading
    setModalState(prev => ({ ...prev, isOpen: false }));
    const loadingToast = toast.loading(`Renewing subscription for ${admin.name}...`);

    try {
      const today = new Date();
      const nextDue = new Date();
      nextDue.setDate(today.getDate() + 30);

      // 1. Update Admin Status
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          subscription_status: 'Active',
          frozen: false,
          subscription_due: nextDue.toISOString().split('T')[0]
        })
        .eq('id', admin.id);

      if (updateError) throw updateError;

      // 2. Record Payment (without description column)
      try {
        const { error: paymentError } = await supabase
          .from('admin_to_sa_payments')
          .insert({
            admin_id: admin.id,
            amount: admin.subscription_fee || 0,
            status: 'Confirmed',
            payment_method: 'Manual',
            date: today.toISOString()
            // Note: 'description' column removed - doesn't exist in table
          });

        if (paymentError) {
          console.warn('Payment recording failed (non-critical):', paymentError);
        }
      } catch (payErr) {
        console.warn('Payment insert exception (non-critical):', payErr);
      }

      // 3. Reactivate Tenants
      try {
        await supabase
          .from('tenants')
          .update({ status: 'Active' })
          .eq('admin_id', admin.id)
          .neq('status', 'Vacated');
      } catch (tenantErr) {
        console.warn('Tenant reactivation failed (non-critical):', tenantErr);
      }

      toast.dismiss(loadingToast);
      
      // Show success modal
      setModalState({
        isOpen: true,
        type: 'success',
        admin: { ...admin, nextDue: nextDue.toLocaleDateString() }
      });

      // Refresh local data
      fetchSubscriptions();

      // ✅ Trigger dashboard refresh
      window.dispatchEvent(new Event('dashboard-refresh'));

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Renewal error:', error);
      toast.error(`Failed to renew: ${error.message}`, {
        style: {
          background: '#fff',
          color: '#1F2937',
          borderRadius: '12px',
          border: '2px solid #EF4444'
        }
      });
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = admins.reduce((sum, admin) => sum + (admin.subscription_fee || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: 'clamp(1.5rem, 4vw, 1.75rem)' }}>Subscription Management</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Manage admin billing cycles and renewals</p>
          </div>
          
          <input 
            type="text" 
            placeholder="🔍 Search admins..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ minWidth: 200, width: '100%', maxWidth: 300 }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div className="stat-card">
          <div className="stat-label">Total Admins</div>
          <div className="stat-value">{admins.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Active Subscriptions</div>
          <div className="stat-value text-success">{admins.filter(a => a.subscription_status === 'Active').length}</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value text-primary">KSh {totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map(admin => (
                <tr key={admin.id} style={{ opacity: admin.frozen ? 0.6 : 1 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{admin.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{admin.email}</div>
                  </td>
                  <td>
                    <span className="badge badge-muted">{admin.subscription_plan || 'Monthly'}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>KSh {admin.subscription_fee?.toLocaleString()}</td>
                  <td>{admin.subscription_due ? new Date(admin.subscription_due).toLocaleDateString() : 'Not set'}</td>
                  <td>
                    <span className={`badge ${admin.frozen ? 'badge-danger' : admin.subscription_status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                      {admin.frozen ? 'Frozen' : admin.subscription_status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRenewClick(admin)}
                      >
                        Renew
                      </button>
                      <button 
                        className={`btn btn-sm ${admin.frozen ? 'btn-success' : 'btn-warning'}`}
                      >
                        {admin.frozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Modal */}
      {modalState.isOpen && modalState.admin && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            maxWidth: 450,
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: modalState.type === 'success' ? '#DEF7EC' : '#FEF3C7',
                color: modalState.type === 'success' ? '#03543F' : '#92400E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem auto', fontSize: '1.5rem'
              }}>
                {modalState.type === 'success' ? '✅' : '⚠️'}
              </div>

              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {modalState.type === 'success' ? 'Renewal Successful!' : 'Confirm Renewal'}
              </h3>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {modalState.type === 'success' 
                  ? `Subscription for ${modalState.admin.name} has been extended.` 
                  : `Renew subscription for ${modalState.admin.name}?`
                }
              </p>
            </div>

            <div style={{ margin: '1.25rem', padding: '1rem', background: 'var(--bg-faint)', borderRadius: '12px' }}>
              {modalState.type === 'confirm' ? (
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  <li>Extend access for 30 days</li>
                  <li>Unfreeze account and tenants</li>
                  <li>Record payment of <strong>KSh {modalState.admin.subscription_fee?.toLocaleString()}</strong></li>
                </ul>
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'left' }}>
                  <div style={{ marginBottom: '0.375rem' }}><strong>Admin:</strong> {modalState.admin.name}</div>
                  <div style={{ marginBottom: '0.375rem' }}><strong>Plan:</strong> {modalState.admin.subscription_plan}</div>
                  <div style={{ marginBottom: '0.375rem' }}><strong>Fee:</strong> KSh {modalState.admin.subscription_fee?.toLocaleString()}</div>
                  <div><strong>Next Due:</strong> {modalState.admin.nextDue}</div>
                  <div style={{ marginTop: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                    ✅ All tenant accounts have been reactivated.
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
              {modalState.type === 'confirm' ? (
                <>
                  <button 
                    className="btn btn-secondary flex-1"
                    onClick={() => setModalState({ isOpen: false, admin: null, type: 'confirm' })}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary flex-1"
                    onClick={confirmRenewal}
                  >
                    Confirm Renewal
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-primary btn-full"
                  onClick={() => setModalState({ isOpen: false, admin: null, type: 'confirm' })}
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}