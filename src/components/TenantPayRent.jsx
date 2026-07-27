import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function TenantPayRent() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [tenantInfo, setTenantInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    method: '',
    mpesa_code: '',
    house_number: ''  // ✅ Added house number field
  });

  useEffect(() => {
    if (userProfile?.id) {
      fetchTenantInfo();
      fetchPaymentMethods();
    }
  }, [userProfile?.id]);

  async function fetchTenantInfo() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('house, property')
        .eq('id', userProfile.id)
        .single();
      
      if (error) throw error;
      setTenantInfo(data);
      
      // Auto-fill house number if available
      if (data?.house) {
        setFormData(prev => ({
          ...prev,
          house_number: data.house
        }));
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    }
  }

  async function fetchPaymentMethods() {
    try {
      setLoading(true);
      
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('admin_id')
        .eq('id', userProfile.id)
        .single();

      if (tenantError || !tenantData) {
        throw new Error('Tenant record not found');
      }

      const { data: methodsData, error: methodsError } = await supabase
        .from('payment_methods')
        .select('method_type, method_name, is_default')
        .eq('admin_id', tenantData.admin_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (methodsError) throw methodsError;
      
      setPaymentMethods(methodsData || []);
      
      if (methodsData?.[0]) {
        setFormData(prev => ({
          ...prev,
          method: methodsData[0].method_type
        }));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.method) {
      toast.error('Please enter amount and select payment method');
      return;
    }

    setSubmitting(true);
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('admin_id')
        .eq('id', userProfile.id)
        .single();

      if (!tenantData) {
        throw new Error('Could not find your admin assignment');
      }

      // ✅ Include transaction code and house number
      const paymentData = {
        tenant_id: userProfile.id,
        admin_id: tenantData.admin_id,
        amount: parseFloat(formData.amount),
        method: formData.method,
        mpesa_code: formData.mpesa_code || null,  // ✅ Transaction code
        reference: formData.house_number || null,  // ✅ House number as reference
        status: 'Pending',
        date: new Date().toISOString()
      };

      console.log('Submitting payment:', paymentData);

      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }
      
      toast.success('Payment recorded! Waiting for admin confirmation.');
      
      // Reset form but keep house number
      setFormData({ 
        amount: '', 
        method: paymentMethods[0]?.method_type || '',
        mpesa_code: '',
        house_number: tenantInfo?.house || ''
      });
      
    } catch (error) {
      console.error('Payment submission error:', error);
      toast.error(`Failed: ${error.message || 'Check console'}`);
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
            <p style={{ color: 'var(--danger)', textAlign: 'center' }}>
              No payment methods configured. Contact your admin.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {paymentMethods.map((method, index) => (
                <div key={index} style={{ 
                  padding: 12, 
                  background: 'var(--bg-faint)', 
                  borderRadius: 8,
                  border: method.is_default ? '2px solid var(--primary)' : '1px solid var(--border)'
                }}>
                  <strong>{method.method_name || method.method_type}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Form with Transaction Code & House Number */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Record Your Payment</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              
              {/* Amount */}
              <div>
                <label className="form-label">Amount Paid *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="e.g., 7000"
                  className="form-input"
                  required
                  min="1"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="form-label">Payment Method *</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({...formData, method: e.target.value})}
                  className="form-select"
                  required
                >
                  <option value="">Select method...</option>
                  {paymentMethods.map((method, index) => (
                    <option key={index} value={method.method_type}>
                      {method.method_name || method.method_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* M-Pesa Transaction Code */}
              <div>
                <label className="form-label">M-Pesa Transaction Code *</label>
                <input
                  type="text"
                  value={formData.mpesa_code}
                  onChange={(e) => setFormData({...formData, mpesa_code: e.target.value.toUpperCase()})}
                  placeholder="e.g., QKH123ABC"
                  className="form-input"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                  Enter the M-Pesa confirmation code from your SMS
                </small>
              </div>

              {/* House Number */}
              <div>
                <label className="form-label">House Number / Unit *</label>
                <input
                  type="text"
                  value={formData.house_number}
                  onChange={(e) => setFormData({...formData, house_number: e.target.value})}
                  placeholder="e.g., A7, B12"
                  className="form-input"
                  required
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                  Your house/unit number for reference
                </small>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={submitting || paymentMethods.length === 0}
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