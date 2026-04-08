import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const PAYMENT_TYPES = ['M-Pesa', 'Paybill', 'Bank Transfer', 'Airtel Money', 'Cash'];

export default function AdminPaymentMethods() {
  const { userProfile } = useAuth();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const [formData, setFormData] = useState({
    type: 'M-Pesa',
    name: '',
    number: '',
    paybill_number: '',
    account_number: '',
    holder: '',
    details: '',
    active: true
  });

  useEffect(() => {
    if (userProfile?.id) fetchMethods();
  }, [userProfile]);

  async function fetchMethods() {
    const {  data } = await supabase
      .from('admin_payment_methods')
      .select('*')
      .eq('admin_id', userProfile.id)
      .order('created_at', { ascending: false });
    
    if (data) setMethods(data);
    setLoading(false);
  }

  function handleTypeChange(type) {
    const reset = {
      type,
      name: type === 'M-Pesa' ? 'M-Pesa' : type === 'Airtel Money' ? 'Airtel Money' : type === 'Bank Transfer' ? 'Bank Transfer' : type === 'Cash' ? 'Cash' : '',
      number: '',
      paybill_number: '',
      account_number: '',
      holder: '',
      details: '',
      active: true
    };
    setFormData(reset);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    try {
      const payload = { ...formData, admin_id: userProfile.id };
      
      if (editingId) {
        const { error } = await supabase
          .from('admin_payment_methods')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setMsg('✅ Payment method updated!');
      } else {
        const { error } = await supabase
          .from('admin_payment_methods')
          .insert(payload);
        if (error) throw error;
        setMsg('✅ Payment method added!');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ type: 'M-Pesa', name: '', number: '', paybill_number: '', account_number: '', holder: '', details: '', active: true });
      fetchMethods();
    } catch (err) {
      console.error(err);
      setMsg(`❌ ${err.message}`);
    }
  }

  function startEdit(method) {
    setFormData(method);
    setEditingId(method.id);
    setShowForm(true);
  }

  async function toggleActive(id, currentStatus) {
    await supabase
      .from('admin_payment_methods')
      .update({ active: !currentStatus })
      .eq('id', id);
    fetchMethods();
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this payment method?')) {
      await supabase.from('admin_payment_methods').delete().eq('id', id);
      fetchMethods();
    }
  }

  if (loading) return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading payment methods...</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h2 style={{margin: 0}}>Payment Methods</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ type: 'M-Pesa', name: '', number: '', paybill_number: '', account_number: '', holder: '', details: '', active: true }); }}>
          {showForm ? 'Cancel' : '+ Add Method'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card" style={{marginBottom: 24, borderLeft: '4px solid var(--blue)'}}>
          <h3 style={{marginTop: 0}}>{editingId ? 'Edit Method' : 'Add New Payment Method'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom: 12}}>
              <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Payment Type</label>
              <select value={formData.type} onChange={(e) => handleTypeChange(e.target.value)} style={inputStyle} required>
                {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <div>
                <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Account Name / Holder</label>
                <input placeholder="e.g. John Doe Properties" value={formData.holder} onChange={e => setFormData({...formData, holder: e.target.value})} style={inputStyle} required />
              </div>
              
              {(formData.type === 'M-Pesa' || formData.type === 'Airtel Money') && (
                <div>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Phone Number</label>
                  <input placeholder="0712 345 678" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} style={inputStyle} required />
                </div>
              )}

              {formData.type === 'Paybill' && (
                <>
                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Paybill Number</label>
                    <input placeholder="e.g. 123456" value={formData.paybill_number} onChange={e => setFormData({...formData, paybill_number: e.target.value})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Account Number</label>
                    <input placeholder="e.g. APT01" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} style={inputStyle} required />
                  </div>
                </>
              )}

              {formData.type === 'Bank Transfer' && (
                <>
                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Bank Name</label>
                    <input placeholder="e.g. KCB Bank" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Account Number</label>
                    <input placeholder="e.g. 1234567890" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} style={inputStyle} required />
                  </div>
                </>
              )}

              {formData.type === 'Cash' && (
                <div style={{gridColumn: 'span 2'}}>
                  <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Payment Location / Instructions</label>
                  <input placeholder="e.g. Pay at Management Office, Block B" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} style={inputStyle} required />
                </div>
              )}
            </div>

            <div style={{marginTop: 12}}>
              <label style={{display: 'block', marginBottom: 4, fontSize: 13}}>Additional Details / Instructions</label>
              <textarea placeholder="Any extra info tenants need to know..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} style={{...inputStyle, minHeight: 60}} />
            </div>

            <div style={{display: 'flex', gap: 12, marginTop: 16}}>
              <button type="submit" className="btn btn-primary" style={{flex: 1}}>
                {editingId ? 'Update Method' : 'Save Method'}
              </button>
              <button type="button" className="btn" style={{background: 'var(--border)'}} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
          {msg && <p style={{marginTop: 12, textAlign: 'center', fontWeight: 'bold', color: msg.includes('✅') ? 'var(--green)' : 'var(--red)'}}>{msg}</p>}
        </div>
      )}

      {/* Methods Grid */}
      <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16}}>
        {methods.length === 0 ? (
          <div className="card" style={{gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--gray)'}}>
            No payment methods added yet. Click "+ Add Method" to start.
          </div>
        ) : (
          methods.map(method => (
            <div key={method.id} className="card" style={{position: 'relative', border: method.active ? '1px solid var(--border)' : '1px solid var(--border)', opacity: method.active ? 1 : 0.6}}>
              {!method.active && <div style={{position: 'absolute', top: 8, right: 8, fontSize: 10, background: 'var(--gray)', color: 'white', padding: '2px 6px', borderRadius: 4}}>INACTIVE</div>}
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                <h3 style={{margin: 0, fontSize: 18}}>{method.type}</h3>
                <span className={`badge ${method.active ? 'status-green' : 'status-red'}`}>{method.active ? 'Active' : 'Disabled'}</span>
              </div>

              <div style={{fontSize: 14, marginBottom: 12}}>
                {method.holder && <p style={{margin: '4px 0'}}><strong>Holder:</strong> {method.holder}</p>}
                {method.number && <p style={{margin: '4px 0'}}><strong>Number:</strong> {method.number}</p>}
                {method.paybill_number && <p style={{margin: '4px 0'}}><strong>Paybill:</strong> {method.paybill_number}</p>}
                {method.account_number && <p style={{margin: '4px 0'}}><strong>Account:</strong> {method.account_number}</p>}
                {method.details && <p style={{margin: '4px 0', color: 'var(--gray)'}}>{method.details}</p>}
              </div>

              <div style={{display: 'flex', gap: 8, marginTop: 12}}>
                <button className="btn" style={{flex: 1, fontSize: 12}} onClick={() => startEdit(method)}>✏️ Edit</button>
                <button className="btn" style={{flex: 1, fontSize: 12, background: method.active ? 'var(--amber)' : 'var(--green)', color: 'white'}} onClick={() => toggleActive(method.id, method.active)}>
                  {method.active ? 'Disable' : 'Enable'}
                </button>
                <button className="btn" style={{flex: 1, fontSize: 12, background: 'var(--red)', color: 'white'}} onClick={() => handleDelete(method.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: 8, borderRadius: 4, border: '1px solid var(--border)', width: '100%', background: 'var(--bg)', color: 'var(--text)' };