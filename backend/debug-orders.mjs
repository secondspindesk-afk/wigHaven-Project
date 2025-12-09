import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugJoins() {
    try {
        // Check order_items directly
        const orderItems = await prisma.orderItem.findMany({
            take: 5
        });
        console.log('Order Items raw:', JSON.stringify(orderItems, null, 2));

        // Check if variant_id in order_items matches any variants
        if (orderItems.length > 0) {
            const variantIds = orderItems.map(oi => oi.variantId);
            console.log('Variant IDs in order_items:', variantIds);

            const variants = await prisma.variant.findMany({
                where: { id: { in: variantIds } }
            });
            console.log('Found variants:', variants.length);

            // Check if its a case issue - check schema
            const allVariants = await prisma.variant.findMany({ take: 2 });
            console.log('Sample variants:', JSON.stringify(allVariants, null, 2));
        }

        // Direct SQL to check
        const result = await prisma.$queryRaw`
            SELECT 
                oi.id as order_item_id,
                oi.variant_id,
                v.id as variant_id_check,
                p.name as product_name
            FROM order_items oi
            LEFT JOIN variants v ON oi.variant_id = v.id
            LEFT JOIN products p ON v.product_id = p.id
            LIMIT 5
        `;
        console.log('JOIN check:', JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debugJoins();
