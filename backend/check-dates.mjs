import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
    try {
        // Direct count
        const orderCount = await prisma.order.count({ where: { status: { notIn: ['cancelled', 'refunded'] } } });
        const itemCount = await prisma.orderItem.count();

        console.log(`Non-cancelled orders: ${orderCount}`);
        console.log(`Order items: ${itemCount}`);

        // Check dates
        const orders = await prisma.order.findMany({
            where: { status: { notIn: ['cancelled', 'refunded'] } },
            select: { id: true, orderNumber: true, createdAt: true, status: true }
        });

        console.log('\nOrders:');
        orders.forEach(o => console.log(`  ${o.orderNumber}: created ${o.createdAt} (${o.status})`));

        // Test query with no date filter
        const productsNoDate = await prisma.$queryRaw`
            SELECT 
                v.product_id as product_id,
                oi.product_name as product_name,
                SUM(oi.quantity) as units_sold,
                SUM(oi.subtotal) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
        `;

        console.log('\nProducts (NO date filter):');
        console.log(JSON.stringify(productsNoDate, null, 2));

        // Test with explicit dates
        const now = new Date();
        const past = new Date();
        past.setDate(past.getDate() - 30);

        console.log(`\nQuerying from ${past.toISOString()} to ${now.toISOString()}`);

        const productsWithDate = await prisma.$queryRaw`
            SELECT 
                v.product_id,
                oi.product_name,
                SUM(oi.quantity) as units_sold,
                SUM(oi.subtotal) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE 
                o.created_at >= ${past}
                AND o.created_at <= ${now}
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
        `;

        console.log('\nProducts (WITH date filter):');
        console.log(JSON.stringify(productsWithDate, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

quickCheck();
