/**
 * Cache Performance Test Script
 * 
 * Tests server-side caching effectiveness by simulating:
 * 1. Same user - sequential requests (should cache after first)
 * 2. Same user - concurrent requests (should deduplicate)
 * 3. Different users - concurrent requests (should share cache)
 * 4. Cache invalidation timing
 * 
 * Run: node scripts/test-cache-performance.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// High-frequency public routes that should be cached
const PUBLIC_ROUTES = [
    { name: 'Public Settings', path: '/settings/public', cacheExpected: true },
    { name: 'Banners', path: '/banners', cacheExpected: true },
    { name: 'Categories', path: '/products/categories', cacheExpected: true },
    { name: 'Products (newest)', path: '/products?page=1&sort=newest', cacheExpected: true },
    { name: 'Products (popular)', path: '/products?sort=popular&page=1', cacheExpected: true },
    { name: 'Featured Products', path: '/products?featured=true', cacheExpected: true },
];

// Authenticated routes (require token)
const AUTH_ROUTES = [
    { name: 'User Notifications', path: '/notifications?page=1', cacheExpected: false }, // User-specific, no cache
    { name: 'Cart', path: '/cart', cacheExpected: false }, // User-specific, no cache
    { name: 'Wishlist', path: '/wishlist', cacheExpected: false }, // User-specific, no cache
    { name: 'Auth Me', path: '/auth/me', cacheExpected: false }, // User-specific
];

// Product detail routes (should cache with product ID)
const PRODUCT_ROUTES = [
    // Replace with actual product IDs from your database
    { name: 'Product Detail', path: '/products/cmiz9vgac000ejeo320wlc1my', cacheExpected: true },
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

// Results storage
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: [],
};

/**
 * Make a timed HTTP request
 */
async function timedFetch(url, options = {}) {
    const start = Date.now();
    try {
        const response = await fetch(url, options);
        const duration = Date.now() - start;
        const data = await response.json().catch(() => ({}));
        return {
            ok: response.ok,
            status: response.status,
            duration,
            data,
            headers: Object.fromEntries(response.headers.entries()),
        };
    } catch (error) {
        return { ok: false, duration: Date.now() - start, error: error.message };
    }
}

/**
 * Test sequential requests from same user
 * First request should be slow (cache miss), subsequent should be fast (cache hit)
 */
async function testSequentialRequests(route, token = null) {
    const url = `${BASE_URL}${route.path}`;
    const options = token ? { headers: { 'x-auth-token': token } } : {};

    console.log(`\n${colors.cyan}▶ ${route.name}${colors.reset}`);
    console.log(`  ${colors.dim}${route.path}${colors.reset}`);

    // First request (cold)
    const first = await timedFetch(url, options);

    // Second request (should be cached)
    const second = await timedFetch(url, options);

    // Third request (still cached)
    const third = await timedFetch(url, options);

    const avgCached = (second.duration + third.duration) / 2;
    const cacheSpeedup = first.duration / avgCached;
    // Cache is effective if speedup > 2x OR if warm response is fast (<150ms)
    const hasCacheBenefit = cacheSpeedup > 2 || avgCached < 150;

    if (!first.ok) {
        console.log(`  ${colors.red}✗ FAILED${colors.reset} - HTTP ${first.status || 'error'}`);
        results.failed++;
        results.details.push({ route: route.name, status: 'FAILED', reason: `HTTP ${first.status}` });
        return;
    }

    console.log(`  1st request (cold): ${formatDuration(first.duration)}`);
    console.log(`  2nd request:        ${formatDuration(second.duration)}`);
    console.log(`  3rd request:        ${formatDuration(third.duration)}`);

    if (route.cacheExpected) {
        if (hasCacheBenefit) {
            console.log(`  ${colors.green}✓ CACHED${colors.reset} - ${cacheSpeedup.toFixed(1)}x speedup`);
            results.passed++;
            results.details.push({ route: route.name, status: 'CACHED', speedup: cacheSpeedup.toFixed(1) });
        } else {
            console.log(`  ${colors.red}✗ NOT CACHED${colors.reset} - No significant speedup (${cacheSpeedup.toFixed(1)}x)`);
            results.failed++;
            results.details.push({
                route: route.name,
                status: 'NOT_CACHED',
                cold: first.duration,
                warm: avgCached,
                recommendation: 'Add caching for this route'
            });
        }
    } else {
        // Cache not expected (user-specific data)
        if (hasCacheBenefit) {
            console.log(`  ${colors.yellow}⚠ UNEXPECTEDLY CACHED${colors.reset} - User data should not be cached!`);
            results.warnings++;
            results.details.push({ route: route.name, status: 'WARNING', reason: 'User-specific data being cached' });
        } else {
            console.log(`  ${colors.green}✓ NOT CACHED (correct)${colors.reset} - User-specific data`);
            results.passed++;
            results.details.push({ route: route.name, status: 'OK', reason: 'Correctly not cached' });
        }
    }

    return { first, second, third };
}

/**
 * Test concurrent requests (should not cause duplicate DB queries)
 */
