import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function AdminPaymentsManager() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) fetchPayments();
  }, [userProfile, filter]);

  async function fetchPayments() {
    let query = supabase
      .from('payments')
      .select(`
        id, amount, method, reference, status, date,
        tenants!payments_tenant_id_fkey (name, house)
      `)
      .eq('admin_id', userProfile.id)
      .order('date', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter === 'pending' ? 'Pending' : filter === 'confirmed' ? 'Confirmed' : 'Rejected');
    }

    const { data } = await query;
    setPayments(data || []);
    setLoading(false);
  }

  async function confirmPayment(id) {
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'Confirmed',
        confirmed_by: userProfile.id
      })
      .eq('id', id);

    if (!error) {
      const payment = payments.find(p => p.id === id);
      if (payment?.tenants) {
        await supabase.from('tenants').update({ status: 'good' }).eq('id', payment.tenant_id);
      }
      fetchPayments();
    }
  }

  async function rejectPayment(id) {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'Rejected' })
      .eq('id', id);

    if (!error) {
      const payment = payments.find(p => p.id === id);
      if (payment?.tenants) {
        await supabase.from('tenants').update({ status: 'overdue' }).eq('id', payment.tenant_id);
      }
      fetchPayments();
    }
  }

  const getStatusStyle = (status) => {
    if (status === 'Confirmed') return { background: 'var(--green)', color: 'white' };
    if (status === 'Pending') return { background: 'var(--amber)', color: 'white' };
    return { background: 'var(--red)', color: 'white' };
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'Pending').length,
    confirmed: payments.filter(p => p.status === 'Confirmed').length,
    rejected: payments.filter(p => p.status === 'Rejected').length
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading payments...</div>;

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Payment Management</h2>

      <div className="grid" style={{marginBottom: 24}}>
        <div className="card">
          <h3 style={{margin: '0 0 4px 0', fontSize: '14px', color: 'var(--gray)'}}>Total Payments</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0}}>{stats.total}</p>
        </div>
        <div className="card">
          <h3 style={{margin: '0 0 4px 0', fontSize: '14px', color: 'var(--gray)'}}>Pending Confirmation</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--amber)'}}>{stats.pending}</p>
        </div>
        <div className="card">
          <h3 style={{margin: '0 0 4px 0', fontSize: '14px', color: 'var(--gray)'}}>Confirmed</h3>
          <p style={{fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--green)'}}>{stats.confirmed}</p>
        </div>
      </div>

      <div className="card" style={{marginBottom: 16}}>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <button className={`btn ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`btn ${filter === 'pending' ? 'btn-primary' : ''}`} onClick={() => setFilter('pending')} style={filter !== 'pending' ? {background: 'var(--amber)', color: 'white'} : {}}>Pending</button>
          <button className={`btn ${filter === 'confirmed' ? 'btn-primary' : ''}`} onClick={() => setFilter('confirmed')} style={filter !== 'confirmed' ? {background: 'var(--green)', color: 'white'} : {}}>Confirmed</button>
        </div>
      </div>

      <div className="card" style={{padding: 0}}>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: 'var(--bg)', borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: 12}}>Tenant</th>
              <th>Amount</th>
              <th>Method</th>
              <th style={{minWidth: 120}}>Transaction Code</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan="7" style={{padding: 24, textAlign: 'center', color: 'var(--gray)'}}>No payments found.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: 12}}>
                    <strong>{p.tenants?.name || 'Unknown'}</strong>
                    <div style={{fontSize: 12, color: 'var(--gray)'}}>Unit {p.tenants?.house || '-'}</div>
                  </td>
                  <td style={{fontWeight: 600}}>KSh {p.amount}</td>
                  <td>{p.method}</td>
                  <td>
                    <span style={{
                      fontFamily: 'monospace', 
                      background: 'var(--bg)', 
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}>
                      {p.reference}
                    </span>
                  </td>
                  <td style={{fontSize: 12, color: 'var(--gray)'}}>{new Date(p.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge" style={getStatusStyle(p.status)}>{p.status}</span>
                  </td>
                  <td>
                    {p.status === 'Pending' && (
                      <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                        <button 
                          className="btn" 
                          style={{fontSize: 12, padding: '4px 8px', background: 'var(--green)', color: 'white'}}
                          onClick={() => confirmPayment(p.id)}
                        >
                          ✓ Verify & Confirm
                        </button>
                        <button 
                          className="btn" 
                          style={{fontSize: 12, padding: '4px 8px', background: 'var(--red)', color: 'white'}}
                          onClick={() => rejectPayment(p.id)}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                    {p.status !== 'Pending' && <span style={{fontSize: 12, color: 'var(--gray)'}}>-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}