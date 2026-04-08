import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantRequests() {
  const { userProfile } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (userProfile && userProfile.email) {
      console.log('📝 Requests: Loading for email:', userProfile.email);
      fetchTenantData();
    }
  }, [userProfile]);

  async function fetchTenantData() {
    try {
      console.log('🔍 Finding tenant by email:', userProfile.email);
      
      const tenantResult = await supabase
        .from('tenants')
        .select('id, admin_id, name')
        .eq('email', userProfile.email)
        .single();

      console.log('📦 Tenant query result:', tenantResult);
      
      const tenant = tenantResult.data;
      const error = tenantResult.error;

      if (error) {
        console.error('❌ Tenant fetch error:', error);
      }

      console.log('✅ Tenant found:', tenant);

      if (!tenant) {
        setLoading(false);
        return;
      }

      setTenantData(tenant);

      const requestsResult = await supabase
        .from('complaints')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      const requestsData = requestsResult.data;
      const requestsError = requestsResult.error;

      if (requestsError) console.error(requestsError);
      console.log('✅ Requests fetched:', requestsData);
      
      setRequests(requestsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tenantData) return;
    
    setSubmitting(true);
    setMsg('');

    try {
      const { error } = await supabase.from('complaints').insert({
        tenant_id: tenantData.id,
        admin_id: tenantData.admin_id,
        subject,
        message,
        status: 'Open'
      });

      if (error) throw error;

      setMsg('✅ Request submitted successfully!');
      setSubject('');
      setMessage('');
      setShowForm(false);
      fetchTenantData();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return 'var(--green)';
      case 'In Progress': return 'var(--amber)';
      default: return 'var(--red)';
    }
  };

  if (loading) return <div className="card" style={{textAlign:'center', padding:40}}>Loading requests...</div>;

  if (!tenantData) {
    return (
      <div className="card">
        <h2>⚠️ Tenant Profile Not Found</h2>
        <p>Email: {userProfile?.email}</p>
        <p>Please contact your admin.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:24}}>
        <h2 style={{margin:0}}>My Requests & Complaints</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{marginBottom:24, borderLeft:'4px solid var(--blue)'}}>
          <h3 style={{marginTop:0}}>Submit New Request</h3>
          <form onSubmit={handleSubmit}>
            <input 
              placeholder="Subject (e.g. Leaking Tap, Power Outage)" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              style={inputStyle} 
              required 
            />
            <textarea 
              placeholder="Describe the issue in detail..." 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              style={{...inputStyle, minHeight:100, marginTop:8}} 
              required 
            />
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{marginTop:12, width:'100%'}}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
          {msg && <p style={{marginTop:8, textAlign:'center', fontWeight:'bold', color: msg.includes('✅') ? 'var(--green)' : 'var(--red)'}}>{msg}</p>}
        </div>
      )}

      <div className="card" style={{padding:0}}>
        <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg)', borderBottom:'2px solid var(--border)'}}>
              <th style={{padding:12}}>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th>Admin Response</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan="4" style={{padding:24, textAlign:'center', color:'var(--gray)'}}>No requests submitted yet.</td></tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:12}}>
                    <strong>{r.subject}</strong>
                    <div style={{fontSize:12, color:'var(--gray)', marginTop:4}}>{r.message}</div>
                  </td>
                  <td>
                    <span className="badge" style={{background: getStatusColor(r.status), color: 'white'}}>{r.status}</span>
                  </td>
                  <td style={{fontSize:12, color:'var(--gray)'}}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td style={{fontSize:13}}>
                    {r.response ? <span style={{color:'var(--green)'}}>{r.response}</span> : <span style={{color:'var(--gray)', fontStyle:'italic'}}>Awaiting response...</span>}
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

const inputStyle = { padding:8, borderRadius:4, border:'1px solid var(--border)', width:'100%', background:'var(--bg)', color:'var(--text)' };