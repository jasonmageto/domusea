import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function OccupancyGrid() {
  const { userProfile } = useAuth();
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({ occupied: 0, vacant: 0 });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', rent: '', status: 'good', due_date: '' });
  const [saving, setSaving] = useState(false);

  const DEFAULT_UNITS = [];
  for (let i = 1; i <= 20; i++) DEFAULT_UNITS.push(`A${i}`);
  for (let i = 1; i <= 20; i++) DEFAULT_UNITS.push(`B${i}`);

  useEffect(() => {
    if (userProfile?.id) {
      fetchGridData();
    }
  }, [userProfile]);

  async function fetchGridData() {
    try {
      console.log('🔍 Fetching tenants for admin:', userProfile.id);
      
      const result = await supabase
        .from('tenants')
        .select('id, house, status, name, rent, due_date, email')
        .eq('admin_id', userProfile.id);

      console.log('📦 Raw result:', result);
      console.log('📦 Result data:', result.data);
      console.log('📦 Result error:', result.error);

      if (result.error) {
        console.error('❌ Query error:', result.error);
        setLoading(false);
        return;
      }

      const tenants = result.data || [];
      console.log('✅ Found tenants:', tenants);
      console.log('📊 Tenant count:', tenants.length);

      const grid = DEFAULT_UNITS.map(unitLabel => {
        const normalizedUnit = unitLabel.toString().toUpperCase().trim();
        
        const tenant = tenants.find(t => {
          const normalizedHouse = t.house?.toString().toUpperCase().trim();
          return normalizedHouse === normalizedUnit;
        });

        return {
          unit: unitLabel,
          status: tenant ? (tenant.status || 'good') : 'vacant',
          id: tenant ? tenant.id : null,
          name: tenant ? tenant.name : null,
          rent: tenant ? tenant.rent : null,
          due_date: tenant ? tenant.due_date : null,
          email: tenant ? tenant.email : null
        };
      });

      console.log('📋 Generated grid with occupied units:', grid.filter(u => u.status !== 'vacant'));
      
      setUnits(grid);
      setStats({
        occupied: tenants.length,
        vacant: DEFAULT_UNITS.length - tenants.length
      });

    } catch (err) {
      console.error('💥 Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnitClick(unit) {
    const unitData = units.find(u => u.unit === unit);
    
    if (unitData && unitData.status !== 'vacant') {
      setSelectedUnit(unitData);
      setEditForm({
        name: unitData.name || '',
        rent: unitData.rent || '',
        status: unitData.status || 'good',
        due_date: unitData.due_date || ''
      });
      setShowEditModal(true);
    }
  }

  async function handleUpdateTenant(e) {
    e.preventDefault();
    if (!selectedUnit?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: editForm.name,
          rent: parseFloat(editForm.rent),
          status: editForm.status,
          due_date: editForm.due_date
        })
        .eq('id', selectedUnit.id);

      if (error) throw error;
      
      setShowEditModal(false);
      await fetchGridData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'var(--green)';
      case 'pending': return 'var(--amber)';
      case 'overdue': return 'var(--red)';
      default: return 'var(--gray)';
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: '40px'}}>Loading Grid...</div>;

  return (
    <div>
      <h2 style={{marginBottom: 24}}>Occupancy Grid</h2>

      <div className="grid" style={{marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'}}>
        <div className="card" style={{textAlign: 'center', borderLeft: `4px solid var(--green)`}}>
          <p style={{margin: 0, fontSize: 14, color: 'var(--gray)'}}>Occupied</p>
          <p style={{margin: '8px 0 0', fontSize: 32, fontWeight: 'bold', color: 'var(--green)'}}>{stats.occupied}</p>
        </div>
        <div className="card" style={{textAlign: 'center', borderLeft: `4px solid var(--gray)`}}>
          <p style={{margin: 0, fontSize: 14, color: 'var(--gray)'}}>Vacant</p>
          <p style={{margin: '8px 0 0', fontSize: 32, fontWeight: 'bold', color: 'var(--gray)'}}>{stats.vacant}</p>
        </div>
        <div className="card" style={{textAlign: 'center', borderLeft: `4px solid var(--blue)`}}>
          <p style={{margin: 0, fontSize: 14, color: 'var(--gray)'}}>Total Units</p>
          <p style={{margin: '8px 0 0', fontSize: 32, fontWeight: 'bold'}}>{DEFAULT_UNITS.length}</p>
        </div>
      </div>

      <div className="card" style={{marginBottom: 24}}>
        <div style={{display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center'}}>
          <strong>Legend:</strong>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 16, height: 16, borderRadius: 4, background: 'var(--green)'}}></span> Good
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 16, height: 16, borderRadius: 4, background: 'var(--amber)'}}></span> Pending
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 16, height: 16, borderRadius: 4, background: 'var(--red)'}}></span> Overdue
          </span>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 16, height: 16, borderRadius: 4, background: 'var(--gray)'}}></span> Vacant
          </span>
        </div>
      </div>

      <div className="card">
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12}}>
          {units.map(u => (
            <div 
              key={u.unit}
              onClick={() => handleUnitClick(u.unit)}
              style={{
                background: getStatusColor(u.status),
                color: u.status === 'vacant' ? 'var(--text)' : 'white',
                padding: 16,
                borderRadius: 8,
                textAlign: 'center',
                minHeight: 100,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: u.status === 'vacant' ? 0.6 : 1,
                transition: 'transform 0.2s'
              }}
              title={u.status !== 'vacant' ? `Unit: ${u.unit}\nTenant: ${u.name}\nRent: KSh ${u.rent}` : `Unit ${u.unit} - Vacant`}
            >
              <strong style={{fontSize: 18}}>{u.unit}</strong>
              {u.status !== 'vacant' ? (
                <>
                  <div style={{fontSize: 12, marginTop: 4, opacity: 0.9}}>
                    {u.name?.split(' ')[0]}
                  </div>
                  <div style={{fontSize: 10, marginTop: 2, opacity: 0.7}}>
                    KSh {u.rent}
                  </div>
                </>
              ) : (
                <span style={{fontSize: 10, marginTop: 4, opacity: 0.6}}>VACANT</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {showEditModal && selectedUnit && (
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
          zIndex: 1000
        }}>
          <div className="card" style={{width: '90%', maxWidth: 500}}>
            <h3 style={{marginTop: 0}}>Edit Unit {selectedUnit.unit}</h3>
            <form onSubmit={handleUpdateTenant}>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 4, fontWeight: 500}}>Tenant Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  required
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 4, fontWeight: 500}}>Monthly Rent (KSh)</label>
                <input
                  type="number"
                  value={editForm.rent}
                  onChange={e => setEditForm({...editForm, rent: e.target.value})}
                  required
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 4, fontWeight: 500}}>Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm({...editForm, due_date: e.target.value})}
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: 16}}>
                <label style={{display: 'block', marginBottom: 4, fontWeight: 500}}>Payment Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                  style={{width: '100%'}}
                >
                  <option value="good">Good (Paid)</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div style={{display: 'flex', gap: 12}}>
                <button type="button" className="btn" onClick={() => setShowEditModal(false)} style={{flex: 1}}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{flex: 1}}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}