// src/api/paymentCallbacks.js
import { supabaseServer } from '../supabaseServer.js';

/**
 * Unified Payment Callback Handler
 */
export async function handlePaymentCallback(req, res, provider) {
  try {
    console.log(`📥 ${provider} Callback received:`, JSON.stringify(req.body, null, 2));
    
    let result;
    if (provider === 'mpesa') {
      result = await parseMpesaPayload(req.body);
    } else if (provider === 'sasapay') {
      result = await parseSasaPayPayload(req.body);
    }

    if (result && result.success) {
      // 1. Find the admin associated with this transaction
      const { data: paymentRecord, error: fetchError } = await supabaseServer
        .from('admin_to_sa_payments')
        .select('admin_id, amount')
        .eq('reference', result.reference)
        .single();

      if (fetchError || !paymentRecord) {
        console.error('❌ Could not find payment record for reference:', result.reference);
        return { status: 'error', message: 'Record not found' };
      }

      // 2. Calculate next due date
      const { data: admin, error: adminError } = await supabaseServer
        .from('admins')
        .select('subscription_due, subscription_plan')
        .eq('id', paymentRecord.admin_id)
        .single();

      const currentDue = admin.subscription_due ? new Date(admin.subscription_due) : new Date();
      const baseDate = currentDue > new Date() ? currentDue : new Date();
      let nextDue = new Date(baseDate);
      
      if (admin.subscription_plan === 'Annual') nextDue.setFullYear(baseDate.getFullYear() + 1);
      else nextDue.setMonth(baseDate.getMonth() + 1);

      // 3. Update database atomically via RPC
      const { error: rpcError } = await supabaseServer.rpc('activate_admin_subscription_v2', {
        p_admin_id: paymentRecord.admin_id,
        p_amount: paymentRecord.amount,
        p_method: provider.toUpperCase(),
        p_reference: result.externalReference,
        p_next_due: nextDue.toISOString()
      });

      if (rpcError) throw rpcError;

      console.log(`✅ ${provider} Payment Processed Successfully for Admin:`, paymentRecord.admin_id);
      return { status: 'success' };
    } else {
      console.log(`❌ ${provider} Payment Failed or Incomplete:`, result?.message);
      return { status: 'failed', message: result?.message };
    }
  } catch (error) {
    console.error(`❌ ${provider} Callback Error:`, error.message);
    return { status: 'error', error: error.message };
  }
}

async function parseMpesaPayload(body) {
  const stkCallback = body.Body?.stkCallback;
  if (!stkCallback) return { success: false, message: 'Invalid payload' };
  
  if (stkCallback.ResultCode === 0) {
    const metadata = stkCallback.CallbackMetadata?.Item || [];
    return {
      success: true,
      reference: stkCallback.CheckoutRequestID,
      externalReference: metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value,
      amount: metadata.find(item => item.Name === 'Amount')?.Value
    };
  }
  return { success: false, message: stkCallback.ResultDesc };
}

async function parseSasaPayPayload(body) {
  // SasaPay callback structure usually contains status and MerchantReference
  if (body.ResultCode === '0' || body.status === true) {
    return {
      success: true,
      reference: body.CheckoutRequestID || body.MerchantRequestID,
      externalReference: body.TransactionReference || body.SasaPayReference,
      amount: body.Amount
    };
  }
  return { success: false, message: body.ResultDesc || body.detail };
}
