/**
 * Database Seed Script
 * Creates only user accounts for WigHaven e-commerce
 * 
 * Usage: node prisma/seed.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =====================================================
// MAIN SEED FUNCTION
// =====================================================
async function main() {
    console.log('🌱 WigHaven Database Seed');
    console.log('=========================\n');

    // -------------------------------------------------
    // 0. CLEANUP EXISTING DATA
    // -------------------------------------------------
    console.log('🧹 Cleaning up existing data...');

    const deleteOrder = [
        prisma.orderItem.deleteMany(),
        prisma.order.deleteMany(),
        prisma.cartItem.deleteMany(),
        prisma.cart.deleteMany(),
        prisma.guestCartItem.deleteMany(),
        prisma.guestCart.deleteMany(),
        prisma.review.deleteMany(),
        prisma.wishlist.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.backInStockAlert.deleteMany(),
        prisma.abandonedCart.deleteMany(),
        prisma.stockMovement.deleteMany(),
        prisma.adminActivity.deleteMany(),
        prisma.supportMessage.deleteMany(),
        prisma.supportTicket.deleteMany(),
        prisma.webhookLog.deleteMany(),
        prisma.emailLog.deleteMany(),
        prisma.passwordResetToken.deleteMany(),
        prisma.emailVerificationToken.deleteMany(),
        prisma.blacklistedToken.deleteMany(),
        prisma.analytic.deleteMany(),
        prisma.discountCode.deleteMany(),
        prisma.promotionalBanner.deleteMany(),
        prisma.media.deleteMany(),
        prisma.variant.deleteMany(),
        prisma.product.deleteMany(),
        prisma.category.deleteMany(),
        prisma.emailPreferences.deleteMany(),
        prisma.address.deleteMany(),
        prisma.user.deleteMany(),
        prisma.systemSetting.deleteMany(),
        prisma.blockedIP.deleteMany(),
        prisma.currencyRate.deleteMany(),
        prisma.adminMilestone.deleteMany(),
    ];

    await prisma.$transaction(deleteOrder);
    console.log('   ✓ Database cleared\n');

    // -------------------------------------------------
    // 1. CREATE ADMIN USER
    // -------------------------------------------------
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    await prisma.user.create({
        data: {
            email: 'admin@wighaven.com',
            password: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            emailVerified: true,
            isActive: true,
        },
    });
    console.log('👤 Admin: admin@wighaven.com / Admin123!');

    // -------------------------------------------------
    // 2. CREATE SUPER ADMIN USER
    // -------------------------------------------------
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
    await prisma.user.create({
        data: {
            email: 'superadmin@wighaven.com',
            password: superAdminPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'super_admin',
            emailVerified: true,
            isActive: true,
        },
    });
    console.log('👑 Super Admin: superadmin@wighaven.com / SuperAdmin123!');

    // -------------------------------------------------
    // 3. CREATE TEST CUSTOMER
    // -------------------------------------------------
    const testPassword = await bcrypt.hash('Test123!', 10);
    await prisma.user.create({
        data: {
            email: 'test@wighaven.com',
            password: testPassword,
            firstName: 'Test',
            lastName: 'Customer',
            phone: '+233 24 123 4567',
            role: 'customer',
            emailVerified: true,
            isActive: true,
        },
    });
    console.log('👤 Customer: test@wighaven.com / Test123!');

    // -------------------------------------------------
    // SUMMARY
    // -------------------------------------------------
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ├── Admin: admin@wighaven.com / Admin123!');
    console.log('   ├── Super Admin: superadmin@wighaven.com / SuperAdmin123!');
    console.log('   └── Customer: test@wighaven.com / Test123!');
}

// Execute
main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
