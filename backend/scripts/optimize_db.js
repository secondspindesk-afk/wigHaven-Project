import { getPrisma, initializePrisma, disconnectPrisma } from '../src/config/database.js';
import logger from '../src/utils/logger.js';

const optimizeTables = async () => {
    try {
        await initializePrisma();
        logger.info('🐘 Optimizing Guest Cart tables (UNLOGGED)...');
        const prisma = getPrisma();

        // Make guest_cart_items UNLOGGED first (because it references guest_carts)
        await prisma.$executeRawUnsafe(`ALTER TABLE "guest_cart_items" SET UNLOGGED`);
        logger.info('✓ guest_cart_items table set to UNLOGGED');

        // Make guest_carts UNLOGGED
        await prisma.$executeRawUnsafe(`ALTER TABLE "guest_carts" SET UNLOGGED`);
        logger.info('✓ guest_carts table set to UNLOGGED');

        logger.info('✅ Optimization Complete! Guest carts are now high-performance.');
    } catch (error) {
        logger.error('❌ Optimization failed:', error);
        process.exit(1);
    } finally {
        await disconnectPrisma();
    }
};

optimizeTables();
