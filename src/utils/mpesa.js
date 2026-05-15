// src/utils/mpesa.js
import axios from 'axios';

const CONSUMER_KEY = import.meta.env.VITE_MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.VITE_MPESA_CONSUMER_SECRET;
const SHORTCODE = import.meta.env.VITE_MPESA_SHORTCODE;
const PASSKEY = import.meta.env.VITE_MPESA_PASSKEY;
const CALLBACK_URL = import.meta.env.VITE_MPESA_CALLBACK_URL;

/**
 * Generate M-Pesa Access Token
 */
export const getAccessToken = async () => {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  
  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

/**
 * Initiate STK Push Payment
 */
export const initiateSTKPush = async (phoneNumber, amount, accountReference, adminId) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    // Format phone: 0712345678 → 254712345678
    const formattedPhone = phoneNumber.startsWith('254') 
      ? phoneNumber 
      : `254${phoneNumber.replace(/^0/, '')}`;

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: `DomusEA Maintenance Fee - Admin ${adminId}`
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: response.data.ResponseCode === '0',
      message: response.data.ResponseDescription,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      customerMessage: response.data.CustomerMessage
    };
  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
  }
};

/**
 * Check Payment Status
 */
export const checkPaymentStatus = async (checkoutRequestId) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Payment Status Check Error:', error.response?.data || error.message);
    throw error;
  }
};