import { useState, useEffect } from 'react';
import { getPremiumPackages } from '../lib/premiumApi';

export default function PremiumOverlay({ onUnlock, session }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const data = await getPremiumPackages();
        setPackages(data);
      } catch (error) {
        console.error('Failed to load packages:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, []);

  if (session) {
    // Show session info instead of payment prompt
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="card p-6 max-w-md mx-4 text-center animate-fadeIn">
          <div className="text-4xl mb-4">🔓</div>
          <h3 className="text-xl font-bold mb-2">Premium Access Active</h3>
          <p className="text-muted mb-4">
            You have {session.package?.name} access.
          </p>
          <div className="text-sm text-muted mb-4">
            Expires: {new Date(session.expires_at).toLocaleString()}
          </div>
          <button 
            onClick={onUnlock}
            className="btn btn-primary"
          >
            View Property Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card p-6 max-w-md mx-4 w-full animate-fadeIn">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🗺️</div>
          <h2 className="text-2xl font-bold mb-2">Unlock Apartment Locations</h2>
          <p className="text-muted">
            Get instant access to apartment locations, owner contacts, and navigation.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {packages.map(pkg => (
              <button
                key={pkg.id}
                onClick={onUnlock}
                className="w-full card p-4 hover:border-primary transition text-left flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{pkg.name}</div>
                  <div className="text-sm text-muted">{pkg.description}</div>
                </div>
                <div className="text-primary font-bold">KSh {pkg.price_kes}</div>
              </button>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-muted space-y-1">
          <div>✓ No account required</div>
          <div>✓ Instant access after payment</div>
          <div>✓ Secure & encrypted</div>
          <div className="pt-2">
            Payments processed via M-Pesa, Airtel, Visa, Mastercard, PayPal
          </div>
        </div>
      </div>
    </div>
  );
}