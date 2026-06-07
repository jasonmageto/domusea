import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function TenantPayRent() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    mpesa_code: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (userProfile?.id) {
      fetchPaymentMethods();
    }
  }, [userProfile?.id]);

  async function fetchPaymentMethods() {
    try {
      setLoading(true);
      // Get tenant's admin ID
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('admin_id')
        .eq('id', userProfile.id)
        .single();

      if (!tenantData) throw new Error('Tenant record not found');

      // Fetch admin's payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('admin_id', tenantData.admin_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      setPaymentMethods(methodsData || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.payment_method) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Record payment (pending verification by admin)
      const { error } = await supabase
        .from('payments')
        .insert({
          tenant_id: userProfile.id,
          admin_id: (await supabase.from('tenants').select('admin_id').eq('id', userProfile.id).single()).data.admin_id,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          mpesa_code: formData.mpesa_code,
          reference: formData.reference,
          status: 'Pending',
          date: new Date().toISOString(),
          notes: formData.notes
        });

      if (error) throw error;
      
      toast.success('Payment recorded! Waiting for admin confirmation.');
      setFormData({
        amount: '',
        payment_method: '',
        mpesa_code: '',
        reference: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
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
      <h2 style={{ marginBottom: 24 }}>💳 Pay Rent</h2>

      {/* Payment Instructions */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Available Payment Methods</h3>
        </div>
        <div className="card-body">
          {paymentMethods.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              No payment methods configured. Contact your admin.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {paymentMethods.map(method => (
                <div key={method.id} style={{ 
                  padding: 12, 
                  background: 'var(--bg-faint)', 
                  borderRadius: 8,
                  border: method.is_default ? '2px solid var(--primary)' : '1px solid var(--border-primary)'
                }}>
                  <strong>{method.method_name}</strong>
                  {method.phone_number && <div>📱 {method.phone_number}</div>}
                  {method.account_number && <div>🔢 {method.account_number}</div>}
                  {method.instructions && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>💡 {method.instructions}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Form */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Record Your Payment</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label className="form-label">Amount Paid *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="e.g., 7000"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Payment Method *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="form-select"
                  required
                >
                  <option value="">Select method...</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.method_name}>
                      {method.method_name} {method.is_default ? '(Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">M-Pesa Code / Reference</label>
                <input
                  type="text"
                  value={formData.mpesa_code}
                  onChange={(e) => setFormData({...formData, mpesa_code: e.target.value})}
                  placeholder="e.g., QKH123ABC"
                  className="form-input"
                />
                <small style={{ color: 'var(--text-muted)' }}>Enter M-Pesa confirmation code if applicable</small>
              </div>

              <div>
                <label className="form-label">Additional Reference</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="e.g., House number, Your name"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional information..."
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : '✅ Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}