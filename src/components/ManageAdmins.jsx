import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function ManageAdmins() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    properties: '',
    tenant_limit: 50,
    subscription_plan: 'Monthly',
    base_fee: 2500,
    subscription_due: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate final fee based on plan and discount
  const calculateFinalFee = () => {
    const base = parseFloat(formData.base_fee) || 0;
    if (formData.subscription_plan === 'Annual') {
      // 15% discount for annual plans
      const annualFee = base * 12;
      const discount = annualFee * 0.15;
      return annualFee - discount;
    }
    return base;
  };

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setCreating(true);

    try {
      const finalFee = calculateFinalFee();

      // 1. Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            full_name: formData.name,
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Failed to create auth user');

      // 2. Create admin record in database
      const { error: dbError } = await supabase
        .from('admins')
        .insert({
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          properties: formData.properties || null,
          tenant_limit: parseInt(formData.tenant_limit),
          subscription_plan: formData.subscription_plan,
          subscription_fee: finalFee,
          subscription_due: formData.subscription_due || new Date().toISOString(),
          subscription_status: 'Active',
          frozen: false,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        // Rollback auth user if DB insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw dbError;
      }

      alert(`✅ Admin created successfully!\n\nPlan: ${formData.subscription_plan}\nFee: KSh ${finalFee.toLocaleString()}${formData.subscription_plan === 'Annual' ? ' (15% annual discount applied)' : ''}`);
      
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        properties: '',
        tenant_limit: 50,
        subscription_plan: 'Monthly',
        base_fee: 2500,
        subscription_due: ''
      });
      setShowCreateForm(false);
      fetchAdmins();

    } catch (error) {
      console.error('Error creating admin:', error);
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleFreezeAdmin(adminId, currentFrozenStatus) {
    const action = currentFrozenStatus ? 'Unfreeze' : 'Freeze';
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this admin? ${action === 'Freeze' ? 'All their tenants will also be blocked.' : 'All their tenants will regain access.'}`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .update({ 
          frozen: !currentFrozenStatus,
          subscription_status: !currentFrozenStatus ? 'Overdue' : 'Active'
        })
        .eq('id', adminId);

      if (error) throw error;
      alert(`✅ Admin ${action.toLowerCase()}d successfully!`);
      fetchAdmins();
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing admin:`, error);
      alert(`❌ Failed: ${error.message}`);
    }
  }

  const formatCurrency = (amount) => `KSh ${parseFloat(amount || 0).toLocaleString()}`;

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading admins...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>👥 Manage Admins</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ New Admin'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 20px 0'}}>Create New Admin Account</h3>
          <form onSubmit={handleCreateAdmin}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16}}>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Full Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Password *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={6} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Properties Managed</label>
                <input type="text" value={formData.properties} onChange={(e) => setFormData({...formData, properties: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Tenant Limit *</label>
                <input type="number" value={formData.tenant_limit} onChange={(e) => setFormData({...formData, tenant_limit: e.target.value})} required min={1} max={500} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              
              {/* Subscription Fields */}
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Subscription Plan *</label>
                <select value={formData.subscription_plan} onChange={(e) => setFormData({...formData, subscription_plan: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}}>
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual (15% Discount)</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>Monthly Base Fee (KSh) *</label>
                <input type="number" value={formData.base_fee} onChange={(e) => setFormData({...formData, base_fee: e.target.value})} required min={0} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14}}>First Due Date *</label>
                <input type="date" value={formData.subscription_due} onChange={(e) => setFormData({...formData, subscription_due: e.target.value})} required style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)'}} />
              </div>
            </div>

            {/* Fee Preview */}
            <div style={{padding: 12, background: formData.subscription_plan === 'Annual' ? '#dbeafe' : '#f3f4f6', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: 14, fontWeight: 500}}>
                {formData.subscription_plan === 'Annual' ? '📅 Annual Fee (15% off)' : '📅 Monthly Fee'}
              </span>
              <span style={{fontSize: 18, fontWeight: 700, color: 'var(--primary)'}}>
                {formatCurrency(calculateFinalFee())}
              </span>
            </div>

            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button type="button" className="btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 700}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Tenants</th>
                <th>Subscription</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{borderBottom: '1px solid var(--border)', opacity: admin.frozen ? 0.6 : 1}}>
                  <td style={{padding: '12px 8px', fontWeight: 500}}>{admin.name}</td>
                  <td style={{color: 'var(--gray)', fontSize: 13}}>{admin.email}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background: admin.subscription_plan === 'Annual' ? '#dbeafe' : '#f3f4f6',
                      color: admin.subscription_plan === 'Annual' ? '#1e40af' : '#374151'
                    }}>
                      {admin.subscription_plan}
                    </span>
                  </td>
                  <td style={{fontWeight: 600}}>{formatCurrency(admin.subscription_fee)}</td>
                  <td>
                    <div style={{width: '100%', maxWidth: 100, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 4}}>
                      <div style={{width: `${Math.min((admin.tenant_limit || 50) / 50 * 100, 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: 3}}></div>
                    </div>
                    <span style={{fontSize: 11, color: 'var(--gray)'}}>{admin.tenant_limit || 50} limit</span>
                  </td>
                  <td>
                    <span className={`badge ${admin.frozen ? 'status-red' : admin.subscription_status === 'Active' ? 'status-green' : 'status-amber'}`}>
                      {admin.frozen ? '❄️ Frozen' : admin.subscription_status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button 
                      className="btn btn-sm" 
                      style={{background: admin.frozen ? 'var(--green)' : 'var(--amber)', color: 'white', marginRight: 8}}
                      onClick={() => handleFreezeAdmin(admin.id, admin.frozen)}
                    >
                      {admin.frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="7" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                    No admins found. Click "+ New Admin" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}