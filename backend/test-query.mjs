import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
    try {
        console.log('=== Testing Top Products Query ===\n');

        // Check order dates
        const orders = await prisma.order.findMany({
            where: { status: { notIn: ['cancelled', 'refunded'] } },
            select: { orderNumber: true, createdAt: true }
        });

        console.log('Order dates:');
        orders.forEach(o => console.log(`  ${o.orderNumber}: ${o.createdAt.toISOString()}`));

        // Test 1: No date filter
        console.log('\n--- Test 1: NO date filter ---');
        const test1 = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE o.status NOT IN ('cancelled', 'refunded')
        `;
        console.log('Count:', test1[0].count);

        // Test 2: With loose date range (past 365 days)
        const now = new Date();
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);

        console.log(`\n--- Test 2: Date range ${yearAgo.toISOString()} to ${now.toISOString()} ---`);

        const test2 = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE 
                o.created_at >= ${yearAgo}
                AND o.created_at <= ${now}
                AND o.status NOT IN ('cancelled', 'refunded')
        `;
        console.log('Count with date filter:', test2[0].count);

        // Test 3: Actual top products query (365 days)
        console.log('\n--- Test 3: Full query (365 days) ---');
        const test3 = await prisma.$queryRaw`
            SELECT 
                v.product_id,
                oi.product_name,
                SUM(oi.quantity) as units_sold,
                SUM(oi.subtotal) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE 
                o.created_at >= ${yearAgo}
                AND o.created_at <= ${now}
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
            LIMIT 10
        `;
        console.log('Results:', JSON.stringify(test3, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testQuery();
