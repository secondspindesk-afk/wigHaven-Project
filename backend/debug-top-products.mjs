import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTopProducts() {
    try {
        console.log('=== DEBUG TOP PRODUCTS ===\n');

        // 1. Check if we have any orders
        const orderCount = await prisma.order.count();
        console.log(`Total orders: ${orderCount}`);

        // 2. Check if we have any order items
        const orderItemCount = await prisma.orderItem.count();
        console.log(`Total order items: ${orderItemCount}`);

        // 3. Check order statuses
        const ordersByStatus = await prisma.order.groupBy({
            by: ['status'],
            _count: true
        });
        console.log('\nOrders by status:');
        ordersByStatus.forEach(s => console.log(`  ${s.status}: ${s._count}`));

        // 4. Test the actual query with 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();

        console.log(`\nQuerying from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // 5. Run the simplified query
        const products = await prisma.$queryRaw`
            SELECT 
                v.product_id as product_id,
                oi.product_name as product_name,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                COALESCE(SUM(oi.subtotal), 0) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE 
                o.created_at >= ${startDate} 
                AND o.created_at <= ${endDate}
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
            LIMIT 10
        `;

        console.log('\nTop Products Query Result:');
        console.log(JSON.stringify(products, null, 2));

        // 6. Check a single order item with its relationships
        const sampleOrderItem = await prisma.orderItem.findFirst({
            include: {
                order: true,
                variant: {
                    include: {
                        product: true
                    }
                }
            }
        });

        console.log('\nSample OrderItem with relationships:');
        console.log(JSON.stringify(sampleOrderItem, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debugTopProducts();
