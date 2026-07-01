import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/couple-website';

async function resetDatabase() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('No collections found. Database is already empty.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${collections.length} collection(s):`);
  for (const col of collections) {
    console.log(`  - ${col.name}`);
  }

  console.log('\nDropping all collections...');
  for (const col of collections) {
    await db.dropCollection(col.name);
    console.log(`  ✓ Dropped ${col.name}`);
  }

  // Drop the couple-website database itself to ensure clean state
  await db.dropDatabase();
  console.log('\n  ✓ Dropped database (couple-website)');

  console.log('\nDatabase reset complete. All collections removed — ready for a fresh start.');
  await mongoose.disconnect();
  console.log('Disconnected.');
}

resetDatabase().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
