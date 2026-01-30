import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
// Aiven MySQL URI example:
// mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl-mode=REQUIRED

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined");
  process.exit(1);
}

// Create connection pool using URI
const pool = mysql.createPool(DATABASE_URL, {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: true, // required for Aiven
  },
});

// Test DB connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to Aiven MySQL successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Failed to connect to MySQL:", error.message);
  }
})();

export const db = pool;
