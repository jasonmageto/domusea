import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

// Default marker icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export default function AddPropertyForm({ onBack }) {
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1); // 1: Details, 2: Location, 3: Review
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState(null);
  const [addressVerified, setAddressVerified] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    total_units: '',
    vacant_units: '',
    caretaker_name: '',
    caretaker_phone: '',
    is_visible_on_map: true
  });

  // Search address as user types
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', Kenya'
        )}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle address selection
  const handleAddressSelect = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    setLocation({ lat, lng });
    setFormData({
      ...formData,
      address: suggestion.display_name.split(',')[0],
      city: suggestion.display_name.split(',')[1]?.trim() || '',
      latitude: lat.toString(),
      longitude: lng.toString()
    });
    setAddressVerified(true);
    setSuggestions([]);
    setSearchQuery('');
  };

  // 🔥 GET CURRENT LOCATION
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    toast.loading('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLocation({ lat, lng });
        setFormData({
          ...formData,
          latitude: lat.toString(),
          longitude: lng.toString()
        });
        
        // Try to get address from coordinates (Reverse Geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            setFormData(prev => ({
              ...prev,
              address: data.display_name.split(',')[0] || 'Location found',
              city: data.display_name.split(',')[1]?.trim() || ''
            }));
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        }
        
        setAddressVerified(true);
        setGettingLocation(false);
        toast.dismiss();
        toast.success('Location found! You can adjust it on the map.');
      },
      (error) => {
        setGettingLocation(false);
        toast.dismiss();
        
        let errorMessage = 'Failed to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred.';
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Validate before proceeding
  const validateStep = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.total_units) {
        toast.error('Please fill in property name and total units');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.latitude || !formData.longitude) {
        toast.error('Please select a valid location');
        return false;
      }
      // Check if within Kenya bounds (rough)
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (lat < -5 || lat > 5 || lng < 33 || lng > 42) {
        if (!window.confirm('This location appears to be outside Kenya. Continue anyway?')) {
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error('Authentication error. Please login again.');
      setLoading(false);
      return;
    }

    console.log('📝 Submitting property for user:', user.id, user.email);

    // Check for duplicate properties
    const {  existingProperties, error: duplicateError } = await supabase
      .from('properties')
      .select('id, name, latitude, longitude')
      .eq('property_manager_id', user.id);

    if (duplicateError) {
      console.error('Error checking duplicates:', duplicateError);
    }

    const isDuplicate = existingProperties?.some(p => {
      const dist = calculateDistance(
        parseFloat(p.latitude), parseFloat(p.longitude),
        parseFloat(formData.latitude), parseFloat(formData.longitude)
      );
      return p.name.toLowerCase() === formData.name.toLowerCase() || dist < 0.1;
    });

    if (isDuplicate) {
      toast.error('A property with this name or location already exists');
      setLoading(false);
      return;
    }

    // 🔥 CRITICAL: Ensure moderation_status is 'pending'
    const propertyData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      latitude: formData.latitude,
      longitude: formData.longitude,
      total_units: parseInt(formData.total_units),
      vacant_units: parseInt(formData.vacant_units),
      caretaker_name: formData.caretaker_name,
      caretaker_phone: formData.caretaker_phone,
      is_visible_on_map: false, // Hidden until approved
      moderation_status: 'pending', // 🔥 MUST be pending
      approved_by_sa: false,
      sa_visibility_override: false,
      property_manager_id: user.id,
      created_at: new Date().toISOString()
    };

    console.log('📦 Inserting property:', propertyData);

    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select();

    if (error) {
  console.error('❌ INSERT ERROR:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    full_error: error
  });
  
  // Show alert with full error
  alert(`Error inserting property:\n\nMessage: ${error.message}\nCode: ${error.code}\n\nDetails: ${JSON.stringify(error.details || 'none')}`);
  
  throw error;
}

  toast.success('Property submitted for approval! It will appear once verified by Supreme Admin.');

