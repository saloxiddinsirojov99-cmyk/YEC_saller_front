const { PrismaClient } = require('@prisma/client');

// Simple singleton with minimal logging – Prisma reads DATABASE_URL from .env automatically.
const prisma = global.prisma || new PrismaClient({ log: ['error'] });

// Ensure the same instance is reused across cold starts/hot reloads.
if (!global.prisma) {
  global.prisma = prisma;
}

module.exports = prisma;