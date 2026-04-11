import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const DEFAULT_TENANT_PASSWORD = 'tenant123'; // Default password for all new tenants

export default function ManageTenants() {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newTenantCredentials, setNewTenantCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property: '',
    house: '',
    rent: '',
    due_date: '',
    status: 'Active'
  });
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('name');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleBulkReminders = async () => {
    if (!window.confirm('Send rent reminders to all pending and overdue tenants?')) {
      return;
    }

    setSendingBulkReminders(true);
    try {
      const today = new Date();
      const tenantsNeedingReminders = tenants.filter(tenant => {
        if (tenant.status?.toLowerCase() === 'vacated') return false;
        
        const dueDate = tenant.due_date ? new Date(tenant.due_date) : null;
        const status = tenant.status?.toLowerCase();
        
        if (status === 'overdue' || (dueDate && dueDate < today)) {
          return true;
        }
        if (status === 'pending') {
          return true;
        }
        return false;
      });

      if (tenantsNeedingReminders.length === 0) {
        alert('No tenants require reminders at this time.');
        return;
      }

      const reminders = tenantsNeedingReminders.map(tenant => ({
        admin_id: userProfile.id,
        tenant_id: tenant.id,
        from_id: userProfile.id,
        to_id: tenant.id,
        from_name: userProfile.name,
        subject: 'Rent Payment Reminder',
        message: `Dear ${tenant.name},\n\nThis is a friendly reminder that your rent of KSh ${parseInt(tenant.rent).toLocaleString()} ${tenant.due_date ? `(due: ${new Date(tenant.due_date).toLocaleDateString()})` : ''} is ${tenant.status?.toLowerCase() === 'overdue' ? 'overdue' : 'pending'}.\n\nPlease make payment at your earliest convenience.\n\nThank you.`,
        date: new Date().toISOString(),
        read: false
      }));

      const { error } = await supabase
        .from('messages')
        .insert(reminders);

      if (error) throw error;

      alert(`✅ Rent reminders sent to ${tenantsNeedingReminders.length} tenant(s)`);
      
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Failed to send reminders. Please try again.');
    } finally {
      setSendingBulkReminders(false);
    }
  };

  const openAddModal = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      property: '',
      house: '',
      rent: '',
      due_date: '',
      status: 'Active'
    });
    setNewTenantCredentials(null);
    setShowModal(true);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      property: tenant.property || '',
      house: tenant.house || '',
      rent: tenant.rent || '',
      due_date: tenant.due_date ? tenant.due_date.split('T')[0] : '',
      status: tenant.status || 'Active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      if (editingTenant) {
        // Update existing tenant
        const { error } = await supabase
          .from('tenants')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            property: formData.property,
            house: formData.house,
            rent: parseFloat(formData.rent) || 0,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
            status: formData.status
          })
          .eq('id', editingTenant.id)
          .eq('admin_id', userProfile.id);

        if (error) throw error;
        alert('✅ Tenant updated successfully!');
        setShowModal(false);
      } else {
        // Check tenant limit
        const { data: adminData, error: limitError } = await supabase
          .from('admins')
          .select('tenant_limit')
          .eq('id', userProfile.id)
          .single();

        if (limitError) throw limitError;

        const currentTenantCount = tenants.length;
        const tenantLimit = adminData?.tenant_limit || 50;

        if (currentTenantCount >= tenantLimit) {
          alert(`❌ Tenant limit reached!\n\nYour limit is ${tenantLimit} tenants.\n\nContact Supreme Admin to increase your limit.`);
          setCreating(false);
          return;
        }

        // Create tenant in Supabase Auth with default password
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: DEFAULT_TENANT_PASSWORD,
          options: {
            data: {
              name: formData.name,
              role: 'tenant'
            }
          }
        });

        if (authError) {
          if (authError.message.includes('already been registered') || 
              authError.message.includes('User already registered')) {
            throw new Error('This email is already registered. Please use a different email or ask the tenant to use "Forgot Password".');
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Failed to create tenant account. Please try again.');
        }

        // Create tenant record in database
        const { data: newTenant, error: dbError } = await supabase
          .from('tenants')
          .insert({
            id: authData.user.id,
            admin_id: userProfile.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            property: formData.property,
            house: formData.house,
            rent: parseFloat(formData.rent) || 0,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
            status: formData.status,
            password_changed: false // Force password change on first login
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          // Try to rollback auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw dbError;
        }

        // Show credentials to admin
        setNewTenantCredentials({
          email: formData.email,
          password: DEFAULT_TENANT_PASSWORD,
          name: formData.name
        });
        setShowPasswordModal(true);
        setShowModal(false);
      }

      await fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert(`❌ Failed to save tenant:\n${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleVacate = async (tenant) => {
    if (!window.confirm(`Mark ${tenant.name} as vacated?\n\nThis will archive the tenant and free up the unit.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: 'Vacated' })
        .eq('id', tenant.id)
        .eq('admin_id', userProfile.id);

      if (error) throw error;
      await fetchTenants();
      alert('✅ Tenant marked as vacated');
    } catch (error) {
      console.error('Error vacating tenant:', error);
      alert('Failed to update tenant status.');
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setNewTenantCredentials(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'paid':
        return 'status-green';
      case 'pending':
        return 'status-amber';
      case 'overdue':
        return 'status-red';
      case 'vacated':
        return 'status-gray';
      default:
        return 'status-gray';
    }
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>⏳</div>
        <div>Loading tenants...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <h2 style={{margin: 0}}>👥 Manage Tenants</h2>
        <div style={{display: 'flex', gap: 12}}>
          <button 
            onClick={handleBulkReminders}
            disabled={sendingBulkReminders}
            className="btn"
            style={{
              background: '#f59e0b',
              color: 'white',
              padding: '10px 20px',
              opacity: sendingBulkReminders ? 0.6 : 1
            }}
          >
            {sendingBulkReminders ? 'Sending...' : '📧 Bulk Reminders'}
          </button>
          <button onClick={openAddModal} className="btn btn-primary">
            + New Tenant
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Name</th>
                <th style={{padding: '12px 8px'}}>Email</th>
                <th style={{padding: '12px 8px'}}>Property</th>
                <th style={{padding: '12px 8px'}}>Unit</th>
                <th style={{padding: '12px 8px'}}>Rent</th>
                <th style={{padding: '12px 8px'}}>Due Date</th>
                <th style={{padding: '12px 8px'}}>Status</th>
                <th style={{padding: '12px 8px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} style={{
                  borderBottom: '1px solid var(--border)',
                  opacity: tenant.status?.toLowerCase() === 'vacated' ? 0.5 : 1
                }}>
                  <td style={{padding: '12px 8px', fontWeight: 600}}>
                    {tenant.name}
                  </td>
                  <td style={{padding: '12px 8px', color: 'var(--gray)', fontSize: 13}}>
                    {tenant.email}
                  </td>
                  <td style={{padding: '12px 8px'}}>{tenant.property}</td>
                  <td style={{padding: '12px 8px'}}>{tenant.house}</td>
                  <td style={{padding: '12px 8px', fontWeight: 600}}>
                    KSh {parseInt(tenant.rent || 0).toLocaleString()}
                  </td>
                  <td style={{padding: '12px 8px', fontSize: 13}}>
                    {formatDate(tenant.due_date)}
                  </td>
                  <td style={{padding: '12px 8px'}}>
                    <span className={`badge ${getStatusColor(tenant.status)}`}>
                      {tenant.status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{padding: '12px 8px'}}>
                    {tenant.status?.toLowerCase() !== 'vacated' ? (
                      <>
                        <button 
                          onClick={() => openEditModal(tenant)}
                          className="btn btn-sm"
                          style={{marginRight: 8}}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleVacate(tenant)}
                          className="btn btn-sm"
                          style={{background: '#fee2e2', color: '#dc2626'}}
                        >
                          🏠 Vacate
                        </button>
                      </>
                    ) : (
                      <span style={{color: 'var(--gray)', fontSize: 13}}>Archived</span>
                    )}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="8" style={{padding: 40, textAlign: 'center', color: 'var(--gray)'}}>
                    No tenants yet. Click "New Tenant" to add your first tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card" style={{maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto', background: 'white'}}>
            <h3 style={{marginTop: 0}}>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Property *</label>
                  <input
                    type="text"
                    required
                    value={formData.property}
                    onChange={(e) => setFormData({...formData, property: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Unit/House *</label>
                  <input
                    type="text"
                    required
                    value={formData.house}
                    onChange={(e) => setFormData({...formData, house: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Rent (KSh) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.rent}
                    onChange={(e) => setFormData({...formData, rent: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600}}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    style={{width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14}}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : (editingTenant ? 'Update Tenant' : 'Create Tenant')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Credentials Modal */}
      {showPasswordModal && newTenantCredentials && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: 20
        }}>
          <div className="card" style={{maxWidth: 500, width: '100%', background: 'white', border: '3px solid #10b981'}}>
            <div style={{textAlign: 'center', marginBottom: 20}}>
              <div style={{fontSize: 48, marginBottom: 8}}>✅</div>
              <h3 style={{margin: 0, color: '#10b981'}}>Tenant Created Successfully!</h3>
            </div>

            <div style={{
              padding: 16,
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: 8,
              marginBottom: 20
            }}>
              <h4 style={{margin: '0 0 12px 0', color: '#92400e', fontSize: 14}}>📋 LOGIN CREDENTIALS</h4>
              <div style={{marginBottom: 12}}>
                <div style={{fontSize: 12, color: '#78350f', marginBottom: 2}}>Email:</div>
                <div style={{
                  padding: 8,
                  background: 'white',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  wordBreak: 'break-all'
                }}>
                  {newTenantCredentials.email}
                </div>
              </div>
              <div style={{marginBottom: 12}}>
                <div style={{fontSize: 12, color: '#78350f', marginBottom: 2}}>Temporary Password:</div>
                <div style={{
                  padding: 8,
                  background: 'white',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#dc2626',
                  letterSpacing: '2px'
                }}>
                  {newTenantCredentials.password}
                </div>
              </div>
              <div style={{
                padding: 8,
                background: '#fbbf24',
                borderRadius: 4,
                fontSize: 12,
                color: '#92400e',
                fontWeight: 600
              }}>
                ⚠️ IMPORTANT: Share these credentials with the tenant. They MUST change the password on first login!
              </div>
            </div>

            <div style={{
              padding: 12,
              background: '#eff6ff',
              borderRadius: 6,
              marginBottom: 20,
              fontSize: 13
            }}>
              <strong style={{color: '#1e40af'}}>📱 Instructions for Tenant:</strong>
              <ol style={{margin: '8px 0 0 0', paddingLeft: 20, color: '#1e3a8a'}}>
                <li>Login with the credentials above</li>
                <li>You will be forced to change password immediately</li>
                <li>Choose a strong, memorable password</li>
                <li>You can change it anytime in Settings</li>
              </ol>
            </div>

            <button 
              onClick={closePasswordModal}
              className="btn btn-primary"
              style={{width: '100%', padding: '12px'}}
            >
              Got it! Create Another Tenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}