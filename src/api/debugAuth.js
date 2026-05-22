import { supabase } from '../supabaseClient';

export async function debugUserAuth(userId, userEmail) {
  console.log('🔍 DEBUG: Checking user:', userId, userEmail);
  
  // Check admins table
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('*')
    .eq('id', userId)
    .single();
  
  console.log('Admin check:', { admin, adminError });
  
  // Check tenants table
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .single();
  
  console.log('Tenant check:', { tenant, tenantError });
  
  return { admin, tenant, adminError, tenantError };
}