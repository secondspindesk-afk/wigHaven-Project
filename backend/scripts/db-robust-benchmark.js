/**
 * ROBUST Database Benchmark: Neon vs Xata
 * 
 * Based on serverless database benchmarking best practices:
 * - Separate cold vs hot measurements
 * - Statistical analysis (P50, P90, P99, variance)
 * - Warm-up periods
 * - Multiple iterations (10+)
 * - Connection stability test
 * - Concurrent load test
 * 
 * Run: node scripts/db-robust-benchmark.js
 */

import pg from 'pg';
const { Pool } = pg;

// Database configurations - Testing BOTH pooled and direct URLs
const DATABASES = {
    neon_pooled: {
        name: 'Neon (Pooled)',
        connectionString: 'postgresql://neondb_owner:npg_fLhnzIa23SeP@ep-square-sky-agisfeh1-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
    neon_direct: {
        name: 'Neon (Direct)',
        connectionString: 'postgresql://neondb_owner:npg_fLhnzIa23SeP@ep-square-sky-agisfeh1.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
    xata: {
        name: 'Xata',
        connectionString: 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require',
    }
};

const CONFIG = {
    ITERATIONS: 15,          // More iterations for statistical significance
    WARMUP_QUERIES: 5,       // Warm-up queries before measurement
    CONCURRENT_USERS: 5,     // Simulated concurrent users
    COLD_WAIT_SEC: 15,       // Wait time for cold start test
    CONNECTION_TIMEOUT: 30000,
};

// Statistical helper functions
function calculateStats(times) {
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
        min: Math.round(sorted[0]),
        max: Math.round(sorted[sorted.length - 1]),
        mean: Math.round(mean),
        median: Math.round(sorted[Math.floor(sorted.length / 2)]),
        p90: Math.round(sorted[Math.floor(sorted.length * 0.9)]),
        p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]),
        stdDev: Math.round(stdDev),
        cv: Math.round((stdDev / mean) * 100), // Coefficient of variation (%)
        samples: sorted.length,
    };
}

async function measureQuery(pool, query, params = []) {
    const start = performance.now();
    try {
        await pool.query(query, params);
        return performance.now() - start;
    } catch (error) {
        return { error: error.message };
    }
}

async function runQueryBenchmark(pool, name, query, params = [], iterations = CONFIG.ITERATIONS) {
    const times = [];

    // Warm-up phase (not measured)
    for (let i = 0; i < CONFIG.WARMUP_QUERIES; i++) {
        await measureQuery(pool, query, params);
    }

    // Measurement phase
    for (let i = 0; i < iterations; i++) {
        const time = await measureQuery(pool, query, params);
        if (typeof time === 'number') {
            times.push(time);
        }
    }

    return calculateStats(times);
}

async function testConcurrentLoad(pool, query, users = CONFIG.CONCURRENT_USERS) {
    const times = [];

    // Run concurrent queries
    for (let batch = 0; batch < 3; batch++) { // 3 batches
        const batchStart = performance.now();
        const promises = Array(users).fill(null).map(() => measureQuery(pool, query));
        const results = await Promise.all(promises);
        const batchTime = performance.now() - batchStart;

        results.forEach(r => {
            if (typeof r === 'number') times.push(r);
        });
    }

    return {
        stats: calculateStats(times),
        successRate: Math.round((times.length / (3 * users)) * 100),
    };
}

async function testConnectionStability(pool, duration = 20) {
    const results = { success: 0, errors: 0, times: [] };
    const endTime = Date.now() + duration * 1000;

    while (Date.now() < endTime) {
        const time = await measureQuery(pool, 'SELECT 1');
        if (typeof time === 'number') {
            results.success++;
            results.times.push(time);
        } else {
            results.errors++;
        }
        await new Promise(r => setTimeout(r, 500)); // Query every 500ms
    }

    return {
        totalQueries: results.success + results.errors,
        successRate: Math.round((results.success / (results.success + results.errors)) * 100),
        errors: results.errors,
        avgLatency: results.times.length > 0 ? Math.round(results.times.reduce((a, b) => a + b, 0) / results.times.length) : null,
        maxLatency: results.times.length > 0 ? Math.round(Math.max(...results.times)) : null,
    };
}

