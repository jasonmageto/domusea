import { MapContainer, TileLayer, Marker, Popup, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const vacantIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  ">🏠</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const occupiedIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  ">🏢</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

const PropertyMap = ({ filter = 'all', enableRealtime = true }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  const defaultCenter = [-1.2921, 36.8219];

  useEffect(() => {
    fetchProperties();
    getUserLocation();
    
    let channel;
    if (enableRealtime) {
      channel = setupRealtimeSubscription();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [filter]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        (payload) => {
          handleRealtimeUpdate(payload);
          if (payload.eventType === 'UPDATE') {
             const { new: newItem, old: oldItem } = payload;
             if (newItem.vacant_units > oldItem.vacant_units) {
               toast.success(`${newItem.name} now has ${newItem.vacant_units} vacant units!`);
             }
          }
          setLastUpdate(new Date());
        }
      )
      .subscribe();
  };

  const handleRealtimeUpdate = (payload) => {
    if (payload.eventType === 'INSERT') setProperties(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') {
      setProperties(prev => prev.map(prop => prop.id === payload.new.id ? payload.new : prop));
    } else if (payload.eventType === 'DELETE') {
      setProperties(prev => prev.filter(prop => prop.id !== payload.old.id));
    }
  };

  const fetchProperties = async () => {
    try {
      let query = supabase.from('properties').select('*');
      
      // Only show properties that are visible AND approved
      query = query.eq('is_visible_on_map', true)
                   .eq('moderation_status', 'approved');
      
      if (filter === 'vacant') query = query.gt('vacant_units', 0);
      else if (filter === 'full') query = query.eq('vacant_units', 0);

      const { data, error } = await query;
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (property) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}&destination_place_id=${encodeURIComponent(property.name)}`;
    window.open(url, '_blank');
  };

  const openInWaze = (property) => {
    const url = `https://waze.com/ul?ll=${property.latitude},${property.longitude}&navigate=yes`;
    window.open(url, '_blank');
  };

  const getDirections = (property) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${property.latitude},${property.longitude}`;
      window.open(url, '_blank');
    } else {
      openInGoogleMaps(property);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{fontSize: 48, marginBottom: 16}}>🗺️</div>
          <div>Loading Map...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', minHeight: '600px' }}>
      
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <ScaleControl position="bottomleft" metric={true} imperial={false} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={new L.DivIcon({
              className: 'user-location-marker',
              html: `<div style="
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3b82f6;
                border: 3px solid white;
                box-shadow: 0 0 0 rgba(59, 130, 246, 0.5);
                animation: pulse-blue 2s infinite;
              "></div>
              <style>
                @keyframes pulse-blue {
                  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                  70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
              </style>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}

        <MapUpdater center={selectedProperty ? [selectedProperty.latitude, selectedProperty.longitude] : null} />

        {properties.map((property) => {
          const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, property.latitude, property.longitude) : null;
          
          return (
            <Marker
              key={property.id}
              position={[property.latitude, property.longitude]}
              icon={property.vacant_units > 0 ? vacantIcon : occupiedIcon}
              eventHandlers={{ click: () => setSelectedProperty(property) }}
            >
              <Popup maxWidth={350} className="custom-popup">
                <div style={{ minWidth: '280px', padding: '8px' }}>
                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#2d3748' }}>
                      {property.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>
                      📍 {property.address}, {property.city}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: '#f7fafc', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: property.vacant_units > 0 ? '#48bb78' : '#f56565' }}>
                        {property.vacant_units}
                      </div>
                      <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase' }}>Vacant Units</div>
                    </div>
                    <div style={{ background: '#f7fafc', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#4299e1' }}>
                        {property.total_units}
                      </div>
                      <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase' }}>Total Units</div>
                    </div>
                  </div>

                  {distance && (
                    <div style={{ 
                      background: '#ebf8ff', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      marginBottom: '12px',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#2b6cb0',
                      fontWeight: '600'
                    }}>
                      📍 {distance} km from your location
                    </div>
                  )}

                  {property.caretaker_name && (
                    <div style={{ marginBottom: '12px', padding: '8px', background: '#f0fff4', borderRadius: '6px' }}>
                      <div style={{ fontSize: '13px', color: '#2f855a', marginBottom: '4px' }}>
                        <strong>👤 Caretaker:</strong> {property.caretaker_name}
                      </div>
                      {property.caretaker_phone && (
                        <a 
                          href={`tel:${property.caretaker_phone}`}
                          style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}
                        >
                          📞 {property.caretaker_phone}
                        </a>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => getDirections(property)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🧭 Get Directions
                    </button>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openInGoogleMaps(property)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗺️ Google Maps
                      </button>
                      <button
                        onClick={() => openInWaze(property)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🚗 Waze
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={getUserLocation}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'white',
            border: '2px solid var(--border)',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
          title="Find My Location"
        >
          📍
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        background: 'var(--card-bg)',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        border: '1px solid var(--border)',
        fontSize: '13px',
        minWidth: '180px'
      }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--text)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
          📍 Map Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#48bb78', border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>Vacant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f56565', border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>Occupied</span>
        </div>
        {userLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <span style={{ color: 'var(--text)', fontWeight: '500' }}>Your Location</span>
          </div>
        )}
        {enableRealtime && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px', 
            borderTop: '2px solid var(--border)', 
            fontSize: '11px', 
            color: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600'
          }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: 'var(--green)',
              animation: 'pulse 2s infinite'
            }}></div>
            Live Updates Active
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PropertyMap;