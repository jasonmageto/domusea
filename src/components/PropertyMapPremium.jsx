import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import PropertyMap from './PropertyMap'; // Your existing map component
import PremiumOverlay from './PremiumOverlay';
import PremiumPaymentModal from './PremiumPaymentModal';
import { 
  getActivePremiumSession, 
  storePremiumSession, 
  verifyPremiumSession,
  fetchProtectedProperties 
} from '../lib/premiumApi';

export default function PropertyMapPremium({ adminId = null }) {
  const { userProfile } = useAuth();
  const [premiumSession, setPremiumSession] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLocked, setMapLocked] = useState(true);

  // Check for active session on mount
  useEffect(() => {
    const checkSession = async () => {
      const session = await getActivePremiumSession();
      if (session) {
        setPremiumSession(session);
        setMapLocked(false);
        await loadProtectedProperties(session.token);
      } else {
        await loadPublicProperties();
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // Auto-check session expiry every minute
  useEffect(() => {
    if (!premiumSession) return;
    
    const interval = setInterval(async () => {
      const verification = await verifyPremiumSession(premiumSession.token);
      if (!verification.valid) {
        // Session expired
        setPremiumSession(null);
        setMapLocked(true);
        localStorage.removeItem('premium_session_token');
        toast.error('Your premium access has expired. Purchase a new package to continue.');
        clearInterval(interval);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [premiumSession]);

  const loadPublicProperties = async () => {
    // Load properties WITHOUT owner contacts
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, location, latitude, longitude, rent, images, is_available')
      .eq('is_published', true)
      .eq('admin_id', adminId || userProfile?.id);
    
    if (error) {
      toast.error('Failed to load properties');
      return;
    }
    setProperties(data || []);
  };

  const loadProtectedProperties = async (sessionToken) => {
    // Load properties WITH owner contacts (protected)
    try {
      const data = await fetchProtectedProperties(sessionToken, { adminId });
      setProperties(data || []);
    } catch (error) {
      toast.error('Failed to load premium properties');
      setMapLocked(true);
    }
  };

  const handlePaymentSuccess = async (session) => {
    storePremiumSession(session);
    setPremiumSession(session);
    setMapLocked(false);
    setShowPaymentModal(false);
    toast.success('🎉 Premium access activated!');
    await loadProtectedProperties(session.token);
  };

  const handleUnlockClick = () => {
    if (mapLocked) {
      setShowPaymentModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Premium Overlay - shows when map is locked */}
      {mapLocked && (
        <PremiumOverlay 
          onUnlock={handleUnlockClick}
          session={premiumSession}
        />
      )}

      {/* Main Map Component - blurred when locked */}
      <div className={mapLocked ? 'filter blur-sm pointer-events-none select-none' : ''}>
        <PropertyMap 
          properties={properties}
          showOwnerContacts={!mapLocked}
          adminId={adminId}
          onPropertyClick={mapLocked ? null : undefined}
        />
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PremiumPaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Session Expiry Warning */}
      {premiumSession && !mapLocked && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="card p-3 shadow-lg border border-primary" style={{ maxWidth: 280 }}>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <div>
                <div className="font-semibold text-sm">Premium Active</div>
                <div className="text-xs text-muted">
                  Expires: {new Date(premiumSession.expires_at).toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => {
                  clearPremiumSession();
                  setPremiumSession(null);
                  setMapLocked(true);
                  loadPublicProperties();
                  toast('Premium access revoked');
                }}
                className="text-xs text-danger hover:underline ml-auto"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}