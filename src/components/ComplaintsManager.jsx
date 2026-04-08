import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function ComplaintsManager() {
  const { userProfile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('Open');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (userProfile?.id) fetchComplaints();
  }, [userProfile]);

  async function fetchComplaints() {
    // Fetch complaints with tenant details via FK join
    const {  data, error } = await supabase
      .from('complaints')
      .select(`
        id, subject, message, status, response, created_at,
        tenants!complaints_tenant_id_fkey (name, house)
      `)
      .eq('admin_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Complaint fetch error:', error);
    if (data) setComplaints(data);
    setLoading(false);
  }

  async function handleUpdate(id) {
    setUpdating(true);
    setMsg('');
    
    const { error } = await supabase
      .from('complaints')
      .update({
        status: newStatus,
        response: response.trim() || null
      })
      .eq('id', id);

    if (error) {
      setMsg(`❌ ${error.message}`);
    } else {
      setMsg('✅ Complaint updated successfully!');
      setResponse('');
      setSelectedId(null);
      fetchComplaints();
    }
    setUpdating(false);
  }

  const getStatusStyle = (status) => {
    const colors = { 'Open': 'var(--red)', 'In Progress': 'var(--amber)', 'Resolved': 'var(--green)' };
    return { background: colors[status] || 'var(--gray)', color: 'white' };
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading complaints...</div>;

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Complaints & Maintenance</h2>
      {msg && <div className="card" style={{marginBottom: 16, borderLeft: `4px solid ${msg.includes('✅') ? 'var(--green)' : 'var(--red)'}`}}>{msg}</div>}

      {/* Complaints List */}
      <div className="card" style={{padding: 0}}>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: 'var(--bg)', borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: 12}}>Tenant</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr><td colSpan="5" style={{padding: 24, textAlign: 'center', color: 'var(--gray)'}}>No complaints submitted yet.</td></tr>
            ) : (
              complaints.map(c => (
                <tr key={c.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: 12}}>
                    <strong>{c.tenants?.name || 'Unknown'}</strong>
                    <div style={{fontSize: 12, color: 'var(--gray)'}}>Unit {c.tenants?.house || '-'}</div>
                  </td>
                  <td style={{fontWeight: 500}}>{c.subject}</td>
                  <td>
                    <span className="badge" style={getStatusStyle(c.status)}>{c.status}</span>
                  </td>
                  <td style={{fontSize: 12, color: 'var(--gray)'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn" style={{fontSize: 12}} onClick={() => {
                      setSelectedId(c.id);
                      setResponse(c.response || '');
                      setNewStatus(c.status);
                    }}>
                      {selectedId === c.id ? 'Cancel' : 'Manage'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Response Form */}
      {selectedId && (
        <div className="card" style={{marginTop: 24, borderLeft: '4px solid var(--blue)'}}>
          <h3 style={{marginTop: 0}}>Respond to Complaint</h3>
          {complaints.find(c => c.id === selectedId)?.message && (
            <div style={{background: 'var(--bg)', padding: 12, borderRadius: 6, marginBottom: 12, border: '1px solid var(--border)', fontSize: 14}}>
              <strong>Original Message:</strong> {complaints.find(c => c.id === selectedId)?.message}
            </div>
          )}
          <textarea
            placeholder="Type your response or update notes here..."
            value={response}
            onChange={e => setResponse(e.target.value)}
            style={{...inputStyle, minHeight: 80, marginBottom: 12}}
          />
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={inputStyle}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <button className="btn btn-primary" onClick={() => handleUpdate(selectedId)} disabled={updating} style={{flex: 1}}>
              {updating ? 'Saving...' : 'Save & Update Status'}
            </button>
            <button className="btn" style={{background: 'var(--border)'}} onClick={() => setSelectedId(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: 8, borderRadius: 4, border: '1px solid var(--border)', width: '100%', background: 'var(--bg)', color: 'var(--text)' };