import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { phoneNumber, amount, adminId } = await req.json()
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Format phone number (remove 0, add 254)
    const formattedPhone = phoneNumber.startsWith('0') 
      ? `254${phoneNumber.slice(1)}` 
      : phoneNumber

    // M-Pesa API credentials (store these in Supabase Secrets)
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')
    const shortcode = Deno.env.get('MPESA_SHORTCODE')
    const passkey = Deno.env.get('MPESA_PASSKEY')
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback?provider=mpesa`

    // Get OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`)
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { 'Authorization': `Basic ${auth}` }
    })
    const { access_token } = await tokenResponse.json()

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = btoa(`${shortcode}${passkey}${timestamp}`)

    // Initiate STK Push
    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: `DOMUS_${adminId}`,
        TransactionDesc: 'Subscription Payment'
      })
    })

    const data = await stkResponse.json()

    if (data.ResponseCode === '0') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          checkoutRequestId: data.CheckoutRequestID,
          customerMessage: data.CustomerMessage 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error(data.errorMessage || 'STK Push failed')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})