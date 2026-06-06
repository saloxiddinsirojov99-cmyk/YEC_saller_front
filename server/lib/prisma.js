const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL environment variable is not defined.");
  }

  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;