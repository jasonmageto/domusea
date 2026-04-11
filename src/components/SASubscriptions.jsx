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

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('subscription_due', { ascending: true });
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
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
      await unfreezeAdminAndTenants(admin.id);

      // 3. Record the payment in admin_to_sa_payments
      const { error: paymentError } = await supabase
        .from('admin_to_sa_payments')
        .insert({
          admin_id: admin.id,
          amount: admin.subscription_fee,
          date: currentDate.toISOString(),
          method: 'Manual Renewal',
          reference: `SUB-${admin.id}-${Date.now()}`,
          note: `${admin.subscription_plan} subscription renewed`,
          status: 'Confirmed',
          confirmed_by: userProfile?.id
        });

      if (paymentError) throw paymentError;

      // 4. Refresh UI
      fetchSubscriptions();
      alert(`✅ Subscription renewed for ${admin.name}!\nNext due: ${nextDue.toLocaleDateString()}\n\nAll tenant accounts have been reactivated.`);

    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert(`❌ Failed to renew subscription: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading subscriptions...</div>;

  return (
    <div>
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
          style={{padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', width: 250}}
        />
      </div>

      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 800}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Admin</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{textAlign: 'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => {
                const isOverdue = admin.subscription_due && new Date(admin.subscription_due) < new Date() && admin.subscription_status !== 'Active';
                return (
                  <tr key={admin.id} style={{borderBottom: '1px solid var(--border)', background: admin.frozen ? 'rgba(239, 68, 68, 0.05)' : 'transparent'}}>
                    <td style={{padding: '12px 8px'}}>
                      <div style={{fontWeight: 600}}>{admin.name}</div>
                      {admin.frozen && <span style={{fontSize: 11, color: 'var(--red)'}}>❄️ Frozen</span>}
                    </td>
                    <td style={{color: 'var(--gray)', fontSize: 13}}>{admin.email}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        background: admin.subscription_plan === 'Annual' ? '#dbeafe' : '#f3f4f6',
                        color: admin.subscription_plan === 'Annual' ? '#1e40af' : '#374151'
                      }}>
                        {admin.subscription_plan}
                      </span>
                    </td>
                    <td style={{fontWeight: 600}}>{formatCurrency(admin.subscription_fee)}</td>
                    <td style={{color: isOverdue ? 'var(--red)' : 'var(--text)', fontWeight: isOverdue ? 600 : 400}}>
                      {admin.subscription_due ? new Date(admin.subscription_due).toLocaleDateString() : 'Not set'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(admin.subscription_status, admin.subscription_due)}`}>
                        {admin.subscription_status || 'Unknown'}
                      </span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleRenewSubscription(admin)}
                        disabled={processingId === admin.id}
                        style={{opacity: processingId === admin.id ? 0.6 : 1, cursor: processingId === admin.id ? 'not-allowed' : 'pointer'}}
                      >
                        {processingId === admin.id ? 'Renewing...' : 'Renew / Mark Paid'}
                      </button>
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
    </div>
  );
}