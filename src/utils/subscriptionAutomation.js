// src/utils/subscriptionAutomation.js
import { supabase } from '../supabaseClient';

/**
 * Check and freeze overdue admin subscriptions + their tenants
 * Call this on: SA login, Admin login, or via scheduled Edge Function
 * @param {string} adminId - Optional: check specific admin only
 * @returns {Promise<{frozenAdmins: number, frozenTenants: number}>}
 */
export async function checkAndFreezeOverdueSubscriptions(adminId = null) {
  try {
    // Build query: find admins with overdue subscriptions who aren't already frozen
    let query = supabase
      .from('admins')
      .select('id, name, email, auto_freeze_on_overdue')
      .eq('frozen', false)
      .eq('auto_freeze_on_overdue', true)
      .or(`subscription_status.eq.Pending,subscription_status.eq.Overdue`)
      .lt('subscription_due', new Date().toISOString());

    // If checking specific admin, add filter
    if (adminId) {
      query = query.eq('id', adminId);
    }

    const { data: overdueAdmins, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!overdueAdmins?.length) return { frozenAdmins: 0, frozenTenants: 0 };

    let frozenAdminCount = 0;
    let frozenTenantCount = 0;

    // Freeze each overdue admin + their tenants
    for (const admin of overdueAdmins) {
      // 1. Freeze the admin
      const { error: adminUpdateError } = await supabase
        .from('admins')
        .update({
          frozen: true,
          subscription_status: 'Overdue',
          last_subscription_check: new Date().toISOString()
        })
        .eq('id', admin.id);
      
      if (adminUpdateError) {
        console.error(`Failed to freeze admin ${admin.id}:`, adminUpdateError);
        continue;
      }
      frozenAdminCount++;

      // 2. Freeze all tenants under this admin
      const { data: tenants, error: tenantsFetchError } = await supabase
        .from('tenants')
        .select('id')
        .eq('admin_id', admin.id)
        .eq('frozen', false);

      if (tenantsFetchError) {
        console.error(`Failed to fetch tenants for admin ${admin.id}:`, tenantsFetchError);
        continue;
      }

      if (tenants?.length) {
        const tenantIds = tenants.map(t => t.id);
        const { error: tenantsUpdateError } = await supabase
          .from('tenants')
          .update({
            frozen: true,
            frozen_reason: `Admin subscription overdue - ${admin.name}`
          })
          .in('id', tenantIds);
        
        if (tenantsUpdateError) {
          console.error(`Failed to freeze tenants for admin ${admin.id}:`, tenantsUpdateError);
        } else {
          frozenTenantCount += tenantIds.length;
        }
      }

      // 3. Log the action
      await supabase.from('activity_log').insert({
        type: 'subscription_overdue',
        message: `Admin ${admin.name} (${admin.email}) frozen due to overdue subscription. ${tenants?.length || 0} tenants also frozen.`,
        admin_id: admin.id
      });
    }

    return { frozenAdmins: frozenAdminCount, frozenTenants: frozenTenantCount };

  } catch (error) {
    console.error('Error in subscription automation:', error);
    return { frozenAdmins: 0, frozenTenants: 0, error: error.message };
  }
}

/**
 * Unfreeze admin + tenants when subscription is marked paid
 * @param {string} adminId 
 */
export async function unfreezeAdminAndTenants(adminId) {
  try {
    // Unfreeze admin
    const { error: adminError } = await supabase
      .from('admins')
      .update({
        frozen: false,
        subscription_status: 'Active',
        last_subscription_check: new Date().toISOString()
      })
      .eq('id', adminId);
    
    if (adminError) throw adminError;

    // Unfreeze all tenants under this admin
    const { error: tenantsError } = await supabase
      .from('tenants')
      .update({
        frozen: false,
        frozen_reason: null
      })
      .eq('admin_id', adminId)
      .eq('frozen_reason', `Admin subscription overdue%`); // Only unfreeze those frozen by us
    
    if (tenantsError) throw tenantsError;

    // Log the action
    await supabase.from('activity_log').insert({
      type: 'subscription_paid',
      message: `Admin subscription renewed - account and tenants unfrozen`,
      admin_id: adminId
    });

    return { success: true };
  } catch (error) {
    console.error('Error unfreezing admin:', error);
    return { success: false, error: error.message };
  }
}