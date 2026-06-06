require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/crypto');

const authRoutes = require('../routes/auth');
const branchRoutes = require('../routes/branches');
const userRoutes = require('../routes/users');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const statsRoutes = require('../routes/stats');

const app = express();

// CORS - allow frontend domains
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://yec-sallers.vercel.app'
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // For development, also allow any Vercel deployment previews
    if (process.env.NODE_ENV !== 'production' && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('CORS error: Origin not allowed.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser
app.use(express.json());

// Database check and seeding on first request using Prisma client
let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    seeded = true;
    try {
      console.log('Checking database status using Prisma client...');
      const branchCount = await prisma.branch.count();
      if (branchCount === 0) {
        console.log('No branches found. Seeding default database contents...');
        
        // 1. Default Branch
        const branch = await prisma.branch.create({
          data: {
            id: 1,
            name: 'Bosh Showroom',
            address: 'Toshkent sh., Chilonzor 1-mavze',
            phone: '+998 99 123 45 67',
          }
        });
        console.log('✅ Default branch created:', branch.name);

        // 2. Default Admin
        const adminHash = hashPassword('admin123');
        await prisma.user.create({
          data: {
            name: 'Administrator',
            email: 'admin@yecgilam.uz',
            password_hash: adminHash,
            role: 'admin',
            branch_id: branch.id,
          }
        });
        console.log('✅ Default admin (admin@yecgilam.uz / admin123)');

        // 3. Default Seller
        const sellerHash = hashPassword('password123');
        await prisma.user.create({
          data: {
            name: 'Sotuvchi Test',
            email: 'seller@yecgilam.uz',
            password_hash: sellerHash,
            role: 'seller',
            branch_id: branch.id,
          }
        });
        console.log('✅ Default seller (seller@yecgilam.uz / password123)');

        // 4. Default Products
        const defaultProducts = [
          { name: 'Turkiya Premium', description: "Yuqori sifatli Turkiya jun gilami, qalinligi 12mm", price: 450000 },
          { name: 'Eron Ipak Gilam', description: "Nafis naqshli, qo'lda to'qilgan Eron ipak gilami", price: 1200000 },
          { name: "O'zbekiston Baxmal", description: "Milliy naqshli, yumshoq va chidamli baxmal gilam", price: 350000 },
          { name: 'Buxoro Shoyi Gilam', description: 'Klassik Buxoro nusxa shoyi gilam', price: 800000 },
        ];

        for (const prod of defaultProducts) {
          await prisma.product.create({
            data: {
              name: prod.name,
              description: prod.description,
              price: prod.price,
              is_active: 1,
            }
          });
        }
        console.log('✅ Sample products seeded');

        // 5. Default Terms
        const defaultTerms = `Texnik jixatlar
1.1. Aniq o'lchamlar aytib o'tilganidan 1-2sm ga farq qilishi mumkin.
1.2. Gilam ranglari vitrina na'munasidan 10% gacha farq qilishi mumkin.
...
Yetkazib berish va kafolat:
2.1. Toshkent shahrida yetkazib berish shartnomada kelishilgan holda amalga oshiriladi.
2.2. Yetkazib berish xizmati qavatga ko'tarish shartlarini o'z ichiga oladi.
2.3. Yetkazib berish sanasida haridor yoki uning vakili kun davomida manzilda bo'lishi shart.
2.4. Mahsulotni topshirish-qabul qilish jarayoni tugaganidan keyingi mexanik shikastlanishlar va nuqsonlar bo'yicha e'tirozlar qabul qilinmaydi!
2.5. Maqbul sifatli va o'lchami kesilgan gilamlar qaytarib olinmaydi va almashtirib berilmaydi!`;

        await prisma.setting.create({
          data: {
            key: 'receipt_terms',
            value: defaultTerms
          }
        });
        console.log('✅ Default terms seeded');
      } else {
        console.log('Database already has content. Seeding skipped.');
      }
    } catch (err) {
      console.error('Database connection/seeding check failed on startup:', err.message);
    }
  }
  next();
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasDB = !!process.env.DATABASE_URL;
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.VERCEL === '1' ? 'vercel' : 'local',
    database: hasDB ? 'postgresql' : 'sqlite'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'So\'ralgan resurs topilmadi.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express global error:', err);
  res.status(500).json({ error: 'Ichki server xatoligi yuz berdi.' });
});

// Vercel serverless uchun export
module.exports = app;