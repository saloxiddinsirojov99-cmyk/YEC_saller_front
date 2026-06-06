const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  
  // connectionString check, fallback during initialization or build
  if (!connectionString) {
    console.warn("Warning: DATABASE_URL environment variable is not defined.");
  }

  const useSsl = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 3 : 5, // Low pool size for serverless
    idleTimeoutMillis: 15000, // Close idle connections faster in serverless
    connectionTimeoutMillis: 5000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  const adapter = new PrismaPg(pool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;