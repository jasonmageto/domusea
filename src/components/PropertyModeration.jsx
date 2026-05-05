import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function PropertyModeration() {
  const { userProfile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [filter]);

 const fetchProperties = async () => {
  try {
    setRefreshing(true);
    console.log('🔍 Fetching properties for Supreme Admin...');
    
    // 🔥 Simplified query - NO admins relationship
    let query = supabase
      .from('properties')
      .select('*')  // Just fetch properties, no joins
      .order('created_at', { ascending: false });

    // Apply status filter ONLY if explicitly selected
    if (filter === 'pending') {
      query = query.eq('moderation_status', 'pending');
    } else if (filter === 'approved') {
      query = query.eq('moderation_status', 'approved');
    } else if (filter === 'rejected') {
      query = query.eq('moderation_status', 'rejected');
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching properties:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Failed to load properties: ' + error.message);
      setProperties([]);
      return;
    }
    
    console.log('✅ Properties fetched:', data?.length || 0);
    
    // 🔥 If we have properties, fetch admin names separately
    if (data && data.length > 0) {
      const propertiesWithAdmins = await Promise.all(
        data.map(async (prop) => {
          if (prop.property_manager_id) {
            const {  admin } = await supabase
              .from('admins')
              .select('name, email')
              .eq('id', prop.property_manager_id)
              .single();
            
            return { ...prop, admins: admin };
          }
          return prop;
        })
      );
      setProperties(propertiesWithAdmins);
    } else {
      setProperties(data || []);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    toast.error('Failed to load properties');
    setProperties([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const fetchModerationLogs = async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('property_moderation_logs')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const moderateProperty = async (propertyId, action, notes = '') => {
    try {
      const updates = {
        moderation_status: action,
        moderation_notes: notes,
        moderated_by: userProfile?.id,
        sa_visibility_override: action === 'approved',
        is_visible_on_map: action === 'approved',
        approved_by_sa: action === 'approved',
        moderated_at: new Date().toISOString()
      };

      console.log('📝 Updating property:', propertyId, updates);

      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      if (error) throw error;

      toast.success(`Property ${action} successfully`);
      fetchProperties();
      setShowModal(false);
      setSelectedProperty(null);
      setModerationNotes('');
    } catch (error) {
      console.error('Error moderating property:', error);
      toast.error('Failed to moderate property');
    }
  };

  const toggleVisibility = async (propertyId, currentVisibility) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          sa_visibility_override: !currentVisibility,
          is_visible_on_map: !currentVisibility,
          moderated_by: userProfile?.id,
          moderated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;
      toast.success(`Property ${!currentVisibility ? 'made visible' : 'hidden'}`);
      fetchProperties();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  // 🔥 NEW: Delete property permanently
  const deleteProperty = async (propertyId, propertyName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${propertyName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      toast.success(`Property "${propertyName}" deleted successfully`);
      fetchProperties();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const openModerationModal = (property) => {
    setSelectedProperty(property);
    setModerationNotes(property.moderation_notes || '');
    setShowModal(true);
    fetchModerationLogs(property.id);
  };

  const getStatusBadge = (status) => {
    // Handle NULL or undefined status
    const statusKey = status?.toLowerCase() || 'pending';
    
    const badges = {
      pending: { color: '#f59e0b', label: '⏳ Pending' },
      approved: { color: '#10b981', label: '✅ Approved' },
      rejected: { color: '#ef4444', label: '❌ Rejected' },
      suspended: { color: '#6b7280', label: '⚠️ Suspended' }
    };
    const badge = badges[statusKey] || badges.pending;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: badge.color,
        color: 'white',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {badge.label}
      </span>
    );
  };

  // Calculate stats
  const stats = {
    pending: properties.filter(p => (p.moderation_status || 'pending').toLowerCase() === 'pending').length,
    approved: properties.filter(p => p.moderation_status?.toLowerCase() === 'approved').length,
    rejected: properties.filter(p => p.moderation_status?.toLowerCase() === 'rejected').length,
    total: properties.length
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <div>Loading properties for review...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>
            🛡️ Property Moderation
          </h2>
          <button 
            onClick={fetchProperties}
            disabled={refreshing}
            className="btn"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        <p style={{ margin: 0, color: 'var(--gray)' }}>
          Review and approve properties before they appear on the public map
        </p>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '4px' }}>Pending Review</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.pending}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '4px' }}>Approved</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.approved}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '4px' }}>Rejected</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.rejected}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '4px' }}>Total Properties</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.total}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f} {f === 'all' ? `(${stats.total})` : f === 'pending' ? `(${stats.pending})` : f === 'approved' ? `(${stats.approved})` : `(${stats.rejected})`}
            </button>
          ))}
        </div>
      </div>

      {/* Properties List */}
      <div className="card">
        {properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>No properties found</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="btn btn-sm" style={{ marginTop: 12 }}>
                View All Properties
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Property</th>
                  <th style={{ padding: '12px' }}>Manager</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Visibility</th>
                  <th style={{ padding: '12px' }}>Units</th>
                  <th style={{ padding: '12px' }}>Created</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const isPending = !property.moderation_status || property.moderation_status.toLowerCase() === 'pending';
                  
                  return (
                    <tr key={property.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{property.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--gray)' }}>
                          {property.address}, {property.city}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{property.admins?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                          {property.admins?.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {getStatusBadge(property.moderation_status)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={property.is_visible_on_map}
                            onChange={() => toggleVisibility(property.id, property.is_visible_on_map)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px' }}>
                            {property.is_visible_on_map ? 'Visible' : 'Hidden'}
                          </span>
                        </label>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{property.vacant_units} vacant</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                          of {property.total_units} total
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--gray)' }}>
                        {new Date(property.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {isPending && (
                            <button
                              onClick={() => openModerationModal(property)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => setShowDeleteConfirm(property)}
                            className="btn"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '12px',
                              background: '#fee2e2',
                              color: '#dc2626'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moderation Modal */}
      {showModal && selectedProperty && (
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
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>📋 Moderate Property</h3>
              <p style={{ margin: 0, color: 'var(--gray)', fontSize: '14px' }}>
                Review property details and take action
              </p>
            </div>

            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>{selectedProperty.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div><strong>Manager:</strong> {selectedProperty.admins?.name}</div>
                <div><strong>Location:</strong> {selectedProperty.city}</div>
                <div><strong>Total Units:</strong> {selectedProperty.total_units}</div>
                <div><strong>Vacant:</strong> {selectedProperty.vacant_units}</div>
                <div><strong>Coordinates:</strong> {selectedProperty.latitude}, {selectedProperty.longitude}</div>
                <div><strong>Created:</strong> {new Date(selectedProperty.created_at).toLocaleString()}</div>
              </div>
            </div>

            {(selectedProperty.moderation_status || 'pending').toLowerCase() === 'pending' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Moderation Notes (Optional)
                </label>
                <textarea
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                  style={{ width: '100%', marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => moderateProperty(selectedProperty.id, 'approved', moderationNotes)}
                    className="btn"
                    style={{ background: '#10b981', color: 'white', flex: 1 }}
                  >
                    ✅ Approve Property
                  </button>
                  <button
                    onClick={() => moderateProperty(selectedProperty.id, 'rejected', moderationNotes)}
                    className="btn"
                    style={{ background: '#ef4444', color: 'white', flex: 1 }}
                  >
                    ❌ Reject Property
                  </button>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px 0' }}>📜 Moderation History</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {logs.map((log) => (
                    <div key={log.id} style={{
                      padding: '12px',
                      background: 'var(--bg)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{log.action}</strong>
                        <span style={{ color: 'var(--gray)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--gray)' }}>By: {log.moderated_by_name}</div>
                      {log.notes && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>"{log.notes}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProperty(null);
                setModerationNotes('');
              }}
              className="btn"
              style={{ marginTop: '20px', width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Delete Property?</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--gray)' }}>
              Are you sure you want to permanently delete <strong>"{showDeleteConfirm.name}"</strong>? 
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProperty(showDeleteConfirm.id, showDeleteConfirm.name)}
                className="btn"
                style={{ 
                  flex: 1, 
                  background: '#ef4444', 
                  color: 'white' 
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}