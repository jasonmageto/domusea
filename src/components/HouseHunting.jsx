import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { 
  Search, Lock, Phone, Mail, ArrowLeft, Heart, 
  MapPin, Home, DollarSign, Calendar, CheckCircle, Building,
  Bed, Bath, Clock
} from "lucide-react";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [1, -38],
  shadowSize: [44, 44]
});

// ========================================
// MAIN COMPONENT: HouseHunting
// ========================================
export default function HouseHunting() {
  const { userProfile } = useAuth();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedProperties, setSavedProperties] = useState(new Set());
  const [accessExpiry, setAccessExpiry] = useState(null);
  
  // Filter states (per Developer Brief)
  const [filters, setFilters] = useState({
    location: '',
    propertyType: '',
    minRent: '',
    maxRent: '',
    bedrooms: ''
  });

  // Initialize component
  useEffect(() => {
    fetchProperties();
    checkAccess();
    fetchSavedProperties();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, properties]);

  // Fetch available properties from Supabase
  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  // Check if user has active access pass (per payment plans)
  async function checkAccess() {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('access_passes')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('is_active', true)
        .eq('payment_status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .maybeSingle();

      if (data && !error) {
        setHasAccess(true);
        setAccessExpiry(new Date(data.expires_at));
      }
    } catch (error) {
      console.log('No active access pass');
    }
  }

  // Fetch user's saved properties
  async function fetchSavedProperties() {
    if (!userProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', userProfile.id);
      if (data && !error) {
        setSavedProperties(new Set(data.map(item => item.property_id)));
      }
    } catch (error) {
      console.error('Error fetching saved properties:', error);
    }
  }

  // Apply all active filters
  function applyFilters() {
    let filtered = [...properties];

    if (filters.location) {
      filtered = filtered.filter(p => 
        p.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.propertyType) {
      filtered = filtered.filter(p => p.property_type === filters.propertyType);
    }
    if (filters.minRent) {
      filtered = filtered.filter(p => p.rent_amount >= parseFloat(filters.minRent));
    }
    if (filters.maxRent) {
      filtered = filtered.filter(p => p.rent_amount <= parseFloat(filters.maxRent));
    }
    if (filters.bedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= parseInt(filters.bedrooms));
    }

    setFilteredProperties(filtered);
  }

  // Handle property click - show details or payment modal
  const handlePropertyClick = (property) => {
    if (hasAccess) {
      setSelectedProperty(property);
    } else {
      setSelectedProperty(property);
      setShowPaymentModal(true);
    }
  };

  // Toggle save/unsave property
  const toggleSaveProperty = async (propertyId) => {
    if (!userProfile?.id) {
      toast.error('Please login to save properties');
      return;
    }
    try {
      if (savedProperties.has(propertyId)) {
        await supabase.from('saved_properties').delete()
          .eq('user_id', userProfile.id)
          .eq('property_id', propertyId);
        setSavedProperties(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
        toast.success('Property removed from saved');
      } else {
        await supabase.from('saved_properties').insert({
          user_id: userProfile.id,
          property_id: propertyId
        });
        setSavedProperties(prev => new Set([...prev, propertyId]));
        toast.success('Property saved successfully');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to save property');
    }
  };

  // ✅ FIX: Back button redirects to Login page (clears session)
  const handleBack = () => {
    localStorage.removeItem('domusea-user');
    localStorage.removeItem('domusea-token');
    localStorage.removeItem('domusea-session-ts');
    window.location.href = '/';
  };

  return (
    <div className="house-hunting-container">
      {/* ===== HEADER ===== */}
      <div className="hh-header">
        <button 
          onClick={handleBack} 
          className="hh-back-btn"
          aria-label="Back to login"
        >
          <ArrowLeft size={18} />
          <span>Back to Login</span>
        </button>
        <div className="header-content">
          <h1>🏠 Find Your Perfect Home</h1>
          <p>Search and explore rental properties across Kenya</p>
        </div>
      </div>

      {/* ===== FILTERS (per Brief) ===== */}
      <div className="hh-filters">
        <div className="filter-group">
          <Search size={16} className="filter-icon" />
          <input
            type="text"
            placeholder="Search by location..."
            value={filters.location}
            onChange={(e) => setFilters({...filters, location: e.target.value})}
            className="hh-filter-input"
            aria-label="Search location"
          />
        </div>
        
        <select
          value={filters.propertyType}
          onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
          className="hh-filter-select"
          aria-label="Property type"
        >
          <option value="">All Property Types</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="studio">Studio</option>
          <option value="bedsitter">Bedsitter</option>
        </select>

        <select
          value={filters.bedrooms}
          onChange={(e) => setFilters({...filters, bedrooms: e.target.value})}
          className="hh-filter-select"
          aria-label="Number of bedrooms"
        >
          <option value="">Any Bedrooms</option>
          <option value="1">1+ Bedroom</option>
          <option value="2">2+ Bedrooms</option>
          <option value="3">3+ Bedrooms</option>
        </select>

        <input
          type="number"
          placeholder="Min KSh"
          value={filters.minRent}
          onChange={(e) => setFilters({...filters, minRent: e.target.value})}
          className="hh-filter-input hh-filter-small"
          aria-label="Minimum rent"
        />
        <input
          type="number"
          placeholder="Max KSh"
          value={filters.maxRent}
          onChange={(e) => setFilters({...filters, maxRent: e.target.value})}
          className="hh-filter-input hh-filter-small"
          aria-label="Maximum rent"
        />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="hh-main">
        {/* Interactive Map (Leaflet) */}
        <div className="hh-map-container">
          <MapContainer 
            center={[-1.2921, 36.8219]} // Nairobi coordinates
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* Show markers only if user has paid access */}
            {hasAccess ? (
              filteredProperties.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.latitude, property.longitude]}
                  icon={customIcon}
                  eventHandlers={{ click: () => handlePropertyClick(property) }}
                >
                  <Popup>
                    <div className="marker-popup">
                      <h3>{property.title}</h3>
                      <p className="popup-rent">KSh {property.rent_amount?.toLocaleString()}/mo</p>
                      <p>{property.location}</p>
                      <div className="popup-details">
                        <span>{property.bedrooms} Beds</span>
                        <span>{property.bathrooms} Baths</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
            ) : (
              <BlurredMapOverlay onUnlock={() => setShowPaymentModal(true)} />
            )}
          </MapContainer>
        </div>

        {/* Property List */}
        <div className="hh-property-list">
          <div className="list-header">
            <h2>{filteredProperties.length} Properties Found</h2>
            {hasAccess && accessExpiry && (
              <div className="access-info">
                <CheckCircle size={14} />
                <span>Premium Access</span>
                <Clock size={14} />
                <span>Expires: {accessExpiry.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>Loading properties...</p>
            </div>
          ) : (
            filteredProperties.map((property) => {
              const placeholderGradient = getPropertyGradient(property.property_type);
              
              return (
                <div 
                  key={property.id} 
                  className="property-card"
                  onClick={() => handlePropertyClick(property)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${property.title}`}
                >
                  {/* Placeholder image (no storage) */}
                  <div className={`property-placeholder ${placeholderGradient}`}>
                    <Building size={48} color="white" />
                    <button
                      className="save-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveProperty(property.id);
                      }}
                      aria-label={savedProperties.has(property.id) ? 'Remove from saved' : 'Save property'}
                    >
                      <Heart 
                        size={20} 
                        fill={savedProperties.has(property.id) ? "red" : "none"}
                        color={savedProperties.has(property.id) ? "red" : "white"}
                      />
                    </button>
                  </div>
                  
                  <div className="property-info">
                    <h3>{property.title}</h3>
                    <p className="property-rent">KSh {property.rent_amount?.toLocaleString()}/month</p>
                    <p className="property-location">
                      <MapPin size={14} />
                      {property.location}
                    </p>
                    <div className="property-details">
                      <span><Bed size={14} /> {property.bedrooms} Beds</span>
                      <span><Bath size={14} /> {property.bathrooms} Baths</span>
                      {property.area_sqft && <span>📐 {property.area_sqft} sqft</span>}
                    </div>
                    {!hasAccess && (
                      <div className="locked-overlay">
                        <Lock size={24} />
                        <span>Unlock to view exact location & contacts</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== PROPERTY DETAILS MODAL ===== */}
      {selectedProperty && (
        <PropertyDetailsModal 
          property={selectedProperty}
          hasAccess={hasAccess}
          isSaved={savedProperties.has(selectedProperty.id)}
          onClose={() => setSelectedProperty(null)}
          onUnlock={() => setShowPaymentModal(true)}
          onSave={() => toggleSaveProperty(selectedProperty.id)}
        />
      )}

      {/* ===== PAYMENT MODAL (per Brief plans) ===== */}
      {showPaymentModal && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={() => {
            setHasAccess(true);
            setShowPaymentModal(false);
            checkAccess();
          }}
        />
      )}

      {/* ===== STYLES ===== */}
      <style>{`
        .house-hunting-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
        }
        .hh-header {
          text-align: center;
          margin-bottom: 24px;
          position: relative;
        }
        .hh-back-btn {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .hh-back-btn:hover { background: var(--bg-faint); }
        .header-content h1 {
          font-size: 2rem;
          color: var(--text-primary);
          margin: 0 0 8px;
        }
        .header-content p {
          color: var(--text-muted);
          margin: 0;
        }
        .hh-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-group {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .filter-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .hh-filter-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-card);
          color: var(--text-primary);
        }
        .hh-filter-select, .hh-filter-input.hh-filter-small {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          background: var(--bg-card);
          color: var(--text-primary);
          min-width: 120px;
        }
        .hh-main {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 20px;
          height: calc(100vh - 220px);
        }
        .hh-map-container {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .hh-property-list {
          overflow-y: auto;
          padding-right: 8px;
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .list-header h2 {
          font-size: 1.25rem;
          margin: 0;
          color: var(--text-primary);
        }
        .access-info {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--success-bg);
          color: var(--success);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .property-card {
          background: var(--bg-card);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .property-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .property-placeholder {
          position: relative;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .property-type-apartment { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
        .property-type-house { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .property-type-studio { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); }
        .property-type-bedsitter { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .save-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.9);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .save-btn:hover { transform: scale(1.1); }
        .property-info { padding: 14px; }
        .property-info h3 {
          margin: 0 0 6px;
          color: var(--text-primary);
          font-size: 1.1rem;
        }
        .property-rent {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--primary);
          margin: 0 0 6px;
        }
        .property-location {
          color: var(--text-muted);
          margin: 0 0 10px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .property-details {
          display: flex;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }
        .property-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .locked-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          gap: 8px;
          backdrop-filter: blur(2px);
        }
        .marker-popup h3 {
          margin: 0 0 4px;
          font-size: 14px;
        }
        .popup-rent {
          font-weight: 700;
          color: var(--primary);
          margin: 0 0 4px;
        }
        .popup-details {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .loading-container {
          text-align: center;
          padding: 40px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .hh-main {
            grid-template-columns: 1fr;
            height: auto;
          }
          .hh-map-container { height: 350px; }
          .hh-back-btn {
            position: static;
            transform: none;
            margin-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}

// Helper: Get placeholder gradient by property type
function getPropertyGradient(type) {
  const gradients = {
    apartment: 'property-type-apartment',
    house: 'property-type-house',
    studio: 'property-type-studio',
    bedsitter: 'property-type-bedsitter'
  };
  return gradients[type] || 'property-type-apartment';
}

// ========================================
// BLURRED MAP OVERLAY (Guest Preview)
// ========================================
function BlurredMapOverlay({ onUnlock }) {
  return (
    <div className="blurred-overlay">
      <div className="overlay-content">
        <div className="lock-icon">🔒</div>
        <h3>Unlock Full Map Access</h3>
        <p>Get exact property locations, landlord contacts, and full details</p>
        <div className="pricing-preview">
          <div className="price-tag">
            <DollarSign size={16} />
            <span>From KSh 50</span>
          </div>
          <div className="price-tag">
            <Clock size={16} />
            <span>1 Hour to 7 Days</span>
          </div>
        </div>
        <button onClick={onUnlock} className="btn btn-primary btn-large">
          View Pricing Plans
        </button>
      </div>
      <style>{`
        .blurred-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .overlay-content {
          background: white;
          padding: 32px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          max-width: 400px;
        }
        .lock-icon { font-size: 64px; margin-bottom: 16px; }
        .overlay-content h3 { 
          margin: 0 0 12px; 
          color: var(--text-primary);
          font-size: 1.5rem;
        }
        .overlay-content p { 
          color: var(--text-muted); 
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .pricing-preview {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .price-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--bg-faint);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

// ========================================
// PROPERTY DETAILS MODAL
// ========================================
function PropertyDetailsModal({ property, hasAccess, isSaved, onClose, onUnlock, onSave }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        
        {/* Placeholder instead of image */}
        <div className={`modal-placeholder ${getPropertyGradient(property.property_type)}`}>
          <Building size={80} color="white" />
          <button className="save-modal-btn" onClick={onSave} aria-label="Save property">
            <Heart size={20} fill={isSaved ? "red" : "none"} color={isSaved ? "red" : "white"} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <div className="modal-body">
          <h2>{property.title}</h2>
          <p className="modal-rent">KSh {property.rent_amount?.toLocaleString()}/month</p>
          
          {hasAccess ? (
            <>
              <p className="modal-location">
                <MapPin size={16} />
                {property.location}
              </p>
              
              {property.description && (
                <div className="modal-description">
                  <h3>Description</h3>
                  <p>{property.description}</p>
                </div>
              )}
              
              <div className="modal-features">
                <div className="feature-grid">
                  <div className="feature-item">
                    <Bed size={18} />
                    <span>{property.bedrooms} Bedrooms</span>
                  </div>
                  <div className="feature-item">
                    <Bath size={18} />
                    <span>{property.bathrooms} Bathrooms</span>
                  </div>
                  {property.area_sqft && (
                    <div className="feature-item">
                      <span>📐</span>
                      <span>{property.area_sqft} sqft</span>
                    </div>
                  )}
                  <div className="feature-item">
                    <span>🏷️</span>
                    <span className="capitalize">{property.property_type}</span>
                  </div>
                </div>
              </div>

              {property.amenities && Object.keys(property.amenities).length > 0 && (
                <div className="modal-amenities">
                  <h3>Amenities</h3>
                  <div className="amenities-grid">
                    {Object.entries(property.amenities)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <span key={key} className="amenity-tag">
                          <CheckCircle size={14} />
                          {key}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Landlord contacts (per Brief) */}
              <div className="landlord-contact">
                <h3>Contact Landlord</h3>
                {property.landlord_phone && (
                  <a href={`tel:${property.landlord_phone}`} className="contact-link">
                    <Phone size={16} /> {property.landlord_phone}
                  </a>
                )}
                {property.landlord_email && (
                  <a href={`mailto:${property.landlord_email}`} className="contact-link">
                    <Mail size={16} /> {property.landlord_email}
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="locked-content">
              <Lock size={64} className="lock-icon-large" />
              <h3>Full Details Locked</h3>
              <p>Purchase access to view exact location, amenities, and landlord contacts</p>
              <button onClick={onUnlock} className="btn btn-primary btn-large">
                Unlock Now - From KSh 50
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 650px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 16px; right: 16px;
          background: white;
          border: none;
          width: 36px; height: 36px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          z-index: 10;
        }
        .modal-placeholder {
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .save-modal-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          background: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .modal-body { padding: 24px; }
        .modal-rent {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin: 8px 0 16px;
        }
        .modal-location {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          margin-bottom: 20px;
        }
        .locked-content {
          text-align: center;
          padding: 40px 20px;
        }
        .lock-icon-large {
          font-size: 64px;
          margin-bottom: 20px;
          color: var(--text-muted);
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin: 16px 0;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--bg-faint);
          border-radius: 8px;
        }
        .amenities-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }
        .amenity-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--success-bg);
          color: var(--success-dark);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
        }
        .contact-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          text-decoration: none;
          padding: 12px;
          background: var(--bg-faint);
          border-radius: 8px;
          margin: 8px 0;
          transition: background 0.2s;
        }
        .contact-link:hover { background: var(--bg-hover); }
        .capitalize { text-transform: capitalize; }
      `}</style>
    </div>
  );
}

// ========================================
// PAYMENT MODAL (per Developer Brief plans)
// ========================================
function PaymentModal({ onClose, onPaymentComplete }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  // Payment plans per Brief: KES 50(1hr), 100(24hrs), 300(7days)
  const plans = [
    { id: '1hour', name: '1 Hour Access', price: 50, duration: '1 hour', popular: false },
    { id: '24hours', name: '24 Hours Access', price: 100, duration: '24 hours', popular: true },
    { id: '7days', name: '7 Days Access', price: 300, duration: '7 days', popular: false }
  ];

  const handlePayment = async () => {
    if (!selectedPlan || !phoneNumber) {
      toast.error('Please select a plan and enter phone number');
      return;
    }

    // Validate Kenyan phone number
    const phoneRegex = /^(07|01)\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712 345 678)');
      return;
    }

    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to continue');
        return;
      }

      // Calculate expiry (access tied to device/browser)
      const now = new Date();
      const expiresAt = new Date();
      
      if (selectedPlan === '1hour') expiresAt.setHours(now.getHours() + 1);
      else if (selectedPlan === '24hours') expiresAt.setDate(now.getDate() + 1);
      else if (selectedPlan === '7days') expiresAt.setDate(now.getDate() + 7);

      const plan = plans.find(p => p.id === selectedPlan);
      
      // Record access pass in database
      const { error } = await supabase.from('access_passes').insert({
        user_id: user.id,
        plan_type: selectedPlan,
        amount_paid: plan.price,
        payment_method: paymentMethod,
        payment_status: 'completed',
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        device_id: navigator.userAgent, // Tie to device/browser
        is_active: true
      });

      if (error) throw error;

      toast.success('Payment successful! Access granted.');
      onPaymentComplete();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        
        <div className="payment-header">
          <h2>Choose Your Access Plan</h2>
          <p>Get full access to property details, exact locations, and landlord contacts</p>
        </div>

        <div className="plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
              role="button"
              tabIndex={0}
              aria-label={`${plan.name} for KSh ${plan.price}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <DollarSign size={20} />
                <span>{plan.price}</span>
              </div>
              <div className="plan-duration">
                <Clock size={14} />
                <span>{plan.duration}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <div className="payment-form">
            <h3>Payment Method</h3>
            
            <div className="payment-methods">
              <button
                className={`method-btn ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('mpesa')}
              >M-Pesa</button>
              <button
                className={`method-btn ${paymentMethod === 'airtel' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('airtel')}
              >Airtel Money</button>
              <button
                className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >Card</button>
            </div>

            <div className="form-group">
              <label>Phone Number (for {paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'airtel' ? 'Airtel Money' : 'Card'})</label>
              <input
                type="tel"
                placeholder="0712 345 678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="form-input"
              />
              <small>Enter your {paymentMethod} registered phone number</small>
            </div>

            <div className="payment-summary">
              <div className="summary-row">
                <span>Plan:</span>
                <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>KSh {plans.find(p => p.id === selectedPlan)?.price}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={processing}
              className="btn btn-primary btn-full btn-large"
            >
              {processing ? (
                <>
                  <span className="spinner-small" />
                  Processing...
                </>
              ) : (
                `Pay KSh ${plans.find(p => p.id === selectedPlan)?.price} Now`
              )}
            </button>

            <p className="payment-note">
              🔒 Secure payment • Access expires automatically • Tied to this device
            </p>
          </div>
        )}

        <style>{`
          .payment-modal {
            background: white;
            padding: 32px;
            border-radius: 16px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
          }
          .payment-header {
            text-align: center;
            margin-bottom: 24px;
          }
          .payment-header h2 {
            margin: 0 0 8px;
            color: var(--text-primary);
          }
          .payment-header p {
            color: var(--text-muted);
            margin: 0;
          }
          .plans-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 24px 0;
          }
          .plan-card {
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 20px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
          }
          .plan-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
          }
          .plan-card.selected {
            border-color: var(--primary);
            background: var(--primary-light);
          }
          .plan-card.popular {
            border-color: var(--primary);
            border-width: 3px;
          }
          .popular-badge {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
          }
          .plan-card h3 {
            margin: 0 0 12px;
            font-size: 14px;
            color: var(--text-primary);
          }
          .plan-price {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin: 12px 0;
          }
          .plan-duration {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-muted);
          }
          .payment-form {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid var(--border);
          }
          .payment-form h3 {
            margin: 0 0 16px;
            color: var(--text-primary);
          }
          .payment-methods {
            display: flex;
            gap: 10px;
            margin: 16px 0;
          }
          .method-btn {
            flex: 1;
            padding: 12px;
            border: 2px solid var(--border);
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .method-btn:hover { border-color: var(--primary); }
          .method-btn.active {
            border-color: var(--primary);
            background: var(--primary-light);
          }
          .form-group { margin: 16px 0; }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-primary);
          }
          .form-input {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--border);
            border-radius: 8px;
            font-size: 16px;
          }
          .form-group small {
            display: block;
            margin-top: 6px;
            color: var(--text-muted);
            font-size: 12px;
          }
          .payment-summary {
            background: var(--bg-faint);
            padding: 16px;
            border-radius: 8px;
            margin: 16px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 14px;
          }
          .summary-row.total {
            font-size: 18px;
            font-weight: 700;
            color: var(--primary);
            border-top: 1px solid var(--border);
            padding-top: 8px;
            margin-top: 12px;
          }
          .payment-note {
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
            margin-top: 12px;
          }
          .spinner-small {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            display: inline-block;
            margin-right: 8px;
          }
        `}</style>
      </div>
    </div>
  );
}