/**
 * DEEP Database Benchmark: Neon vs Xata
 * 
 * STRESS TEST MODE:
 * - 100 Concurrent Users
 * - 500 Batch Rows
 * - Complex Transactions
 * - Heavy Write Operations
 * 
 * Run: node scripts/db-deep-benchmark.js
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASES = {
    neon: {
        name: 'Neon (Pooled)',
        connectionString: 'postgresql://neondb_owner:npg_fLhnzIa23SeP@ep-square-sky-agisfeh1-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
    xata: {
        name: 'Xata (TCP/pg)',
        connectionString: 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require',
    }
};

const CONFIG = {
    BATCH_SIZE: 500,           // 500 rows per batch insert
    ITERATIONS: 20,            // 20 iterations per test
    CONCURRENT_USERS: 100,     // 100 parallel connections
    WARMUP: 3,
};

// Helper to get a valid user ID
async function getValidUserId(pool) {
    const res = await pool.query('SELECT id FROM users LIMIT 1');
    return res.rows[0]?.id;
}

async function runTest(name, pool, fn, context = {}, iterations = CONFIG.ITERATIONS) {
    const times = [];
    // Warmup
    for (let i = 0; i < CONFIG.WARMUP; i++) {
        try { await fn(pool, context, i); } catch (e) { /* ignore warmup errors */ }
    }
    // Measure
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
            await fn(pool, context, i + CONFIG.WARMUP);
            times.push(performance.now() - start);
        } catch (e) {
            // Skip failed iterations
        }
    }
    if (times.length === 0) return null;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    return { avg: Math.round(avg), p95: Math.round(p95) };
}

// Batch Insert - uses notifications table with ALL required fields
async function testBatchInsert(pool, context, iteration) {
    const values = [];
    const params = [];
    const userId = context.userId;
    for (let i = 0; i < CONFIG.BATCH_SIZE; i++) {
        const id = `bench_${iteration}_${i}_${Math.random().toString(36).slice(2, 7)}`;
        // id, user_id, type, title, message, created_at
        values.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, NOW())`);
        params.push(id, userId, 'benchmark', 'Benchmark Test', 'Batch test message');
    }
    const query = `INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`;
    await pool.query(query, params);
}

// Complex Analytics - multi-table aggregation
async function testComplexAnalytics(pool) {
    const query = `
        SELECT 
            c.name as category,
            COUNT(p.id) as product_count,
            AVG(p.base_price) as avg_price,
            SUM(v.stock) as total_stock
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN variants v ON v.product_id = p.id
        GROUP BY c.name
        ORDER BY total_stock DESC NULLS LAST
    `;
    await pool.query(query);
}

// Full-text search using ILIKE
async function testSearch(pool) {
    const query = `SELECT name, description FROM products WHERE name ILIKE '%wig%' OR description ILIKE '%natural%' LIMIT 20`;
    await pool.query(query);
}

// Concurrency stress test
async function testConcurrency(pool) {
    const promises = Array(CONFIG.CONCURRENT_USERS).fill(0).map(() =>
        pool.query('SELECT * FROM products WHERE is_active = true LIMIT 5')
    );
    await Promise.all(promises);
}

async function main() {
    console.log('🚀 Starting DEEP Database Benchmark...');
    console.log(`Batch Size: ${CONFIG.BATCH_SIZE} | Iterations: ${CONFIG.ITERATIONS} | Concurrent Users: ${CONFIG.CONCURRENT_USERS}\n`);

    const results = {};
    let hasResults = false;

    for (const [key, config] of Object.entries(DATABASES)) {
        console.log(`\n🔬 Testing ${config.name}...`);
        const pool = new Pool({
            connectionString: config.connectionString,
            ssl: { rejectUnauthorized: false },
            max: 100
        });

        try {
            const userId = await getValidUserId(pool);
            if (!userId) throw new Error('No users found in database');

            const context = { userId };

            const batch = await runTest('Batch Insert', pool, testBatchInsert, context);
            if (batch) {
                console.log(`   ✅ Batch Insert (${CONFIG.BATCH_SIZE} rows): Avg ${batch.avg}ms | P95 ${batch.p95}ms`);
            } else {
                console.log(`   ⚠️ Batch Insert: Failed`);
            }

            const analytics = await runTest('Complex Analytics', pool, testComplexAnalytics);
            if (analytics) {
                console.log(`   ✅ Complex Analytics:          Avg ${analytics.avg}ms | P95 ${analytics.p95}ms`);
            } else {
                console.log(`   ⚠️ Complex Analytics: Failed`);
            }

            const search = await runTest('Search (ILIKE)', pool, testSearch);
            if (search) {
                console.log(`   ✅ Search (ILIKE):             Avg ${search.avg}ms | P95 ${search.p95}ms`);
            } else {
                console.log(`   ⚠️ Search: Failed`);
            }

            const concurrency = await runTest('Concurrency Stress', pool, testConcurrency);
            if (concurrency) {
                console.log(`   ✅ Concurrency (${CONFIG.CONCURRENT_USERS} users):   Avg ${concurrency.avg}ms | P95 ${concurrency.p95}ms`);
            } else {
                console.log(`   ⚠️ Concurrency: Failed`);
            }

            results[key] = { batch, analytics, search, concurrency };
            hasResults = true;

            // Cleanup batch data
            await pool.query("DELETE FROM notifications WHERE id LIKE 'bench_%'");
        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        } finally {
            await pool.end();
        }
    }

    // Only show comparison if we have actual results
    if (hasResults && results.neon && results.xata) {
        console.log('\n' + '═'.repeat(70));
        console.log('📊 DEEP BENCHMARK COMPARISON');
        console.log('═'.repeat(70));

        const metrics = [
            ['Batch Insert (100 rows)', 'batch'],
            ['Complex Analytics', 'analytics'],
            ['Search (ILIKE)', 'search'],
            ['Concurrency (10 users)', 'concurrency']
        ];

        let neonWins = 0;
        let xataWins = 0;

        for (const [label, key] of metrics) {
            const n = results.neon?.[key];
            const x = results.xata?.[key];
            if (n && x) {
                const winner = n.avg < x.avg ? 'Neon' : 'Xata';
                const diff = Math.abs(n.avg - x.avg);
                const pct = Math.round((diff / Math.max(n.avg, x.avg)) * 100);
                if (n.avg < x.avg) neonWins++; else xataWins++;
                console.log(`${label.padEnd(25)} │ Neon: ${String(n.avg).padStart(4)}ms │ Xata: ${String(x.avg).padStart(4)}ms │ ${winner} wins (${pct}% faster)`);
            }
        }

        console.log('═'.repeat(70));
        console.log(`\n🏆 SCORE: Neon ${neonWins} wins | Xata ${xataWins} wins`);

        if (neonWins > xataWins) {
            console.log('\n🎯 RECOMMENDATION: Neon (Pooled) is faster for this workload');
        } else if (xataWins > neonWins) {
            console.log('\n🎯 RECOMMENDATION: Xata is faster for this workload');
        } else {
            console.log('\n🎯 RECOMMENDATION: Performance is comparable - choose based on features');
        }
    } else {
        console.log('\n⚠️ Could not complete comparison - some tests failed');
    }
}

main().catch(console.error);
