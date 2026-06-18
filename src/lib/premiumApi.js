// src/lib/premiumApi.js
import { supabase } from '../supabaseClient';
import { getDeviceFingerprint, getBrowserFingerprint } from './fingerprint';

// ==========================================
// PREMIUM PACKAGES
// ==========================================

export async function getPremiumPackages() {
  const { data, error } = await supabase
    .from('premium_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_kes');
  
  if (error) throw error;
  return data;
}

// ==========================================
// PAYMENT INITIATION
// ==========================================

export async function initiatePremiumPayment({ packageId, paymentMethod, phoneNumber, email }) {
  // 1. Get package details
  const { data: packageData, error: pkgError } = await supabase
    .from('premium_packages')
    .select('*')
    .eq('id', packageId)
    .eq('is_active', true)
    .single();
  
  if (pkgError || !packageData) {
    throw new Error('Invalid package selected');
  }

  // 2. Generate unique transaction reference
  const transactionRef = `PREM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // 3. Create payment record
  const { data: payment, error: payError } = await supabase
    .from('premium_payments')
    .insert({
      package_id: packageId,
      amount_kes: packageData.price_kes,
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      phone_number: phoneNumber,
      email: email,
      status: 'pending',
      metadata: {
        initiated_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: await getPublicIP() // You'll need to implement this
      }
    })
    .select()
    .single();
  
  if (payError) throw payError;

  // 4. Initiate payment with gateway (mock - replace with actual gateway)
  const paymentResult = await processPaymentWithGateway({
    transactionRef,
    amount: packageData.price_kes,
    method: paymentMethod,
    phoneNumber,
    email,
    metadata: {
      package_name: packageData.name,
      duration: packageData.duration_minutes
    }
  });

  // 5. Update payment status based on gateway response
  if (paymentResult.success) {
    await confirmPremiumPayment(payment.id, paymentResult.gatewayData);
    return { success: true, payment, session: paymentResult.session };
  } else {
    await supabase
      .from('premium_payments')
      .update({ status: 'failed', metadata: { ...payment.metadata, error: paymentResult.error } })
      .eq('id', payment.id);
    throw new Error(paymentResult.error || 'Payment initiation failed');
  }
}

// Mock payment gateway - REPLACE WITH ACTUAL INTEGRATION
async function processPaymentWithGateway({ transactionRef, amount, method, phoneNumber, email, metadata }) {
  // This is where you integrate with:
  // - M-Pesa STK Push (Daraja API)
  // - Airtel Money API
  // - Stripe/PayPal for cards
  // - etc.
  
  // For demo purposes, simulate successful payment after 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a secure session token
  const sessionToken = crypto.randomUUID(); // Or use generate_secure_token() via RPC
  
  return {
    success: true,
    gatewayData: {
      transaction_id: `GW-${Date.now()}`,
      status: 'completed'
    },
    session: {
      token: sessionToken,
      expires_at: new Date(Date.now() + (metadata.duration * 60 * 1000)).toISOString()
    }
  };
}

// ==========================================
// PAYMENT VERIFICATION & SESSION CREATION
// ==========================================

export async function confirmPremiumPayment(paymentId, gatewayData) {
  // 1. Update payment to confirmed
  const { data: payment, error: payError } = await supabase
    .from('premium_payments')
    .update({
      status: 'confirmed',
      metadata: { 
        ...(await getPayment(paymentId)).metadata,
        confirmed_at: new Date().toISOString(),
        gateway_response: gatewayData
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select()
    .single();
  
  if (payError) throw payError;

  // 2. Get package details
  const { data: packageData } = await supabase
    .from('premium_packages')
    .select('*')
    .eq('id', payment.package_id)
    .single();

  // 3. Generate fingerprints
  const deviceFingerprint = await getDeviceFingerprint();
  const browserFingerprint = await getBrowserFingerprint();

  // 4. Create access session
  const expiresAt = new Date(Date.now() + (packageData.duration_minutes * 60 * 1000));
  
  const { data: session, error: sessError } = await supabase
    .from('premium_access_sessions')
    .insert({
      payment_id: paymentId,
      session_token: await generateSecureToken(), // Use RPC function or crypto
      device_fingerprint: deviceFingerprint,
      browser_fingerprint: browserFingerprint,
      ip_address: await getPublicIP(),
      package_id: payment.package_id,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .select()
    .single();
  
  if (sessError) throw sessError;

  // 5. Return session (store in localStorage/cookie on frontend)
  return {
    session_token: session.session_token,
    expires_at: session.expires_at,
    package: packageData
  };
}

// Helper to generate secure token (client-side fallback)
async function generateSecureToken() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'token-' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Helper to get public IP (optional, for logging)
async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch {
    return null;
  }
}

// ==========================================
// SESSION VERIFICATION
// ==========================================

export async function verifyPremiumSession(sessionToken) {
  if (!sessionToken) return { valid: false, reason: 'no_token' };

  // 1. Check session exists and is active
  const { data: session, error } = await supabase
    .from('premium_access_sessions')
    .select(`
      *,
      premium_packages (
        name,
        duration_minutes,
        price_kes
      )
    `)
    .eq('session_token', sessionToken)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !session) {
    return { valid: false, reason: error?.message || 'invalid_session' };
  }

  // 2. Verify device/browser fingerprint (optional strict mode)
  const currentDevice = await getDeviceFingerprint();
  const currentBrowser = await getBrowserFingerprint();
  
  // Allow slight variations in fingerprints (user agent updates, etc.)
  // For strict mode, uncomment these checks:
  /*
  if (session.device_fingerprint !== currentDevice) {
    return { valid: false, reason: 'device_mismatch' };
  }
  if (session.browser_fingerprint !== currentBrowser) {
    return { valid: false, reason: 'browser_mismatch' };
  }
  */

  // 3. Update last activity
  await supabase
    .from('premium_access_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', session.id);

  return {
    valid: true,
    session: {
      token: session.session_token,
      expires_at: session.expires_at,
      package: session.premium_packages,
      issued_at: session.issued_at
    }
  };
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================

export async function revokePremiumSession(sessionToken) {
  const { error } = await supabase
    .from('premium_access_sessions')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('session_token', sessionToken);
  
  if (error) throw error;
  return { success: true };
}

export async function getActivePremiumSession() {
  // Check localStorage for token first (client-side cache)
  const cachedToken = localStorage.getItem('premium_session_token');
  if (cachedToken) {
    const verification = await verifyPremiumSession(cachedToken);
    if (verification.valid) {
      return verification.session;
    }
    // If invalid, clear cache
    localStorage.removeItem('premium_session_token');
  }
  return null;
}

export function storePremiumSession(session) {
  localStorage.setItem('premium_session_token', session.token);
  localStorage.setItem('premium_session_expires', session.expires_at);
}

export function clearPremiumSession() {
  localStorage.removeItem('premium_session_token');
  localStorage.removeItem('premium_session_expires');
}

// ==========================================
// PROTECTED DATA ACCESS
// ==========================================

// Wrapper for fetching protected property data
export async function fetchProtectedProperties(sessionToken, filters = {}) {
  const verification = await verifyPremiumSession(sessionToken);
  if (!verification.valid) {
    throw new Error('Premium access required');
  }

  // Fetch properties with owner contacts (protected fields)
  const query = supabase
    .from('properties')
    .select(`
      *,
      owners:owner_id (
        name,
        phone,
        whatsapp,
        email
      )
    `)
    .eq('is_published', true);

  // Apply filters
  if (filters.location) {
    query.ilike('location', `%${filters.location}%`);
  }
  if (filters.minRent) {
    query.gte('rent', filters.minRent);
  }
  if (filters.maxRent) {
    query.lte('rent', filters.maxRent);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data;
}