import { supabase } from '../supabaseClient';

export const handleMPesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    
    const merchantRequestId = stkCallback.MerchantRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    
    // Find the payment record
    const { data: payment, error: fetchError } = await supabase
      .from('admin_to_sa_payments')
      .select('id, admin_id, amount')
      .eq('merchant_request_id', merchantRequestId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (resultCode === 0) {
      // Payment successful
      const callbackData = stkCallback.CallbackMetadata.Item.reduce((acc, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});
      
      await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Confirmed',
          mpesa_receipt_number: callbackData.MpesaReceiptNumber,
          transaction_date: new Date(callbackData.TransactionDate).toISOString(),
          phone_number: callbackData.PhoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
      
      // The trigger will automatically update admin status
      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } else {
      // Payment failed
      await supabase
        .from('admin_to_sa_payments')
        .update({
          status: 'Rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
      
      res.json({ ResultCode: 1, ResultDesc: resultDesc });
    }
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
};