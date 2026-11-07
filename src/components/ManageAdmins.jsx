import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';

export default function ManageAdmins() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    admin: null,
    type: 'warning',
    actionType: null
  });

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', properties: '',
    tenant_limit: 50, subscription_plan: 'Monthly', base_fee: 2500, subscription_due: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }

  // ✅ Toasts now use your real CSS variables (--success/--danger/--warning/
  // --primary) with getComputedStyle-independent inline fallbacks, so they
  // render correctly in both light and dark mode.
  const toastStyle = (borderColor) => ({
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-xl)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-lg)',
    border: `2px solid ${borderColor}`,
    fontWeight: '600',
  });

  const downloadCSV = () => {
    if (admins.length === 0) {
      toast.error('No admins to export', { style: toastStyle('var(--warning)') });
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Plan', 'Fee', 'Status', 'Joined'];
    const rows = admins.map(a => [
      a.name, a.email, a.phone || 'N/A', a.subscription_plan,
      a.subscription_fee, a.subscription_status, new Date(a.created_at).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admins_list_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('✅ CSV downloaded successfully!', { style: toastStyle('var(--success)') });
  };

  const downloadPDF = () => {
    if (admins.length === 0) {
      toast.error('No admins to export', { style: toastStyle('var(--danger)') });
      return;
    }

    const loadingToast = toast.loading('📄 Generating PDF...', { style: toastStyle('var(--info)') });

    setTimeout(() => {
      try {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text('🏢 DomusEA - Admins Report', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString('en-KE')}`, 14, 28);
        doc.text(`Total Admins: ${admins.length}`, 14, 33);

        const tableData = admins.map(a => [
          a.name,
          a.email,
          a.subscription_plan,
          `KSh ${parseFloat(a.subscription_fee || 0).toLocaleString()}`,
          a.frozen ? 'Frozen' : a.subscription_status
        ]);

        autoTable(doc, {
          startY: 40,
          head: [['Name', 'Email', 'Plan', 'Fee', 'Status']],
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
            cellPadding: 3
          }
        });

        doc.save(`Admins_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.dismiss(loadingToast);
        toast.success('✅ PDF downloaded successfully!', { style: toastStyle('var(--success)') });
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error('❌ Failed to generate PDF', { style: toastStyle('var(--danger)') });
      }
    }, 300);
  };

  const handleOpenModal = (admin, actionType) => {
    let modalConfig = {
      isOpen: true,
      admin,
      actionType,
      type: 'warning'
    };

    if (actionType === 'freeze') {
      modalConfig = {
        ...modalConfig,
        title: 'Freeze Admin Account',
        message: `Are you sure you want to freeze ${admin.name}?`,
        details: [
          'Block their access to the dashboard',
          'Freeze all their tenants access',
          'Set subscription status to Overdue'
        ],
        confirmText: 'Yes, Freeze',
        type: 'danger'
      };
    } else if (actionType === 'unfreeze') {
      modalConfig = {
        ...modalConfig,
        title: 'Unfreeze Admin Account',
        message: `Reactivate ${admin.name}?`,
        details: [
          'Restore their dashboard access',
          'Unfreeze their tenants',
          'Set subscription status to Active'
        ],
        confirmText: 'Yes, Unfreeze',
        type: 'success'
      };
    } else if (actionType === 'renew') {
      modalConfig = {
        ...modalConfig,
        title: 'Renew Subscription',
        message: `Renew subscription for ${admin.name}?`,
        details: [
          'Extend access for 30 days',
          'Mark as Paid',
          'Unfreeze account if currently frozen',
          `Record payment of KSh ${(admin.subscription_fee || 0).toLocaleString()}`
        ],
        confirmText: 'Confirm Renewal',
        type: 'success'
      };
    }

    setConfirmationModal(modalConfig);
  };

  const confirmAction = async () => {
    const { admin, actionType } = confirmationModal;
    if (!admin) return;

    const loadingToast = toast.loading(`⏳ ${actionType === 'renew' ? 'Renewing' : 'Updating'}...`, {
      style: toastStyle('var(--info)')
    });

    try {
      if (actionType === 'freeze') {
        const { error } = await supabase
          .from('admins')
          .update({
            frozen: true,
            subscription_status: 'Overdue'
          })
          .eq('id', admin.id);
        if (error) throw error;
        toast.dismiss(loadingToast);
        toast.success(`❄️ ${admin.name} has been frozen`, { style: toastStyle('var(--success)') });

      } else if (actionType === 'unfreeze') {
        const { error } = await supabase
          .from('admins')
          .update({
            frozen: false,
            subscription_status: 'Active'
          })
          .eq('id', admin.id);
        if (error) throw error;
        toast.dismiss(loadingToast);
        toast.success(`✅ ${admin.name} has been unfrozen`, { style: toastStyle('var(--success)') });

      } else if (actionType === 'renew') {
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + 30);

        const { error: updateError } = await supabase
          .from('admins')
          .update({
            subscription_status: 'Active',
            frozen: false,
            subscription_due: newDueDate.toISOString().split('T')[0]
          })
          .eq('id', admin.id);

        if (updateError) throw updateError;

        const { error: paymentError } = await supabase
          .from('admin_to_sa_payments')
          .insert({
            admin_id: admin.id,
            amount: admin.subscription_fee || 0,
            status: 'Confirmed',
            payment_method: 'Manual',
            date: new Date().toISOString(),
            description: `Subscription renewal - ${admin.subscription_plan}`
          });

        if (paymentError) throw paymentError;

        toast.dismiss(loadingToast);
        toast.success(`✅ Subscription renewed for ${admin.name}!`, { style: toastStyle('var(--success)') });
      }

      fetchAdmins();

    } catch (error) {
      console.error('Action error:', error);
      toast.dismiss(loadingToast);
      toast.error(`❌ Failed: ${error.message}`, { style: toastStyle('var(--danger)') });
    } finally {
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
    <div>Loading admins...</div>
  </div>;

  return (
    <div>
      {/* ✅ Enhanced Toast Notifications */}
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{ margin: '8px' }}
        toastOptions={{
          duration: 4000,
          success: {
            iconTheme: { primary: '#10B981', secondary: '#fff' },
            style: { ...toastStyle('var(--success)'), fontSize: '14px', minWidth: '320px' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
            style: { ...toastStyle('var(--danger)'), fontSize: '14px', minWidth: '320px' },
          },
          loading: {
            iconTheme: { primary: '#3B82F6', secondary: '#fff' },
            style: { ...toastStyle('var(--info)'), fontSize: '14px', minWidth: '320px' },
          },
        }}
      />

      {/* ✅ Beautiful Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmAction}
        title={confirmationModal.title}
        message={confirmationModal.message}
        details={confirmationModal.details}
        confirmText={confirmationModal.confirmText}
        cancelText="Cancel"
        type={confirmationModal.type}
      />

      <div className="page-header" style={{marginBottom: 24}}>
        <h2 style={{margin: 0}}>👥 Manage Admins</h2>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          {/* ✅ FIX: was var(--green)/var(--red)/var(--amber) — those custom
              vars don't exist in the stylesheet, so backgrounds resolved to
              nothing and left white-on-white/invisible buttons. Swapped to
              the real .btn-success / .btn-danger / .btn-primary classes
              already defined (and dark-mode-aware) in your CSS. */}
          <button onClick={downloadCSV} className="btn btn-success btn-sm">📊 CSV</button>
          <button onClick={downloadPDF} className="btn btn-danger btn-sm">📄 PDF</button>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ New Admin'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="card" style={{marginBottom: 24, padding: 20, background: 'var(--bg-faint)'}}>
          <h3 style={{marginTop: 0}}>Add New Admin</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setCreating(true);
            try {
              const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: { data: { name: formData.name, role: 'admin' } }
              });
              if (error) throw error;

              toast.success('✅ Admin created successfully!', { style: toastStyle('var(--success)') });

              setShowCreateForm(false);
              fetchAdmins();
            } catch (error) {
              toast.error(`❌ ${error.message}`, { style: toastStyle('var(--danger)') });
            } finally {
              setCreating(false);
            }
          }}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <input className="form-input" placeholder="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="form-input" type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input className="form-input" type="password" placeholder="Password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <input className="form-input" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input className="form-input" placeholder="Properties" value={formData.properties} onChange={e => setFormData({...formData, properties: e.target.value})} />
              <input className="form-input" type="number" placeholder="Subscription Fee" value={formData.base_fee} onChange={e => setFormData({...formData, base_fee: e.target.value})} />
            </div>
            <div style={{marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Admin'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table style={{minWidth: 800}}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Status</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{opacity: admin.frozen ? 0.6 : 1}}>
                  <td style={{fontWeight: 500}}>{admin.name}</td>
                  <td className="text-muted" style={{fontSize: 13}}>{admin.email}</td>
                  <td>{admin.subscription_plan}</td>
                  <td style={{fontWeight: 600}}>KSh {admin.subscription_fee?.toLocaleString()}</td>
                  <td>
                    {/* ✅ FIX: className referenced .status-red/.status-green,
                        which are never defined in the stylesheet (only
                        mentioned once inside a mobile media query). Swapped
                        to the real .badge-danger / .badge-success classes. */}
                    <span className={`badge ${admin.frozen ? 'badge-danger' : 'badge-success'}`}>
                      {admin.frozen ? '❄️ Frozen' : admin.subscription_status}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenModal(admin, 'renew')}
                      >
                        Renew
                      </button>
                      <button
                        className={`btn btn-sm ${admin.frozen ? 'btn-success' : 'btn-warning'}`}
                        onClick={() => handleOpenModal(admin, admin.frozen ? 'unfreeze' : 'freeze')}
                      >
                        {admin.frozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
