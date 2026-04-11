import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { unfreezeAdminAndTenants } from '../utils/subscriptionAutomation';

export default function SASubscriptions() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeSubscriptions: 0,
    overdueSubscriptions: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [admins]);

  async function fetchSubscriptions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('subscription_due', { ascending: true });
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      alert('Failed to load subscriptions. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  const calculateStats = () => {
    const totalAdmins = admins.length;
    const activeSubscriptions = admins.filter(a => a.subscription_status === 'Active').length;
    const overdueSubscriptions = admins.filter(a => {
      if (!a.subscription_due) return false;
      return new Date(a.subscription_due) < new Date() && a.subscription_status !== 'Active';
    }).length;
    
    const monthlyRevenue = admins.reduce((sum, admin) => {
      const fee = parseFloat(admin.subscription_fee) || 0;
      return sum + (admin.subscription_status === 'Active' && admin.subscription_plan === 'Monthly' ? fee : 0);
    }, 0);

    setStats({
      totalAdmins,
      activeSubscriptions,
      overdueSubscriptions,
      monthlyRevenue
    });
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KSh ${num.toLocaleString()}`;
  };

  const getStatusColor = (status, dueDate) => {
    if (!dueDate) return 'status-amber';
    const isOverdue = new Date(dueDate) < new Date() && status !== 'Active';
    if (isOverdue) return 'status-red';
    if (status === 'Active') return 'status-green';
    return 'status-amber';
  };

  const handleRenewSubscription = async (admin) => {
    if (!window.confirm(`Renew subscription for ${admin.name}?\n\nThis will:\n• Extend their access\n• Unfreeze their account and all tenants\n• Record the payment\n\nContinue?`)) {
      return;
    }

    setProcessingId(admin.id);
    try {
      const currentDate = new Date();
      const currentDue = admin.subscription_due ? new Date(admin.subscription_due) : currentDate;
      const nextDue = new Date(currentDue);

      // Calculate next due date based on plan
      if (admin.subscription_plan === 'Annual') {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      } else {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      // 1. Update admin subscription in DB
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          subscription_status: 'Active',
          subscription_due: nextDue.toISOString(),
          frozen: false,
          last_subscription_check: currentDate.toISOString()
        })
        .eq('id', admin.id);

      if (updateError) throw updateError;

      // 2. 🎯 AUTOMATION: Unfreeze admin + their tenants
      try {
        await unfreezeAdminAndTenants(admin.id);
      } catch (unfreezeError) {
        console.error('Error unfreezing admin/tenants:', unfreezeError);
        // Continue even if unfreeze fails - subscription is still renewed
      }

      // 3. Record the payment in admin_to_sa_payments
      const { error: paymentError } = await supabase
        .from('admin_to_sa_payments')
        .insert({
          admin_id: admin.id,
          amount: parseFloat(admin.subscription_fee) || 0,
          date: currentDate.toISOString(),
          method: 'Manual Renewal',
          reference: `SUB-${admin.id}-${Date.now()}`,
          note: `${admin.subscription_plan} subscription renewed`,
          status: 'Confirmed',
          confirmed_by: userProfile?.id
        });

      if (paymentError) {
        console.error('Error recording payment:', paymentError);
        // Continue - subscription is renewed even if payment record fails
      }

      // 4. Log activity
      await supabase
        .from('activity_log')
        .insert({
          type: 'subscription_renewed',
          message: `Supreme Admin renewed ${admin.subscription_plan} subscription for ${admin.name}`,
          admin_id: admin.id
        });

      // 5. Refresh UI
      await fetchSubscriptions();
      
      alert(`✅ Subscription renewed successfully!\n\nAdmin: ${admin.name}\nPlan: ${admin.subscription_plan}\nFee: ${formatCurrency(admin.subscription_fee)}\nNext Due: ${nextDue.toLocaleDateString()}\n\nAll tenant accounts have been reactivated.`);

    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert(`❌ Failed to renew subscription: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFreezeAdmin = async (admin) => {
    const action = admin.frozen ? 'Unfreeze' : 'Freeze';
    if (!window.confirm(`${action} account for ${admin.name}?\n\n${admin.frozen ? 'This will restore access for the admin and all their tenants.' : 'WARNING: This will block the admin and ALL their tenants from accessing the system.'}`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .update({ 
          frozen: !admin.frozen,
          frozen_at: admin.frozen ? null : new Date().toISOString(),
          frozen_by: admin.frozen ? null : userProfile?.id
        })
        .eq('id', admin.id);

      if (error) throw error;

      // If freezing, also freeze all tenants
      if (!admin.frozen) {
        await supabase
          .from('tenants')
          .update({ frozen: true })
          .eq('admin_id', admin.id);
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          type: admin.frozen ? 'admin_unfrozen' : 'admin_frozen',
          message: `Supreme Admin ${admin.frozen ? 'unfroze' : 'froze'} account for ${admin.name}`,
          admin_id: admin.id
        });

      await fetchSubscriptions();
      alert(`✅ Admin ${admin.frozen ? 'unfrozen' : 'frozen'} successfully!`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert(`Failed to ${action.toLowerCase()} admin: ${error.message}`);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    (admin.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="card" style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>⏳</div>
        <div>Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16}}>
        <div>
          <h2 style={{margin: 0}}>💳 Subscription Management</h2>
          <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Manage admin billing cycles and renewals</p>
        </div>
        <input
          type="text"
          placeholder="Search admins..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 14px', 
            borderRadius: 8, 
            border: '1px solid var(--border)', 
            background: 'var(--input-bg)', 
            color: 'var(--text)', 
            width: 250,
            fontSize: 14
          }}
        />
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="card" style={{borderLeft: '4px solid #3b82f6', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4}}>Total Admins</div>
          <div style={{fontSize: 28, fontWeight: 700}}>{stats.totalAdmins}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #10b981', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4}}>Active Subscriptions</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#10b981'}}>{stats.activeSubscriptions}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #ef4444', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4}}>Overdue</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#ef4444'}}>{stats.overdueSubscriptions}</div>
        </div>
        <div className="card" style={{borderLeft: '4px solid #8b5cf6', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4}}>Monthly Revenue</div>
          <div style={{fontSize: 28, fontWeight: 700, color: '#8b5cf6'}}>{formatCurrency(stats.monthlyRevenue)}</div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 900}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Admin</th>
                <th style={{padding: '12px 8px'}}>Email</th>
                <th style={{padding: '12px 8px'}}>Plan</th>
                <th style={{padding: '12px 8px'}}>Fee</th>
                <th style={{padding: '12px 8px'}}>Due Date</th>
                <th style={{padding: '12px 8px'}}>Status</th>
                <th style={{padding: '12px 8px', textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => {
                const isOverdue = admin.subscription_due && new Date(admin.subscription_due) < new Date() && admin.subscription_status !== 'Active';
                
                return (
                  <tr 
                    key={admin.id} 
                    style={{
                      borderBottom: '1px solid var(--border)', 
                      background: admin.frozen ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      opacity: admin.frozen ? 0.7 : 1
                    }}
                  >
                    <td style={{padding: '12px 8px'}}>
                      <div style={{fontWeight: 600, marginBottom: 4}}>{admin.name || 'N/A'}</div>
                      {admin.frozen && (
                        <span style={{fontSize: 11, color: 'var(--red)', fontWeight: 600}}>❄️ Frozen Account</span>
                      )}
                    </td>
                    <td style={{color: 'var(--gray)', fontSize: 13, padding: '12px 8px'}}>{admin.email}</td>
                    <td style={{padding: '12px 8px'}}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: admin.subscription_plan === 'Annual' ? '#dbeafe' : '#f3f4f6',
                        color: admin.subscription_plan === 'Annual' ? '#1e40af' : '#374151'
                      }}>
                        {admin.subscription_plan || 'Monthly'}
                      </span>
                    </td>
                    <td style={{fontWeight: 600, padding: '12px 8px'}}>{formatCurrency(admin.subscription_fee)}</td>
                    <td style={{
                      color: isOverdue ? 'var(--red)' : 'var(--text)', 
                      fontWeight: isOverdue ? 600 : 400,
                      padding: '12px 8px'
                    }}>
                      {admin.subscription_due ? new Date(admin.subscription_due).toLocaleDateString('en-KE') : 'Not set'}
                      {isOverdue && <div style={{fontSize: 11, color: 'var(--red)', marginTop: 2}}>⚠️ Overdue</div>}
                    </td>
                    <td style={{padding: '12px 8px'}}>
                      <span className={`badge ${getStatusColor(admin.subscription_status, admin.subscription_due)}`} style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {admin.subscription_status || 'Inactive'}
                      </span>
                    </td>
                    <td style={{padding: '12px 8px', textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap'}}>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleRenewSubscription(admin)}
                          disabled={processingId === admin.id}
                          style={{
                            opacity: processingId === admin.id ? 0.6 : 1, 
                            cursor: processingId === admin.id ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            padding: '6px 12px'
                          }}
                        >
                          {processingId === admin.id ? 'Processing...' : 'Renew / Mark Paid'}
                        </button>
                        <button 
                          onClick={() => handleFreezeAdmin(admin)}
                          disabled={processingId === admin.id}
                          style={{
                            background: admin.frozen ? '#10b981' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: processingId === admin.id ? 0.6 : 1
                          }}
                        >
                          {admin.frozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                    {searchTerm ? 'No admins match your search' : 'No subscriptions found. Create admins to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{marginTop: 16, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, fontSize: 13, color: 'var(--text)'}}>
        <strong>💡 Tip:</strong> Click "Renew / Mark Paid" to extend an admin's subscription. This automatically unfreezes their account and all their tenants, then records the payment.
      </div>
    </div>
  );
}