import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantPayRent() {
  const { userProfile } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    if (userProfile && userProfile.email) {
      fetchTenantProfile();
    }
  }, [userProfile]);

  async function fetchTenantProfile() {
    try {
      const tenantResult = await supabase
        .from('tenants')
        .select('*')
        .eq('email', userProfile.email)
        .single();

      const tData = tenantResult.data;
      if (tData) {
        setTenant(tData);
        const methodsResult = await supabase
          .from('admin_payment_methods')
          .select('*')
          .eq('admin_id', tData.admin_id)
          .eq('active', true);
        setMethods(methodsResult.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function copyCodeToClipboard() {
    if (paymentSuccess) {
      navigator.clipboard.writeText(paymentSuccess.reference);
      setMsg('✅ Code copied to clipboard!');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMethodId || !reference.trim()) {
      setMsg('❌ Please select a method and enter the Transaction Code.');
      return;
    }
    if (!tenant) return;

    setSubmitting(true);
    setMsg('');
    setPaymentSuccess(null);

    try {
      const selectedMethod = methods.find(m => m.id === selectedMethodId);
      
      const insertResult = await supabase.from('payments').insert({
        tenant_id: tenant.id,
        admin_id: tenant.admin_id,
        amount: tenant.rent,
        method: selectedMethod.type,
        reference: reference.trim(),
        status: 'Pending'
      });

      if (insertResult.error) throw insertResult.error;

      // Show success screen with code
      setPaymentSuccess({
        amount: tenant.rent,
        reference: reference.trim(),
        method: selectedMethod.type
      });
      setReference('');
      setSelectedMethodId('');
      
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!tenant) return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;

  // Success Screen
  if (paymentSuccess) {
    return (
      <div>
        <div className="card" style={{textAlign: 'center', border: '2px solid var(--green)'}}>
          <h2 style={{color: 'var(--green)'}}>✅ Payment Submitted!</h2>
          <p style={{marginBottom: 16}}>Your payment of <strong>KSh {paymentSuccess.amount}</strong> is pending confirmation.</p>
          
          <div style={{background: 'var(--bg)', padding: 16, borderRadius: 8, marginBottom: 16, display: 'inline-block'}}>
            <p style={{margin: 0, fontSize: 14, color: 'var(--gray)'}}>Transaction Code</p>
            <p style={{margin: '4px 0 0', fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 2}}>
              {paymentSuccess.reference}
            </p>
          </div>

          <div style={{display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20}}>
            <button className="btn btn-primary" onClick={copyCodeToClipboard}>
              📋 Copy Code
            </button>
            <button className="btn" onClick={() => setPaymentSuccess(null)}>
              Back
            </button>
          </div>
          
          <p style={{marginTop: 16, fontSize: 13, color: 'var(--gray)'}}>
            ⚠️ Please send this code to your Landlord/Admin to confirm your payment.
          </p>
          {msg && <p style={{color: 'var(--green)', fontWeight: 'bold', marginTop: 8}}>{msg}</p>}
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(tenant.due_date) - new Date()) / 86400000);
  const isUrgent = daysLeft <= 3 || daysLeft < 0;
  const themeColor = tenant.status === 'good' ? 'var(--green)' : tenant.status === 'pending' ? 'var(--amber)' : 'var(--red)';

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Pay Rent</h2>

      {isUrgent && (
        <div className="card" style={{marginBottom: 16, background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid var(--red)'}}>
          <p style={{margin:0, fontWeight:600, color:'var(--red)'}}>
            ⚠️ {daysLeft < 0 ? `Rent is OVERDUE by ${Math.abs(daysLeft)} days!` : `Rent is DUE in ${daysLeft} day(s).`}
          </p>
        </div>
      )}

      <div className="card" style={{marginBottom: 24, borderLeft: `4px solid ${themeColor}`}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h3 style={{margin:'0 0 4px 0'}}>Amount Due</h3>
            <p style={{margin:0, color:'var(--gray)'}}>Due: {new Date(tenant.due_date).toLocaleDateString()}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{margin:0, fontSize:32, fontWeight:700, color: themeColor}}>KSh {tenant.rent}</p>
            <p style={{margin:0, fontSize:12, color:'var(--gray)'}}>
              {daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days remaining`}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginTop:0}}>Submit Payment</h3>
        <p style={{fontSize: 13, color: 'var(--gray)', marginBottom: 16}}>
          Enter the <strong>Transaction Code</strong> you received from M-Pesa/Bank to complete this payment.
        </p>
        {methods.length === 0 ? (
          <p>No active payment methods available.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
              <select value={selectedMethodId} onChange={e=>setSelectedMethodId(e.target.value)} style={inputStyle} required>
                <option value="">Choose method...</option>
                {methods.map(m => <option key={m.id} value={m.id}>{m.type} ({m.holder || m.name})</option>)}
              </select>
              <input 
                placeholder="Transaction Code (e.g. QKH3...)" 
                value={reference} 
                onChange={e=>setReference(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>

            {selectedMethodId && (
              <div style={{background:'var(--bg)', padding:12, borderRadius:6, marginBottom:12, border:'1px solid var(--border)', fontSize:14}}>
                {(() => {
                  const m = methods.find(x => x.id === selectedMethodId);
                  if (!m) return null;
                  return (
                    <div>
                      {m.type === 'M-Pesa' && <p><strong>Send to:</strong> {m.number} (Name: {m.holder})</p>}
                      {m.type === 'Paybill' && <p><strong>Paybill:</strong> {m.paybill_number} | <strong>Account:</strong> {m.account_number}</p>}
                      {m.type === 'Bank Transfer' && <p><strong>Bank:</strong> {m.name} | <strong>Acc:</strong> {m.account_number}</p>}
                      {m.type === 'Airtel Money' && <p><strong>Send to:</strong> {m.number}</p>}
                      {m.details && m.type !== 'Cash' && <p style={{marginTop:4, color:'var(--gray)'}}>{m.details}</p>}
                    </div>
                  );
                })()}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting || methods.length === 0} style={{width:'100%', padding:'12px'}}>
              {submitting ? 'Submitting...' : 'Submit Payment'}
            </button>
          </form>
        )}
        {msg && <p style={{marginTop:12, textAlign:'center', fontWeight:'bold', color: 'var(--red)'}}>{msg}</p>}
      </div>
    </div>
  );
}

const inputStyle = { padding:10, borderRadius:6, border:'1px solid var(--border)', width:'100%', background:'var(--bg)', color:'var(--text)' };