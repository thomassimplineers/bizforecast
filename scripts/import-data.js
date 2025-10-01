#!/usr/bin/env node

/**
 * Import Production Data Script
 * 
 * This script imports your production data from the backup-data directory
 * into the Firebase emulator. Run this after cloning the repo to restore
 * your data.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = './backup-data';
const EMULATOR_PORT = 4400;

console.log('🔄 BizForecast Data Import');
console.log('==========================');

// Check if backup data exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.error('❌ Backup data not found!');
  console.error(`   Expected directory: ${BACKUP_DIR}`);
  console.error('   Make sure you have exported your data first.');
  process.exit(1);
}

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
  console.log('📥 Importing production data...');
  
  // Import the data
  execSync(`firebase emulators:import ${BACKUP_DIR}`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('');
  console.log('🎉 Data import completed successfully!');
  console.log('');
  console.log('Your BizForecast application now has all your production data.');
  console.log('You can start using the app at: http://localhost:3001');
  
} catch (error) {
  console.error('❌ Failed to import data:', error.message);
  process.exit(1);
}
