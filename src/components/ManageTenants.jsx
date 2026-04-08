import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import emailjs from '@emailjs/browser';

// --- ⚙️ CONFIGURATION ---
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; 
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; 
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; 
const DEFAULT_PASSWORD = '12345678'; 
// ----------------------

export default function ManageTenants() {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    house: '', 
    rent: '', 
    due_date: '' 
  });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [limitInfo, setLimitInfo] = useState({ occupied: 0, limit: 50 });

  useEffect(() => {
    if (userProfile && userProfile.id) {
      fetchUnits();
    }
  }, [userProfile]);

  async function fetchUnits() {
    try {
      const adminResult = await supabase.from('admins').select('tenant_limit').eq('id', userProfile.id).single();
      const countResult = await supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('admin_id', userProfile.id);
      const tenantResult = await supabase.from('tenants').select('id, name, house, rent, status, due_date').eq('admin_id', userProfile.id).order('house');

      setLimitInfo({ occupied: countResult.count || 0, limit: adminResult.data ? adminResult.data.tenant_limit : 50 });
      if (tenantResult.data) setTenants(tenantResult.data);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    
    // Validate Email Format Strictly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMsg('❌ Please enter a valid email address (e.g., name@example.com)');
      return;
    }

    if (!userProfile?.id) {
      setMsg('❌ Admin not logged in. Please refresh.');
      return;
    }

    if (limitInfo.occupied >= limitInfo.limit) {
      setMsg('❌ Tenant limit reached!');
      return;
    }

    const isDuplicate = tenants.some(t => t.house.toLowerCase() === formData.house.toLowerCase());
    if (isDuplicate) {
      setMsg('❌ This unit is already occupied.');
      return;
    }

    setCreating(true);
    setMsg('');

    try {
      // 1. Check if email already exists in tenants
      const {  existing } = await supabase
        .from('tenants')
        .select('id, email')
        .eq('email', formData.email)
        .single();

      if (existing) {
        throw new Error('A tenant with this email already exists in the system.');
      }

      // 2. Create Auth User
      console.log('Creating user:', formData.email);
      const result = await supabase.auth.signUp({
        email: formData.email,
        password: DEFAULT_PASSWORD
      });

      console.log('Full SignUp Result:', result);

      // Check for errors in the result
      if (result.error) {
        console.error('Supabase Auth Error:', result.error);
        if (result.error.message.includes('already registered')) {
          throw new Error('This email is already registered.');
        }
        throw new Error(result.error.message);
      }

      // Get user from data
      const user = result.data?.user;
      
      if (!user) {
        console.error('No user in result.data:', result);
        throw new Error('User creation failed. Check console for details.');
      }

      console.log('✅ User created:', user.id);

      // 3. Insert into Tenants table
      const { error: insertError } = await supabase.from('tenants').insert({
        id: user.id,
        admin_id: userProfile.id,
        name: formData.name,
        email: formData.email,
        house: formData.house.toUpperCase(),
        rent: parseFloat(formData.rent),
        due_date: formData.due_date || null,
        status: 'good'
      });

      if (insertError) {
        console.error('DB Insert Error:', insertError);
        // Clean up: delete the auth user
        await supabase.auth.admin.deleteUser(user.id);
        throw new Error(insertError.message);
      }

      // 4. Send Email (Optional)
      let emailSent = false;
      try {
        if (EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID') {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_name: formData.name,
              to_email: formData.email,
              login_email: formData.email,
              temp_password: DEFAULT_PASSWORD,
              app_url: window.location.origin
            },
            EMAILJS_PUBLIC_KEY
          );
          emailSent = true;
        }
      } catch (emailError) {
        console.warn('Email failed:', emailError);
      }

      // Success!
      const successMsg = emailSent 
        ? `✅ Tenant created!\n\n📧 Email: ${formData.email}\n🔑 Password: ${DEFAULT_PASSWORD}\n\nCredentials emailed to tenant.`
        : `✅ Tenant created!\n\n📧 Email: ${formData.email}\n🔑 Password: ${DEFAULT_PASSWORD}\n\n⚠️ Share password with tenant.`;

      setMsg(successMsg);
      setFormData({ name: '', email: '', house: '', rent: '', due_date: '' });
      setShowForm(false);
      await fetchUnits();
      
    } catch (err) {
      console.error('💥 Error:', err);
      setMsg(`❌ ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, house) {
    if (window.confirm(`Delete tenant in unit ${house}?`)) {
      await supabase.from('tenants').delete().eq('id', id);
      fetchUnits();
    }
  }

  async function updateStatus(id, newStatus) {
    await supabase.from('tenants').update({ status: newStatus }).eq('id', id);
    fetchUnits();
  }

  const usagePercent = Math.min((limitInfo.occupied / limitInfo.limit) * 100, 100);
  const usageColor = usagePercent > 90 ? 'var(--red)' : usagePercent > 70 ? 'var(--amber)' : 'var(--green)';

  if (loading) return <div className="card" style={{textAlign:'center', padding:40}}>Loading units...</div>;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
        <h2 style={{margin:0}}>Manage Units & Tenants</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Assign Unit'}
        </button>
      </div>

      <div className="card" style={{marginBottom: 24}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 8}}>
          <span style={{fontWeight: 500}}>Assigned Units</span>
          <span style={{color: usageColor, fontWeight: 700}}>{limitInfo.occupied} / {limitInfo.limit}</span>
        </div>
        <div style={{height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${usagePercent}%`, background: usageColor, transition: 'width 0.3s'}} />
        </div>
      </div>

      {showForm && (
        <div className="card" style={{marginBottom: 24, borderLeft: '4px solid var(--blue)'}}>
          <h3 style={{marginTop:0}}>Assign New Unit</h3>
          <form onSubmit={handleCreate} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12}}>
            <input placeholder="Tenant Full Name" value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} required style={inputStyle} />
            <input type="email" placeholder="Tenant Email (must be valid)" value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} required style={inputStyle} />
            <input placeholder="Unit Number (e.g. A1)" value={formData.house} onChange={e => setFormData({...formData, house:e.target.value})} required style={inputStyle} />
            <input type="number" placeholder="Rent (KSh)" value={formData.rent} onChange={e => setFormData({...formData, rent:e.target.value})} required style={inputStyle} />
            <div style={{gridColumn: 'span 2'}}>
              <label style={{fontSize:12, display:'block', marginBottom:4}}>Rent Due Date</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date:e.target.value})} style={inputStyle} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{gridColumn:'span 2', marginTop:8}}>
              {creating ? 'Creating...' : 'Assign Unit & Send Email'}
            </button>
          </form>
          {msg && (
            <div style={{marginTop: 12, padding: 12, borderRadius: 6, background: msg.includes('✅') ? '#d1fae5' : '#fee2e2', border: `1px solid ${msg.includes('✅') ? '#10b981' : '#ef4444'}`, whiteSpace: 'pre-line'}}>
              <p style={{margin: 0, fontWeight: 'bold', color: msg.includes('✅') ? '#065f46' : '#991b1b'}}>{msg}</p>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{padding:0}}>
        <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg)', borderBottom:'2px solid var(--border)'}}>
              <th style={{padding:12}}>Unit</th>
              <th>Tenant</th>
              <th>Rent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr><td colSpan="5" style={{padding:24, textAlign:'center', color:'var(--gray)'}}>No units assigned.</td></tr>
            ) : (
              tenants.map(t => (
                <tr key={t.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:12, fontWeight: 700, fontFamily: 'monospace'}}>{t.house}</td>
                  <td>{t.name}</td>
                  <td>KSh {t.rent}</td>
                  <td>
                    <span className={`badge ${t.status === 'good' ? 'status-green' : 'status-amber'}`}>{t.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(t.id, t.house)} style={{padding: '4px 8px', fontSize: '12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px'}}>Delete</button>
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

const inputStyle = { padding:8, borderRadius:4, border:'1px solid var(--border)', width:'100%', background: 'var(--bg)', color: 'var(--text)' };