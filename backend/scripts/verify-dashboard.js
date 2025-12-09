import dotenv from 'dotenv';
import { initializePrisma, getPrisma, disconnectPrisma } from '../src/config/database.js';
import analyticsRepository from '../src/db/repositories/analyticsRepository.js';

// Load env vars from backend root
dotenv.config();

const verifyDashboard = async () => {
    console.log('🚀 Starting Dashboard Verification...');

    try {
        await initializePrisma();

        // 1. Daily Metrics
        console.log('\n📊 Testing Daily Metrics...');
        const daily = await analyticsRepository.calculateDailyMetrics(new Date());
        console.log('✅ Daily Metrics:', JSON.stringify(daily, null, 2));

        // 2. Sales Trends (Gap Filling)
        console.log('\n📈 Testing Sales Trends (7 Days)...');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const trends = await analyticsRepository.getSalesTrends(startDate, endDate);
        console.log(`✅ Trends returned ${trends.length} days`);
        if (trends.length > 0) console.log('Sample:', trends[0]);

        // 3. Inventory Status
        console.log('\n📦 Testing Inventory Status...');
        const inventory = await analyticsRepository.getInventoryStatus();
        console.log('✅ Inventory:', JSON.stringify(inventory, null, 2));

        // 4. System Health
        console.log('\n🏥 Testing System Health...');
        const health = await analyticsRepository.getSystemHealth();
        console.log('✅ Health:', JSON.stringify(health, null, 2));

        // 5. Cart Abandonment
        console.log('\n🛒 Testing Cart Abandonment...');
        const cart = await analyticsRepository.getCartAbandonmentStats();
        console.log('✅ Cart Stats:', JSON.stringify(cart, null, 2));

        console.log('\n✨ Verification Complete!');
    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await disconnectPrisma();
    }
};

verifyDashboard();
