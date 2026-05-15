// src/components/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { initiateSTKPush, checkPaymentStatus } from '../utils/mpesa';

export default function PaymentModal({ admin, amount, frequency, onClose, onPaymentSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
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
      const accountRef = `DOMUS_${admin.id}_${Date.now()}`;
      const result = await initiateSTKPush(phoneNumber, amount, accountRef, admin.id);

      if (result?.success) {
        // Save payment record
        await supabase.from('admin_payments').insert({
          admin_id: admin.id,
          amount_due: amount,
          payment_frequency: frequency,
          payment_method: 'mpesa',
          status: 'pending',
          due_date: new Date().toISOString(),
          mpesa_phone: phoneNumber,
          checkout_request_id: result.checkoutRequestId,
          merchant_request_id: result.merchantRequestId,
        });

        setStatus('waiting');
        setCheckoutId(result.checkoutRequestId);
        toast.success(result.customerMessage || 'Check your phone to complete payment');

        // Start polling
        startPolling(result.checkoutRequestId);
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

  // Poll for payment status
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
    
    const metadata = paymentResult.CallbackMetadata?.Item || [];
    const mpesaReceipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
    const amountPaid = metadata.find(item => item.Name === 'Amount')?.Value;

    // Calculate end date
    const now = new Date();
    let endDate = new Date(now);
    if (frequency === 'monthly') endDate.setMonth(now.getMonth() + 1);
    else if (frequency === 'quarterly') endDate.setMonth(now.getMonth() + 3);
    else if (frequency === 'annual') endDate.setFullYear(now.getFullYear() + 1);

    // Update database
    await supabase
      .from('admins')
      .update({
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        frozen: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    await supabase
      .from('tenants')
      .update({ frozen: false })
      .eq('admin_id', admin.id);

    toast.success('✅ Payment successful! Subscription activated.');

    if (onPaymentSuccess) {
      onPaymentSuccess({
        method: 'mpesa',
        amount: amountPaid || amount,
        receipt: mpesaReceipt,
        endDate: endDate.toISOString()
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

        {/* Phone Input */}
        {status === 'idle' && (
          <>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              📱 M-Pesa Phone Number
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
            <div style={{ color: '#6b7280' }}>Enter your M-Pesa PIN to complete payment</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#10b981' }}>✅</div>
            <div style={{ fontWeight: 600 }}>Payment Successful!</div>
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