import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const sql = fs.readFileSync('/home/yuvan/Programs/Development/crm/backend/db/migrations/add_oauth_tokens.sql', 'utf8');
const pool = mysql.createPool(process.env.DATABASE_URL);

// Split and execute
const statements = sql.split(';').filter(s => s.trim());
for (const stmt of statements) {
  if (stmt.trim()) {
    try {
      await pool.query(stmt);
      console.log('✅ Executed:', stmt.substring(0, 50) + '...');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Already exists, skipping');
      } else {
        console.error('❌', e.message);
      }
    }
  }
}
pool.end();
console.log('Done!');