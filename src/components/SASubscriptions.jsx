import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SASubscriptions() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); // Track which admin is being updated

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

  // Fix for NaN display: handles null/undefined/non-numeric values safely
  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 'KSh 0';
    return `KSh ${num.toLocaleString()}`;
  };

  const getStatusBadge = (status, dueDate) => {
    if (!dueDate) return <span className="badge status-amber">No Date</span>;
    
    const due = new Date(dueDate);
    const today = new Date();
    const isOverdue = due < today && status !== 'Active';
    
    if (isOverdue) return <span className="badge status-red">Overdue</span>;
    if (status === 'Active') return <span className="badge status-green">Active</span>;
    return <span className="badge status-amber">Pending</span>;
  };

  // Handle "Mark Paid" click
  const handleMarkPaid = async (admin) => {
    setProcessingId(admin.id);
    try {
      // Calculate next due date (add 1 month to current due date)
      const currentDue = admin.subscription_due ? new Date(admin.subscription_due) : new Date();
      const nextDue = new Date(currentDue);
      nextDue.setMonth(nextDue.getMonth() + 1);

      // Update the admin's subscription status and due date in Supabase
      const { error } = await supabase
        .from('admins')
        .update({
          subscription_status: 'Active',
          subscription_due: nextDue.toISOString()
        })
        .eq('id', admin.id);

      if (error) throw error;
      
      // Refresh the list to show updated data
      fetchSubscriptions();
      alert(`Subscription for ${admin.name} marked as paid! Next due: ${nextDue.toLocaleDateString()}`);
    } catch (error) {
      console.error('Error marking subscription as paid:', error);
      alert('Failed to update subscription. Check console for details.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>💳 Subscription Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => alert('To set a subscription plan, please edit the admin in the "Manage Admins" page during creation.')}
        >
          + New Subscription
        </button>
      </div>

      <div className="card">
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: '12px 0'}}>Admin Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Fee</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={{borderBottom: '1px solid var(--border)'}}>
                <td style={{padding: '12px 0'}}>{admin.name}</td>
                <td>{admin.email}</td>
                <td>{admin.subscription_plan || 'Monthly'}</td>
                <td>{formatCurrency(admin.subscription_fee)}</td>
                <td>{admin.subscription_due ? new Date(admin.subscription_due).toLocaleDateString() : '-'}</td>
                <td>{getStatusBadge(admin.subscription_status, admin.subscription_due)}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleMarkPaid(admin)}
                    disabled={processingId === admin.id}
                    style={{opacity: processingId === admin.id ? 0.7 : 1, cursor: processingId === admin.id ? 'not-allowed' : 'pointer'}}
                  >
                    {processingId === admin.id ? 'Updating...' : 'Mark Paid'}
                  </button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                  No subscriptions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}