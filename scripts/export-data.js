#!/usr/bin/env node

/**
 * Export Production Data Script
 * 
 * This script exports your current production data from the Firebase emulator
 * to the backup-data directory. Run this before committing to save your data.
 */

const { execSync } = require('child_process');
const fs = require('fs');

const BACKUP_DIR = './backup-data';
const EMULATOR_PORT = 4400;

console.log('💾 BizForecast Data Export');
console.log('==========================');

// Check if emulator is running
try {
  execSync(`curl -s http://localhost:${EMULATOR_PORT}/emulators`, { stdio: 'ignore' });
  console.log('✅ Firebase emulator is running');
} catch (error) {
  console.error('❌ Firebase emulator is not running!');
  console.error('   Please start the emulator first:');
  console.error('   firebase emulators:start');
  process.exit(1);
}

try {
  // Remove old backup if exists
  if (fs.existsSync(BACKUP_DIR)) {
    console.log('🗑️  Removing old backup...');
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }
  
  console.log('📤 Exporting production data...');
  
  // Export the data
  execSync(`firebase emulators:export ${BACKUP_DIR}`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('');
  console.log('🎉 Data export completed successfully!');
  console.log('');
  console.log('Your production data has been saved to ./backup-data/');
  console.log('This data will be included when you commit to git.');
  console.log('');
  console.log('Next steps:');
  console.log('1. git add .');
  console.log('2. git commit -m "Update production data"');
  console.log('3. git push');
  
} catch (error) {
  console.error('❌ Failed to export data:', error.message);
  process.exit(1);
}
