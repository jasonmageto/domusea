import { useState, useEffect } from 'react';

export default function DownloadAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDownload = async () => {
    if (!deferredPrompt) return;

    // Show native install prompt
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  if (isInstalled) return null; // Hide if already installed

  return (
    <button
      onClick={handleDownload}
      disabled={!deferredPrompt}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border-primary)',
        background: deferredPrompt ? 'var(--primary)' : 'var(--bg-faint)',
        color: deferredPrompt ? '#fff' : 'var(--text-muted)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: deferredPrompt ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        if (deferredPrompt) {
          e.currentTarget.style.background = 'var(--primary-dark)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (deferredPrompt) {
          e.currentTarget.style.background = 'var(--primary)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      title="Install DomusEA as a standalone app"
    >
      <i className="fas fa-download"></i>
      <span>Download App</span>
    </button>
  );
}