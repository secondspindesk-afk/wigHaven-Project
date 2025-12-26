/**
 * Comprehensive Database Performance Test
 * 
 * Tests: CRUD Operations, Joins, Aggregations, Transactions
 * Compares Neon vs Xata with real data
 * 
 * Run: node scripts/db-crud-test.js
 */

import pg from 'pg';
const { Pool } = pg;

// Database configurations
const DATABASES = {
    neon: {
        name: 'Neon',
        connectionString: 'postgresql://neondb_owner:npg_fLhnzIa23SeP@ep-square-sky-agisfeh1-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
    xata: {
        name: 'Xata',
        connectionString: 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require',
    }
};

const ITERATIONS = 5;

// Helper to measure query time
async function measureQuery(pool, name, query, params = []) {
    const times = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        try {
            await pool.query(query, params);
            times.push(performance.now() - start);
        } catch (error) {
            console.log(`   ❌ ${name}: ${error.message}`);
            return null;
        }
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { avg: Math.round(avg), min: Math.round(min), max: Math.round(max) };
}

async function testDatabase(config) {
    console.log(`\\n${'═'.repeat(60)}`);
    console.log(`🔬 Testing: ${config.name}`);
    console.log('═'.repeat(60));

    const pool = new Pool({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
    });

    const results = {};

    try {
        // Warm up connection
        await pool.query('SELECT 1');

        // ============================================
        // TEST 1: READ OPERATIONS
        // ============================================
        console.log('\\n📖 READ OPERATIONS');

        // Simple read
        results.readSingle = await measureQuery(pool, 'Single User Read',
            'SELECT * FROM users WHERE id = $1', ['cm1234567890']);
        console.log(`   Single Read:     Avg: ${results.readSingle?.avg}ms`);

        // List with pagination
        results.readList = await measureQuery(pool, 'Product List',
            'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT 10');
        console.log(`   List (10 items): Avg: ${results.readList?.avg}ms`);

        // Read with join
        results.readJoin = await measureQuery(pool, 'Order with Items',
            `SELECT o.*, oi.* FROM orders o 
             LEFT JOIN order_items oi ON oi.order_id = o.id 
             WHERE o.status = 'processing' LIMIT 5`);
        console.log(`   Join Query:      Avg: ${results.readJoin?.avg}ms`);

        // ============================================
        // TEST 2: AGGREGATIONS
        // ============================================
        console.log('\\n📊 AGGREGATIONS');

        results.countSimple = await measureQuery(pool, 'Simple Count',
            'SELECT COUNT(*) FROM orders');
        console.log(`   Simple Count:    Avg: ${results.countSimple?.avg}ms`);

        results.countFiltered = await measureQuery(pool, 'Filtered Count',
            `SELECT COUNT(*) FROM orders WHERE status = 'paid'`);
        console.log(`   Filtered Count:  Avg: ${results.countFiltered?.avg}ms`);

        results.aggregate = await measureQuery(pool, 'Multi-Aggregate',
            `SELECT 
                COUNT(*) as total_orders,
                SUM(total) as total_revenue,
                AVG(total) as avg_order_value
             FROM orders WHERE payment_status = 'paid'`);
        console.log(`   Multi-Aggregate: Avg: ${results.aggregate?.avg}ms`);

        results.dashboard = await measureQuery(pool, 'Dashboard Stats',
            `SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
                (SELECT COUNT(*) FROM variants WHERE stock <= 10) as low_stock`);
        console.log(`   Dashboard Stats: Avg: ${results.dashboard?.avg}ms`);

        // ============================================
        // TEST 3: WRITE OPERATIONS
        // ============================================
        console.log('\\n✏️ WRITE OPERATIONS');

        // Create test record
        const testId = `test_${Date.now()}`;
        results.insert = await measureQuery(pool, 'Insert',
            `INSERT INTO notifications (id, user_id, type, title, message, created_at)
             VALUES ($1, (SELECT id FROM users LIMIT 1), 'test', 'Test', 'Test message', NOW())
             RETURNING id`,
            [testId]);
        console.log(`   Insert:          Avg: ${results.insert?.avg}ms`);

        // Update
        results.update = await measureQuery(pool, 'Update',
            `UPDATE notifications SET is_read = true, title = 'Updated' WHERE id = $1`,
            [testId]);
        console.log(`   Update:          Avg: ${results.update?.avg}ms`);

        // Delete
        results.delete = await measureQuery(pool, 'Delete',
            `DELETE FROM notifications WHERE id = $1`, [testId]);
        console.log(`   Delete:          Avg: ${results.delete?.avg}ms`);

        // ============================================
        // TEST 4: TRANSACTIONS
        // ============================================
        console.log('\\n🔄 TRANSACTIONS');

        const txTimes = [];
        for (let i = 0; i < ITERATIONS; i++) {
            const start = performance.now();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query('SELECT * FROM variants WHERE id = (SELECT id FROM variants LIMIT 1) FOR UPDATE');
                await client.query('UPDATE variants SET reserved_stock = reserved_stock + 1 WHERE id = (SELECT id FROM variants LIMIT 1)');
                await client.query('UPDATE variants SET reserved_stock = reserved_stock - 1 WHERE id = (SELECT id FROM variants LIMIT 1)');
                await client.query('COMMIT');
                txTimes.push(performance.now() - start);
            } catch (e) {
                await client.query('ROLLBACK');
            } finally {
                client.release();
            }
        }
        const avgTx = txTimes.reduce((a, b) => a + b, 0) / txTimes.length;
        results.transaction = { avg: Math.round(avgTx), min: Math.round(Math.min(...txTimes)), max: Math.round(Math.max(...txTimes)) };
        console.log(`   Transaction:     Avg: ${results.transaction.avg}ms`);

        // ============================================
        // TEST 5: COMPLEX QUERIES
        // ============================================
        console.log('\\n🔗 COMPLEX QUERIES');

        results.orderDetails = await measureQuery(pool, 'Order with Details',
            `SELECT 
                o.*,
                u.email as customer_email,
                u.first_name || ' ' || u.last_name as customer_name,
                json_agg(json_build_object(
                    'product_name', oi.product_name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price
                )) as items
             FROM orders o
             LEFT JOIN users u ON u.id = o.user_id
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE o.id = (SELECT id FROM orders LIMIT 1)
             GROUP BY o.id, u.id`);
        console.log(`   Order Details:   Avg: ${results.orderDetails?.avg}ms`);

        results.productPopular = await measureQuery(pool, 'Popular Products',
            `SELECT p.id, p.name, COUNT(oi.id) as order_count
             FROM products p
             LEFT JOIN variants v ON v.product_id = p.id
             LEFT JOIN order_items oi ON oi.variant_id = v.id
             GROUP BY p.id
             ORDER BY order_count DESC
             LIMIT 5`);
        console.log(`   Popular Prods:   Avg: ${results.productPopular?.avg}ms`);

        // ============================================
        // TEST 6: COLD CONNECTION AFTER IDLE
        // ============================================
        console.log('\\n❄️ COLD CONNECTION TEST');
        console.log('   Waiting 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));

        const coldStart = performance.now();
        await pool.query('SELECT 1');
        results.coldAfter10s = Math.round(performance.now() - coldStart);
        console.log(`   After 10s idle:  ${results.coldAfter10s}ms`);

    } finally {
        await pool.end();
    }

    return results;
}

function compareResults(neon, xata) {
    console.log('\\n\\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    COMPREHENSIVE COMPARISON                        ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');

    const metrics = [
        ['READ: Single', 'readSingle'],
        ['READ: List (10)', 'readList'],
        ['READ: Join', 'readJoin'],
        ['AGG: Simple Count', 'countSimple'],
        ['AGG: Filtered', 'countFiltered'],
        ['AGG: Multi', 'aggregate'],
        ['AGG: Dashboard', 'dashboard'],
        ['WRITE: Insert', 'insert'],
        ['WRITE: Update', 'update'],
        ['WRITE: Delete', 'delete'],
        ['Transaction', 'transaction'],
        ['Complex: Order', 'orderDetails'],
        ['Complex: Popular', 'productPopular'],
        ['Cold (10s idle)', 'coldAfter10s'],
    ];

    let neonWins = 0;
    let xataWins = 0;

    for (const [label, key] of metrics) {
        const neonVal = typeof neon[key] === 'object' ? neon[key]?.avg : neon[key];
        const xataVal = typeof xata[key] === 'object' ? xata[key]?.avg : xata[key];

        const neonStr = neonVal != null ? `${neonVal}ms` : 'N/A';
        const xataStr = xataVal != null ? `${xataVal}ms` : 'N/A';

        let winner = '';
        if (neonVal != null && xataVal != null) {
            if (neonVal < xataVal) {
                winner = '← Neon';
                neonWins++;
            } else if (xataVal < neonVal) {
                winner = 'Xata →';
                xataWins++;
            } else {
                winner = 'Tie';
            }
        }

        console.log(`║ ${label.padEnd(18)} │ Neon: ${neonStr.padEnd(8)} │ Xata: ${xataStr.padEnd(8)} │ ${winner.padEnd(10)} ║`);
    }

    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log(`║ SCORE: Neon ${neonWins} wins | Xata ${xataWins} wins${' '.repeat(32)}║`);
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    console.log('\\n🎯 FINAL RECOMMENDATION:');
    if (xataWins > neonWins) {
        console.log('   ✅ SWITCH TO XATA - Better overall performance');
    } else if (neonWins > xataWins) {
        console.log('   ❌ KEEP NEON - Better overall performance');
    } else {
        console.log('   ⚖️ TIE - Both perform similarly, choose based on other factors');
    }
}

async function main() {
    console.log('🚀 Comprehensive Database Performance Test: Neon vs Xata');
    console.log('═'.repeat(60));
    console.log('Testing: CRUD, Aggregations, Joins, Transactions');
    console.log('This test will take approximately 1-2 minutes...\\n');

    const neonResults = await testDatabase(DATABASES.neon);
    const xataResults = await testDatabase(DATABASES.xata);

    compareResults(neonResults, xataResults);
}

main().catch(console.error);
