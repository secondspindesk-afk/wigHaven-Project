/**
 * Test R2 Backup
 * Run with: node src/scripts/testBackup.js
 */

import { initializePrisma } from '../config/database.js';
import { runBackup } from '../jobs/backupJob.js';

async function testBackup() {
    console.log('🔧 Initializing database...');
    await initializePrisma();

    console.log('🚀 Running backup test...');
    const result = await runBackup();

    console.log('\n📦 Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
}

testBackup().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
