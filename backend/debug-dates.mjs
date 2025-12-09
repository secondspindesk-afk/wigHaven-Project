import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDates() {
    try {
        // Check order dates
        const orders = await prisma.order.findMany({
            select: { orderNumber: true, createdAt: true }
        });

        console.log('Order dates in DB:');
        orders.forEach(o => {
            console.log(`  ${o.orderNumber}: ${o.createdAt.toISOString()}`);
        });

        // Current dates being used in query
        const now = new Date();
        const past30 = new Date();
        past30.setDate(past30.getDate() - 30);

        console.log(`\nQuery date range:`);
        console.log(`  From: ${past30.toISOString()}`);
        console.log(`  To:   ${now.toISOString()}`);

        // Test with generous date range
        const wayPast = new Date('2020-01-01');
        const wayFuture = new Date('2030-01-01');

        console.log(`\nTesting with WIDE date range (2020-2030)...`);

        const productsWide = await prisma.$queryRaw`
            SELECT 
                v.product_id,
                oi.product_name,
                CAST(SUM(oi.quantity) AS DOUBLE PRECISION) as units_sold,
                CAST(SUM(oi.subtotal) AS DOUBLE PRECISION) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE 
                o.created_at >= ${wayPast}
                AND o.created_at <= ${wayFuture}
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
        `;

        console.log(`Found ${productsWide.length} products`);
        if (productsWide.length > 0) {
            console.log('\nFirst product:', productsWide[0]);
        }

        // Test WITHOUT any date filter
        console.log(`\nTesting WITHOUT date filter...`);
        const productsNoDate = await prisma.$queryRaw`
            SELECT 
                v.product_id,
                oi.product_name,
                CAST(SUM(oi.quantity) AS DOUBLE PRECISION) as units_sold,  
                CAST(SUM(oi.subtotal) AS DOUBLE PRECISION) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
        `;

        console.log(`Found ${productsNoDate.length} products`);
        if (productsNoDate.length > 0) {
            productsNoDate.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.product_name} - ${p.units_sold} units, GHS ${p.revenue}`);
            });
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debugDates();
