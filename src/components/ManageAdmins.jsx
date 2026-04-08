import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function ManageAdmins() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', 
    tenant_limit: '50', plan: 'Monthly', fee: '2500', due: ''
  });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    const { data } = await supabase
      .from('admins')
      .select('id, name, email, phone, tenant_limit, subscription_status, frozen, is_supreme')
      .order('created_at', { ascending: false });
    
    if (data) setAdmins(data);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setMsg('');

    try {
      // 1. Create Auth User
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;
      if (!user) throw new Error("User creation failed");

      // 2. Insert into Admins Table
      const { error: dbError } = await supabase
        .from('admins')
        .insert({
          id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          tenant_limit: parseInt(formData.tenant_limit),
          subscription_plan: formData.plan,
          subscription_fee: `KSh ${formData.fee}`,
          subscription_due: formData.due || null,
          subscription_status: 'Active',
          is_supreme: false,
          frozen: false
        });

      if (dbError) throw dbError;

      setMsg('✅ Admin created successfully!');
      setFormData({ name: '', email: '', phone: '', password: '', tenant_limit: '50', plan: 'Monthly', fee: '2500', due: '' });
      setShowForm(false);
      fetchAdmins();
    } catch (error) {
      console.error(error);
      setMsg(`❌ Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleFreeze(id, isFrozen) {
    const { error } = await supabase
      .from('admins')
      .update({ frozen: !isFrozen })
      .eq('id', id);
    
    if (!error) {
      fetchAdmins();
      // Log activity (Optional)
      supabase.from('activity_log').insert({
        type: isFrozen ? 'UNFROZEN' : 'FROZEN',
        message: `Admin ${isFrozen ? 'unfrozen' : 'frozen'} by SA`
      });
    }
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
        <h2 style={{margin:0}}>Manage Admins</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Admin'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{marginBottom: 24, borderLeft: '4px solid var(--blue)'}}>
          <h3 style={{marginTop:0}}>Create New Property Admin</h3>
          <p style={{color:'var(--red)', fontSize:12}}>⚠️ Note: You must temporarily enable "Email Signups" in Supabase Auth settings for this to work from the browser.</p>
          
          <form onSubmit={handleCreate} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12}}>
            <input placeholder="Full Name" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required style={inputStyle} />
            <input type="email" placeholder="Email" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} required style={inputStyle} />
            <input type="password" placeholder="Password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})} required style={inputStyle} />
            <input placeholder="Phone (Optional)" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} style={inputStyle} />
            
            <div>
              <label style={{fontSize:12, display:'block', marginBottom:4}}>Tenant Limit</label>
              <input type="number" value={formData.tenant_limit} onChange={e=>setFormData({...formData, tenant_limit:e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:12, display:'block', marginBottom:4}}>Subscription Plan</label>
              <select value={formData.plan} onChange={e=>setFormData({...formData, plan:e.target.value})} style={inputStyle}>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            
            <div>
              <label style={{fontSize:12, display:'block', marginBottom:4}}>Subscription Fee (KSh)</label>
              <input type="number" value={formData.fee} onChange={e=>setFormData({...formData, fee:e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:12, display:'block', marginBottom:4}}>Due Date</label>
              <input type="date" value={formData.due} onChange={e=>setFormData({...formData, due:e.target.value})} style={inputStyle} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={creating} style={{gridColumn:'span 2', marginTop:8}}>
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
          {msg && <p style={{marginTop:12, textAlign:'center', fontWeight:'bold'}}>{msg}</p>}
        </div>
      )}

      {/* Admins List */}
      {loading ? <p>Loading...</p> : (
        <div className="card" style={{padding:0}}>
          <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg)', borderBottom:'2px solid var(--border)'}}>
                <th style={{padding:12}}>Name</th>
                <th>Email</th>
                <th>Limit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:12}}>
                    {admin.name} {admin.is_supreme && <span style={{fontSize:10, background:'var(--blue)', color:'white', padding:'2px 6px', borderRadius:4, marginLeft:8}}>SA</span>}
                  </td>
                  <td>{admin.email}</td>
                  <td>{admin.tenant_limit}</td>
                  <td>
                    <span className={`badge ${admin.frozen ? 'status-red' : 'status-green'}`}>
                      {admin.frozen ? 'FROZEN' : 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    {!admin.is_supreme && (
                      <button 
                        className="btn" 
                        style={{fontSize:12, padding:'4px 8px', background: admin.frozen ? 'var(--amber)' : 'var(--red)', color:'white'}}
                        onClick={() => toggleFreeze(admin.id, admin.frozen)}
                      >
                        {admin.frozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                    )}
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

const inputStyle = { padding:8, borderRadius:4, border:'1px solid var(--border)', width:'100%' };