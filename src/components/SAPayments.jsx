import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function SAPayments() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReceived: 0,
    pending: 0,
    confirmed: 0,
    thisMonth: 0
  });
  
  const now = new Date();

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
      calculateStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments]);

  async function fetchPayments() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_to_sa_payments')
        .select(`
          *,
          admins:admin_id (
            name,
            email
          )
        `)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw payments ', data);
      setPayments(data || []);

    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateStats = () => {
    console.log('Calculating stats for payments:', payments);
    
    const totalReceived = payments
      .filter(p => p.status === 'Confirmed')
      .reduce((sum, p) => {
        const amount = parseFloat(p.amount) || 0;
        return sum + amount;
      }, 0);
    
    const pending = payments
      .filter(p => p.status === 'Pending')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    const confirmed = payments.filter(p => p.status === 'Confirmed').length;
    
    const thisMonth = payments
      .filter(p => {
        const paymentDate = new Date(p.date);
        const isThisMonth = paymentDate.getMonth() === now.getMonth() && 
                           paymentDate.getFullYear() === now.getFullYear();
        return isThisMonth && p.status === 'Confirmed';
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const newStats = {
      totalReceived,
      pending,
      confirmed,
      thisMonth
    };

    console.log('Calculated stats:', newStats);
    setStats(newStats);
  };

  const handleConfirmPayment = async (payment) => {
    if (!window.confirm(`Confirm payment of ${formatCurrency(payment.amount)} from ${payment.admins?.name || 'Admin'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Confirmed',
          confirmed_by: userProfile?.id,
          confirmed_at: now.toISOString()
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Log activity (ignore errors if activity_log table doesn't exist or RLS blocks)
      await supabase
        .from('activity_log')
        .insert({
          type: 'payment_confirmed',
          message: `Supreme Admin confirmed payment of ${formatCurrency(payment.amount)}`,
          admin_id: payment.admin_id
        })
        .catch(err => console.error('Activity log error:', err));

      alert('✅ Payment confirmed successfully!');
      await fetchPayments();
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment. Please try again.');
    }
  };

  const handleRejectPayment = async (payment) => {
    const reason = window.prompt(`Reject payment of ${formatCurrency(payment.amount)}\n\nEnter reason for rejection:`);
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Rejected',
          confirmed_by: userProfile?.id,
          confirmed_at: now.toISOString(),
          note: reason
        })
        .eq('id', payment.id);

      if (error) throw error;

      alert('❌ Payment rejected');
      await fetchPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KSh ${num.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'status-green';
      case 'Pending':
        return 'status-amber';
      case 'Rejected':
        return 'status-red';
      default:
        return 'status-gray';
    }
  };

  if (loading) {
    return (
      <div className="card" style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>⏳</div>
        <div>Loading payments...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 24}}>
        <h2 style={{margin: 0}}>💰 SA Payments</h2>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Admin remittances to Supreme Admin</p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="card" style={{borderLeft: '4px solid #10b981', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4, fontWeight: 600}}>TOTAL RECEIVED</div>
          <div style={{fontSize: 32, fontWeight: 700, color: '#10b981'}}>{formatCurrency(stats.totalReceived)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>{stats.confirmed} payments confirmed</div>
        </div>
        
        <div className="card" style={{borderLeft: '4px solid #f59e0b', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4, fontWeight: 600}}>PENDING</div>
          <div style={{fontSize: 32, fontWeight: 700, color: '#f59e0b'}}>{formatCurrency(stats.pending)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>Awaiting confirmation</div>
        </div>
        
        <div className="card" style={{borderLeft: '4px solid #8b5cf6', padding: 16}}>
          <div style={{fontSize: 13, color: 'var(--gray)', marginBottom: 4, fontWeight: 600}}>THIS MONTH</div>
          <div style={{fontSize: 32, fontWeight: 700, color: '#8b5cf6'}}>{formatCurrency(stats.thisMonth)}</div>
          <div style={{fontSize: 12, color: 'var(--gray)', marginTop: 4}}>
            {now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Admin</th>
                <th style={{padding: '12px 8px'}}>Amount</th>
                <th style={{padding: '12px 8px'}}>Date</th>
                <th style={{padding: '12px 8px'}}>Method</th>
                <th style={{padding: '12px 8px'}}>Reference</th>
                <th style={{padding: '12px 8px'}}>Status</th>
                <th style={{padding: '12px 8px', textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 8px'}}>
                    <div style={{fontWeight: 600}}>{payment.admins?.name || 'Unknown Admin'}</div>
                    <div style={{fontSize: 12, color: 'var(--gray)'}}>{payment.admins?.email || ''}</div>
                  </td>
                  <td style={{padding: '12px 8px', fontWeight: 600}}>
                    {formatCurrency(payment.amount)}
                  </td>
                  <td style={{padding: '12px 8px', color: 'var(--gray)', fontSize: 13}}>
                    {formatDate(payment.date)}
                  </td>
                  <td style={{padding: '12px 8px'}}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      background: '#f3f4f6',
                      color: '#374151'
                    }}>
                      {payment.method || 'N/A'}
                    </span>
                  </td>
                  <td style={{padding: '12px 8px', fontSize: 13, color: 'var(--gray)', fontFamily: 'monospace'}}>
                    {payment.reference || 'N/A'}
                  </td>
                  <td style={{padding: '12px 8px'}}>
                    <span className={`badge ${getStatusBadgeClass(payment.status)}`} style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {payment.status || 'Pending'}
                    </span>
                  </td>
                  <td style={{padding: '12px 8px', textAlign: 'center'}}>
                    {payment.status === 'Pending' && (
                      <div style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleConfirmPayment(payment)}
                          style={{fontSize: 12, padding: '6px 12px'}}
                        >
                          Confirm
                        </button>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleRejectPayment(payment)}
                          style={{
                            fontSize: 12, 
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {payment.status === 'Confirmed' && (
                      <span style={{color: '#10b981', fontSize: 13, fontWeight: 600}}>✓ Confirmed</span>
                    )}
                    {payment.status === 'Rejected' && (
                      <span style={{color: '#ef4444', fontSize: 13, fontWeight: 600}}>✗ Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                    No payments recorded yet. Payments will appear here when admins submit remittances or renew subscriptions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{marginTop: 16, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, fontSize: 13, color: 'var(--text)'}}>
        <strong>💡 Note:</strong> All subscription renewals and admin payments are recorded here. Confirm pending payments to update revenue analytics.
      </div>
    </div>
  );
}