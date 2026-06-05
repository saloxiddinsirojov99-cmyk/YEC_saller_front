const path = require('path');
const fs = require('fs');

// ============================================================
// DATABASE ADAPTER: SQLite (local) / PostgreSQL (Vercel)
// ============================================================
// Vercel'da serverless funksiyalar /tmp dan foydalanadi, bu esa
// har safar cold start'da tozalanadi. SHU SABAB SQLITE VERCEL'DA
// ISHLAMAYDI. PostgreSQL ishlatish MAJBURIY.
// ============================================================

const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

// Only use PostgreSQL if DATABASE_URL is actually set
const usePostgres = hasDatabaseUrl;

// ============================================================
// CRITICAL: Vercel'da DATABASE_URL o'rnatilmasa, ma'lumotlar
//           5 daqiqada yo'qoladi! Quyidagi log'ni tekshiring.
// ============================================================
if (isVercel && !hasDatabaseUrl) {
  console.error('========================================================');
  console.error('  XATO: DATABASE_URL environment variable o\'rnatilmagan!');
  console.error('  Vercel serverless da SQLite /tmp ga yoziladi va');
  console.error('  5 daqiqadan so\'ng hamma ma\'lumotlar yo\'qoladi.');
  console.error('  ');
  console.error('  Tuzatish: Vercel Dashboard → yec-seller → Settings →');
  console.error('  Environment Variables → DATABASE_URL qo\'shing.');
  console.error('========================================================');
}

// ============================================================
// LAZY INIT: Pool/DB faqat kerak bo'lganda yaratiladi
// ============================================================
let query = null;
let pool = null;
let db = null;

/**
 * PostgreSQL ulanishini yaratadi.
 * Lazy init – faqat birinchi so'rovda ishga tushadi.
 */
function createPostgresPool() {
  if (pool) return pool;

  const { Pool } = require('pg');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });

  return pool;
}

/**
 * SQLite ulanishini yaratadi.
 * Lazy init – faqat birinchi so'rovda ishga tushadi.
 */
function createSqliteConnection() {
  if (db) return db;

  // sqlite3 ni dinamik yuklash – Vercel'da import qilinmaydi
  let sqlite3;
  try {
    sqlite3 = require('sqlite3').verbose();
  } catch (err) {
    console.error('sqlite3 yuklanmadi:', err.message);
    console.error('Bu xato faqat Vercel\'da sodir bo\'lsa, muammo yo\'q.');
    throw err;
  }

  const dbPath = path.join(__dirname, 'yec_gilam.db');

  if (!fs.existsSync(dbPath)) {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const dbInit = new sqlite3.Database(dbPath);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInit.exec(schemaSql);
      dbInit.close();
      console.log('SQLite database auto-initialized at:', dbPath);
    }
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('SQLite connection error:', err.message);
    } else {
      db.run('PRAGMA foreign_keys = ON;');
      console.log('SQLite connected at:', dbPath);
    }
  });

  return db;
}

/**
 * Query object yaratadi (lazy).
 */
function getQuery() {
  if (query) return query;

  if (usePostgres) {
    // ========================================
    // POSTGRESQL (Vercel / Production)
    // ========================================
    const pgPool = createPostgresPool();

    // SQLite → PostgreSQL transform
    function transformPgSql(sql) {
      let result = sql.replace(/date\('now',\s*'localtime'\)/gi, 'CURRENT_DATE');
      result = result.replace(/date\('now'\)/gi, 'CURRENT_DATE');
      result = result.replace(/datetime\('now'\)/gi, 'NOW()');
      result = result.replace(/julianday\(/gi, 'EXTRACT(JULIAN FROM ');
      return result;
    }

    function convertPlaceholders(sql) {
      let index = 0;
      return sql.replace(/\?/g, () => `$${++index}`);
    }

    query = {
      get(sql, params = []) {
        sql = transformPgSql(sql);
        const pgSql = convertPlaceholders(sql);
        return pgPool.query(pgSql, params).then((res) => res.rows[0] || null);
      },
      all(sql, params = []) {
        sql = transformPgSql(sql);
        const pgSql = convertPlaceholders(sql);
        return pgPool.query(pgSql, params).then((res) => res.rows);
      },
      run(sql, params = []) {
        sql = transformPgSql(sql);
        const pgSql = convertPlaceholders(sql);
        const finalSql = pgSql.trim().toUpperCase().startsWith('INSERT')
          ? pgSql + ' RETURNING id'
          : pgSql;
        return pgPool.query(finalSql, params).then((res) => ({
          id: res.rows[0]?.id || res.rowCount,
          changes: res.rowCount,
        }));
      },
      exec(sql) {
        sql = transformPgSql(sql);
        return pgPool.query(sql).then((res) => ({ changes: res.rowCount }));
      },
      getPool() {
        return pgPool;
      },
    };
  } else if (!isVercel) {
    // ========================================
    // SQLITE (Local Development ONLY!)
    // ========================================
    const sqliteDb = createSqliteConnection();

    query = {
      get(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      run(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
          });
        });
      },
      exec(sql) {
        return new Promise((resolve, reject) => {
          sqliteDb.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      },
      getPool() {
        return null;
      },
    };
  } else {
    // ========================================
    // VERCEL WITHOUT DATABASE_URL - ERROR
    // ========================================
    // Return a stub query object that shows clear error
    const errorMsg =
      'DATABASE_URL environment variable is not set! Vercel requires PostgreSQL.';
    console.error(errorMsg);

    query = {
      get() {
        return Promise.reject(new Error(errorMsg));
      },
      all() {
        return Promise.reject(new Error(errorMsg));
      },
      run() {
        return Promise.reject(new Error(errorMsg));
      },
      exec() {
        return Promise.reject(new Error(errorMsg));
      },
      getPool() {
        return null;
      },
    };
  }

  return query;
}

