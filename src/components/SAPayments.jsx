import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SAPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('admin_to_sa_payments')
        .select(`
          *,
          admins:name
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => `KSh ${parseFloat(amount).toLocaleString()}`;

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: 24}}>
        <h2 style={{margin: 0}}>💰 SA Payments</h2>
        <p style={{color: 'var(--gray)', margin: '4px 0 0 0'}}>Admin remittances to Supreme Admin</p>
      </div>

      <div className="grid" style={{marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Total Received</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--green)'}}>
            {formatCurrency(payments.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + parseFloat(p.amount), 0))}
          </p>
        </div>
        <div className="card">
          <h3 style={{margin: '0 0 8px 0', color: 'var(--gray)', fontSize: 14}}>Pending</h3>
          <p style={{fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--amber)'}}>
            {formatCurrency(payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0))}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{margin: '0 0 16px 0'}}>Recent Payments</h3>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: '12px 0'}}>Admin</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} style={{borderBottom: '1px solid var(--border)'}}>
                <td style={{padding: '12px 0'}}>{payment.admins || 'Unknown'}</td>
                <td>{formatCurrency(payment.amount)}</td>
                <td>{new Date(payment.date).toLocaleDateString()}</td>
                <td>{payment.method}</td>
                <td>{payment.reference}</td>
                <td>
                  <span className={`badge ${payment.status === 'Confirmed' ? 'status-green' : payment.status === 'Pending' ? 'status-amber' : 'status-red'}`}>
                    {payment.status}
                  </span>
                </td>
                <td>
                  {payment.status === 'Pending' && (
                    <button className="btn btn-sm btn-success">Confirm</button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                  No payments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}