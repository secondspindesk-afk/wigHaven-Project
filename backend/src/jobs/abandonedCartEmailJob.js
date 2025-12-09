import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { sendAbandonedCartEmail } from '../services/emailService.js';
import { logJobStart, logJobComplete, logJobError, logRecordError } from '../utils/cronLogger.js';

/**
 * Abandoned Cart Email Job
 * Runs daily at 10 AM to send abandoned cart reminder emails
 * Max 50 emails per run (memory-safe)
 */
export const runAbandonedCartEmailLogic = async () => {
    const context = logJobStart('abandoned_cart_emails');

    try {
        const prisma = getPrisma();

        // Get carts abandoned > 24 hours ago
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Don't email if already emailed in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // CRITICAL FIX: Check which carts have already been emailed
        const emailedCartIds = await prisma.abandonedCart.findMany({
            where: {
                emailSentAt: {
                    not: null,
                    gte: sevenDaysAgo  // Within last 7 days
                }
            },
            select: { cartId: true }
        }).then(carts => carts.map(c => c.cartId));

        // Find abandoned carts (authenticated users only) that haven't been emailed
        const abandonedCarts = await prisma.cart.findMany({
            where: {
                updatedAt: {
                    lte: twentyFourHoursAgo,
                    gte: sevenDaysAgo, // Not too old
                },
                userId: {
                    not: null, // Only authenticated users
                },
                id: {
                    notIn: emailedCartIds  // CRITICAL: Exclude already emailed carts
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                    },
                },
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            take: 50, // Memory-safe limit
            orderBy: {
                updatedAt: 'asc',
            },
        });

        context.recordsChecked = abandonedCarts.length;
        let processed = 0;
        let failed = 0;

        for (const cart of abandonedCarts) {
            try {
                // Skip if no items
                if (!cart.items || cart.items.length === 0) {
                    continue;
                }

                // Calculate cart total
                const total = cart.items.reduce((sum, item) => {
                    return sum + (item.variant.price * item.quantity);
                }, 0);

                // Format items for email
                const formattedItems = cart.items.map(item => ({
                    product_name: item.variant.product.name,
                    quantity: item.quantity,
                    price: item.variant.price,
                }));

                // Send email
                await sendAbandonedCartEmail(cart.user, {
                    items: formattedItems,
                    total,
                });

                // CRITICAL FIX: Log in AbandonedCart table to prevent duplicate emails
                await prisma.abandonedCart.upsert({
                    where: {
                        cartId: cart.id
                    },
                    update: {
                        emailSentAt: new Date(),
                        items: formattedItems,
                        total: total
                    },
                    create: {
                        cartId: cart.id,
                        userId: cart.userId,
                        items: formattedItems,
                        total: total,
                        emailSentAt: new Date()
                    }
                });

                processed++;
            } catch (error) {
                logRecordError('abandoned_cart_emails', cart.id, error);
                failed++;
            }
        }

        logJobComplete(context, {
            recordsChecked: context.recordsChecked,
            recordsProcessed: processed,
            recordsFailed: failed,
            details: `Sent ${processed} abandoned cart emails`,
        });
    } catch (error) {
        logJobError(context, error);
    }
};

export const startAbandonedCartEmailJob = () => {
    // Daily at 10 AM: 0 10 * * *
    cron.schedule('0 10 * * *', runAbandonedCartEmailLogic);
};
