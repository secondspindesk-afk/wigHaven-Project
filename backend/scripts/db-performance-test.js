/**
 * Database Performance Test
 * 
 * Tests: Latency, Read/Write Speed, Concurrency
 * 
 * Usage:
 *   node scripts/db-performance-test.js
 * 
 * Make sure backend is NOT running when you run this test
 * (to avoid connection pool conflicts)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Test configuration
const CONFIG = {
    singleReadCount: 20,      // Number of single reads
    singleWriteCount: 10,     // Number of single writes
    concurrentCount: 10,      // Concurrent operations at once
    batchSize: 5,             // Batch operation size
};

// Results storage
const results = {
    provider: '',
    timestamp: new Date().toISOString(),
    tests: {}
};

// Helper to measure time
const measure = async (name, fn) => {
    const start = Date.now();
    try {
        await fn();
        const duration = Date.now() - start;
        return { success: true, duration };
    } catch (error) {
        const duration = Date.now() - start;
        return { success: false, duration, error: error.message };
    }
};

// Helper to calculate stats
const calculateStats = (times) => {
    if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = times[0];
    const max = times[times.length - 1];
    const p95 = times[Math.floor(times.length * 0.95)] || max;

    return {
        avg: Math.round(avg),
        min,
        max,
        p95
    };
};

console.log('\n' + '='.repeat(60));
console.log('🔬 DATABASE PERFORMANCE TEST');
console.log('='.repeat(60));
console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown'}`);
console.log(`Time: ${new Date().toLocaleString()}`);
console.log('='.repeat(60) + '\n');

// Detect provider from URL
if (process.env.DATABASE_URL?.includes('supabase')) {
    results.provider = 'Supabase';
} else if (process.env.DATABASE_URL?.includes('neon')) {
    results.provider = 'Neon';
} else {
    results.provider = 'Unknown';
}

async function runTests() {
    try {
        // ============================================
        // TEST 1: Connection Latency
        // ============================================
        console.log('📡 Test 1: Connection Latency...');
        const connResult = await measure('connection', async () => {
            await prisma.$connect();
        });
        console.log(`   Connection: ${connResult.duration}ms ${connResult.success ? '✓' : '✗'}\n`);
        results.tests.connection = connResult;

        // ============================================
        // TEST 2: Single Read Operations
        // ============================================
        console.log(`📖 Test 2: Single Reads (${CONFIG.singleReadCount}x)...`);
        const readTimes = [];

        for (let i = 0; i < CONFIG.singleReadCount; i++) {
            const result = await measure('read', async () => {
                await prisma.user.findFirst();
            });
            if (result.success) readTimes.push(result.duration);
        }

        const readStats = calculateStats(readTimes);
        console.log(`   Avg: ${readStats.avg}ms | Min: ${readStats.min}ms | Max: ${readStats.max}ms | P95: ${readStats.p95}ms\n`);
        results.tests.singleRead = readStats;

        // ============================================
        // TEST 3: Single Write Operations
        // ============================================
        console.log(`✏️ Test 3: Single Writes (${CONFIG.singleWriteCount}x)...`);
        const writeTimes = [];
        const testEmail = `perf_test_${Date.now()}@test.com`;

        // Create test user
        const testUser = await prisma.user.create({
            data: {
                email: testEmail,
                password: 'test123',
                firstName: 'Perf',
                lastName: 'Test',
                role: 'customer'
            }
        });

        for (let i = 0; i < CONFIG.singleWriteCount; i++) {
            const result = await measure('write', async () => {
                await prisma.user.update({
                    where: { id: testUser.id },
                    data: { firstName: `Test${i}` }
                });
            });
            if (result.success) writeTimes.push(result.duration);
        }

        const writeStats = calculateStats(writeTimes);
        console.log(`   Avg: ${writeStats.avg}ms | Min: ${writeStats.min}ms | Max: ${writeStats.max}ms | P95: ${writeStats.p95}ms\n`);
        results.tests.singleWrite = writeStats;

        // ============================================
        // TEST 4: Concurrent Reads
        // ============================================
        console.log(`🔀 Test 4: Concurrent Reads (${CONFIG.concurrentCount} parallel)...`);
        const concurrentReadStart = Date.now();

        const concurrentReadResults = await Promise.all(
            Array(CONFIG.concurrentCount).fill(null).map(() =>
                measure('concurrent_read', async () => {
                    await prisma.product.findMany({ take: 5 });
                })
            )
        );

        const concurrentReadDuration = Date.now() - concurrentReadStart;
        const concurrentReadTimes = concurrentReadResults.filter(r => r.success).map(r => r.duration);
        const concurrentReadStats = calculateStats(concurrentReadTimes);
        const concurrentReadFailed = concurrentReadResults.filter(r => !r.success).length;

        console.log(`   Total: ${concurrentReadDuration}ms | Avg: ${concurrentReadStats.avg}ms | Failed: ${concurrentReadFailed}/${CONFIG.concurrentCount}\n`);
        results.tests.concurrentRead = {
            ...concurrentReadStats,
            total: concurrentReadDuration,
            failed: concurrentReadFailed
        };

        // ============================================
        // TEST 5: Concurrent Writes
        // ============================================
        console.log(`🔀 Test 5: Concurrent Writes (${CONFIG.concurrentCount} parallel)...`);
        const concurrentWriteStart = Date.now();

        const concurrentWriteResults = await Promise.all(
            Array(CONFIG.concurrentCount).fill(null).map((_, i) =>
                measure('concurrent_write', async () => {
                    await prisma.user.update({
                        where: { id: testUser.id },
                        data: { lastName: `ConcurrentTest${i}` }
                    });
                })
            )
        );

        const concurrentWriteDuration = Date.now() - concurrentWriteStart;
        const concurrentWriteTimes = concurrentWriteResults.filter(r => r.success).map(r => r.duration);
        const concurrentWriteStats = calculateStats(concurrentWriteTimes);
        const concurrentWriteFailed = concurrentWriteResults.filter(r => !r.success).length;

        console.log(`   Total: ${concurrentWriteDuration}ms | Avg: ${concurrentWriteStats.avg}ms | Failed: ${concurrentWriteFailed}/${CONFIG.concurrentCount}\n`);
        results.tests.concurrentWrite = {
            ...concurrentWriteStats,
            total: concurrentWriteDuration,
            failed: concurrentWriteFailed
        };

        // ============================================
        // TEST 6: Complex Query (Join)
        // ============================================
        console.log(`🔗 Test 6: Complex Query (Join)...`);
        const joinTimes = [];

        for (let i = 0; i < 5; i++) {
            const result = await measure('join', async () => {
                await prisma.order.findMany({
                    take: 3,
                    include: {
                        items: {
                            include: {
                                variant: {
                                    include: { product: true }
                                }
                            }
                        },
                        user: true
                    }
                });
            });
            if (result.success) joinTimes.push(result.duration);
        }

        const joinStats = calculateStats(joinTimes);
        console.log(`   Avg: ${joinStats.avg}ms | Min: ${joinStats.min}ms | Max: ${joinStats.max}ms\n`);
        results.tests.complexQuery = joinStats;

        // ============================================
        // CLEANUP
        // ============================================
        console.log('🧹 Cleanup...');
        await prisma.user.delete({ where: { id: testUser.id } });
        console.log('   Done\n');

        // ============================================
        // SUMMARY
        // ============================================
        console.log('='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`Provider: ${results.provider}`);
        console.log(`\nLatencies (avg):`);
        console.log(`  • Connection:      ${results.tests.connection.duration}ms`);
        console.log(`  • Single Read:     ${results.tests.singleRead.avg}ms`);
        console.log(`  • Single Write:    ${results.tests.singleWrite.avg}ms`);
        console.log(`  • Concurrent Read: ${results.tests.concurrentRead.avg}ms (total: ${results.tests.concurrentRead.total}ms)`);
        console.log(`  • Concurrent Write:${results.tests.concurrentWrite.avg}ms (total: ${results.tests.concurrentWrite.total}ms)`);
        console.log(`  • Complex Query:   ${results.tests.complexQuery.avg}ms`);
        console.log(`\nConcurrency:`);
        console.log(`  • Read failures:   ${results.tests.concurrentRead.failed}/${CONFIG.concurrentCount}`);
        console.log(`  • Write failures:  ${results.tests.concurrentWrite.failed}/${CONFIG.concurrentCount}`);
        console.log('='.repeat(60));

        // Calculate score
        const score = (
            (1000 / (results.tests.singleRead.avg + 1)) * 2 +
            (1000 / (results.tests.singleWrite.avg + 1)) +
            (1000 / (results.tests.concurrentRead.total + 1)) * 2 +
            (10 - results.tests.concurrentRead.failed) * 5 +
            (10 - results.tests.concurrentWrite.failed) * 5
        );

        console.log(`\n🏆 PERFORMANCE SCORE: ${Math.round(score)}/200`);
        console.log('='.repeat(60) + '\n');

        // Save results to JSON
        const fs = await import('fs');
        const filename = `db-test-${results.provider.toLowerCase()}-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`Results saved to: ${filename}\n`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
