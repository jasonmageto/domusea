import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantPaymentHistory() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile && userProfile.email) {
      console.log('💳 Payment History: Loading for email:', userProfile.email);
      fetchPayments();
    }
  }, [userProfile]);

  async function fetchPayments() {
    try {
      // 1. First find the tenant record
      const tenantResult = await supabase
        .from('tenants')
        .select('id')
        .eq('email', userProfile.email)
        .single();

      console.log('📦 Tenant query result:', tenantResult);
      
      const tenant = tenantResult.data;
      const tenantError = tenantResult.error;

      if (tenantError) {
        console.error('❌ Error finding tenant:', tenantError);
        setLoading(false);
        return;
      }

      console.log('✅ Tenant found:', tenant);
      const tenantId = tenant?.id;

      if (!tenantId) {
        console.error('❌ No tenant ID found');
        setLoading(false);
        return;
      }

      // 2. Fetch payments for this tenant
      console.log('🔍 Fetching payments for tenant_id:', tenantId);
      
      const paymentsResult = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      const paymentsData = paymentsResult.data;
      const paymentsError = paymentsResult.error;

      if (paymentsError) {
        console.error('❌ Error fetching payments:', paymentsError);
      }

      console.log('✅ Payments fetched:', paymentsData);
      console.log('📊 Number of payments:', paymentsData?.length);
      
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('💥 Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusStyle = (status) => {
    if (status === 'Confirmed') return { background: 'var(--green)', color: 'white' };
    if (status === 'Pending') return { background: 'var(--amber)', color: 'white' };
    return { background: 'var(--red)', color: 'white' };
  };

  if (loading) {
    return <div className="card" style={{textAlign:'center', padding:40}}>Loading payment history...</div>;
  }

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Payment History</h2>
      
      {payments.length === 0 ? (
        <div className="card" style={{textAlign: 'center', padding: 40}}>
          <p style={{color: 'var(--gray)', fontSize: 16}}>No payments recorded yet.</p>
        </div>
      ) : (
        <div className="card" style={{padding:0}}>
          <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg)', borderBottom:'2px solid var(--border)'}}>
                <th style={{padding:12}}>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:12}}>{new Date(p.date).toLocaleDateString()}</td>
                  <td style={{fontWeight: 600}}>KSh {p.amount}</td>
                  <td>{p.method}</td>
                  <td style={{fontFamily:'monospace', fontSize: 12}}>{p.reference}</td>
                  <td>
                    <span className="badge" style={getStatusStyle(p.status)}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}