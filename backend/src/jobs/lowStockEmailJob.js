import cron from 'node-cron';
import { getLowStockVariants } from '../db/repositories/stockRepository.js';
import { sendLowStockAlert } from '../services/emailService.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';

/**
 * Low Stock Email Job
 * Runs daily at 9 AM to send low stock alerts to admin
 */
export const startLowStockEmailJob = () => {
    // Daily at 9 AM: 0 9 * * *
    cron.schedule('0 9 * * *', async () => {
        const context = logJobStart('low_stock_alerts');

        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

            if (!adminEmail) {
                throw new Error('ADMIN_EMAIL not configured');
            }

            // Get low stock variants (threshold: 5)
            const result = await getLowStockVariants(5, 1, 100);

            // Only send email if there are low stock items
            if (result.variants.length > 0) {
                // Format products for email
                const formattedProducts = result.variants.map(variant => ({
                    product_name: variant.product.name,
                    sku: variant.sku,
                    stock: variant.stock,
                    threshold: 5,
                }));

                // Send email
                await sendLowStockAlert(adminEmail, formattedProducts);

                logJobComplete(context, {
                    recordsChecked: result.pagination.total,
                    recordsProcessed: 1,
                    recordsFailed: 0,
                    details: `Sent low stock alert for ${result.variants.length} items`,
                });
            } else {
                logJobComplete(context, {
                    recordsChecked: result.pagination.total,
                    recordsProcessed: 0,
                    recordsFailed: 0,
                    details: 'No low stock items found',
                });
            }
        } catch (error) {
            logJobError(context, error);
        }
    });
};
