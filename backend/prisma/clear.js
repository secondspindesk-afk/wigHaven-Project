/**
 * Database Clear Script
 * Removes ALL data from the database while preserving the schema
 * 
 * Usage: node prisma/clear.js
 * 
 * WARNING: This will permanently delete all data!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
    console.log('🗑️  Database Clear Script');
    console.log('========================\n');
    console.log('⚠️  WARNING: This will delete ALL data!\n');

    try {
        // Delete in order to respect foreign key constraints
        // Start with tables that have foreign keys pointing TO other tables
        const deleteOperations = [
            // Order-related (depends on Users, Variants)
            { name: 'OrderItem', op: () => prisma.orderItem.deleteMany() },
            { name: 'Order', op: () => prisma.order.deleteMany() },

            // Cart-related
            { name: 'CartItem', op: () => prisma.cartItem.deleteMany() },
            { name: 'Cart', op: () => prisma.cart.deleteMany() },
            { name: 'GuestCartItem', op: () => prisma.guestCartItem.deleteMany() },
            { name: 'GuestCart', op: () => prisma.guestCart.deleteMany() },
            { name: 'AbandonedCart', op: () => prisma.abandonedCart.deleteMany() },

            // User activity
            { name: 'Review', op: () => prisma.review.deleteMany() },
            { name: 'Wishlist', op: () => prisma.wishlist.deleteMany() },
            { name: 'Notification', op: () => prisma.notification.deleteMany() },
            { name: 'BackInStockAlert', op: () => prisma.backInStockAlert.deleteMany() },

            // Inventory & Analytics
            { name: 'StockMovement', op: () => prisma.stockMovement.deleteMany() },
            { name: 'Analytic', op: () => prisma.analytic.deleteMany() },
            { name: 'AdminActivity', op: () => prisma.adminActivity.deleteMany() },

            // Support
            { name: 'SupportMessage', op: () => prisma.supportMessage.deleteMany() },
            { name: 'SupportTicket', op: () => prisma.supportTicket.deleteMany() },

            // Tokens & Logs
            { name: 'PasswordResetToken', op: () => prisma.passwordResetToken.deleteMany() },
            { name: 'EmailVerificationToken', op: () => prisma.emailVerificationToken.deleteMany() },
            { name: 'BlacklistedToken', op: () => prisma.blacklistedToken.deleteMany() },
            { name: 'WebhookLog', op: () => prisma.webhookLog.deleteMany() },
            { name: 'EmailLog', op: () => prisma.emailLog.deleteMany() },

            // Email Preferences
            { name: 'EmailPreferences', op: () => prisma.emailPreferences.deleteMany() },

            // Promotions
            { name: 'DiscountCode', op: () => prisma.discountCode.deleteMany() },
            { name: 'PromotionalBanner', op: () => prisma.promotionalBanner.deleteMany() },

            // Media (must be before users!)
            { name: 'Media', op: () => prisma.media.deleteMany() },

            // Products (variants before products, products before categories)
            { name: 'Variant', op: () => prisma.variant.deleteMany() },
            { name: 'Product', op: () => prisma.product.deleteMany() },
            { name: 'Category', op: () => prisma.category.deleteMany() },

            // Users (last, since many tables reference users)
            { name: 'User', op: () => prisma.user.deleteMany() },
        ];

        console.log('🔄 Deleting data from all tables...\n');

        for (const { name, op } of deleteOperations) {
            try {
                const result = await op();
                console.log(`   ✓ ${name}: ${result.count} records deleted`);
            } catch (error) {
                // Table might not exist or have no data
                console.log(`   - ${name}: skipped (${error.message.slice(0, 50)}...)`);
            }
        }

        console.log('\n✅ Database cleared successfully!');
        console.log('\n💡 Next steps:');
        console.log('   Run: node prisma/seed.js    (to add sample data)');
        console.log('   Or start fresh with your own data');

    } catch (error) {
        console.error('\n❌ Error clearing database:', error.message);
        throw error;
    }
}

// Execute
clearDatabase()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