// ============================================================
// SEED DATABASE — default admin/seller/products
// ============================================================
// NOTE: seedDatabase is called ONCE per container instance.
// Vercel serverless'da bu har bir cold start'da ishlaydi.
// Lekin PostgreSQL da ma'lumotlar saqlanib qoladi.
// ============================================================
async function seedDatabase() {
  const q = getQuery();

  // PostgreSQL schema creation
  if (usePostgres) {
    try {
      await ensurePostgresSchema(q);
    } catch (err) {
      console.error('Schema creation error:', err.message);
      return; // Don't proceed if schema creation failed
    }
  }

  // Skip seeding if we're on Vercel without DATABASE_URL
  if (isVercel && !hasDatabaseUrl) {
    console.error('Skipping seed: no DATABASE_URL configured');
    return;
  }

  // 1. Default Branch
  try {
    const existingBranch = await q.get(
      'SELECT * FROM branches WHERE name = ?',
      ['Bosh Showroom']
    );
    if (!existingBranch) {
      await q.run(
        'INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)',
        ['Bosh Showroom', 'Toshkent sh., Chilonzor 1-mavze', '+998 99 123 45 67']
      );
      console.log('Default branch created.');
    }
  } catch (err) {
    if (!isVercel) console.error('Seed branch error:', err.message);
  }

  // 2. Default Admin
  try {
    const existingAdmin = await q.get(
      'SELECT * FROM users WHERE email = ?',
      ['admin@yecgilam.uz']
    );
    if (!existingAdmin) {
      const { hashPassword } = require('../utils/crypto');
      const adminPassHash = hashPassword('admin123');
      await q.run(
        'INSERT INTO users (name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)',
        ['Administrator', 'admin@yecgilam.uz', adminPassHash, 'admin', 1]
      );
      console.log('Default Admin created (admin@yecgilam.uz / admin123).');
    }
  } catch (err) {
    if (!isVercel) console.error('Seed admin error:', err.message);
  }

  // 3. Default Seller
  try {
    const existingSeller = await q.get(
      'SELECT * FROM users WHERE email = ?',
      ['seller@yecgilam.uz']
    );
    if (!existingSeller) {
      const { hashPassword } = require('../utils/crypto');
      const sellerPassHash = hashPassword('password123');
      await q.run(
        'INSERT INTO users (name, email, password_hash, role, branch_id) VALUES (?, ?, ?, ?, ?)',
        ['Sotuvchi Test', 'seller@yecgilam.uz', sellerPassHash, 'seller', 1]
      );
      console.log('Default Seller created (seller@yecgilam.uz / password123).');
    }
  } catch (err) {
    if (!isVercel) console.error('Seed seller error:', err.message);
  }

  // 4. Default Products
  try {
    const productCount = await q.get('SELECT COUNT(*) as count FROM products');
    if (parseInt(productCount.count) === 0) {
      const defaultProducts = [
        {
          name: 'Turkiya Premium',
          description: "Yuqori sifatli Turkiya jun gilami, qalinligi 12mm",
          price: 450000,
        },
        {
          name: 'Eron Ipak Gilam',
          description: "Nafis naqshli, qo'lda to'qilgan Eron ipak gilami",
          price: 1200000,
        },
        {
          name: "O'zbekiston Baxmal",
          description: 'Milliy naqshli, yumshoq va chidamli baxmal gilam',
          price: 350000,
        },
        {
          name: 'Buxoro Shoyi Gilam',
          description: 'Klassik Buxoro nusxa shoyi gilam',
          price: 800000,
        },
      ];
      for (const prod of defaultProducts) {
        await q.run(
          'INSERT INTO products (name, description, price, is_active) VALUES (?, ?, ?, ?)',
          [prod.name, prod.description, prod.price, 1]
        );
      }
      console.log('Sample products seeded.');
    }
  } catch (err) {
    if (!isVercel) console.error('Seed products error:', err.message);
  }
}

// ============================================================
// PostgreSQL Schema Creation (auto-migrate)
// ============================================================
async function ensurePostgresSchema(q) {
  const pgPool = q.getPool();
  if (!pgPool) {
    console.error('No PostgreSQL pool available for schema creation');
    return;
  }

  try {
    const tableCheck = await pgPool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'branches'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      console.log('Creating PostgreSQL tables...');
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS branches (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'seller')) NOT NULL,
          branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT DEFAULT '',
          description TEXT,
          price REAL NOT NULL,
          image_url TEXT,
          is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number TEXT UNIQUE NOT NULL,
          branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
          seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          customer_phone2 TEXT NOT NULL DEFAULT '',
          customer_address TEXT,
          order_date TEXT NOT NULL,
          delivery_date TEXT NOT NULL,
          total_amount REAL NOT NULL,
          paid_amount REAL NOT NULL,
          note TEXT,
          status TEXT CHECK(status IN ('pending', 'delivering', 'pending_balance', 'completed', 'cancelled')) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
          product_name TEXT NOT NULL,
          product_code TEXT DEFAULT '',
          width REAL DEFAULT 0,
          height REAL DEFAULT 0,
          quantity REAL NOT NULL CHECK(quantity > 0),
          price REAL NOT NULL,
          discount_percent REAL DEFAULT 0,
          note TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log('PostgreSQL tables created successfully.');
    } else {
      console.log('PostgreSQL tables already exist.');
    }
  } catch (err) {
    console.error('Error ensuring PostgreSQL schema:', err.message);
    throw err;
  }
}

module.exports = {
  getQuery,
  seedDatabase,
};