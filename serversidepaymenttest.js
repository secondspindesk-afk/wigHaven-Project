// server.js - Mobile Money Payment with Webhook Support
// Run with: node server.js
// Then visit: http://localhost:5000

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

// ⚠️ REPLACE WITH YOUR PAYSTACK KEYS
const PAYSTACK_SECRET = 'sk_test_5d4b724be6405a8d54765f25bdaad036f32738b6';
const WEBHOOK_SECRET = 'your_webhook_secret'; // Optional: from Paystack dashboard

app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Store for tracking payments (in production, use a database)
const paymentStore = {};

// Test numbers for each network
const TEST_NUMBERS = {
  mtn: ['0551234987', '0241234567'],
  vod: ['0201234567', '0501234567'], 
  tgo: ['0267777777', '0261234567']
};

// Serve the HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile Money Payment Test</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      gap: 20px;
    }
    
    .main-layout {
      display: flex;
      gap: 20px;
      max-width: 1200px;
      width: 100%;
      align-items: flex-start;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      flex: 1;
      max-width: 450px;
    }
    
    .webhook-sidebar {
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      width: 400px;
      max-height: 600px;
      overflow-y: auto;
    }
    
    .webhook-sidebar h2 {
      font-size: 18px;
      color: #333;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .webhook-subtitle {
      font-size: 12px;
      color: #666;
      margin-bottom: 20px;
    }
    
    .webhook-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .webhook-item {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 15px;
      border-left: 4px solid #10b981;
      animation: slideInRight 0.3s ease;
    }
    
    .webhook-item.failed {
      border-left-color: #ef4444;
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .webhook-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .webhook-event {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }
    
    .webhook-time {
      font-size: 11px;
      color: #666;
    }
    
    .webhook-details {
      display: grid;
      gap: 6px;
    }
    
    .webhook-detail {
      font-size: 12px;
      color: #555;
      display: flex;
      justify-content: space-between;
    }
    
    .webhook-detail strong {
      color: #333;
    }
    
    .webhook-empty {
      text-align: center;
      color: #999;
      padding: 40px 20px;
      font-size: 14px;
    }
    
    .webhook-empty-icon {
      font-size: 48px;
      margin-bottom: 10px;
      opacity: 0.3;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .status-badge.success {
      background: #d4edda;
      color: #155724;
    }
    
    .status-badge.failed {
      background: #f8d7da;
      color: #721c24;
    }
    
    @media (max-width: 968px) {
      body {
        flex-direction: column;
        padding: 10px;
      }
      
      .main-layout {
        flex-direction: column;
      }
      
      .webhook-sidebar {
        width: 100%;
        max-width: 450px;
      }
    }
    
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
      font-size: 24px;
    }
    
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    
    .webhook-badge {
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
      margin-left: 8px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 500;
      font-size: 14px;
    }
    
    input, select {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e1e8ed;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .network-selector {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .network-option {
      padding: 15px 10px;
      border: 2px solid #e1e8ed;
      border-radius: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 12px;
      font-weight: 500;
    }
    
    .network-option:hover {
      border-color: #667eea;
    }
    
    .network-option.selected {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }
    
    .test-numbers {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 12px;
    }
    
    .test-numbers strong {
      display: block;
      margin-bottom: 6px;
      color: #333;
    }
    
    .number-chip {
      display: inline-block;
      background: white;
      padding: 4px 10px;
      border-radius: 15px;
      margin: 3px;
      cursor: pointer;
      border: 1px solid #ddd;
      transition: all 0.2s;
    }
    
    .number-chip:hover {
      border-color: #667eea;
      color: #667eea;
    }
    
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 10px;
      text-align: center;
      font-weight: 500;
      display: none;
    }
    
    .status.pending {
      background: #fff3cd;
      color: #856404;
      border: 2px solid #ffeaa7;
      display: block;
    }
    
    .status.success {
      background: #d4edda;
      color: #155724;
      border: 2px solid #c3e6cb;
      display: block;
      animation: successPulse 0.5s ease;
    }
    
    .status.error {
      background: #f8d7da;
      color: #721c24;
      border: 2px solid #f5c6cb;
      display: block;
    }
    
    @keyframes successPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .loader {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      display: inline-block;
      margin-right: 10px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .webhook-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 10px 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 12px;
      display: none;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    
    .webhook-indicator.active {
      display: block;
    }
    
    .webhook-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="webhook-indicator" id="webhookIndicator">
    <span class="webhook-dot"></span>
    <span id="webhookMessage">Webhook active</span>
  </div>

  <div class="main-layout">
    <div class="container">
      <h1>🇬🇭 Mobile Money Payment</h1>
      <p class="subtitle">Test Paystack Integration <span class="webhook-badge">WEBHOOK</span></p>
    
    <form id="paymentForm">
      <div class="form-group">
        <label>Select Network</label>
        <div class="network-selector">
          <div class="network-option selected" data-provider="mtn">
            📱 MTN
          </div>
          <div class="network-option" data-provider="vod">
            📱 Telecel
          </div>
          <div class="network-option" data-provider="tgo">
            📱 AirtelTigo
          </div>
        </div>
        <input type="hidden" id="provider" value="mtn">
        
        <div class="test-numbers" id="testNumbers">
          <strong>📋 Working Test Numbers:</strong>
          <div id="numberList"></div>
        </div>
      </div>
      
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel" id="phone" placeholder="Select a test number above" required>
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="email" placeholder="your@email.com" value="test@example.com" required>
      </div>
      
      <div class="form-group">
        <label>Amount (GHS)</label>
        <input type="number" id="amount" value="1" min="1" required>
      </div>
      
      <button type="submit" id="payBtn">Pay Now</button>
    </form>
    
    <div id="status" class="status"></div>
  </div>
  
  <!-- Webhook Sidebar -->
  <div class="webhook-sidebar">
    <h2>
      <span>📡</span> Webhook Events
    </h2>
    <p class="webhook-subtitle">Real-time payment notifications</p>
    
    <div class="webhook-list" id="webhookList">
      <div class="webhook-empty">
        <div class="webhook-empty-icon">📭</div>
        <div>No webhook events yet</div>
        <div style="font-size: 12px; margin-top: 5px;">Make a payment to see events here</div>
      </div>
    </div>
  </div>
</div>

  <script>
    const testNumbers = {
      mtn: ['0551234987', '0241234567'],
      vod: ['0201234567', '0501234567'],
      tgo: ['0267777777', '0261234567']
    };
    
    let currentReference = null;
    let pollingInterval = null;
    let eventSource = null;
    let webhookEvents = [];

    // Update test numbers display
    function updateTestNumbers(provider) {
      const numberList = document.getElementById('numberList');
      const numbers = testNumbers[provider];
      
      numberList.innerHTML = numbers.map(num => 
        \`<span class="number-chip" onclick="selectNumber('\${num}')">\${num}</span>\`
      ).join('');
    }
    
    function selectNumber(number) {
      document.getElementById('phone').value = number;
    }
    
    // Add webhook event to sidebar
    function addWebhookEvent(event) {
      webhookEvents.unshift(event); // Add to beginning
      if (webhookEvents.length > 10) webhookEvents.pop(); // Keep last 10
      
      renderWebhookEvents();
    }
    
    function renderWebhookEvents() {
      const webhookList = document.getElementById('webhookList');
      
      if (webhookEvents.length === 0) {
        webhookList.innerHTML = \`
          <div class="webhook-empty">
            <div class="webhook-empty-icon">📭</div>
            <div>No webhook events yet</div>
            <div style="font-size: 12px; margin-top: 5px;">Make a payment to see events here</div>
          </div>
        \`;
        return;
      }
      
      webhookList.innerHTML = webhookEvents.map(event => \`
        <div class="webhook-item \${event.status === 'failed' ? 'failed' : ''}">
          <div class="webhook-header">
            <span class="webhook-event">\${event.event}</span>
            <span class="webhook-time">\${event.time}</span>
          </div>
          <div class="webhook-details">
            <div class="webhook-detail">
              <span>Reference:</span>
              <strong>\${event.reference}</strong>
            </div>
            <div class="webhook-detail">
              <span>Amount:</span>
              <strong>GHS \${(event.amount / 100).toFixed(2)}</strong>
            </div>
            <div class="webhook-detail">
              <span>Status:</span>
              <span class="status-badge \${event.status}">\${event.status.toUpperCase()}</span>
            </div>
            \${event.message ? \`
              <div class="webhook-detail">
                <span>Message:</span>
                <strong>\${event.message}</strong>
              </div>
            \` : ''}
          </div>
        </div>
      \`).join('');
    }
    
    // Network selector
    document.querySelectorAll('.network-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.network-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        const provider = this.dataset.provider;
        document.getElementById('provider').value = provider;
        updateTestNumbers(provider);
        document.getElementById('phone').value = ''; // Clear phone field
      });
    });
    
    // Initialize with MTN numbers
    updateTestNumbers('mtn');

    // Listen for webhook events via Server-Sent Events
    function connectWebhookListener(reference) {
      eventSource = new EventSource(\`/api/webhook-stream/\${reference}\`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === 'success') {
          handlePaymentSuccess(data);
        } else if (data.status === 'failed') {
          handlePaymentFailed(data);
        }
      };
      
      eventSource.onerror = () => {
        console.log('Webhook stream closed');
      };
    }
    
    function handlePaymentSuccess(data) {
      if (pollingInterval) clearInterval(pollingInterval);
      if (eventSource) eventSource.close();
      
      const status = document.getElementById('status');
      const webhookIndicator = document.getElementById('webhookIndicator');
      const webhookMessage = document.getElementById('webhookMessage');
      
      status.className = 'status success';
      status.innerHTML = '✅ Payment Successful via Webhook! GHS ' + (data.amount / 100).toFixed(2);
      
      webhookIndicator.className = 'webhook-indicator active';
      webhookMessage.textContent = '✅ Webhook received!';
      
      // Add to webhook sidebar
      addWebhookEvent({
        event: 'charge.success',
        reference: data.reference,
        amount: data.amount,
        status: 'success',
        message: data.message || 'Approved',
        time: new Date().toLocaleTimeString()
      });
      
      setTimeout(() => {
        webhookIndicator.className = 'webhook-indicator';
      }, 3000);
      
      document.getElementById('payBtn').disabled = false;
      document.getElementById('payBtn').textContent = 'Pay Again';
    }
    
    function handlePaymentFailed(data) {
      if (pollingInterval) clearInterval(pollingInterval);
      if (eventSource) eventSource.close();
      
      const status = document.getElementById('status');
      status.className = 'status error';
      status.innerHTML = '❌ Payment Failed: ' + (data.message || 'Transaction declined');
      
      // Add to webhook sidebar
      addWebhookEvent({
        event: 'charge.failed',
        reference: data.reference,
        amount: data.amount,
        status: 'failed',
        message: data.message || 'Declined',
        time: new Date().toLocaleTimeString()
      });
      
      document.getElementById('payBtn').disabled = false;
      document.getElementById('payBtn').textContent = 'Try Again';
    }

    // Form submission
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payBtn = document.getElementById('payBtn');
      const status = document.getElementById('status');
      
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      status.className = 'status';
      status.style.display = 'none';
      
      const data = {
        provider: document.getElementById('provider').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        amount: parseFloat(document.getElementById('amount').value)
      };
      
      try {
        const response = await fetch('/api/initiate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.error) {
          status.className = 'status error';
          status.innerHTML = '❌ ' + result.error;
          payBtn.disabled = false;
          payBtn.textContent = 'Pay Now';
          return;
        }
        
        currentReference = result.reference;
        
        // Show pending status
        status.className = 'status pending';
        status.innerHTML = '<div class="loader"></div>Waiting for payment... (Webhook listening)';
        
        // Connect to webhook stream
        connectWebhookListener(currentReference);
        
        // Also start polling as backup
        startPolling(currentReference);
        
      } catch (error) {
        status.className = 'status error';
        status.innerHTML = '❌ Network error. Please try again.';
        payBtn.disabled = false;
        payBtn.textContent = 'Pay Now';
      }
    });

    function startPolling(reference) {
      let attempts = 0;
      const maxAttempts = 40;
      
      pollingInterval = setInterval(async () => {
        attempts++;
        
        try {
          const response = await fetch(\`/api/verify-payment/\${reference}\`);
          const result = await response.json();
          
          if (result.status === 'success') {
            handlePaymentSuccess(result);
          } else if (result.status === 'failed') {
            handlePaymentFailed(result);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval);
            const status = document.getElementById('status');
            status.className = 'status error';
            status.innerHTML = '⏱️ Payment timeout. Check transaction history.';
            document.getElementById('payBtn').disabled = false;
            document.getElementById('payBtn').textContent = 'Try Again';
          }
        } catch (error) {
          console.error('Verification error:', error);
        }
      }, 3000);
    }
  </script>
</body>
</html>
  `);
});

// API: Get test numbers for a network
app.get('/api/test-numbers/:provider', (req, res) => {
  const numbers = TEST_NUMBERS[req.params.provider] || [];
  res.json({ numbers });
});

// API: Initiate Mobile Money Payment
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { provider, phone, email, amount } = req.body;
    
    if (!provider || !phone || !email || !amount) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const amountInPesewas = Math.round(amount * 100);
    
    console.log('💳 Initiating payment:', { provider, phone, email, amount: amountInPesewas });
    
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email: email,
        amount: amountInPesewas,
        mobile_money: {
          phone: phone,
          provider: provider
        },
        currency: 'GHS'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const reference = response.data.data.reference;
    
    // Store payment reference
    paymentStore[reference] = {
      status: 'pending',
      amount: amountInPesewas,
      phone,
      email,
      provider,
      createdAt: new Date()
    };
    
    console.log('✅ Payment initiated:', reference);
    
    res.json({
      status: response.data.data.status,
      reference: reference,
      message: 'Check your phone for payment prompt'
    });
    
  } catch (error) {
    console.error('❌ Payment error:', error.response?.data || error.message);
    res.status(400).json({ 
      error: error.response?.data?.message || 'Payment initiation failed'
    });
  }
});

