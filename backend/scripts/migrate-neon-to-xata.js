/**
 * Data Migration Script: Neon → Xata
 * 
 * Migrates all data from Neon PostgreSQL to Xata PostgreSQL
 * 
 * Run: node scripts/migrate-neon-to-xata.js
 */

import pg from 'pg';
const { Pool } = pg;

// Database configurations
const NEON_URL = 'postgresql://neondb_owner:npg_fLhnzIa23SeP@ep-square-sky-agisfeh1-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const XATA_URL = 'postgresql://xata:JDijOC2bwSTY8JYOvsIsjK0zoJEUDSp2DbUK8wrx4lniE4RVm8ChvRbQW2ZHA7DV@r745ss5tbt4v96moqhk6dunl6g.eu-central-1.xata.tech/postgres?sslmode=require';

// Tables to migrate in order (respecting foreign key constraints)
const TABLES = [
    // Independent tables first
    'system_settings',
    'blocked_ips',
    'blacklisted_tokens',
    'discount_codes',
    'currency_rates',
    'admin_milestones',

    // Users (base for many relations)
    'users',

    // User-related
    'addresses',
    'email_preferences',
    'password_reset_tokens',
    'email_verification_tokens',
    'notifications',
    'support_tickets',
    'support_messages',

    // Categories & Products
    'categories',
    'products',
    'variants',

    // Product-related
    'reviews',
    'review_votes',
    'wishlist',
    'back_in_stock_alerts',
    'media',
    'promotional_banners',

    // Carts
    'carts',
    'cart_items',
    'guest_carts',
    'guest_cart_items',

    // Orders
    'orders',
    'order_items',
    'stock_movements',

    // Logs
    'webhook_logs',
    'email_logs',
    'admin_activities',
    'analytics',
    'abandoned_carts',
];

async function migrateTable(neonPool, xataPool, tableName) {
    try {
        // Get data from Neon
        const { rows: data } = await neonPool.query(`SELECT * FROM "${tableName}"`);

        if (data.length === 0) {
            console.log(`   ⚪ ${tableName}: Empty (skipped)`);
            return { table: tableName, count: 0, status: 'empty' };
        }

        // Get column names
        const columns = Object.keys(data[0]);
        const columnList = columns.map(c => `"${c}"`).join(', ');

        // Clear existing data in Xata (if any)
        await xataPool.query(`DELETE FROM "${tableName}"`);

        // Insert in batches of 100
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            // Build VALUES clause
            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            for (const row of batch) {
                const rowPlaceholders = [];
                for (const col of columns) {
                    values.push(row[col]);
                    rowPlaceholders.push(`$${paramIndex++}`);
                }
                placeholders.push(`(${rowPlaceholders.join(', ')})`);
            }

            const insertQuery = `
                INSERT INTO "${tableName}" (${columnList})
                VALUES ${placeholders.join(', ')}
                ON CONFLICT DO NOTHING
            `;

            await xataPool.query(insertQuery, values);
            inserted += batch.length;
        }

        console.log(`   ✅ ${tableName}: ${inserted} rows migrated`);
        return { table: tableName, count: inserted, status: 'success' };

    } catch (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
        return { table: tableName, count: 0, status: 'error', error: error.message };
    }
}

async function main() {
    console.log('\\n' + '═'.repeat(60));
    console.log('🚀 DATA MIGRATION: Neon → Xata');
    console.log('═'.repeat(60) + '\\n');

    const neonPool = new Pool({
        connectionString: NEON_URL,
        ssl: { rejectUnauthorized: false },
    });

    const xataPool = new Pool({
        connectionString: XATA_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        // Test connections
        console.log('📡 Testing connections...');
        await neonPool.query('SELECT 1');
        console.log('   ✅ Neon connected');
        await xataPool.query('SELECT 1');
        console.log('   ✅ Xata connected\\n');

        // Disable foreign key checks temporarily for faster inserts
        await xataPool.query('SET session_replication_role = replica;');

        console.log('📦 Migrating tables...\\n');

        const results = [];
        for (const table of TABLES) {
            const result = await migrateTable(neonPool, xataPool, table);
            results.push(result);
        }

        // Re-enable foreign key checks
        await xataPool.query('SET session_replication_role = DEFAULT;');

        // Summary
        console.log('\\n' + '═'.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('═'.repeat(60));

        const successful = results.filter(r => r.status === 'success');
        const empty = results.filter(r => r.status === 'empty');
        const failed = results.filter(r => r.status === 'error');
        const totalRows = successful.reduce((sum, r) => sum + r.count, 0);

        console.log(`   ✅ Successful: ${successful.length} tables (${totalRows} rows)`);
        console.log(`   ⚪ Empty: ${empty.length} tables`);
        console.log(`   ❌ Failed: ${failed.length} tables`);

        if (failed.length > 0) {
            console.log('\\n   Failed tables:');
            for (const f of failed) {
                console.log(`      - ${f.table}: ${f.error}`);
            }
        }

        console.log('\\n' + '═'.repeat(60) + '\\n');

    } finally {
        await neonPool.end();
        await xataPool.end();
    }
}

main().catch(console.error);
