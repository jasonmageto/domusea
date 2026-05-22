import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function PropertyModeration() {
  const { userProfile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [filter]);

  const fetchProperties = async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching properties for moderation...');
      
      // Build base query
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('moderation_status', filter);
      }

      // Execute query
      const { data, error: queryError } = await query;
      
      if (queryError) {
        console.error('❌ Database error:', queryError);
        throw queryError;
      }
      
      console.log('✅ Properties fetched:', data?.length || 0);
      
      // If we have properties, try to fetch admin details separately
      let propertiesWithAdmins = data || [];
      
      if (data && data.length > 0) {
        propertiesWithAdmins = await Promise.all(
          data.map(async (prop) => {
            if (prop.property_manager_id) {
              try {
                // ✅ FIXED: Correct destructuring { data: admin }
                const { data: admin, error: adminError } = await supabase
                  .from('admins')
                  .select('name, email')
                  .eq('id', prop.property_manager_id)
                  .maybeSingle();
                
                if (!adminError && admin) {
                  return { ...prop, admins: admin };
                }
              } catch (err) {
                console.warn('Could not fetch admin for property:', prop.id);
              }
            }
            return prop;
          })
        );
      }
      
      setProperties(propertiesWithAdmins);
      
    } catch (err) {
      console.error('❌ Error fetching properties:', err);
      setError(err.message || 'Failed to load properties');
      setProperties([]);
    } finally {
      // ✅ CRITICAL: Always stop loading
      setLoading(false);
      setRefreshing(false);
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

      alert(`Property ${action} successfully`);
      fetchProperties();
      setShowModal(false);
      setSelectedProperty(null);
      setModerationNotes('');
    } catch (err) {
      console.error('Error moderating property:', err);
      alert('Failed to moderate property: ' + err.message);
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
      alert(`Property ${!currentVisibility ? 'made visible' : 'hidden'}`);
      fetchProperties();
    } catch (err) {
      console.error('Error toggling visibility:', err);
      alert('Failed to update visibility');
    }
  };

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

      alert(`Property "${propertyName}" deleted successfully`);
      fetchProperties();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Failed to delete property');
    }
  };

  const openModerationModal = (property) => {
    setSelectedProperty(property);
    setModerationNotes(property.moderation_notes || '');
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const statusKey = status?.toLowerCase() || 'pending';
    
    const badges = {
      pending: { color: '#f59e0b', label: '⏳ Pending' },
      approved: { color: '#10b981', label: '✅ Approved' },
      rejected: { color: '#ef4444', label: '❌ Rejected' },
      suspended: { color: '#6b7280', label: '⚠️ Suspended' }
    };
    
    const badge = badges[statusKey] || badges.pending;
    return (
      <span className="badge" style={{
        background: badge.color,
        color: 'white'
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

  // Loading state
  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center" style={{ minHeight: '300px', padding: '40px' }}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
        <p className="text-muted text-lg">Loading properties for review...</p>
        <p className="text-muted text-sm mt-2">This may take a moment</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card p-6 text-center" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h3 className="text-xl font-bold text-danger mb-2">Error Loading Properties</h3>
        <p className="text-muted mb-4" style={{ maxWidth: '400px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchProperties} className="btn btn-primary">
            🔄 Try Again
          </button>
          <button onClick={() => { setFilter('all'); fetchProperties(); }} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>
            🛡️ Property Moderation
          </h2>
          <button 
            onClick={fetchProperties}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        <p style={{ margin: 0, color: 'var(--gray)' }}>
          Review and approve properties before they appear on the public map
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card warning">
          <div className="stat-header">
            <div>
              <div className="stat-label">Pending Review</div>
              <div className="stat-value text-warning">{stats.pending}</div>
            </div>
            <div className="stat-icon orange"><i className="fas fa-clock"></i></div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-header">
            <div>
              <div className="stat-label">Approved</div>
              <div className="stat-value text-success">{stats.approved}</div>
            </div>
            <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-header">
            <div>
              <div className="stat-label">Rejected</div>
              <div className="stat-value text-danger">{stats.rejected}</div>
            </div>
            <div className="stat-icon red"><i className="fas fa-times-circle"></i></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Total Properties</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-icon blue"><i className="fas fa-building"></i></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f} {f === 'all' ? `(${stats.total})` : f === 'pending' ? `(${stats.pending})` : f === 'approved' ? `(${stats.approved})` : `(${stats.rejected})`}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Table */}
      <div className="card">
        {properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No properties found</p>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}>
              {filter !== 'all' ? `No ${filter} properties` : 'Properties will appear here once submitted'}
            </p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="btn btn-sm">
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
                            checked={property.is_visible_on_map || false}
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
                <div><strong>Manager:</strong> {selectedProperty.admins?.name || 'Unknown'}</div>
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
                  style={{ width: '100%', marginBottom: '12px', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
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

            <button
              onClick={() => {
                setShowModal(false);
                setSelectedProperty(null);
                setModerationNotes('');
              }}
              className="btn btn-secondary"
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
                className="btn btn-secondary"
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