async function testDatabase(config) {
    console.log(`\\n${'═'.repeat(70)}`);
    console.log(`🔬 Testing: ${config.name}`);
    console.log('═'.repeat(70));

    const pool = new Pool({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: CONFIG.CONNECTION_TIMEOUT,
        max: 10,
    });

    const results = { name: config.name };

    try {
        // ============================================
        // TEST 1: COLD START
        // ============================================
        console.log('\\n❄️ Test 1: Cold Start (first connection)...');
        const coldStart = performance.now();
        await pool.query('SELECT 1');
        results.coldStart = Math.round(performance.now() - coldStart);
        console.log(`   Cold Start: ${results.coldStart}ms`);

        // ============================================
        // TEST 2: HOT QUERIES (with warm-up)
        // ============================================
        console.log('\\n🔥 Test 2: Hot Query Performance (after warm-up)...');

        results.selectSimple = await runQueryBenchmark(pool, 'SELECT Simple', 'SELECT 1');
        console.log(`   SELECT 1:        Mean: ${results.selectSimple?.mean}ms | P90: ${results.selectSimple?.p90}ms | CV: ${results.selectSimple?.cv}%`);

        results.selectRow = await runQueryBenchmark(pool, 'SELECT Row',
            'SELECT * FROM users LIMIT 1');
        console.log(`   SELECT Row:      Mean: ${results.selectRow?.mean}ms | P90: ${results.selectRow?.p90}ms | CV: ${results.selectRow?.cv}%`);

        results.selectList = await runQueryBenchmark(pool, 'SELECT List',
            'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT 10');
        console.log(`   SELECT List:     Mean: ${results.selectList?.mean}ms | P90: ${results.selectList?.p90}ms | CV: ${results.selectList?.cv}%`);

        results.selectCount = await runQueryBenchmark(pool, 'SELECT Count',
            'SELECT COUNT(*) FROM orders');
        console.log(`   COUNT:           Mean: ${results.selectCount?.mean}ms | P90: ${results.selectCount?.p90}ms | CV: ${results.selectCount?.cv}%`);

        results.selectComplex = await runQueryBenchmark(pool, 'Complex Join',
            `SELECT o.*, u.email FROM orders o LEFT JOIN users u ON o.user_id = u.id LIMIT 5`);
        console.log(`   Complex Join:    Mean: ${results.selectComplex?.mean}ms | P90: ${results.selectComplex?.p90}ms | CV: ${results.selectComplex?.cv}%`);

        results.dashboardStats = await runQueryBenchmark(pool, 'Dashboard',
            `SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products`);
        console.log(`   Dashboard Stats: Mean: ${results.dashboardStats?.mean}ms | P90: ${results.dashboardStats?.p90}ms | CV: ${results.dashboardStats?.cv}%`);

        // ============================================
        // TEST 3: WRITE OPERATIONS
        // ============================================
        console.log('\\n✏️ Test 3: Write Operations...');

        // Create unique test data
        const testId = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // INSERT
        const insertTimes = [];
        for (let i = 0; i < CONFIG.ITERATIONS; i++) {
            const id = `${testId}_${i}`;
            const time = await measureQuery(pool,
                `INSERT INTO notifications (id, user_id, type, title, message, created_at)
                 SELECT $1, id, 'benchmark', 'Benchmark', 'Test', NOW() FROM users LIMIT 1
                 ON CONFLICT DO NOTHING`, [id]);
            if (typeof time === 'number') insertTimes.push(time);
        }
        results.insert = calculateStats(insertTimes);
        console.log(`   INSERT:          Mean: ${results.insert?.mean}ms | P90: ${results.insert?.p90}ms | CV: ${results.insert?.cv}%`);

        // UPDATE
        const updateTimes = [];
        for (let i = 0; i < CONFIG.ITERATIONS; i++) {
            const time = await measureQuery(pool,
                `UPDATE notifications SET title = 'Updated' WHERE id LIKE $1 || '%'`, [testId]);
            if (typeof time === 'number') updateTimes.push(time);
        }
        results.update = calculateStats(updateTimes);
        console.log(`   UPDATE:          Mean: ${results.update?.mean}ms | P90: ${results.update?.p90}ms | CV: ${results.update?.cv}%`);

        // DELETE (cleanup)
        const deleteStart = performance.now();
        await pool.query(`DELETE FROM notifications WHERE id LIKE $1 || '%'`, [testId]);
        results.delete = Math.round(performance.now() - deleteStart);
        console.log(`   DELETE:          ${results.delete}ms`);

        // ============================================
        // TEST 4: TRANSACTIONS
        // ============================================
        console.log('\\n🔄 Test 4: Transaction Performance...');
        const txTimes = [];
        for (let i = 0; i < CONFIG.ITERATIONS; i++) {
            const client = await pool.connect();
            const txStart = performance.now();
            try {
                await client.query('BEGIN');
                await client.query('SELECT * FROM variants LIMIT 1 FOR UPDATE');
                await client.query('UPDATE variants SET reserved_stock = reserved_stock WHERE id = (SELECT id FROM variants LIMIT 1)');
                await client.query('COMMIT');
                txTimes.push(performance.now() - txStart);
            } catch (e) {
                await client.query('ROLLBACK');
            } finally {
                client.release();
            }
        }
        results.transaction = calculateStats(txTimes);
        console.log(`   Transaction:     Mean: ${results.transaction?.mean}ms | P90: ${results.transaction?.p90}ms | CV: ${results.transaction?.cv}%`);

        // ============================================
        // TEST 5: CONCURRENT LOAD
        // ============================================
        console.log('\\n👥 Test 5: Concurrent Load Test (' + CONFIG.CONCURRENT_USERS + ' parallel)...');
        results.concurrentLoad = await testConcurrentLoad(pool, 'SELECT * FROM products LIMIT 5');
        console.log(`   Concurrent:      Mean: ${results.concurrentLoad.stats?.mean}ms | P90: ${results.concurrentLoad.stats?.p90}ms | Success: ${results.concurrentLoad.successRate}%`);

        // ============================================
        // TEST 6: CONNECTION STABILITY
        // ============================================
        console.log('\\n🔌 Test 6: Connection Stability (20 seconds)...');
        results.stability = await testConnectionStability(pool, 20);
        console.log(`   Stability:       ${results.stability.successRate}% success | Avg: ${results.stability.avgLatency}ms | Max: ${results.stability.maxLatency}ms | Errors: ${results.stability.errors}`);

        // ============================================
        // TEST 7: COLD RECOVERY (after idle)
        // ============================================
        console.log(`\\n❄️ Test 7: Cold Recovery (waiting ${CONFIG.COLD_WAIT_SEC}s)...`);
        await pool.end(); // Close all connections
        await new Promise(r => setTimeout(r, CONFIG.COLD_WAIT_SEC * 1000));

        // Create new pool
        const coldPool = new Pool({
            connectionString: config.connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: CONFIG.CONNECTION_TIMEOUT,
        });

        const coldRecoveryStart = performance.now();
        await coldPool.query('SELECT 1');
        results.coldRecovery = Math.round(performance.now() - coldRecoveryStart);
        console.log(`   Cold Recovery:   ${results.coldRecovery}ms`);

        await coldPool.end();

    } catch (error) {
        console.log(`\\n❌ Error: ${error.message}`);
        results.error = error.message;
    }

    return results;
}

