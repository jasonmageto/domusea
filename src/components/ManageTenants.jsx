import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { exportToPDF } from '../utils/pdfExport';

const DEFAULT_TENANT_PASSWORD = 'tenant123';

export default function ManageTenants() {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newTenantCredentials, setNewTenantCredentials] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', property: '', house: '',
    rent: '', due_date: '', status: 'Active'
  });
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    let result = [...tenants];
    if (statusFilter === 'active') {
      result = result.filter(t => t.status?.toLowerCase() !== 'vacated');
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(tenant => 
        tenant.name?.toLowerCase().includes(term) ||
        tenant.email?.toLowerCase().includes(term) ||
        tenant.property?.toLowerCase().includes(term) ||
        tenant.house?.toLowerCase().includes(term) ||
        tenant.phone?.toLowerCase().includes(term) ||
        tenant.status?.toLowerCase().includes(term)
      );
    }
    setFilteredTenants(result);
  }, [searchTerm, statusFilter, tenants]);

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('name');
      
      if (error) throw error;
      setTenants(data || []);
      setFilteredTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Property', 'Unit', 'Rent', 'Due Date', 'Status'];
    const rows = filteredTenants.map(t => [
      t.name, t.email, t.phone || 'N/A', t.property || 'N/A', 
      t.house || 'N/A', t.rent, t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A', t.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tenants_list_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadPDF = () => {
    const headers = ['Name', 'Property', 'Unit', 'Rent', 'Due Date', 'Status'];
    const data = filteredTenants.map(t => [
      t.name, t.property || 'N/A', t.house || 'N/A', 
      `KSh ${parseFloat(t.rent).toLocaleString()}`,
      t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
      t.status
    ]);
    exportToPDF({
      title: 'Tenants List Report',
      filename: 'Tenants_List',
      headers,
      data,
      subtitle: `Total Tenants: ${filteredTenants.length}`
    });
  };

  const handleBulkReminders = async () => {
    if (!window.confirm('Send rent reminders to all pending and overdue tenants?')) return;
    setSendingBulkReminders(true);
    try {
      const today = new Date();
      const targets = tenants.filter(t => {
        if (t.status?.toLowerCase() === 'vacated') return false;
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const s = t.status?.toLowerCase();
        return s === 'overdue' || (dueDate && dueDate < today) || s === 'pending';
      });

      if (targets.length === 0) {
        alert('No tenants require reminders.');
        return;
      }

      const reminders = targets.map(t => ({
        admin_id: userProfile.id,
        tenant_id: t.id,
        from_id: userProfile.id,
        to_id: t.id,
        from_name: userProfile.name,
        subject: 'Rent Payment Reminder',
        message: `Dear ${t.name},\n\nYour rent of KSh ${parseInt(t.rent).toLocaleString()} is ${t.status?.toLowerCase()}.\n\nPlease pay promptly.`,
        date: new Date().toISOString(),
        read: false
      }));

      const { error } = await supabase.from('messages').insert(reminders);
      if (error) throw error;
      alert(`✅ Reminders sent to ${targets.length} tenants`);
    } catch (error) {
      alert('Failed to send reminders.');
    } finally {
      setSendingBulkReminders(false);
    }
  };

  const openAddModal = () => {
    setEditingTenant(null);
    setFormData({ name: '', email: '', phone: '', property: '', house: '', rent: '', due_date: '', status: 'Active' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (editingTenant) {
        const { error } = await supabase.from('tenants').update({
          name: formData.name, email: formData.email, phone: formData.phone, property: formData.property,
          house: formData.house, rent: parseFloat(formData.rent) || 0,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null, status: formData.status
        }).eq('id', editingTenant.id);
        if (error) throw error;
        alert('✅ Updated!');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email, password: DEFAULT_TENANT_PASSWORD,
          options: { data: { name: formData.name, role: 'tenant' } }
        });
        if (authError) throw authError;
        const { error: dbError } = await supabase.from('tenants').insert({
          id: authData.user.id, admin_id: userProfile.id, name: formData.name, email: formData.email,
          phone: formData.phone, property: formData.property, house: formData.house,
          rent: parseFloat(formData.rent) || 0, due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          status: formData.status
        });
        if (dbError) throw dbError;
        alert('✅ Created!');
      }
      setShowModal(false);
      fetchTenants();
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{textAlign: 'center', padding: 40}}>Loading tenants...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
        <h2 style={{margin: 0}}>👥 Manage Tenants</h2>
        <div style={{display: 'flex', gap: 12}}>
          <button onClick={downloadCSV} className="btn" style={{background: 'var(--green)', color: 'white'}}>📊 CSV</button>
          <button onClick={downloadPDF} className="btn" style={{background: 'var(--red)', color: 'white'}}>📄 PDF</button>
          <button onClick={handleBulkReminders} disabled={sendingBulkReminders} className="btn" style={{background: '#f59e0b', color: 'white'}}>
            {sendingBulkReminders ? 'Sending...' : '📧 Bulk Reminders'}
          </button>
          <button onClick={openAddModal} className="btn btn-primary">+ New Tenant</button>
        </div>
      </div>

      <div className="card" style={{marginBottom: 20, padding: 16}}>
        <input type="text" placeholder="🔍 Search tenants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12}} />
        <div style={{display: 'flex', gap: 8}}>
          <button onClick={() => setStatusFilter('all')} className={`btn ${statusFilter === 'all' ? 'btn-primary' : ''}`}>All ({tenants.length})</button>
          <button onClick={() => setStatusFilter('active')} className={`btn ${statusFilter === 'active' ? 'btn-primary' : ''}`}>Active ({tenants.filter(t => t.status !== 'Vacated').length})</button>
        </div>
      </div>

      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 800}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Name</th>
                <th>Property</th>
                <th>Unit</th>
                <th>Rent</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(t => (
                <tr key={t.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '12px 8px'}}>{t.name}</td>
                  <td>{t.property || 'N/A'}</td>
                  <td>{t.house || 'N/A'}</td>
                  <td style={{fontWeight: 600}}>KSh {t.rent?.toLocaleString()}</td>
                  <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</td>
                  <td><span className={`badge ${t.status === 'Active' ? 'status-green' : 'status-amber'}`}>{t.status}</span></td>
                  <td style={{textAlign: 'center'}}>
                    <button onClick={() => { setEditingTenant(t); setFormData(t); setShowModal(true); }} className="btn btn-sm" style={{marginRight: 8}}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '100%', maxWidth: 500}}>
            <h3>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{width: '100%', marginBottom: 12, padding: 10}} />
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{width: '100%', marginBottom: 12, padding: 10}} />
              <input type="text" placeholder="Property" value={formData.property} onChange={e => setFormData({...formData, property: e.target.value})} style={{width: '100%', marginBottom: 12, padding: 10}} />
              <input type="text" placeholder="House/Unit" value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})} style={{width: '100%', marginBottom: 12, padding: 10}} />
              <input type="number" placeholder="Rent" value={formData.rent} onChange={e => setFormData({...formData, rent: e.target.value})} required style={{width: '100%', marginBottom: 12, padding: 10}} />
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{creating ? 'Saving...' : 'Save Tenant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
