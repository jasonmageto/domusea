import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function TenantRequests() {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '', type: 'complaint' });

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenant_id', userProfile.id)
        .order('date', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // 🎯 ROUTING: Complaint goes ONLY to the tenant's assigned admin
      const { error } = await supabase.from('complaints').insert({
        tenant_id: userProfile.id,
        admin_id: userProfile.admin_id, // Critical: ensures it never goes to SA
        subject: form.subject,
        message: form.message,
        type: form.type,
        date: new Date().toISOString(),
        status: 'Open'
      });
      if (error) throw error;
      setForm({ subject: '', message: '', type: 'complaint' });
      fetchRequests();
      alert('✅ Request submitted to your Property Admin.');
    } catch (error) { alert(`❌ ${error.message}`); }
  }

  if (loading) return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;

  return (
    <div>
      <h2 style={{marginBottom:16}}>📝 Submit Request / Complaint</h2>
      <form onSubmit={handleSubmit} className="card" style={{marginBottom:24}}>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{width:'100%', padding:10, marginBottom:12, borderRadius:4, border:'1px solid var(--border)'}}>
          <option value="complaint">Complaint</option>
          <option value="maintenance">Maintenance Request</option>
        </select>
        <input type="text" placeholder="Subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required style={{width:'100%', padding:10, marginBottom:12, borderRadius:4, border:'1px solid var(--border)'}} />
        <textarea placeholder="Describe the issue..." value={form.message} onChange={e => setForm({...form, message: e.target.value})} required style={{width:'100%', padding:10, minHeight:100, marginBottom:12, borderRadius:4, border:'1px solid var(--border)'}} />
        <button type="submit" className="btn btn-primary">Submit to Admin</button>
      </form>

      <h3 style={{marginBottom:12}}>My History</h3>
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {requests.map(r => (
          <div key={r.id} className="card" style={{borderLeft: `4px solid ${r.status === 'Resolved' ? 'var(--green)' : 'var(--amber)'}`}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><strong>{r.subject}</strong><span style={{fontSize:12, color:'var(--gray)'}}>{new Date(r.date).toLocaleDateString()}</span></div>
            <p style={{margin:'8px 0'}}>{r.message}</p>
            <span className={`badge ${r.status === 'Resolved' ? 'status-green' : 'status-amber'}`}>{r.status}</span>
            {r.response && <p style={{marginTop:8, fontStyle:'italic', color:'var(--gray)'}}>Admin: {r.response}</p>}
          </div>
        ))}
        {requests.length === 0 && <p style={{color:'var(--gray)'}}>No requests yet.</p>}
      </div>
    </div>
  );
}