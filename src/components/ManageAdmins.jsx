import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { exportToPDF } from '../utils/pdfExport';

export default function ManageAdmins() {
  const { userProfile } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', properties: '',
    tenant_limit: 50, subscription_plan: 'Monthly', base_fee: 2500, subscription_due: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  }

  const downloadCSV = () => {
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
  };

  const downloadPDF = () => {
    const headers = ['Name', 'Email', 'Plan', 'Fee', 'Status'];
    const data = admins.map(a => [
      a.name, a.email, a.subscription_plan, 
      `KSh ${parseFloat(a.subscription_fee).toLocaleString()}`,
      a.subscription_status
    ]);
    exportToPDF({
      title: 'Property Admins Report',
      filename: 'Admins_List',
      headers,
      data,
      subtitle: `Total Registered Admins: ${admins.length}`
    });
  };

  const handleFreezeAdmin = async (adminId, currentFrozenStatus) => {
    const action = currentFrozenStatus ? 'Unfreeze' : 'Freeze';
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this admin?`)) return;
    try {
      const { error } = await supabase.from('admins').update({ 
        frozen: !currentFrozenStatus,
        subscription_status: !currentFrozenStatus ? 'Overdue' : 'Active'
      }).eq('id', adminId);
      if (error) throw error;
      fetchAdmins();
    } catch (error) {
      alert(`❌ Failed: ${error.message}`);
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading admins...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
        <h2 style={{margin: 0}}>👥 Manage Admins</h2>
        <div style={{display: 'flex', gap: 12}}>
          <button onClick={downloadCSV} className="btn" style={{background: 'var(--green)', color: 'white'}}>📊 CSV</button>
          <button onClick={downloadPDF} className="btn" style={{background: 'var(--red)', color: 'white'}}>📄 PDF</button>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ New Admin'}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 800}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border)'}}>
                <th style={{padding: '12px 8px'}}>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Status</th>
                <th style={{textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} style={{borderBottom: '1px solid var(--border)', opacity: admin.frozen ? 0.6 : 1}}>
                  <td style={{padding: '12px 8px', fontWeight: 500}}>{admin.name}</td>
                  <td style={{color: 'var(--gray)', fontSize: 13}}>{admin.email}</td>
                  <td>{admin.subscription_plan}</td>
                  <td style={{fontWeight: 600}}>KSh {admin.subscription_fee?.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${admin.frozen ? 'status-red' : 'status-green'}`}>
                      {admin.frozen ? '❄️ Frozen' : admin.subscription_status}
                    </span>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button className="btn btn-sm" style={{background: admin.frozen ? 'var(--green)' : 'var(--amber)', color: 'white'}}
                      onClick={() => handleFreezeAdmin(admin.id, admin.frozen)}>
                      {admin.frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
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
