import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function ManageTenants() {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    house: '',
    property: '',
    rent: '',
    due_date: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant(e) {
    e.preventDefault();
    setCreating(true);

    try {
      // Generate temporary password (8 characters)
      const tempPassword = Math.random().toString(36).slice(-8);

      // ✅ STEP 1: Create Supabase Auth user FIRST
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: { 
            full_name: formData.full_name,
            role: 'tenant'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData?.user) {
        throw new Error('No user returned from signup');
      }

      console.log('✅ Auth user created:', authData.user.id);

      // ✅ STEP 2: Insert tenant record WITH the auth user ID
      const { error: dbError } = await supabase
        .from('tenants')
        .insert({
          id: authData.user.id, // 🔑 CRITICAL: Link auth ID to tenant table
          admin_id: userProfile.id,
          name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          house: formData.house,
          property: formData.property,
          rent: parseFloat(formData.rent),
          due_date: formData.due_date,
          status: 'Active'
        });

      if (dbError) {
        console.error('DB error:', dbError);
        // Rollback: Delete auth user if DB insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to save tenant: ${dbError.message}`);
      }

      console.log('✅ Tenant record created in database');

      // ✅ STEP 3: Show credentials to admin
      alert(`✅ Tenant created successfully!\n\n📧 Email: ${formData.email}\n🔑 Temporary Password: ${tempPassword}\n\n⚠️ SAVE THESE CREDENTIALS and share with the tenant. They can log in immediately.`);

      // Reset form
      setFormData({ 
        full_name: '', 
        email: '', 
        phone: '', 
        house: '', 
        property: '', 
        rent: '', 
        due_date: '' 
      });
      setShowCreateForm(false);
      fetchTenants();

    } catch (error) {
      console.error('❌ Error creating tenant:', error);
      alert(`❌ Failed to create tenant: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleVacateTenant(tenant) {
    if (!window.confirm(`⚠️ Vacate ${tenant.name} from Unit ${tenant.house}?`)) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: 'Vacated' })
        .eq('id', tenant.id);

      if (error) throw error;
      alert(`✅ ${tenant.name} vacated. Unit ${tenant.house} is now available.`);
      fetchTenants();
    } catch (error) {
      alert(`❌ Failed: ${error.message}`);
    }
  }

  const formatCurrency = (amount) => `KSh ${parseFloat(amount).toLocaleString()}`;

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>👥 Manage Tenants</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ New Tenant'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 20px 0'}}>Create New Tenant Account</h3>
          <form onSubmit={handleCreateTenant}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Full Name *</label>
                <input 
                  type="text" 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                  required 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Email *</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Phone (Optional)</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Property *</label>
                <input 
                  type="text" 
                  value={formData.property} 
                  onChange={(e) => setFormData({...formData, property: e.target.value})} 
                  required 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>House/Unit *</label>
                <input 
                  type="text" 
                  value={formData.house} 
                  onChange={(e) => setFormData({...formData, house: e.target.value})} 
                  required 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Monthly Rent (KSh) *</label>
                <input 
                  type="number" 
                  value={formData.rent} 
                  onChange={(e) => setFormData({...formData, rent: e.target.value})} 
                  required 
                  min={0} 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Rent Due Date *</label>
                <input 
                  type="date" 
                  value={formData.due_date} 
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                  required 
                  style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} 
                />
              </div>
            </div>

            <div style={{padding: '12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, marginBottom: 16}}>
              <p style={{margin: 0, fontSize: 13, color: '#92400e'}}>
                🔐 <strong>Auto-generated password</strong> will be shown after creation. Tenant can log in immediately.
              </p>
            </div>

            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button type="button" className="btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '2px solid var(--border)'}}>
              <th style={{padding: '12px 0'}}>Name</th>
              <th>Email</th>
              <th>Property</th>
              <th>Unit</th>
              <th>Rent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} style={{borderBottom: '1px solid var(--border)', opacity: tenant.status === 'Vacated' ? 0.6 : 1}}>
                <td style={{padding: '12px 0'}}>{tenant.name}</td>
                <td>{tenant.email}</td>
                <td>{tenant.property}</td>
                <td>{tenant.house}</td>
                <td>{formatCurrency(tenant.rent)}</td>
                <td>
                  <span className={`badge ${tenant.status === 'Active' ? 'status-green' : 'status-grey'}`}>
                    {tenant.status}
                  </span>
                </td>
                <td>
                  {tenant.status === 'Active' && (
                    <button 
                      className="btn btn-sm" 
                      style={{background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca'}}
                      onClick={() => handleVacateTenant(tenant)}
                    >
                      🏠 Vacate
                    </button>
                  )}
                  {tenant.status === 'Vacated' && <span style={{fontSize: 12, color: 'var(--gray)'}}>Archived</span>}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                  No tenants yet. Click "+ New Tenant" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}