import 'dotenv/config';
import { initializePayment } from '../src/services/paystackService.js';
import logger from '../src/utils/logger.js';

async function testPaystack() {
    console.log('Testing Paystack Connectivity...');
    console.log('Secret Key Present:', !!process.env.PAYSTACK_SECRET_KEY);

    try {
        const result = await initializePayment({
            email: 'test@example.com',
            amount: 100, // 1 GHS
            reference: `TEST_${Date.now()}`,
            metadata: { test: true }
        });
        console.log('✅ Paystack Initialization Successful:', result);
    } catch (error) {
        console.error('❌ Paystack Test Failed:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

testPaystack();
