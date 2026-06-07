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
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
    if (filteredTenants.length === 0) {
      toast('No tenants to export', {
        icon: '📭',
        duration: 3000,
        style: {
          background: '#F59E0B',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px'
        }
      });
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
    
    toast.success('✅ CSV downloaded!', {
      duration: 3000,
      style: {
        background: '#10B981',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });
  };

  // ✅ FIXED: Beautiful PDF Export with jsPDF
  const downloadPDF = () => {
    if (filteredTenants.length === 0) {
      toast('No tenants to export', {
        icon: '📭',
        duration: 3000,
        style: {
          background: '#F59E0B',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px'
        }
      });
      return;
    }

    const loadingToast = toast.loading('📄 Generating PDF...', {
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text('🏢 DomusEA - Tenant List', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
        doc.text(`Property Admin: ${userProfile.name}`, 14, 33);
        doc.text(`Total Tenants: ${filteredTenants.length}`, 14, 38);
        
        // Table data
        const tableData = filteredTenants.map(t => [
          t.name || 'Unknown',
          t.property || 'N/A',
          t.house || 'N/A',
          `KSh ${parseFloat(t.rent || 0).toLocaleString()}`,
          t.due_date ? new Date(t.due_date).toLocaleDateString('en-KE') : 'N/A',
          t.status || 'Unknown'
        ]);

        // Generate table
        autoTable(doc, {
          startY: 45,
          head: [['Name', 'Property', 'Unit', 'Rent', 'Due Date', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak'
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 20 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
          }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
          doc.text('© DomusEA - Confidential', doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
        }

        // Save file
        doc.save(`Tenants_${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast.success('✅ Tenant list downloaded!', {
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: '600'
          }
        });
        
      } catch (err) {
        console.error('PDF export error:', err);
        toast.error('❌ Failed to generate PDF. Please try again.', {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: '600'
          }
        });
      } finally {
        toast.dismiss(loadingToast);
      }
    }, 300);
  };

  const handleBulkReminders = async () => {
    if (!window.confirm('Send rent reminders to all pending and overdue tenants?')) return;
    setSendingBulkReminders(true);
    
    const loadingToast = toast.loading('📧 Sending reminders...', {
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });
    
    try {
      const today = new Date();
      const targets = tenants.filter(t => {
        if (t.status?.toLowerCase() === 'vacated') return false;
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const s = t.status?.toLowerCase();
        return s === 'overdue' || (dueDate && dueDate < today) || s === 'pending';
      });

      if (targets.length === 0) {
        toast('No tenants require reminders', {
          icon: '✅',
          duration: 3000,
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '14px 20px',
            borderRadius: '12px'
          }
        });
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
      
      toast.success(`✅ Reminders sent to ${targets.length} tenants!`, {
        duration: 4000,
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('❌ Failed to send reminders', {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
    } finally {
      setSendingBulkReminders(false);
      toast.dismiss(loadingToast);
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
    
    const loadingToast = toast.loading(editingTenant ? '💾 Updating...' : '✨ Creating tenant...', {
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: '12px'
      }
    });
    
    try {
      if (editingTenant) {
        const { error } = await supabase.from('tenants').update({
          name: formData.name, email: formData.email, phone: formData.phone, property: formData.property,
          house: formData.house, rent: parseFloat(formData.rent) || 0,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null, status: formData.status
        }).eq('id', editingTenant.id);
        if (error) throw error;
        toast.success('✅ Tenant updated!', {
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: '600'
          }
        });
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
        
        // Show credentials modal
        setNewTenantCredentials({ email: formData.email, password: DEFAULT_TENANT_PASSWORD });
        setShowPasswordModal(true);
        
        toast.success('✅ Tenant created!', {
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: '600'
          }
        });
      }
      setShowModal(false);
      fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(`❌ ${error.message}`, {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: '600'
        }
      });
    } finally {
      setCreating(false);
      toast.dismiss(loadingToast);
    }
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 40}}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div>Loading tenants...</div>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ Toast Notifications */}
      <Toaster 
        position="top-right"
        gutter={12}
        containerStyle={{ margin: '8px' }}
        toastOptions={{
          success: { 
            duration: 4000,
            style: {
              background: '#10B981',
              color: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontWeight: '600'
            }
          },
          error: { 
            duration: 5000,
            style: {
              background: '#EF4444',
              color: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontWeight: '600'
            }
          },
          loading: {
            duration: 3000,
            style: {
              background: '#3B82F6',
              color: '#fff',
              borderRadius: '12px'
            }
          }
        }}
      />

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

      {/* Password Modal for New Tenants */}
      {showPasswordModal && newTenantCredentials && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001}}>
          <div className="card" style={{width: '100%', maxWidth: 400, padding: 24}}>
            <h3 style={{margin: '0 0 16px 0'}}>🎉 Tenant Created!</h3>
            <p style={{margin: '0 0 16px 0', color: 'var(--text-muted)'}}>
              Share these credentials with the new tenant:
            </p>
            <div style={{background: 'var(--bg-faint)', padding: 16, borderRadius: 8, marginBottom: 16}}>
              <div style={{marginBottom: 8}}><strong>Email:</strong> {newTenantCredentials.email}</div>
              <div><strong>Password:</strong> {newTenantCredentials.password}</div>
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