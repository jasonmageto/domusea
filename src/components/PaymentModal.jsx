// src/components/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { initiateSTKPush, checkPaymentStatus } from '../utils/mpesa';
import { initiateSasaPayPayment } from '../utils/sasapay';

export default function PaymentModal({ admin, amount, frequency, onClose, onPaymentSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // mpesa, sasapay_wallet, sasapay_airtel, sasapay_tkash
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, processing, waiting, success, error
  const [checkoutId, setCheckoutId] = useState(null);

  // Format phone number
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('254')) return digits.slice(0, 12);
    if (digits.startsWith('0')) return digits.slice(0, 10);
    return digits.slice(0, 10);
  };

  // Handle payment
  const handlePay = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    setStatus('processing');

    try {
      let result;
      const accountRef = `DOMUS_${admin.id}_${Date.now()}`;

      // Use Supabase Edge Function URL for callbacks
      const callbackBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-callback`;
      const mpesaCallbackUrl = `${callbackBaseUrl}?provider=mpesa`;
      const sasapayCallbackUrl = `${callbackBaseUrl}?provider=sasapay`;

      if (paymentMethod === 'mpesa') {
        // We override the callback URL for M-Pesa if your utility supports it
        result = await initiateSTKPush(phoneNumber, amount, accountRef, admin.id, mpesaCallbackUrl);
      } else {
        // SasaPay channels: 0: SasaPay, 2: Airtel, 3: T-Kash
        const networkCode = paymentMethod === 'sasapay_wallet' ? '0' : (paymentMethod === 'sasapay_airtel' ? '2' : '3');
        result = await initiateSasaPayPayment(phoneNumber, amount, networkCode, admin.id, sasapayCallbackUrl);
      }

      if (result?.success) {
        // Save pending payment record (unified table for SA dashboard visibility)
        await supabase.from('admin_to_sa_payments').insert({
          admin_id: admin.id,
          amount: amount,
          method: paymentMethod.toUpperCase(),
          status: 'Pending',
          reference: result.checkoutRequestId,
          date: new Date().toISOString(),
          note: `Automated ${paymentMethod} payment initiated`
        });

        setStatus('waiting');
        setCheckoutId(result.checkoutRequestId);
        toast.success(result.customerMessage || 'Check your phone to complete payment');

        // Start polling (only for M-Pesa direct for now, SasaPay relies on webhook)
        if (paymentMethod === 'mpesa') {
          startPolling(result.checkoutRequestId);
        } else {
          // For SasaPay, we inform the user that activation is automatic via webhook
          setTimeout(() => {
            setStatus('success');
            toast.success('Payment request sent! Activation will be automatic.');
            setTimeout(() => onClose(), 5000);
          }, 2000);
        }
      } else {
        throw new Error(result?.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setStatus('error');
      toast.error(error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  // Poll for payment status (M-Pesa)
  const startPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(id);
        
        if (result.ResultCode === '0') {
          clearInterval(interval);
          await handlePaymentSuccess(result);
        } else if (result.ResultCode !== '1' && result.ResultCode !== 'PENDING') {
          clearInterval(interval);
          setStatus('error');
          toast.error(result.ResultDesc || 'Payment failed');
          setProcessing(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    // Stop after 2 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (status === 'waiting') {
        setStatus('error');
        toast.error('Payment verification timed out');
        setProcessing(false);
      }
    }, 120000);
  };

  // Handle success
  const handlePaymentSuccess = async (paymentResult) => {
    setStatus('success');
    
    // Calculate end date based on current due date or now
    const currentDue = admin.subscription_due ? new Date(admin.subscription_due) : new Date();
    const baseDate = currentDue > new Date() ? currentDue : new Date();
    
    let nextDue = new Date(baseDate);
    if (frequency === 'monthly') nextDue.setMonth(baseDate.getMonth() + 1);
    else if (frequency === 'quarterly') nextDue.setMonth(baseDate.getMonth() + 3);
    else if (frequency === 'annual') nextDue.setFullYear(baseDate.getFullYear() + 1);

    // Update database using RPC for atomic update
    const { error: rpcError } = await supabase.rpc('activate_admin_subscription_v2', {
      p_admin_id: admin.id,
      p_amount: amount,
      p_method: paymentMethod.toUpperCase(),
      p_reference: paymentResult.CheckoutRequestID || checkoutId,
      p_next_due: nextDue.toISOString()
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      // Fallback to manual updates if RPC fails
      await supabase.from('admins').update({
        subscription_status: 'Active',
        subscription_due: nextDue.toISOString(),
        frozen: false
      }).eq('id', admin.id);
    }

    toast.success('✅ Payment successful! Subscription activated.');

    if (onPaymentSuccess) {
      onPaymentSuccess({
        method: paymentMethod,
        amount: amount,
        endDate: nextDue.toISOString()
      });
    }

    setTimeout(() => onClose(), 3000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        maxWidth: 500,
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>💳 Pay Maintenance Fee</h3>
          <button onClick={onClose} disabled={status === 'waiting'} style={{
            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer'
          }}>×</button>
        </div>

        {/* Summary */}
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Amount:</span>
            <span style={{ fontWeight: 600 }}>KSh {amount?.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Frequency:</span>
            <span style={{ fontWeight: 600 }}>{frequency}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        {status === 'idle' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>Select Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div 
                onClick={() => setPaymentMethod('mpesa')}
                style={{
                  padding: '12px', border: `2px solid ${paymentMethod === 'mpesa' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: paymentMethod === 'mpesa' ? '#f0fdf4' : 'white'
                }}>
                <div style={{ fontSize: 20 }}>📲</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>M-Pesa Direct</div>
              </div>
              <div 
                onClick={() => setPaymentMethod('sasapay_wallet')}
                style={{
                  padding: '12px', border: `2px solid ${paymentMethod === 'sasapay_wallet' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: paymentMethod === 'sasapay_wallet' ? '#f0fdf4' : 'white'
                }}>
                <div style={{ fontSize: 20 }}>💳</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>SasaPay Wallet</div>
              </div>
              <div 
                onClick={() => setPaymentMethod('sasapay_airtel')}
                style={{
                  padding: '12px', border: `2px solid ${paymentMethod === 'sasapay_airtel' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: paymentMethod === 'sasapay_airtel' ? '#f0fdf4' : 'white'
                }}>
                <div style={{ fontSize: 20 }}>🔴</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Airtel Money</div>
              </div>
              <div 
                onClick={() => setPaymentMethod('sasapay_tkash')}
                style={{
                  padding: '12px', border: `2px solid ${paymentMethod === 'sasapay_tkash' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: paymentMethod === 'sasapay_tkash' ? '#f0fdf4' : 'white'
                }}>
                <div style={{ fontSize: 20 }}>🔵</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>T-Kash</div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Input */}
        {status === 'idle' && (
          <>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              📱 {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Mobile Money'} Phone Number
            </label>
            <input
              type="tel"
              placeholder="0712 345 678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
                marginBottom: 16
              }}
            />
          </>
        )}

        {/* States */}
        {status === 'processing' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div>Initiating Payment...</div>
          </div>
        )}

        {status === 'waiting' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📲</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Check Your Phone</div>
            <div style={{ color: '#6b7280' }}>Enter your PIN to complete payment</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#10b981' }}>✅</div>
            <div style={{ fontWeight: 600 }}>Payment Request Sent!</div>
            <div style={{ color: '#6b7280', marginTop: 8 }}>Your subscription will be activated automatically.</div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#ef4444' }}>❌</div>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Payment Failed</div>
            <button onClick={() => { setStatus('idle'); setProcessing(false); }} 
              style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )}

        {/* Buttons */}
        {status === 'idle' && (
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#e5e7eb', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handlePay} disabled={!phoneNumber || phoneNumber.length < 10} 
              style={{ flex: 2, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Pay KSh {amount?.toLocaleString()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