// API: Verify Payment Status
app.get('/api/verify-payment/:reference', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );
    
    const data = response.data.data;
    
    res.json({
      status: data.status,
      amount: data.amount,
      reference: data.reference,
      message: data.gateway_response
    });
    
  } catch (error) {
    res.status(400).json({ 
      error: 'Verification failed',
      status: 'failed'
    });
  }
});

// Webhook endpoint - Paystack will POST here
app.post('/webhook/paystack', (req, res) => {
  try {
    // Verify webhook signature (optional but recommended)
    const payload = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', WEBHOOK_SECRET).update(payload).digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      console.log('⚠️ Invalid webhook signature');
      // In production, you should reject invalid signatures
      // For testing, we'll allow it
    }
    
    const event = req.body;
    
    console.log('🎯 Webhook received:', event.event);
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount;
      
      console.log('✅ Payment successful via webhook:', reference);
      
      // Update payment store
      if (paymentStore[reference]) {
        paymentStore[reference].status = 'success';
        paymentStore[reference].webhook_received = true;
        paymentStore[reference].completedAt = new Date();
      }
    }
    
    res.sendStatus(200);
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(400);
  }
});

// Server-Sent Events stream for real-time updates
app.get('/api/webhook-stream/:reference', (req, res) => {
  const reference = req.params.reference;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Check payment status every 2 seconds
  const interval = setInterval(() => {
    const payment = paymentStore[reference];
    
    if (payment && payment.status !== 'pending') {
      res.write(`data: ${JSON.stringify({
        status: payment.status,
        amount: payment.amount,
        reference: reference,
        webhook_received: payment.webhook_received
      })}\n\n`);
      
      clearInterval(interval);
      res.end();
    }
  }, 2000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📡 Webhook endpoint: http://localhost:${PORT}/webhook/paystack`);
  console.log(`\n⚠️  IMPORTANT: Replace PAYSTACK_SECRET with your test key!`);
  console.log(`   Get it from: https://dashboard.paystack.com/#/settings/developers`);
  console.log(`\n💡 For webhook testing, use ngrok or expose your port 5000`);
  console.log(`   Example: ngrok http 5000`);
  console.log(`   Then set webhook URL in Paystack dashboard to: https://your-ngrok-url.ngrok.io/webhook/paystack\n`);
});