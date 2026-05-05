import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function ComplaintsManager() {
  const { userProfile } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [responseInputs, setResponseInputs] = useState({});

  useEffect(() => { 
    fetchComplaints(); 
  }, []);

  async function fetchComplaints() {
    try {
      let { data: complaints, error } = await supabase
        .from('complaints')
        .select(`
          *,
          tenants (
            name, 
            house,
            admin_id
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Filter to show only this admin's tenant complaints
      const filteredComplaints = (complaints || []).filter(c => {
        return c.admin_id === userProfile.id || 
               c.tenants?.admin_id === userProfile.id;
      });
      
      setComplaints(filteredComplaints);
    } catch (error) { 
      console.error('Error fetching complaints:', error);
      toast.error('Failed to load complaints');
    } finally { 
      setLoading(false); 
    }
  }

  async function handleResolve(id) {
    const response = responseInputs[id]?.trim();
    
    if (!response) {
      toast.error('Please enter a response before resolving');
      return;
    }
    
    setResolvingId(id);
    
    try {
      console.log('Resolving complaint:', id, 'with response:', response);
      
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: 'Resolved', 
          response: response,
          resolved_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      toast.success('Complaint resolved successfully!');
      
      // Clear the input
      setResponseInputs(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      
      // Refresh the list
      await fetchComplaints();
    } catch (error) { 
      console.error('Error resolving complaint:', error);
      toast.error('Failed to resolve: ' + error.message);
    } finally { 
      setResolvingId(null);
    }
  }

  const handleResponseChange = (id, value) => {
    setResponseInputs(prev => ({ ...prev, [id]: value }));
  };

  if (loading) {
    return (
      <div className="card" style={{textAlign:'center', padding:40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>📋</div>
        <div>Loading complaints...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{marginBottom: 24}}>
        <h2 style={{margin: '0 0 8px 0', fontSize: 24}}>⚠️ Tenant Complaints</h2>
        <p style={{margin: 0, color: 'var(--gray)'}}>
          {complaints.filter(c => c.status !== 'Resolved').length} open complaint{complaints.filter(c => c.status !== 'Resolved').length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        {complaints.map(c => {
          const isResolved = c.status === 'Resolved';
          
          return (
            <div key={c.id} className="card" style={{
              borderLeft: isResolved ? '4px solid var(--green)' : '4px solid var(--amber)',
              padding: 20
            }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:12}}>
                <div>
                  <strong style={{fontSize: 16}}>{c.tenants?.name || 'Tenant'}</strong>
                  <span style={{color: 'var(--gray)', marginLeft: 8}}>
                    ({c.tenants?.house || 'Unit'})
                  </span>
                </div>
                <span className={`badge ${isResolved ? 'status-green' : 'status-amber'}`}>
                  {c.status}
                </span>
              </div>
              
              <div style={{marginBottom: 12}}>
                <p style={{margin: '4px 0', fontWeight: 600}}>{c.subject}:</p>
                <p style={{margin: '4px 0', color: 'var(--text)'}}>{c.message}</p>
              </div>
              
              <div style={{fontSize: 12, color: 'var(--gray)', marginBottom: 12}}>
                Submitted: {new Date(c.date || c.created_at).toLocaleString()}
              </div>
              
              {isResolved ? (
                <div style={{
                  padding: 12,
                  background: '#f0fff4',
                  borderRadius: 8,
                  border: '1px solid var(--green)'
                }}>
                  <p style={{margin: 0, fontWeight: 600, color: 'var(--green)'}}>
                    ✅ Resolved
                  </p>
                  {c.response && (
                    <p style={{margin: '8px 0 0 0', fontStyle: 'italic', color: 'var(--text)'}}>
                      <strong>Your Response:</strong> {c.response}
                    </p>
                  )}
                  {c.resolved_at && (
                    <p style={{margin: '4px 0 0 0', fontSize: 12, color: 'var(--gray)'}}>
                      Resolved at: {new Date(c.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{marginTop: 12}}>
                  <label style={{display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500}}>
                    Your Response:
                  </label>
                  <div style={{display:'flex', gap:8}}>
                    <input 
                      type="text" 
                      placeholder="Enter your response to the tenant..." 
                      value={responseInputs[c.id] || ''}
                      onChange={(e) => handleResponseChange(c.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleResolve(c.id);
                        }
                      }}
                      style={{
                        flex:1, 
                        padding: '10px 14px', 
                        borderRadius: 6, 
                        border:'1px solid var(--border)',
                        fontSize: 14
                      }} 
                    />
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleResolve(c.id)}
                      disabled={resolvingId === c.id || !(responseInputs[c.id]?.trim())}
                      style={{
                        padding: '10px 20px',
                        opacity: (resolvingId === c.id || !(responseInputs[c.id]?.trim())) ? 0.6 : 1,
                        cursor: (resolvingId === c.id || !(responseInputs[c.id]?.trim())) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {resolvingId === c.id ? 'Resolving...' : 'Resolve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {complaints.length === 0 && (
          <div className="card" style={{textAlign:'center', padding: 40}}>
            <div style={{fontSize: 48, marginBottom: 16}}>✅</div>
            <p style={{margin: 0, color: 'var(--gray)'}}>
              No complaints from your tenants. Great job!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}