import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/couple-website';

async function seed() {
  console.log(`Connecting to ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('No users found. Use the website setup page to create accounts.');
  } else {
    console.log(`- Skipped: ${userCount} users already exist`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
