import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { addManufacturer, addReseller, addBDM } from '../src/lib/firestore';

const firebaseConfig = {
  projectId: 'bizcast-2025',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
} catch (error) {
  // Already connected
}

// Your actual manufacturers
const manufacturers = [
  'F5',
  'Infoblox',
  'Extreme Networks',
  'Palo Alto Networks',
  'Zscaler',
  'Vectra AI',
];

// Common Swedish resellers you work with
const resellers = [
  'Dustin',
  'Netnordic',
  'ATEA',
  'Ingram Micro',
  'Tech Data',
  'Arrow Electronics',
  'Westcon-Comstor',
];

// Common BDMs
const bdms = [
  'Anna Svensson',
  'Erik Johansson',
  'Maria Andersson',
  'Johan Nilsson',
  'Emma Karlsson',
];

async function initProduction() {
  console.log('🚀 Initializing production-ready BizForecast...');
  
  try {
    // Add manufacturers
    console.log('📦 Adding manufacturers...');
    for (const name of manufacturers) {
      await addManufacturer(name);
      console.log(`   ✅ Added manufacturer: ${name}`);
    }
    
    // Add resellers
    console.log('🏪 Adding resellers...');
    for (const name of resellers) {
      await addReseller(name);
      console.log(`   ✅ Added reseller: ${name}`);
    }
    
    // Add BDMs
    console.log('👥 Adding BDMs...');
    for (const name of bdms) {
      await addBDM(name);
      console.log(`   ✅ Added BDM: ${name}`);
    }
    
    console.log('🎉 Production initialization completed successfully!');
    console.log(`   📦 ${manufacturers.length} manufacturers added`);
    console.log(`   🏪 ${resellers.length} resellers added`);
    console.log(`   👥 ${bdms.length} BDMs added`);
    console.log('   💼 Ready to add your real deals!');
    console.log('');
    console.log('🔥 Your BizForecast app is now ready for production use!');
    console.log('   • Go to http://localhost:3000/deals to start adding deals');
    console.log('   • Use the Dashboard to track your forecasts');
    console.log('   • Manage manufacturers and resellers in Lists section');
    
  } catch (error) {
    console.error('❌ Production initialization failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

initProduction();
