import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function OccupancyGrid() {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenantLimit, setTenantLimit] = useState(50);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ label: '', floor: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUnit?.tenant) {
      fetchMessages(selectedUnit.tenant.id);
    }
  }, [selectedUnit]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Get admin's tenant limit from Supreme Admin allocation
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('tenant_limit')
        .eq('id', userProfile.id)
        .single();
      
      if (adminError) throw adminError;
      const limit = adminData?.tenant_limit || 50;
      setTenantLimit(limit);
      console.log('Tenant limit:', limit);

      // Get all ACTIVE tenants for this admin
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('admin_id', userProfile.id)
        .in('status', ['Active', 'Paid', 'Pending']);
      
      if (tenantsError) throw tenantsError;
      setTenants(tenantsData || []);
      console.log('Active tenants:', tenantsData?.length);

      // Fetch and generate units up to tenant limit
      await fetchUnits(limit);

    } catch (error) {
      console.error('Error fetching occupancy data:', error);
      alert('Failed to load occupancy grid.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits(limit) {
    try {
      // Fetch custom units from database
      const { data: customUnits, error } = await supabase
        .from('property_units')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('sort_order');
      
      if (error) {
        console.log('Property units table error, generating defaults');
        generateDefaultUnits(limit);
        return;
      }
      
      let allUnits = customUnits || [];
      const existingLabels = new Set(allUnits.map(u => u.label.toUpperCase()));
      
      console.log('Custom units from DB:', allUnits.length);
      console.log('Tenant limit:', limit);
      
      // Generate additional units to reach the tenant limit
      if (allUnits.length < limit) {
        const unitsNeeded = limit - allUnits.length;
        console.log('Generating', unitsNeeded, 'additional units');
        
        const floors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        let generatedCount = 0;
        
        for (const floor of floors) {
          for (let i = 1; i <= 12; i++) {
            if (generatedCount >= unitsNeeded) break;
            
            const unitLabel = `${floor}${i}`;
            
            // Skip if this label already exists in database
            if (existingLabels.has(unitLabel.toUpperCase())) {
              continue;
            }
            
            allUnits.push({
              id: `temp-${unitLabel}`, // Temporary ID for auto-generated units
              label: unitLabel,
              floor: floor,
              unit_number: i.toString(),
              description: '',
              sort_order: allUnits.length,
              isTemporary: true
            });
            
            generatedCount++;
          }
          if (generatedCount >= unitsNeeded) break;
        }
      }
      
      // Sort all units properly (A1, A2... B1, B2... etc.)
      allUnits.sort((a, b) => {
        const aMatch = a.label.match(/([A-Z]+)(\d+)/i);
        const bMatch = b.label.match(/([A-Z]+)(\d+)/i);
        
        if (aMatch && bMatch) {
          const aFloor = aMatch[1].toUpperCase();
          const aNum = parseInt(aMatch[2]);
          const bFloor = bMatch[1].toUpperCase();
          const bNum = parseInt(bMatch[2]);
          
          if (aFloor !== bFloor) return aFloor.localeCompare(bFloor);
          return aNum - bNum;
        }
        
        return a.label.localeCompare(b.label);
      });
      
      console.log('Total units (custom + auto):', allUnits.length);
      setUnits(allUnits);
      
    } catch (error) {
      console.error('Error fetching units:', error);
      generateDefaultUnits(limit);
    }
  }

  function generateDefaultUnits(limit) {
    const defaultUnits = [];
    const floors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let unitCount = 0;
    
    for (const floor of floors) {
      for (let i = 1; i <= 12; i++) {
        if (unitCount >= limit) break;
        const unitLabel = `${floor}${i}`;
        defaultUnits.push({
          id: `temp-${unitLabel}`,
          label: unitLabel,
          floor: floor,
          unit_number: i.toString(),
          description: '',
          sort_order: unitCount,
          isTemporary: true
        });
        unitCount++;
      }
      if (unitCount >= limit) break;
    }
    
    setUnits(defaultUnits);
  }

  const getTenantStatus = (tenant) => {
    if (!tenant) return { color: '#94a3b8', label: 'Vacant', bg: '#f1f5f9', textColor: '#94a3b8' };
    
    const today = new Date();
    const dueDate = tenant.due_date ? new Date(tenant.due_date) : null;
    const status = tenant.status?.toLowerCase();
    
    // GREEN - Paid/Active
    if (status === 'paid') {
      return { color: '#10b981', label: 'Paid', bg: '#d1fae5', textColor: '#059669' };
    }
    if (status === 'active') {
      return { color: '#10b981', label: 'Active', bg: '#d1fae5', textColor: '#059669' };
    }
    // RED - Overdue
    if (dueDate && dueDate < today) {
      return { color: '#ef4444', label: 'Overdue', bg: '#fee2e2', textColor: '#dc2626' };
    }
    // AMBER - Pending
    if (status === 'pending') {
      return { color: '#f59e0b', label: 'Pending', bg: '#fef3c7', textColor: '#d97706' };
    }
    
    return { color: '#94a3b8', label: 'Vacant', bg: '#f1f5f9', textColor: '#94a3b8' };
  };

  async function handleSaveUnit() {
    if (!unitForm.label.trim()) {
      alert('Please enter a unit label');
      return;
    }

    try {
      const isTemporaryUnit = editingUnit?.isTemporary || !editingUnit?.id || editingUnit.id.startsWith('temp-');
      
      if (isTemporaryUnit) {
        // Create new unit in database
        console.log('Creating new unit in database:', unitForm.label);
        
        const newUnit = {
          id: crypto.randomUUID(),
          admin_id: userProfile.id,
          label: unitForm.label,
          floor: unitForm.floor || '',
          unit_number: unitForm.label.replace(/[^0-9]/g, ''),
          description: unitForm.description || '',
          sort_order: units.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('property_units')
          .insert(newUnit)
          .select();
        
        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        
        console.log('Unit created successfully:', data);
      } else {
        // Update existing unit in database
        console.log('Updating existing unit:', editingUnit.id);
        
        const { data, error } = await supabase
          .from('property_units')
          .update({
            label: unitForm.label,
            floor: unitForm.floor,
            description: unitForm.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUnit.id)
          .eq('admin_id', userProfile.id)
          .select();
        
        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        
        console.log('Unit updated successfully:', data);
      }

      // Refresh units list with tenant limit
      await fetchUnits(tenantLimit);
      setShowConfigModal(false);
      setEditingUnit(null);
      setUnitForm({ label: '', floor: '', description: '' });
      
    } catch (error) {
      console.error('Error saving unit:', error);
      alert(`Failed to save unit configuration: ${error.message}`);
    }
  }

  async function handleDeleteUnit(unit) {
    const tenant = tenants.find(t => t.house?.toUpperCase() === unit.label.toUpperCase());
    if (tenant) {
      alert(`Cannot delete occupied unit. Please vacate ${tenant.name} first.`);
      return;
    }

    // Don't allow deleting temporary units
    if (unit.isTemporary) {
      alert('This is an auto-generated unit. Edit it to save as a custom unit instead.');
      return;
    }

    if (!window.confirm(`Delete unit "${unit.label}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('property_units')
        .delete()
        .eq('id', unit.id)
        .eq('admin_id', userProfile.id);
      
      if (error) throw error;
      
      await fetchUnits(tenantLimit);
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert('Failed to delete unit.');
    }
  }

  const editUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      label: unit.label,
      floor: unit.floor || '',
      description: unit.description || ''
    });
    setShowConfigModal(true);
  };

  const addNewUnit = () => {
    setEditingUnit({ tempId: Date.now(), isTemporary: true });
    setUnitForm({ label: '', floor: '', description: '' });
    setShowConfigModal(true);
  };

  async function fetchMessages(tenantId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('admin_id', userProfile.id)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUnit?.tenant) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          admin_id: userProfile.id,
          tenant_id: selectedUnit.tenant.id,
          from_id: userProfile.id,
          to_id: selectedUnit.tenant.id,
          from_name: userProfile.name,
          message: newMessage.trim(),
          date: new Date().toISOString(),
          read: false
        });
      
      if (error) throw error;
      
      setNewMessage('');
      await fetchMessages(selectedUnit.tenant.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="card" style={{textAlign: 'center', padding: 40}}>
        <div style={{fontSize: 24, marginBottom: 16}}>🏢</div>
        <div>Loading occupancy grid...</div>
      </div>
    );
  }

  const occupiedCount = tenants.length;
  const vacantCount = units.length - occupiedCount;
  const vacancyRate = Math.round((vacantCount / units.length) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: 24}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
          <div>
            <h2 style={{margin: 0}}>🏢 Occupancy Grid</h2>
            <p style={{margin: '4px 0 0 0', color: 'var(--gray)'}}>
              {occupiedCount} occupied / {units.length} total units • {vacancyRate}% vacant
            </p>
          </div>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="btn btn-primary"
            style={{padding: '10px 20px'}}
          >
            ⚙️ Configure Units
          </button>
        </div>
        
        {/* Legend */}
        <div style={{display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <div style={{width: 16, height: 16, borderRadius: 4, background: '#10b981'}}></div>
            <span style={{fontSize: 13}}>Paid</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <div style={{width: 16, height: 16, borderRadius: 4, background: '#f59e0b'}}></div>
            <span style={{fontSize: 13}}>Pending</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <div style={{width: 16, height: 16, borderRadius: 4, background: '#ef4444'}}></div>
            <span style={{fontSize: 13}}>Overdue</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
            <div style={{width: 16, height: 16, borderRadius: 4, background: '#94a3b8'}}></div>
            <span style={{fontSize: 13}}>Vacant</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 12,
        marginBottom: 24
      }}>
        {units.map((unit) => {
          // Find tenant for this unit
          const tenant = tenants.find(t => {
            const tenantHouse = t.house?.toUpperCase().trim();
            const unitLabel = unit.label.toUpperCase().trim();
            return tenantHouse === unitLabel;
          });
          
          const status = getTenantStatus(tenant);
          
          return (
            <button
              key={unit.id}
              onClick={() => setSelectedUnit({ number: unit.label, tenant, unit })}
              onContextMenu={(e) => {
                e.preventDefault();
                editUnit(unit);
              }}
              style={{
                padding: '16px 8px',
                borderRadius: 10,
                border: selectedUnit?.number === unit.label ? '3px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                background: status.bg,
                color: '#1f2937',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                position: 'relative'
              }}
            >
              <div style={{fontSize: 15, fontWeight: 700, marginBottom: 4}}>{unit.label}</div>
              {unit.floor && unit.floor !== unit.label.charAt(0) && (
                <div style={{fontSize: 10, color: '#6b7280', marginBottom: 4}}>{unit.floor}</div>
              )}
              <div style={{fontSize: 11, marginTop: 4, color: status.textColor, fontWeight: 600}}>
                {tenant ? tenant.name.split(' ')[0] : 'VACANT'}
              </div>
              {tenant && (
                <div style={{
                  fontSize: 10,
                  marginTop: 4,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: status.color,
                  color: 'white',
                  fontWeight: 600
                }}>
                  {status.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Message Panel */}
      {selectedUnit && (
        <div className="card" style={{padding: 20}}>
          <div style={{marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h3 style={{margin: '0 0 4px 0', fontSize: 18}}>
                💬 Messages - Unit {selectedUnit.number}
              </h3>
              <p style={{margin: 0, fontSize: 13, color: 'var(--gray)'}}>
                {selectedUnit.tenant ? `Chat with ${selectedUnit.tenant.name}` : 'No tenant assigned'}
              </p>
            </div>
            <button 
              onClick={() => setSelectedUnit(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: 'var(--gray)',
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          </div>
          
          {selectedUnit.tenant ? (
            <>
              {/* Tenant Info Bar */}
              <div style={{
                padding: 12,
                background: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                gap: 24,
                fontSize: 13,
                flexWrap: 'wrap'
              }}>
                <div><strong>Email:</strong> {selectedUnit.tenant.email}</div>
                <div><strong>Rent:</strong> KSh {parseInt(selectedUnit.tenant.rent || 0).toLocaleString()}</div>
                <div><strong>Status:</strong> {selectedUnit.tenant.status || 'Unknown'}</div>
                <div><strong>Unit:</strong> {selectedUnit.tenant.house}</div>
              </div>
              
              {/* Messages */}
              <div style={{
                maxHeight: 350,
                overflowY: 'auto',
                marginBottom: 16,
                padding: 16,
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 8
              }}>
                {messages.length === 0 ? (
                  <div style={{textAlign: 'center', padding: 32, color: 'var(--gray)'}}>
                    <div style={{fontSize: 32, marginBottom: 8}}>💭</div>
                    <div>No messages yet. Start a conversation!</div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromAdmin = msg.from_id === userProfile.id;
                    return (
                      <div key={msg.id} style={{
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: isFromAdmin ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: isFromAdmin ? '#3b82f6' : '#f1f5f9',
                          color: isFromAdmin ? 'white' : '#1f2937'
                        }}>
                          <div style={{fontSize: 11, opacity: 0.7, marginBottom: 4}}>
                            {msg.from_name} • {new Date(msg.date).toLocaleTimeString()}
                          </div>
                          <div style={{fontSize: 14, lineHeight: 1.4}}>{msg.message}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Input */}
              <div style={{display: 'flex', gap: 8}}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedUnit.tenant.name}...`}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 14
                  }}
                />
                <button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    opacity: sending || !newMessage.trim() ? 0.5 : 1
                  }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div style={{textAlign: 'center', padding: 32, color: 'var(--gray)'}}>
              <div style={{fontSize: 32, marginBottom: 8}}>🏠</div>
              <p style={{margin: 0}}>Unit {selectedUnit.number} is currently vacant.</p>
              <p style={{margin: '8px 0 0 0', fontSize: 13}}>
                Go to <strong>Manage Tenants</strong> to assign a tenant to this unit first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
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
          <div className="card" style={{
            maxWidth: 800,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            background: 'white'
          }}>
            <div style={{
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{margin: 0}}>⚙️ Configure Property Units</h2>
              <button 
                onClick={() => {
                  setShowConfigModal(false);
                  setEditingUnit(null);
                  setUnitForm({ label: '', floor: '', description: '' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--gray)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Add/Edit Unit Form */}
            <div style={{
              padding: 16,
              background: '#f8fafc',
              borderRadius: 8,
              marginBottom: 20
            }}>
              <h3 style={{margin: '0 0 12px 0', fontSize: 16}}>
                {editingUnit?.isTemporary || !editingUnit?.id || editingUnit.id?.startsWith('temp-') ? 'Add New Unit' : 'Edit Unit'}
              </h3>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
                <div>
                  <label style={{display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600}}>
                    Unit Label *
                  </label>
                  <input
                    type="text"
                    value={unitForm.label}
                    onChange={(e) => setUnitForm({...unitForm, label: e.target.value})}
                    placeholder="e.g., C16, B12, Ground Floor 1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600}}>
                    Floor/Block
                  </label>
                  <input
                    type="text"
                    value={unitForm.floor}
                    onChange={(e) => setUnitForm({...unitForm, floor: e.target.value})}
                    placeholder="e.g., Block A, Ground Floor"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>
              <div style={{marginBottom: 12}}>
                <label style={{display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 600}}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({...unitForm, description: e.target.value})}
                  placeholder="e.g., 2 bedroom, Studio, Commercial space"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{display: 'flex', gap: 8}}>
                <button 
                  onClick={handleSaveUnit}
                  className="btn btn-primary"
                  style={{padding: '8px 16px'}}
                >
                  {editingUnit?.isTemporary || !editingUnit?.id || editingUnit.id?.startsWith('temp-') ? 'Add Unit' : 'Update Unit'}
                </button>
                {editingUnit && (
                  <button 
                    onClick={() => {
                      setEditingUnit(null);
                      setUnitForm({ label: '', floor: '', description: '' });
                    }}
                    className="btn"
                    style={{padding: '8px 16px'}}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Units List */}
            <div>
              <h3 style={{margin: '0 0 12px 0', fontSize: 16}}>
                Current Units ({units.length}) / Tenant Limit ({tenantLimit})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
                maxHeight: 400,
                overflowY: 'auto'
              }}>
                {units.map((unit) => {
                  const tenant = tenants.find(t => t.house?.toUpperCase() === unit.label.toUpperCase());
                  return (
                    <div key={unit.id} style={{
                      padding: 12,
                      background: tenant ? '#d1fae5' : '#f8fafc',
                      borderRadius: 6,
                      border: `1px solid ${tenant ? '#10b981' : 'var(--border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{fontWeight: 600}}>{unit.label}</div>
                        {unit.floor && (
                          <div style={{fontSize: 12, color: 'var(--gray)'}}>{unit.floor}</div>
                        )}
                        {tenant && (
                          <div style={{fontSize: 11, color: '#059669', marginTop: 2, fontWeight: 600}}>
                            ✓ {tenant.name.split(' ')[0]}
                          </div>
                        )}
                        {unit.isTemporary && (
                          <div style={{fontSize: 10, color: '#94a3b8', marginTop: 2}}>
                            Auto-generated
                          </div>
                        )}
                      </div>
                      <div style={{display: 'flex', gap: 4}}>
                        <button 
                          onClick={() => editUnit(unit)}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ✏️
                        </button>
                        {!tenant && !unit.isTemporary && (
                          <button 
                            onClick={() => handleDeleteUnit(unit)}
                            style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              marginTop: 20,
              padding: 12,
              background: '#eff6ff',
              borderRadius: 6,
              fontSize: 13,
              color: '#1e40af'
            }}>
              <strong>💡 Tip:</strong> Your tenant limit is {tenantLimit} units (set by Supreme Admin). 
              Auto-generated units fill up to this limit. Edit any unit to customize it.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}