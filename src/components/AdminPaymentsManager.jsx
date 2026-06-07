import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function AdminPaymentsManager() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    method_type: 'mpesa_personal',
    method_name: '',
    phone_number: '',
    account_number: '',
    account_name: '',
    bank_name: '',
    branch: '',
    is_default: false,
    instructions: ''
  });

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (methodsError) throw methodsError;
      setPaymentMethods(methodsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddMethod = async () => {
    if (!formData.method_name) {
      toast.error('Method name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          admin_id: userProfile.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Payment method added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding method:', error);
      toast.error('Failed to add payment method');
    }
  };

  const handleUpdateMethod = async () => {
    if (!editingMethod) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMethod.id);

      if (error) throw error;
      
      toast.success('Payment method updated successfully!');
      setEditingMethod(null);
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating method:', error);
      toast.error('Failed to update payment method');
    }
  };

  const handleDeleteMethod = async (id) => {
    if (!confirm('Delete this payment method?')) return;

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Payment method deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting method:', error);
      toast.error('Failed to delete');
    }
  };

  const handleToggleDefault = async (id) => {
    try {
      // First, unset all defaults for this admin
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('admin_id', userProfile.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Default payment method updated');
      fetchData();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to update default');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Payment method ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      method_type: 'mpesa_personal',
      method_name: '',
      phone_number: '',
      account_number: '',
      account_name: '',
      bank_name: '',
      branch: '',
      is_default: false,
      instructions: ''
    });
  };

  const openEditModal = (method) => {
    setEditingMethod(method);
    setFormData({
      method_type: method.method_type,
      method_name: method.method_name,
      phone_number: method.phone_number || '',
      account_number: method.account_number || '',
      account_name: method.account_name || '',
      bank_name: method.bank_name || '',
      branch: method.branch || '',
      is_default: method.is_default,
      instructions: method.instructions || ''
    });
    setShowAddModal(true);
  };

  const getMethodIcon = (type) => {
    const icons = {
      mpesa_personal: '📱',
      mpesa_till: '🏪',
      mpesa_paybill: '🏦',
      airtel_money: '📲',
      t_kash: '💰',
      bank_account: '🏛️',
      sasa_pay: '💳',
      pesapal: '🌐',
      cash: '💵'
    };
    return icons[type] || '💳';
  };

  const getMethodLabel = (type) => {
    const labels = {
      mpesa_personal: 'M-Pesa (Personal)',
      mpesa_till: 'M-Pesa (Buy Goods)',
      mpesa_paybill: 'M-Pesa (Paybill)',
      airtel_money: 'Airtel Money',
      t_kash: 'T-Kash',
      bank_account: 'Bank Account',
      sasa_pay: 'SasaPay',
      pesapal: 'Pesapal',
      cash: 'Cash'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>💳 Payment Management</h2>
        <button 
          onClick={() => {
            resetForm();
            setEditingMethod(null);
            setShowAddModal(true);
          }}
          className="btn btn-primary"
        >
          ➕ Add Payment Method
        </button>
      </div>

      {/* Payment Methods Grid */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>Your Payment Methods ({paymentMethods.length})</h3>
        
        {paymentMethods.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, background: 'var(--bg-faint)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}></div>
            <h4 style={{ margin: '0 0 8px 0' }}>No Payment Methods Added</h4>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)' }}>
              Add M-Pesa, Bank Accounts, Airtel Money, etc. for your tenants
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              ➕ Add Your First Method
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {paymentMethods.map((method) => (
              <div 
                key={method.id} 
                className="card" 
                style={{
                  border: method.is_default ? '2px solid var(--primary)' : '1px solid var(--border-primary)',
                  opacity: method.is_active ? 1 : 0.6,
                  position: 'relative'
                }}
              >
                <div className="card-body" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{getMethodIcon(method.method_type)}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{method.method_name}</h4>
                        <span className="badge badge-muted" style={{ fontSize: 11 }}>
                          {getMethodLabel(method.method_type)}
                        </span>
                      </div>
                    </div>
                    {method.is_default && (
                      <span className="badge badge-success" style={{ fontSize: 10 }}>DEFAULT</span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {method.phone_number && <div>📞 {method.phone_number}</div>}
                    {method.account_number && <div>🔢 {method.account_number}</div>}
                    {method.account_name && <div>👤 {method.account_name}</div>}
                    {method.bank_name && <div>🏦 {method.bank_name}{method.branch ? ` - ${method.branch}` : ''}</div>}
                    {method.instructions && (
                      <div style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        💡 {method.instructions}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => openEditModal(method)}
                      className="btn btn-sm btn-secondary"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => handleToggleDefault(method.id)}
                      className="btn btn-sm"
                      style={{
                        background: method.is_default ? 'var(--success-bg)' : 'var(--bg-faint)',
                        color: method.is_default ? 'var(--success-dark)' : 'var(--text-secondary)'
                      }}
                    >
                      {method.is_default ? '✓ Default' : 'Set Default'}
                    </button>
                    <button 
                      onClick={() => handleToggleActive(method.id, method.is_active)}
                      className="btn btn-sm"
                      style={{
                        background: method.is_active ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: method.is_active ? 'var(--warning-dark)' : 'var(--success-dark)'
                      }}
                    >
                      {method.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteMethod(method.id)}
                      className="btn btn-sm btn-danger"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Payment History</h3>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div>No payments recorded yet</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tenant</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td className="font-semibold">{p.tenant_name || 'Unknown'}</td>
                      <td className="font-bold">KSh {parseFloat(p.amount).toLocaleString()}</td>
                      <td>{p.payment_method || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          fontSize: 12, 
                          background: 'var(--bg-faint)', 
                          padding: '2px 6px', 
                          borderRadius: 4,
                          fontFamily: 'monospace'
                        }}>
                          {p.mpesa_code || p.reference || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          p.status === 'Confirmed' ? 'badge-success' : 
                          p.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
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
          <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="form-label">Payment Type *</label>
                  <select 
                    name="method_type"
                    value={formData.method_type}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="mpesa_personal">M-Pesa (Personal Number)</option>
                    <option value="mpesa_till">M-Pesa (Buy Goods/Till Number)</option>
                    <option value="mpesa_paybill">M-Pesa (Paybill)</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="t_kash">T-Kash (Telkom)</option>
                    <option value="bank_account">Bank Account</option>
                    <option value="sasa_pay">SasaPay</option>
                    <option value="pesapal">Pesapal</option>
                    <option value="cash">Cash Payment</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Method Name *</label>
                  <input
                    type="text"
                    name="method_name"
                    value={formData.method_name}
                    onChange={handleInputChange}
                    placeholder="e.g., My M-Pesa, KCB Account"
                    className="form-input"
                  />
                </div>

                {(formData.method_type.includes('mpesa') || formData.method_type === 'airtel_money' || formData.method_type === 't_kash') && (
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="e.g., 0712345678"
                      className="form-input"
                    />
                  </div>
                )}

                {(formData.method_type === 'mpesa_till' || formData.method_type === 'mpesa_paybill') && (
                  <div>
                    <label className="form-label">
                      {formData.method_type === 'mpesa_till' ? 'Till Number' : 'Paybill Number'}
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={formData.account_number}
                      onChange={handleInputChange}
                      placeholder="e.g., 522522"
                      className="form-input"
                    />
                  </div>
                )}

                {formData.method_type === 'bank_account' && (
                  <>
                    <div>
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        placeholder="e.g., KCB, Equity, Co-op"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Account Number</label>
                      <input
                        type="text"
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleInputChange}
                        placeholder="e.g., 1234567890"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Branch</label>
                      <input
                        type="text"
                        name="branch"
                        value={formData.branch}
                        onChange={handleInputChange}
                        placeholder="e.g., Nairobi CBD"
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="form-label">Account Name</label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Mary Dash"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Payment Instructions (Optional)</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder="e.g., 'Use house number as reference', 'Available 9AM-5PM'"
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    name="is_default"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_default" className="form-label" style={{ margin: 0 }}>
                    Set as default payment method
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button 
                    onClick={editingMethod ? handleUpdateMethod : handleAddMethod}
                    className="btn btn-primary flex-1"
                  >
                    {editingMethod ? '💾 Update' : '➕ Add'} Method
                  </button>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}