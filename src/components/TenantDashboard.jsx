import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Home, DollarSign, Bell, MessageSquare, Settings, MapPin } from "lucide-react";

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function TenantDashboard({ userProfile }) {
  const [properties, setProperties] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchNearbyProperties();
  }, []);

  async function fetchNearbyProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true)
        .limit(50);
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  }

  return (
    <div className="tenant-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {userProfile?.name || 'Tenant'} 👋</h1>
        <p>Your rental management dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <Home size={24} />
          <div>
            <div className="stat-value">{userProfile?.property || 'N/A'}</div>
            <div className="stat-label">Property</div>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign size={24} />
          <div>
            <div className="stat-value">KSh {userProfile?.rent?.toLocaleString() || '0'}</div>
            <div className="stat-label">Monthly Rent</div>
          </div>
        </div>
        <div className="stat-card">
          <Bell size={24} />
          <div>
            <div className="stat-value">0</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>
      </div>

      {/* ✅ UNRESTRICTED MAP for Authenticated Tenants (No Blur, No Payment) */}
      <div className="map-section">
        <h2 style={{ marginBottom: '16px' }}>📍 Nearby Properties</h2>
        <MapContainer 
          center={[-1.2921, 36.8219]} 
          zoom={12} 
          style={{ height: '400px', width: '100%', borderRadius: '12px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {properties.map((property) => (
            <Marker 
              key={property.id}
              position={[property.latitude, property.longitude]}
            >
              <Popup>
                <h3>{property.title}</h3>
                <p>KSh {property.rent}/month</p>
                <p>{property.location}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#6b7a8f' }}>
          ✅ Full map access for authenticated tenants
        </p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn">
          <DollarSign size={20} />
          <span>Pay Rent</span>
        </button>
        <button className="action-btn">
          <Bell size={20} />
          <span>Submit Request</span>
        </button>
        <button className="action-btn">
          <MessageSquare size={20} />
          <span>Messages</span>
        </button>
        <button className="action-btn">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>

      <style>{`
        .tenant-dashboard {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0B2545;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7a8f;
        }

        .map-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 32px;
        }

        .quick-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #0B2545;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}