function generateReport(allResults) {
    console.log('\\n\\n');
    console.log('╔' + '═'.repeat(90) + '╗');
    console.log('║' + ' '.repeat(30) + 'COMPREHENSIVE BENCHMARK REPORT' + ' '.repeat(30) + '║');
    console.log('╠' + '═'.repeat(90) + '╣');

    // Calculate overall scores
    const scores = {};
    const metrics = [
        { key: 'coldStart', weight: 2, lower: true },
        { key: 'coldRecovery', weight: 3, lower: true },
        { key: 'selectSimple.mean', weight: 1, lower: true },
        { key: 'selectRow.mean', weight: 1, lower: true },
        { key: 'selectList.mean', weight: 2, lower: true },
        { key: 'selectCount.mean', weight: 1, lower: true },
        { key: 'selectComplex.mean', weight: 2, lower: true },
        { key: 'dashboardStats.mean', weight: 2, lower: true },
        { key: 'insert.mean', weight: 1, lower: true },
        { key: 'update.mean', weight: 1, lower: true },
        { key: 'transaction.mean', weight: 2, lower: true },
        { key: 'concurrentLoad.stats.mean', weight: 2, lower: true },
        { key: 'stability.successRate', weight: 3, lower: false },
    ];

    // Print detailed comparison
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((o, k) => o?.[k], obj);
    };

    for (const r of allResults) {
        scores[r.name] = 0;
    }

    console.log('║ Metric                    │ ' + allResults.map(r => r.name.padEnd(20)).join(' │ ') + ' ║');
    console.log('╠' + '─'.repeat(90) + '╣');

    const displayMetrics = [
        ['Cold Start', 'coldStart', 'ms'],
        ['Cold Recovery', 'coldRecovery', 'ms'],
        ['SELECT 1 (Mean)', 'selectSimple.mean', 'ms'],
        ['SELECT 1 (P90)', 'selectSimple.p90', 'ms'],
        ['SELECT 1 (CV%)', 'selectSimple.cv', '%'],
        ['SELECT Row', 'selectRow.mean', 'ms'],
        ['SELECT List', 'selectList.mean', 'ms'],
        ['COUNT', 'selectCount.mean', 'ms'],
        ['Complex Join', 'selectComplex.mean', 'ms'],
        ['Dashboard Stats', 'dashboardStats.mean', 'ms'],
        ['INSERT', 'insert.mean', 'ms'],
        ['UPDATE', 'update.mean', 'ms'],
        ['Transaction', 'transaction.mean', 'ms'],
        ['Concurrent Load', 'concurrentLoad.stats.mean', 'ms'],
        ['Stability %', 'stability.successRate', '%'],
    ];

    for (const [label, path, unit] of displayMetrics) {
        const values = allResults.map(r => {
            const val = getNestedValue(r, path);
            return val !== undefined && val !== null ? `${val}${unit}` : 'N/A';
        });

        // Determine winner
        const numericValues = allResults.map(r => getNestedValue(r, path)).filter(v => typeof v === 'number');
        let winnerIdx = -1;
        if (numericValues.length >= 2) {
            const isLowerBetter = path !== 'stability.successRate';
            const best = isLowerBetter ? Math.min(...numericValues) : Math.max(...numericValues);
            winnerIdx = allResults.findIndex(r => getNestedValue(r, path) === best);
        }

        const row = values.map((v, i) => {
            const padded = v.padEnd(20);
            return i === winnerIdx ? `${padded}` : padded;
        }).join(' │ ');

        console.log(`║ ${label.padEnd(25)} │ ${row} ║`);
    }

    console.log('╠' + '═'.repeat(90) + '╣');

    // Winner analysis
    for (const m of metrics) {
        const numericValues = allResults.map(r => getNestedValue(r, m.key)).filter(v => typeof v === 'number');
        if (numericValues.length >= 2) {
            const best = m.lower ? Math.min(...numericValues) : Math.max(...numericValues);
            const winner = allResults.find(r => getNestedValue(r, m.key) === best);
            if (winner) scores[winner.name] += m.weight;
        }
    }

    console.log('║ WEIGHTED SCORES:                                                                         ║');
    for (const name of Object.keys(scores)) {
        console.log(`║   ${name.padEnd(25)}: ${scores[name]} points                                          ║`.slice(0, 93) + '║');
    }
    console.log('╠' + '═'.repeat(90) + '╣');

    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    console.log('║' + ' '.repeat(30) + `🏆 WINNER: ${winner[0]}`.padEnd(60) + '║');
    console.log('╚' + '═'.repeat(90) + '╝');

    // Recommendation
    console.log('\\n📊 ANALYSIS:');
    console.log('─'.repeat(70));

    // Find highest CV (most unstable)
    const cvValues = allResults.map(r => ({ name: r.name, cv: r.selectSimple?.cv || 0 }));
    const mostStable = cvValues.sort((a, b) => a.cv - b.cv)[0];
    console.log(`   Most Consistent:     ${mostStable.name} (CV: ${mostStable.cv}%)`);

    const coldWinner = allResults.sort((a, b) => (a.coldRecovery || 9999) - (b.coldRecovery || 9999))[0];
    console.log(`   Best Cold Recovery:  ${coldWinner.name} (${coldWinner.coldRecovery}ms)`);

    console.log('\\n🎯 FINAL RECOMMENDATION:');
    console.log(`   ✅ USE ${winner[0].toUpperCase()} - Best overall performance score`);
    console.log('');
}

async function main() {
    console.log('🏁 ROBUST Database Benchmark: Neon vs Xata');
    console.log('═'.repeat(70));
    console.log('This benchmark uses industry best practices:');
    console.log('  • Multiple iterations with warm-up periods');
    console.log('  • Statistical analysis (Mean, P90, P99, Variance)');
    console.log('  • Separate cold vs hot measurements');
    console.log('  • Connection stability testing');
    console.log('  • Concurrent load simulation');
    console.log('\\nEstimated time: ~3 minutes');
    console.log('═'.repeat(70));

    const results = [];

    for (const [key, config] of Object.entries(DATABASES)) {
        const result = await testDatabase(config);
        results.push(result);
    }

    generateReport(results);
}

main().catch(console.error);
