import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    if (filteredTenants.length === 0) {
      toast('No tenants to export', { icon: '📭' });
      return;
    }
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
    toast.success('✅ CSV downloaded!');
  };

  const downloadPDF = () => {
    if (filteredTenants.length === 0) {
      toast('No tenants to export', { icon: '📭' });
      return;
    }
    const loadingToast = toast.loading('📄 Generating PDF...');
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('🏢 DomusEA - Tenant List', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
        
        const tableData = filteredTenants.map(t => [
          t.name || 'Unknown', t.property || 'N/A', t.house || 'N/A',
          `KSh ${parseFloat(t.rent || 0).toLocaleString()}`,
          t.due_date ? new Date(t.due_date).toLocaleDateString('en-KE') : 'N/A',
          t.status || 'Unknown'
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Name', 'Property', 'Unit', 'Rent', 'Due Date', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });
        
        doc.save(`Tenants_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.dismiss(loadingToast);
        toast.success('✅ PDF downloaded!');
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error('❌ Failed to generate PDF');
      }
    }, 300);
  };

  const handleBulkReminders = async () => {
    if (!window.confirm('Send rent reminders to all pending and overdue tenants?')) return;
    setSendingBulkReminders(true);
    toast.loading('📧 Sending reminders...');
    try {
      const today = new Date();
      const targets = tenants.filter(t => {
        if (t.status?.toLowerCase() === 'vacated') return false;
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const s = t.status?.toLowerCase();
        return s === 'overdue' || (dueDate && dueDate < today) || s === 'pending';
      });

      if (targets.length === 0) {
        toast('No tenants require reminders', { icon: '✅' });
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
      
      toast.success(`✅ Reminders sent to ${targets.length} tenants!`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('❌ Failed to send reminders');
    } finally {
      setSendingBulkReminders(false);
    }
  };

  const openAddModal = () => {
    setEditingTenant(null);
    setFormData({ name: '', email: '', phone: '', property: '', house: '', rent: '', due_date: '', status: 'Active' });
    setShowModal(true);
  };

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', property: '', house: '',
    rent: '', due_date: '', status: 'Active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    toast.loading(editingTenant ? '💾 Updating...' : '✨ Creating tenant...');
    try {
      if (editingTenant) {
        const { error } = await supabase.from('tenants').update({
          name: formData.name, email: formData.email, phone: formData.phone, property: formData.property,
          house: formData.house, rent: parseFloat(formData.rent) || 0,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null, status: formData.status
        }).eq('id', editingTenant.id);
        if (error) throw error;
        toast.success('✅ Tenant updated!');
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
        
        setNewTenantCredentials({ email: formData.email, password: DEFAULT_TENANT_PASSWORD });
        setShowPasswordModal(true);
        toast.success('✅ Tenant created!');
      }
      setShowModal(false);
      fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>👥 Manage Tenants</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={downloadCSV} className="btn btn-success" style={{ fontSize: '0.875rem' }}>
              <i className="fas fa-file-csv"></i> <span className="hide-mobile">CSV</span>
            </button>
            <button onClick={downloadPDF} className="btn btn-danger" style={{ fontSize: '0.875rem' }}>
              <i className="fas fa-file-pdf"></i> <span className="hide-mobile">PDF</span>
            </button>
            <button onClick={handleBulkReminders} disabled={sendingBulkReminders} className="btn btn-warning" style={{ fontSize: '0.875rem' }}>
              {sendingBulkReminders ? 'Sending...' : '📧 Bulk Reminders'}
            </button>
            <button onClick={openAddModal} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>+ <span className="hide-mobile">New Tenant</span></button>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
          <input 
            type="text" 
            placeholder="🔍 Search tenants..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input" 
            style={{ marginBottom: '1rem', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setStatusFilter('all')} 
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({tenants.length})
            </button>
            <button 
              onClick={() => setStatusFilter('active')} 
              className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Active ({tenants.filter(t => t.status !== 'Vacated').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card">
        {isMobile ? (
          /* 📱 Mobile Card View */
          <div style={{ padding: '1rem' }}>
            {filteredTenants.map(tenant => (
              <div key={tenant.id} className="card" style={{ 
                padding: '1rem', 
                marginBottom: '1rem',
                border: '1px solid var(--border-primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{tenant.name}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tenant.email}</p>
                  </div>
                  <span className={`badge ${tenant.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                    {tenant.status}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Property</div>
                    <div style={{ fontWeight: 600 }}>{tenant.property || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Unit</div>
                    <div style={{ fontWeight: 600 }}>{tenant.house || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rent</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>KSh {tenant.rent?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Due Date</div>
                    <div style={{ fontWeight: 600 }}>
                      {tenant.due_date ? new Date(tenant.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setEditingTenant(tenant); setFormData(tenant); setShowModal(true); }}
                  className="btn btn-primary btn-full"
                >
                  Edit Tenant
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* 💻 Desktop Table View */
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Rent</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.email}</div>
                    </td>
                    <td>{t.property || 'N/A'}</td>
                    <td>{t.house || 'N/A'}</td>
                    <td style={{ fontWeight: 700 }}>KSh {t.rent?.toLocaleString()}</td>
                    <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`badge ${t.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => { setEditingTenant(t); setFormData(t); setShowModal(true); }} 
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
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
          padding: isMobile ? '1rem' : '0'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: isMobile ? '0' : undefined
          }}>
            <div className="card-header">
              <h3 className="card-title">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="form-input" />
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="form-input" />
                <input type="text" placeholder="Property" value={formData.property} onChange={e => setFormData({...formData, property: e.target.value})} className="form-input" />
                <input type="text" placeholder="House/Unit" value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})} className="form-input" />
                <input type="number" placeholder="Rent" value={formData.rent} onChange={e => setFormData({...formData, rent: e.target.value})} required className="form-input" />
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1">{creating ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && newTenantCredentials && (
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
          zIndex: 1001,
          padding: isMobile ? '1rem' : '0'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '1.5rem',
            borderRadius: isMobile ? '0' : undefined
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>🎉 Tenant Created!</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              Share these credentials with the new tenant:
            </p>
            <div style={{
              background: 'var(--bg-faint)',
              padding: '1rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Email:</strong> {newTenantCredentials.email}
              </div>
              <div>
                <strong>Password:</strong> {newTenantCredentials.password}
              </div>
            </div>
            <button 
              onClick={() => {
                setShowPasswordModal(false);
                setNewTenantCredentials(null);
              }}
              className="btn btn-primary btn-full"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}