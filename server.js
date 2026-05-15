import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { handleMpesaCallback } from './src/api/mpesaCallback.js';

const app = express();
const PORT = 3001;

// ... rest of your code

app.use(cors());
app.use(express.json());

// M-Pesa Callback Endpoint
app.post('/api/mpesa/callback', async (req, res) => {
    console.log('📥 Received M-Pesa callback');
    const result = await handleMpesaCallback(req.body, res);
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
});