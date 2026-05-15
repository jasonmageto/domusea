// src/api/mpesaCallback.js
import { supabaseServer } from '../supabaseServer.js';

export async function handleMpesaCallback(req, res) {
  try {
    console.log('📥 Raw request body:', JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    
    if (!Body) {
      console.error('❌ No Body in request');
      return { ResultCode: 1, ResultDesc: 'Missing Body' };
    }
    
    const { stkCallback } = Body;
    
    if (!stkCallback) {
      console.error('❌ No stkCallback in Body');
      return { ResultCode: 1, ResultDesc: 'Missing stkCallback' };
    }
    
    console.log('📥 M-Pesa Callback received:', stkCallback);
    
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    if (ResultCode === 0) {
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      
      const amount = callbackMetadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceipt = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;

      const { data: payment, error: fetchError } = await supabaseServer
        .from('admin_payments')
        .select('admin_id')
        .eq('checkout_request_id', CheckoutRequestID)
        .single();

      if (fetchError) {
        console.error('❌ Database fetch error:', fetchError);
        throw fetchError;
      }

      const { error: updateError } = await supabaseServer
        .from('admin_payments')
        .update({
          status: 'completed',
          amount_paid: amount,
          mpesa_receipt: mpesaReceipt,
          mpesa_phone: phoneNumber,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', CheckoutRequestID);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw updateError;
      }

      if (payment?.admin_id) {
        await supabaseServer.rpc('activate_admin_subscription', {
          p_admin_id: payment.admin_id
        });
      }

      console.log('✅ Payment completed successfully:', mpesaReceipt);
      
      return { ResultCode: 0, ResultDesc: 'Success' };

    } else {
      await supabaseServer
        .from('admin_payments')
        .update({
          status: 'failed',
          failure_reason: ResultDesc,
          updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', CheckoutRequestID);

      console.log('❌ Payment failed:', ResultDesc);
      
      return { ResultCode: 0, ResultDesc: 'Recorded' };
    }
  } catch (error) {
    console.error('❌ Callback Error:', error.message);
    return { ResultCode: 1, ResultDesc: 'Error' };
  }
}