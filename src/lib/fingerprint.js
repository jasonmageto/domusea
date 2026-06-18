// src/lib/fingerprint.js

// Simple device fingerprinting (not cryptographically secure, but sufficient for session binding)
export async function getDeviceFingerprint() {
  const components = [
    navigator.platform,
    navigator.hardwareConcurrency,
    navigator.deviceMemory || 'unknown',
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `dev_${Math.abs(hash).toString(36)}`;
}

export async function getBrowserFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    // Canvas fingerprinting (basic)
    await getCanvasFingerprint()
  ];
  
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `brw_${Math.abs(hash).toString(36)}`;
}

// Basic canvas fingerprinting
async function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('DomusEA', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('DomusEA', 4, 17);
    
    return canvas.toDataURL();
  } catch {
    return 'canvas_unavailable';
  }
}