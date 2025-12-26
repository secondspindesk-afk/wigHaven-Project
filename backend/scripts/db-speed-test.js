/**
 * Database Speed Comparison Test
 * Compares Neon vs Xata PostgreSQL performance
 * 
 * Run: node scripts/db-speed-test.js
 */

import pg from 'pg';
const { Pool } = pg;

// Database configurations
const DATABASES = {
    neon: {
        name: 'Neon',
        connectionString: 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require',
    },
    xata: {
        name: 'Xata',
        connectionString: 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require',
    }
};

// Test queries
const TESTS = [
    { name: 'Simple ping (SELECT 1)', query: 'SELECT 1' },
    { name: 'Current timestamp', query: 'SELECT NOW()' },
    { name: 'Count small table', query: 'SELECT COUNT(*) FROM users' },
    { name: 'Count medium table', query: 'SELECT COUNT(*) FROM products' },
    {
        name: 'Complex aggregation', query: `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers,
      (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
      (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products
  ` },
];

// Number of times to run each test
const ITERATIONS = 5;

/**
 * Run a single query and measure time
 */
async function measureQuery(pool, query) {
    const start = performance.now();
    try {
        await pool.query(query);
        return performance.now() - start;
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * Test a database with all queries
 */
async function testDatabase(config) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${config.name}`);
    console.log(`${'='.repeat(60)}`);

    const pool = new Pool({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
    });

    const results = {};

    // Cold start test (first connection)
    console.log('\n📊 Cold Start Test (first connection):');
    const coldStart = performance.now();
    try {
        await pool.query('SELECT 1');
        const coldTime = performance.now() - coldStart;
        console.log(`   Cold connection time: ${coldTime.toFixed(0)}ms`);
        results.coldStart = coldTime;
    } catch (error) {
        console.log(`   ❌ Cold connection failed: ${error.message}`);
        results.coldStart = 'FAILED';
        await pool.end();
        return results;
    }

    // Run each test
    for (const test of TESTS) {
        console.log(`\n📊 ${test.name}:`);
        const times = [];

        for (let i = 0; i < ITERATIONS; i++) {
            const time = await measureQuery(pool, test.query);
            if (typeof time === 'number') {
                times.push(time);
                process.stdout.write(`   Run ${i + 1}: ${time.toFixed(0)}ms\n`);
            } else {
                console.log(`   Run ${i + 1}: ❌ ${time.error}`);
            }
        }

        if (times.length > 0) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const min = Math.min(...times);
            const max = Math.max(...times);
            console.log(`   ─────────────────────────`);
            console.log(`   Avg: ${avg.toFixed(0)}ms | Min: ${min.toFixed(0)}ms | Max: ${max.toFixed(0)}ms`);
            results[test.name] = { avg, min, max };
        }
    }

    // Wait 5 seconds and test "warm" connection
    console.log('\n⏳ Waiting 5 seconds to test warm connection...');
    await new Promise(r => setTimeout(r, 5000));

    const warmTime = await measureQuery(pool, 'SELECT 1');
    console.log(`📊 Warm connection (after 5s idle): ${typeof warmTime === 'number' ? warmTime.toFixed(0) + 'ms' : warmTime.error}`);
    results.warmAfter5s = warmTime;

    // Wait 30 seconds and test if connection goes cold
    console.log('\n⏳ Waiting 30 seconds to test if connection goes cold...');
    await new Promise(r => setTimeout(r, 30000));

    const afterIdleTime = await measureQuery(pool, 'SELECT 1');
    console.log(`📊 After 30s idle: ${typeof afterIdleTime === 'number' ? afterIdleTime.toFixed(0) + 'ms' : afterIdleTime.error}`);
    results.after30sIdle = afterIdleTime;

    await pool.end();
    return results;
}

/**
 * Compare results
 */
function compareResults(neonResults, xataResults) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    COMPARISON SUMMARY                          ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');

    const metrics = [
        ['Cold Start', 'coldStart'],
        ['Warm (after 5s)', 'warmAfter5s'],
        ['After 30s Idle', 'after30sIdle'],
    ];

    for (const [label, key] of metrics) {
        const neon = typeof neonResults[key] === 'number' ? `${neonResults[key].toFixed(0)}ms` : 'N/A';
        const xata = typeof xataResults[key] === 'number' ? `${xataResults[key].toFixed(0)}ms` : 'N/A';

        let winner = '';
        if (typeof neonResults[key] === 'number' && typeof xataResults[key] === 'number') {
            winner = neonResults[key] < xataResults[key] ? '← Neon wins' : '→ Xata wins';
        }

        console.log(`║ ${label.padEnd(20)} │ Neon: ${neon.padEnd(8)} │ Xata: ${xata.padEnd(8)} │ ${winner.padEnd(12)} ║`);
    }

    console.log('╚════════════════════════════════════════════════════════════════╝');

    // Recommendation
    console.log('\n🎯 RECOMMENDATION:');
    const neonCold = typeof neonResults.coldStart === 'number' ? neonResults.coldStart : 99999;
    const xataCold = typeof xataResults.coldStart === 'number' ? xataResults.coldStart : 99999;
    const neonIdle = typeof neonResults.after30sIdle === 'number' ? neonResults.after30sIdle : 99999;
    const xataIdle = typeof xataResults.after30sIdle === 'number' ? xataResults.after30sIdle : 99999;

    if (xataCold < neonCold && xataIdle < neonIdle) {
        console.log('   ✅ SWITCH TO XATA - Better cold start AND better idle recovery');
    } else if (xataIdle < 500 && neonIdle > 500) {
        console.log('   ✅ SWITCH TO XATA - Stays warm much better (critical for serverless)');
    } else if (neonCold < xataCold && neonIdle < xataIdle) {
        console.log('   ❌ KEEP NEON - Performs better on both metrics');
    } else {
        console.log('   ⚖️ MIXED RESULTS - Review the detailed numbers above');
    }
}

// Main
async function main() {
    console.log('🚀 Database Speed Comparison: Neon vs Xata');
    console.log('═'.repeat(60));
    console.log('This test will take approximately 2 minutes...\n');

    // Connection strings are hardcoded for this test

    const neonResults = await testDatabase(DATABASES.neon);
    const xataResults = await testDatabase(DATABASES.xata);

    compareResults(neonResults, xataResults);
}

main().catch(console.error);
