const { PrismaClient } = require('@prisma/client');

// Prisma 7 requires datasourceUrl to be passed explicitly
const prisma = global.prisma || new PrismaClient({
  log: ['error'],
  datasourceUrl: process.env.DATABASE_URL,
});

// Ensure the same instance is reused across cold starts/hot reloads.
if (!global.prisma) {
  global.prisma = prisma;
}

module.exports = prisma;
