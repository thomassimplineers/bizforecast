import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc, Timestamp } from 'firebase/firestore';
import { DealFormData, DealStatus } from '../src/types';

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

const manufacturers = [
  'F5',
  'Infoblox',
  'Extreme Networks',
  'Palo Alto Networks',
  'Zscaler',
  'Vectra AI',
];

const bdms = [
  'Anna Karlsson',
  'Björn Eriksson',
  'Caroline Svensson',
  'David Nilsson',
  'Elin Johansson',
  'Fredrik Larsson',
  'Gustav Andersson',
];

const resellers = [
  'Dustin',
  'Netnordic',
  'ATEA',
  'Ingram Micro',
  'Tech Data',
  'Arrow Electronics',
  'Westcon-Comstor',
];

const endCustomers = [
  'Volvo AB',
  'Ericsson',
  'H&M',
  'Spotify',
  'Klarna',
  'SEB Bank',
  'Nordea',
  'Telia',
  'Scania',
  'IKEA',
  'Electrolux',
  'SKF',
  'Atlas Copco',
  'Sandvik',
  'Alfa Laval',
];

const statuses: DealStatus[] = ['prospect', 'qualified', 'proposal', 'verbal', 'won', 'lost'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function generateRealisticDeal(manufacturerIds: string[], resellerIds: string[], bdmIds: string[]): DealFormData {
  const sellUSD = Math.floor(Math.random() * 200000) + 10000; // $10k - $210k
  const marginPct = 0.15 + Math.random() * 0.35; // 15% - 50% margin
  
  const status = getRandomElement(statuses);
  let probability: number;
  
  // Set realistic probabilities based on status
  switch (status) {
    case 'prospect':
      probability = 0.1 + Math.random() * 0.2; // 10-30%
      break;
    case 'qualified':
      probability = 0.3 + Math.random() * 0.2; // 30-50%
      break;
    case 'proposal':
      probability = 0.5 + Math.random() * 0.3; // 50-80%
      break;
    case 'verbal':
      probability = 0.8 + Math.random() * 0.15; // 80-95%
      break;
    case 'won':
      probability = 1.0;
      break;
    case 'lost':
      probability = 0.0;
      break;
  }
  
  const now = new Date();
  const futureDate = new Date(now.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000); // Up to 1 year ahead
  
  return {
    manufacturerId: getRandomElement(manufacturerIds),
    resellerId: getRandomElement(resellerIds),
    endCustomer: getRandomElement(endCustomers),
    bdmId: Math.random() > 0.3 ? getRandomElement(bdmIds) : '',
    sellUSD,
    marginPct,
    probability,
    status,
    expectedCloseMonth: getRandomDate(now, futureDate),
    notes: Math.random() > 0.7 ? 'Generated sample deal with realistic pricing and timing.' : '',
  };
}

async function seed() {
  console.log('🌱 Starting seed process...');
  
  try {
    // Add manufacturers
    console.log('📦 Adding manufacturers...');
    const manufacturerIds: string[] = [];
    for (const name of manufacturers) {
      const docRef = await addDoc(collection(db, 'manufacturers'), {
        name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      manufacturerIds.push(docRef.id);
      console.log(`   ✅ Added manufacturer: ${name}`);
    }
    
    // Add resellers
    console.log('🏪 Adding resellers...');
    const resellerIds: string[] = [];
    for (const name of resellers) {
      const docRef = await addDoc(collection(db, 'resellers'), {
        name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      resellerIds.push(docRef.id);
      console.log(`   ✅ Added reseller: ${name}`);
    }
    
    // Add BDMs
    console.log('👥 Adding BDMs...');
    const bdmIds: string[] = [];
    for (const name of bdms) {
      const docRef = await addDoc(collection(db, 'bdms'), {
        name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      bdmIds.push(docRef.id);
      console.log(`   ✅ Added BDM: ${name}`);
    }
    
    // Add deals
    console.log('💼 Adding deals...');
    for (let i = 0; i < 25; i++) {
      const dealData = generateRealisticDeal(manufacturerIds, resellerIds, bdmIds);
      
      // Calculate margin USD (same as in firestore.ts)
      const marginUSD = dealData.sellUSD * dealData.marginPct;
      
      await addDoc(collection(db, 'deals'), {
        ...dealData,
        marginUSD,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log(`   ✅ Added deal ${i + 1}/25: ${dealData.endCustomer} - $${dealData.sellUSD.toLocaleString()}`);
    }
    
    console.log('🎉 Seed completed successfully!');
    console.log(`   📦 ${manufacturers.length} manufacturers added`);
    console.log(`   🏪 ${resellers.length} resellers added`);
    console.log(`   💼 25 deals added`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
