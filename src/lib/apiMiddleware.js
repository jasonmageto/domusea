// src/lib/apiMiddleware.js
import { supabase } from '../supabaseClient';

// Middleware to check premium access for protected routes
export async function requirePremiumAccess(sessionToken, requiredFeature = 'map_access') {
  if (!sessionToken) {
    return { allowed: false, reason: 'no_token' };
  }

  // Verify session server-side
  const { data: session, error } = await supabase
    .from('premium_access_sessions')
    .select(`
      *,
      premium_packages (name, duration_minutes)
    `)
    .eq('session_token', sessionToken)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    return { allowed: false, reason: 'invalid_or_expired' };
  }

  // Optional: Check if session has access to requested feature
  // (Extend premium_packages table with feature flags if needed)
  
  return {
    allowed: true,
    session: {
      token: session.session_token,
      expires_at: session.expires_at,
      package: session.premium_packages
    }
  };
}

// Example usage in an API route:
/*
export async function GET(req) {
  const sessionToken = req.headers.get('x-premium-token');
  const access = await requirePremiumAccess(sessionToken);
  
  if (!access.allowed) {
    return new Response(JSON.stringify({ error: access.reason }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Proceed with protected data fetch
  const { data } = await supabase.from('properties').select('*');
  return Response.json(data);
}
*/