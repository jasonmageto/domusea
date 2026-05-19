import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { handlePaymentCallback } from './src/api/paymentCallbacks.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/**
 * Unified Payment Callback Route
 * Supports: /api/payments/callback/mpesa or /api/payments/callback/sasapay
 */
app.post('/api/payments/callback/:provider', async (req, res) => {
  const { provider } = req.params;
  console.log(`📥 Incoming callback for ${provider}`);
  
  const result = await handlePaymentCallback(req, res, provider);
  
  // Respond based on provider expectations
  if (provider === 'mpesa') {
    res.json({
      ResultCode: result.status === 'success' ? 0 : 1,
      ResultDesc: result.status === 'success' ? 'Success' : (result.message || 'Error')
    });
  } else {
    res.json(result);
  }
});

/**
 * Legacy M-Pesa Callback Endpoint (for backward compatibility)
 */
app.post('/api/mpesa/callback', async (req, res) => {
    console.log('📥 Received Legacy M-Pesa callback');
    const result = await handlePaymentCallback(req, res, 'mpesa');
    res.json({
      ResultCode: result.status === 'success' ? 0 : 1,
      ResultDesc: result.status === 'success' ? 'Success' : 'Error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
});
