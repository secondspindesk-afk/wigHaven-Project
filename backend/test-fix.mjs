import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFix() {
    try {
        const now = new Date();
        const past = new Date();
        past.setDate(past.getDate() - 30);

        console.log('Testing FIXED query with CAST...\n');

        // Query WITH the CAST fix
        const products = await prisma.$queryRaw`
            SELECT 
                v.product_id as product_id,
                oi.product_name as product_name,
                CAST(COALESCE(SUM(oi.quantity), 0) AS DOUBLE PRECISION) as units_sold,
                CAST(COALESCE(SUM(oi.subtotal), 0) AS DOUBLE PRECISION) as revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN variants v ON oi.variant_id = v.id
            WHERE 
                o.created_at >= ${past} 
                AND o.created_at <= ${now}
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY v.product_id, oi.product_name
            ORDER BY revenue DESC
            LIMIT 10
        `;

        console.log('SUCCESS! Products found:', products.length);
        console.log('\nProducts:');
        products.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.product_name}`);
            console.log(`     Units: ${p.units_sold}, Revenue: GHS ${p.revenue}`);
        });

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testFix();