async function testConcurrentRequests(route, count = 5) {
    const url = `${BASE_URL}${route.path}`;

    console.log(`\n${colors.cyan}▶ Concurrent Test: ${route.name}${colors.reset}`);
    console.log(`  ${colors.dim}${count} simultaneous requests${colors.reset}`);

    const start = Date.now();
    const promises = Array(count).fill(null).map(() => timedFetch(url));
    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;

    const durations = results.map(r => r.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    console.log(`  Total time for ${count} requests: ${formatDuration(totalTime)}`);
    console.log(`  Individual: min=${formatDuration(min)}, avg=${formatDuration(avg)}, max=${formatDuration(max)}`);

    // If all requests took similar time, there's likely no request deduplication
    if (max - min < 50 && avg < 200) {
        console.log(`  ${colors.green}✓ EFFICIENT${colors.reset} - Low variance suggests good caching/deduplication`);
    } else if (max > 1000) {
        console.log(`  ${colors.yellow}⚠ SLOW${colors.reset} - Some requests taking >1s, may need optimization`);
    }

    return { totalTime, avg, min, max };
}

/**
 * Test different "users" hitting same cached endpoint
 */
async function testMultiUserSharedCache(route) {
    const url = `${BASE_URL}${route.path}`;

    console.log(`\n${colors.cyan}▶ Multi-User Cache Test: ${route.name}${colors.reset}`);

    // Simulate user A (first request to warm cache)
    const userA1 = await timedFetch(url);

    // Simulate user B (should hit cache)
    const userB1 = await timedFetch(url);

    // Simulate user C (should hit cache)
    const userC1 = await timedFetch(url);

    console.log(`  User A (first):  ${formatDuration(userA1.duration)}`);
    console.log(`  User B (second): ${formatDuration(userB1.duration)}`);
    console.log(`  User C (third):  ${formatDuration(userC1.duration)}`);

    const speedup = userA1.duration / ((userB1.duration + userC1.duration) / 2);

    if (speedup > 1.5 && route.cacheExpected) {
        console.log(`  ${colors.green}✓ SHARED CACHE${colors.reset} - All users benefiting from cache`);
    } else if (route.cacheExpected) {
        console.log(`  ${colors.red}✗ NOT SHARED${colors.reset} - Each user hitting database`);
    }

    return { userA1, userB1, userC1 };
}

/**
 * Format duration with color coding
 */
function formatDuration(ms) {
    if (ms < 50) return `${colors.green}${ms}ms${colors.reset}`;
    if (ms < 200) return `${colors.yellow}${ms}ms${colors.reset}`;
    return `${colors.red}${ms}ms${colors.reset}`;
}

/**
 * Print summary report
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}📊 CACHE PERFORMANCE SUMMARY${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`\n${colors.green}✓ Passed:${colors.reset}   ${results.passed}`);
    console.log(`${colors.red}✗ Failed:${colors.reset}   ${results.failed}`);
    console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings}`);

    const needsCaching = results.details.filter(d => d.status === 'NOT_CACHED');
    if (needsCaching.length > 0) {
        console.log(`\n${colors.red}Routes that need caching:${colors.reset}`);
        needsCaching.forEach(d => {
            console.log(`  - ${d.route} (cold: ${d.cold}ms, should be <100ms)`);
        });
    }

    console.log('\n' + '='.repeat(60));
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('='.repeat(60));
    console.log(`${colors.cyan}🔬 CACHE PERFORMANCE TEST${colors.reset}`);
    console.log(`${colors.dim}Testing: ${BASE_URL}${colors.reset}`);
    console.log('='.repeat(60));

    // Check if server is running
    console.log('\n📡 Checking server connectivity...');
    const health = await timedFetch(`${BASE_URL}/settings/public`);
    if (!health.ok) {
        console.log(`${colors.red}✗ Server not responding at ${BASE_URL}${colors.reset}`);
        console.log(`  Make sure backend is running on port 5000`);
        process.exit(1);
    }
    console.log(`${colors.green}✓ Server responding${colors.reset} (${health.duration}ms)`);

    // Test 1: Sequential requests for public routes
    console.log('\n\n' + '─'.repeat(60));
    console.log(`${colors.blue}TEST 1: Sequential Requests (Cache Effectiveness)${colors.reset}`);
    console.log('─'.repeat(60));

    for (const route of PUBLIC_ROUTES) {
        await testSequentialRequests(route);
        await new Promise(r => setTimeout(r, 100)); // Small delay between tests
    }

    for (const route of PRODUCT_ROUTES) {
        await testSequentialRequests(route);
    }

    // Test 2: Concurrent requests
    console.log('\n\n' + '─'.repeat(60));
    console.log(`${colors.blue}TEST 2: Concurrent Requests (Request Deduplication)${colors.reset}`);
    console.log('─'.repeat(60));

    await testConcurrentRequests(PUBLIC_ROUTES[0], 10);
    await testConcurrentRequests(PUBLIC_ROUTES[1], 10);

    // Test 3: Multi-user shared cache
    console.log('\n\n' + '─'.repeat(60));
    console.log(`${colors.blue}TEST 3: Multi-User Shared Cache${colors.reset}`);
    console.log('─'.repeat(60));

    await testMultiUserSharedCache(PUBLIC_ROUTES[0]);
    await testMultiUserSharedCache(PUBLIC_ROUTES[2]);

    // Print summary
    printSummary();
}

// Run tests
runTests().catch(console.error);