// Simple redirect instead of using onNav
setTimeout(() => {
  window.location.href = '/admin/occupancy';
}, 1000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    toast.error('Failed to add property: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  // Helper: Calculate distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600' }}>
          ➕ Add New Property
        </h2>
        <p style={{ margin: 0, color: 'var(--gray)' }}>
          Step {step} of 3: {step === 1 ? 'Property Details' : step === 2 ? 'Location' : 'Review'}
        </p>
        
        {/* Progress Bar */}
        <div style={{ marginTop: '16px', height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
          <div style={{
            height: '100%',
            width: `${(step / 3) * 100}%`,
            background: 'var(--primary)',
            borderRadius: '2px',
            transition: 'width 0.3s'
          }}></div>
        </div>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Property Details */}
          {step === 1 && (
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>📋 Basic Information</h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sunset Apartments"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                      Total Units *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g., 20"
                      value={formData.total_units}
                      onChange={(e) => setFormData({...formData, total_units: e.target.value})}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                      Vacant Units *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={formData.total_units || 999}
                      placeholder="e.g., 5"
                      value={formData.vacant_units}
                      onChange={(e) => setFormData({...formData, vacant_units: e.target.value})}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the property..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={nextStep} className="btn btn-primary">
                  Continue to Location →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>📍 Property Location</h3>
              
              {/* 🔥 USE CURRENT LOCATION BUTTON */}
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '16px',
                  background: gettingLocation ? '#e5e7eb' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: gettingLocation ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {gettingLocation ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
                    Getting your location...
                  </>
                ) : (
                  <>
                    📍 Use My Current Location
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', margin: '8px 0 16px 0', color: 'var(--gray)', fontSize: '13px' }}>
                — or search by address —
              </div>
              
              {/* Address Search */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  Search Address *
                </label>
                <input
                  type="text"
                  placeholder="Type address (e.g., Ngong Road, Nairobi)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchAddress(e.target.value);
                  }}
                  style={{ width: '100%' }}
                />
                
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => handleAddressSelect(s)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <div style={{ fontWeight: 600 }}>{s.display_name.split(',')[0]}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{s.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Preview */}
              {location && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    height: '300px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid var(--border)'
                  }}>
                    <MapContainer
                      center={[location.lat, location.lng]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='© OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[location.lat, location.lng]} icon={DefaultIcon}>
                        <Popup>{formData.name || 'Property Location'}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#166534'
                  }}>
                    ✅ Location verified: {formData.address || 'Custom Location'}
                    {formData.city && `, ${formData.city}`}
                  </div>
                </div>
              )}

              {/* Hidden inputs for coordinates */}
              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="button" onClick={prevStep} className="btn">
                  ← Back
                </button>
                <button 
                  type="button" 
                  onClick={nextStep} 
                  className="btn btn-primary"
                  disabled={!addressVerified}
                  style={{ opacity: addressVerified ? 1 : 0.5 }}
                >
                  Continue to Review →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {step === 3 && (
            <div>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>✅ Review & Submit</h3>
              
              <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>Property Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div><strong>Name:</strong> {formData.name}</div>
                  <div><strong>Units:</strong> {formData.vacant_units} vacant / {formData.total_units} total</div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {formData.address}, {formData.city}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Location:</strong> {formData.latitude}, {formData.longitude}
                  </div>
                </div>
              </div>

              {/* Caretaker Info */}
              <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>Caretaker Contact (Optional)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                    <input
                      type="text"
                      value={formData.caretaker_name}
                      onChange={(e) => setFormData({...formData, caretaker_name: e.target.value})}
                      placeholder="John Kamau"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Phone</label>
                    <input
                      type="tel"
                      value={formData.caretaker_phone}
                      onChange={(e) => setFormData({...formData, caretaker_phone: e.target.value})}
                      placeholder="+254 712 345 678"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div style={{
                padding: '16px',
                background: formData.is_visible_on_map ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${formData.is_visible_on_map ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_visible_on_map}
                    onChange={(e) => setFormData({...formData, is_visible_on_map: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {formData.is_visible_on_map ? 'Visible on Public Map' : 'Hidden from Public Map'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray)' }}>
                      {formData.is_visible_on_map 
                        ? 'Tenants can find this property on the map' 
                        : 'Property is internal only'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Warning */}
              <div style={{
                padding: '16px',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                ⚠️ <strong>Note:</strong> New properties require Supreme Admin approval before appearing on the public map.
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={prevStep} className="btn">
                  ← Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Submitting...' : '✅ Submit Property'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}