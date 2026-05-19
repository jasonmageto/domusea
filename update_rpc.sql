-- Create or replace the unified activation RPC
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION activate_admin_subscription_v2(
  p_admin_id UUID,
  p_amount DECIMAL,
  p_method TEXT,
  p_reference TEXT,
  p_next_due TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  -- 1. Update or Insert the payment record in admin_to_sa_payments
  -- This ensures the Supreme Admin sees the payment in their dashboard
  INSERT INTO admin_to_sa_payments (
    admin_id, 
    amount, 
    method, 
    reference, 
    status, 
    date,
    note
  )
  VALUES (
    p_admin_id, 
    p_amount, 
    p_method, 
    p_reference, 
    'Confirmed', 
    NOW(),
    'Automated payment verification'
  )
  ON CONFLICT (reference) DO UPDATE SET
    status = 'Confirmed',
    date = NOW(),
    note = 'Automated payment verification (updated)';

  -- 2. Update the admin's subscription status and due date
  UPDATE admins
  SET 
    subscription_status = 'Active',
    subscription_due = p_next_due,
    frozen = false,
    last_subscription_check = NOW()
  WHERE id = p_admin_id;

  -- 3. Unfreeze all tenants under this admin
  UPDATE tenants
  SET 
    frozen = false,
    frozen_reason = NULL
  WHERE admin_id = p_admin_id 
    AND (frozen_reason LIKE 'Admin subscription overdue%' OR frozen_reason IS NULL);

  -- 4. Log the activity
  INSERT INTO activity_log (type, message, admin_id)
  VALUES (
    'subscription_paid', 
    'Subscription automatically renewed via ' || p_method || '. Reference: ' || p_reference, 
    p_admin_id
  );

END;
$$ LANGUAGE plpgsql;
