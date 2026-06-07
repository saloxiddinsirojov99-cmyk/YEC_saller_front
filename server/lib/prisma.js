const { PrismaClient } = require('@prisma/client');

const DB_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_FsZl5YK8NLnb@ep-falling-shadow-aqpgh06d-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL not in env, using hardcoded fallback.");
    process.env.DATABASE_URL = DB_URL;
  }

  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;