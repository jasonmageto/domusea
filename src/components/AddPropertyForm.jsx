import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

// 🔥 Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

// 🔥 Reverse geocode to get address from coordinates
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

export default function AddPropertyForm({ onBack }) {
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1);
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

  // 🔥 Handle location selection from map click
  const handleMapLocationSelect = async (lat, lng) => {
    setLocation({ lat, lng });
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString()
    });
    setAddressVerified(true);
    
    // Auto-get address from coordinates
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setFormData(prev => ({
        ...prev,
        address: address.split(',')[0],
        city: address.split(',')[1]?.trim() || ''
      }));
    }
    
    toast.success('Location selected! You can refine by clicking again.');
  };

  // 🔥 Quick location presets for Kenya
  const quickLocations = [
    { name: 'Nairobi', lat: -1.286389, lng: 36.817223 },
    { name: 'Kilifi', lat: -3.630278, lng: 39.850000 },
    { name: 'Mombasa', lat: -4.043477, lng: 39.668206 },
    { name: 'Kisumu', lat: -0.091702, lng: 34.767956 },
    { name: 'Nakuru', lat: -0.303099, lng: 36.080025 },
    { name: 'Eldoret', lat: 0.514277, lng: 35.269779 },
  ];

  const handleQuickLocation = (loc) => {
    setLocation({ lat: loc.lat, lng: loc.lng });
    setFormData({
      ...formData,
      latitude: loc.lat.toString(),
      longitude: loc.lng.toString(),
      city: loc.name,
      address: loc.name + ', Kenya'
    });
    setAddressVerified(true);
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
      // Allow skipping location
      if (!formData.latitude || !formData.longitude) {
        const confirm = window.confirm(
          '⚠️ No location selected!\n\nYou can add the property location later from Property Settings.\n\nContinue without location?'
        );
        if (!confirm) return false;
      }
      // If location is set, validate Kenya bounds
      if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (lat < -5 || lat > 5 || lng < 33 || lng > 42) {
          if (!window.confirm('This location appears to be outside Kenya. Continue anyway?')) {
            return false;
          }
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
      const { data: existingProperties, error: duplicateError } = await supabase
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
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
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
        
        alert(`Error inserting property:\n\nMessage: ${error.message}\nCode: ${error.code}\n\nDetails: ${JSON.stringify(error.details || 'none')}`);
        
        throw error;
      }

      toast.success('Property submitted for approval! It will appear once verified by Supreme Admin.');

      // Simple redirect
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
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
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
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
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
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
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
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={nextStep} className="btn btn-primary" style={{ padding: '12px 24px' }}>
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
                  <>📍 Use My Current Location (GPS)</>
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
                  placeholder="Type address (e.g., 'Ngong Road Nairobi', 'Kilifi')"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchAddress(e.target.value);
                  }}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
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
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                          ':hover': { background: '#f9fafb' }
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{s.display_name.split(',')[0]}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{s.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🔥 QUICK LOCATION PRESETS */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  🏙️ Quick Select - Common Locations
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                  {quickLocations.map((loc) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => handleQuickLocation(loc)}
                      style={{
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textAlign: 'center',
                        ':hover': { background: '#eff6ff', borderColor: '#3b82f6' }
                      }}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🔥 INTERACTIVE MAP - CLICK TO SELECT */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  🗺️ Or Click on Map to Select Location
                </label>
                <div style={{
                  height: '300px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                  marginBottom: '8px'
                }}>
                  <MapContainer
                    center={location ? [location.lat, location.lng] : [-1.2921, 36.8219]}
                    zoom={location ? 15 : 13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='© OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* 🔥 Click handler for map */}
                    <MapClickHandler 
                      onLocationSelect={handleMapLocationSelect}
                    />
                    
                    {location && (
                      <Marker position={[location.lat, location.lng]} icon={DefaultIcon}>
                        <Popup>{formData.name || 'Selected Location'}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gray)', textAlign: 'center' }}>
                  👆 Click anywhere on the map to drop a pin
                </div>
              </div>

              {/* Location Status */}
              {location && (
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#166534'
                }}>
                  ✅ Location selected: {formData.address || 'Custom coordinates'}
                  {formData.city && `, ${formData.city}`}
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                    Lat: {formData.latitude}, Lng: {formData.longitude}
                  </div>
                </div>
              )}

              {/* Hidden inputs */}
              <input type="hidden" name="latitude" value={formData.latitude} />
              <input type="hidden" name="longitude" value={formData.longitude} />

              {/* Navigation */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="button" onClick={prevStep} className="btn" style={{ padding: '12px 24px' }}>← Back</button>
                <button 
                  type="button" 
                  onClick={nextStep} 
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', opacity: location ? 1 : 0.5 }}
                >
                  Continue to Review →
                </button>
              </div>
              
              {/* Skip Option */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('⚠️ Skip location?\n\nYou can add the property location later from Property Settings.')) {
                      nextStep();
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #6b7280',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  ⏭️ Add location later
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
                  <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {formData.address || 'Not set'}, {formData.city || ''}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Location:</strong> {formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : 'Not set'}
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
                      value={formData.caretaker_name || ''}
                      onChange={(e) => setFormData({...formData, caretaker_name: e.target.value})}
                      placeholder="John Kamau"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Phone</label>
                    <input
                      type="tel"
                      value={formData.caretaker_phone || ''}
                      onChange={(e) => setFormData({...formData, caretaker_phone: e.target.value})}
                      placeholder="+254 712 345 678"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
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
                <button type="button" onClick={prevStep} className="btn" style={{ padding: '12px 24px' }}>
                  ← Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, padding: '12px 24px' }}
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