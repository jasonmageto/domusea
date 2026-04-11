import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function ComplaintsManager() {
  const { userProfile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchComplaints(); }, []);

  async function fetchComplaints() {
    try {
      // 🎯 ISOLATION: Admin ONLY sees complaints from their own tenants
      const { data, error } = await supabase
        .from('complaints')
        .select(`*, tenants(name, house)`)
        .eq('admin_id', userProfile.id)
        .order('date', { ascending: false });
      if (error) throw error;
      setComplaints(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function handleResolve(id, response) {
    try {
      await supabase.from('complaints').update({ status: 'Resolved', response }).eq('id', id);
      fetchComplaints();
    } catch (error) { alert(`Error: ${error.message}`); }
  }

  if (loading) return <div className="card" style={{textAlign:'center', padding:40}}>Loading...</div>;

  return (
    <div>
      <h2 style={{marginBottom:16}}>⚠️ Tenant Complaints</h2>
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {complaints.map(c => (
          <div key={c.id} className="card">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
              <strong>{c.tenants?.name || 'Tenant'} ({c.tenants?.house || 'Unit'})</strong>
              <span className={`badge ${c.status === 'Resolved' ? 'status-green' : 'status-amber'}`}>{c.status}</span>
            </div>
            <p style={{margin:'4px 0'}}><strong>{c.subject}:</strong> {c.message}</p>
            {c.status === 'Open' && (
              <div style={{marginTop:8, display:'flex', gap:8}}>
                <input type="text" placeholder="Response..." id={`resp-${c.id}`} style={{flex:1, padding:8, borderRadius:4, border:'1px solid var(--border)'}} />
                <button className="btn btn-sm btn-success" onClick={() => handleResolve(c.id, document.getElementById(`resp-${c.id}`).value)}>Resolve</button>
              </div>
            )}
            {c.response && <p style={{marginTop:8, fontStyle:'italic', color:'var(--gray)'}}>Your Response: {c.response}</p>}
          </div>
        ))}
        {complaints.length === 0 && <p style={{color:'var(--gray)', textAlign:'center', padding:20}}>No complaints from your tenants.</p>}
      </div>
    </div>
  );
}