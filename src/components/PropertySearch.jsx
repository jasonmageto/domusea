import { useState, useEffect } from 'react';
import PropertyMap from './PropertyMap';
import { supabase } from '../supabaseClient';

const PropertySearch = () => {
  const [filter, setFilter] = useState('all');
  const [showList, setShowList] = useState(true);

  return (
    <div style={{ 
      height: 'calc(100vh - 80px)', 
      display: 'flex', 
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div className="card" style={{ marginBottom: '0', padding: '16px 24px', flex: 'none' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🗺️ Find Your Home</h2>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setFilter('all')}
                className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '6px 0 0 6px' }}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('vacant')}
                className={`btn ${filter === 'vacant' ? 'btn-primary' : ''}`}
              >
                Vacant
              </button>
              <button 
                onClick={() => setFilter('full')}
                className={`btn ${filter === 'full' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '0 6px 6px 0' }}
              >
                Full
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }}></div>

            <button 
              onClick={() => setShowList(!showList)}
              className="btn"
            >
              {showList ? '📍 Map Only' : '📋 List View'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100% - 100px)', gap: '16px' }}>
        <div 
          style={{ 
            width: showList ? '350px' : '0', 
            transition: 'width 0.3s ease', 
            overflowY: 'auto', 
            paddingRight: showList ? '4px' : '0',
            display: showList ? 'block' : 'none'
          }}
        >
          <PropertyList filter={filter} />
        </div>
        <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <PropertyMap filter={filter} enableRealtime={true} />
        </div>
      </div>
    </div>
  );
};

const PropertyList = ({ filter }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, [filter]);

  const fetchProperties = async () => {
    try {
      let query = supabase.from('properties').select('*');
      
      // Only show approved and visible properties
      query = query.eq('is_visible_on_map', true)
                   .eq('moderation_status', 'approved');
      
      if (filter === 'vacant') query = query.gt('vacant_units', 0);
      else if (filter === 'full') query = query.eq('vacant_units', 0);

      const { data, error } = await query;
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '0', border: 'none', boxShadow: 'none', background: 'transparent' }}>
      <div style={{ padding: '12px 0', color: 'var(--gray)', fontSize: '14px' }}>
        <strong>{properties.length}</strong> Properties found
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {properties.map((property) => (
          <div 
            key={property.id} 
            className="card" 
            style={{ 
              marginBottom: '0', 
              padding: '16px', 
              cursor: 'pointer',
              borderLeft: property.vacant_units > 0 ? '4px solid var(--green)' : '4px solid var(--red)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{property.name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray)' }}>{property.address}, {property.city}</p>
              </div>
              <span className={`badge ${property.vacant_units > 0 ? 'status-green' : 'status-red'}`}>
                {property.vacant_units > 0 ? `${property.vacant_units} Vacant` : 'Full'}
              </span>
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text)' }}>
              Total Units: <strong>{property.total_units}</strong>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px', background: 'var(--bg)' }}>
            <p style={{ color: 'var(--gray)' }}>No properties match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertySearch;