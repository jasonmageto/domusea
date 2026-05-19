// src/utils/sasapay.js
import axios from 'axios';

const CLIENT_ID = import.meta.env.VITE_SASAPAY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SASAPAY_CLIENT_SECRET;
const MERCHANT_CODE = import.meta.env.VITE_SASAPAY_MERCHANT_CODE;
const CALLBACK_URL = import.meta.env.VITE_SASAPAY_CALLBACK_URL;

/**
 * Generate SasaPay Access Token
 */
export const getSasaPayAccessToken = async () => {
  const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  
  try {
    const response = await axios.get(
      'https://sandbox.sasapay.app/api/v1/auth/token/?grant_type=client_credentials',
      { 
        headers: { Authorization: `Basic ${auth}` },
        params: { grant_type: 'client_credentials' }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('SasaPay Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get SasaPay access token');
  }
};

/**
 * Initiate SasaPay C2B Payment Request
 * @param {string} phoneNumber - Customer phone number
 * @param {number} amount - Amount to collect
 * @param {string} networkCode - Channel code (0: SasaPay, 1: M-Pesa, 2: Airtel, 3: T-Kash)
 * @param {string} adminId - Admin ID for reference
 */
export const initiateSasaPayPayment = async (phoneNumber, amount, networkCode, adminId, callbackOverride = null) => {
  try {
    const accessToken = await getSasaPayAccessToken();
    
    // Format phone: 0712345678 → 254712345678
    const formattedPhone = phoneNumber.startsWith('254') 
      ? phoneNumber 
      : `254${phoneNumber.replace(/^0/, '')}`;

    const response = await axios.post(
      'https://sandbox.sasapay.app/api/v1/payments/request-payment/',
      {
        MerchantCode: MERCHANT_CODE,
        NetworkCode: networkCode,
        PhoneNumber: formattedPhone,
        Amount: amount.toString(),
        Currency: "KES",
        CallBackURL: callbackOverride || CALLBACK_URL,
        AccountReference: adminId,
        TransactionDesc: `Subscription Renewal - Admin ${adminId}`
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: response.data.status === true,
      message: response.data.detail,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      customerMessage: response.data.CustomerMessage
    };
  } catch (error) {
    console.error('SasaPay Request Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to initiate SasaPay payment');
  }
};
