import mysql from 'mysql2/promise';
import dotenv from 'dotenv';


dotenv.config();
const pool = mysql.createPool({
        host               : process.env.DB_HOST,
        user               : process.env.DB_USERNAME,
        password           : process.env.DB_PASSWORD,
        database           : process.env.DB_NAME,
        port               : process.env.DB_PORT,
        waitForConnections : true,
        connectionLimit    : 10,
    connectTimeout     : 30000
  
});

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("Database connection established.");
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
  }
};

export default pool;
