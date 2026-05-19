// supabase/functions/payment-callback/index.ts

// @ts-ignore: Deno imports are valid in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno imports are valid in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider')
    const body = await req.json()

    console.log(`📥 ${provider} Callback received:`, JSON.stringify(body, null, 2))

    // Initialize Supabase Client with Service Role Key for admin access
    // @ts-ignore: Deno global is available in Supabase environment
    const supabaseAdmin = createClient(
      // @ts-ignore: Deno global is available in Supabase environment
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno global is available in Supabase environment
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result;
    if (provider === 'mpesa') {
      result = await parseMpesaPayload(body)
    } else if (provider === 'sasapay') {
      result = await parseSasaPayPayload(body)
    } else {
      return new Response(JSON.stringify({ error: 'Unknown provider' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (result && result.success) {
      // 1. Find the admin associated with this transaction
      const { data: paymentRecord, error: fetchError } = await supabaseAdmin
        .from('admin_to_sa_payments')
        .select('admin_id, amount')
        .eq('reference', result.reference)
        .single()

      if (fetchError || !paymentRecord) {
        console.error('❌ Could not find payment record for reference:', result.reference)
        return new Response(JSON.stringify({ status: 'error', message: 'Record not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // 2. Calculate next due date
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('admins')
        .select('subscription_due, subscription_plan')
        .eq('id', paymentRecord.admin_id)
        .single()

      if (adminError) throw adminError

      const currentDue = admin.subscription_due ? new Date(admin.subscription_due) : new Date()
      const baseDate = currentDue > new Date() ? currentDue : new Date()
      let nextDue = new Date(baseDate)
      
      if (admin.subscription_plan === 'Annual') nextDue.setFullYear(baseDate.getFullYear() + 1)
      else nextDue.setMonth(baseDate.getMonth() + 1)

      // 3. Update database atomically via RPC
      const { error: rpcError } = await supabaseAdmin.rpc('activate_admin_subscription_v2', {
        p_admin_id: paymentRecord.admin_id,
        p_amount: paymentRecord.amount,
        p_method: provider.toUpperCase(),
        p_reference: result.externalReference,
        p_next_due: nextDue.toISOString()
      })

      if (rpcError) throw rpcError

      console.log(`✅ ${provider} Payment Processed Successfully for Admin:`, paymentRecord.admin_id)
      
      // Respond based on provider expectations
      if (provider === 'mpesa') {
        return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
      return new Response(JSON.stringify({ status: 'success' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })

    } else {
      console.log(`❌ ${provider} Payment Failed or Incomplete:`, result?.message)
      return new Response(JSON.stringify({ status: 'failed', message: result?.message }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

  } catch (err: any) {
    const error = err as Error;
    console.error('❌ Callback Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

async function parseMpesaPayload(body: any) {
  const stkCallback = body.Body?.stkCallback
  if (!stkCallback) return { success: false, message: 'Invalid payload' }
  
  if (stkCallback.ResultCode === 0) {
    const metadata = stkCallback.CallbackMetadata?.Item || []
    return {
      success: true,
      reference: stkCallback.CheckoutRequestID,
      externalReference: metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value,
      amount: metadata.find((item: any) => item.Name === 'Amount')?.Value
    }
  }
  return { success: false, message: stkCallback.ResultDesc }
}

async function parseSasaPayPayload(body: any) {
  if (body.ResultCode === '0' || body.status === true) {
    return {
      success: true,
      reference: body.CheckoutRequestID || body.MerchantRequestID,
      externalReference: body.TransactionReference || body.SasaPayReference,
      amount: body.Amount
    }
  }
  return { success: false, message: body.ResultDesc || body.detail }
}
