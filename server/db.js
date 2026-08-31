/**
 * Database abstraction layer.
 * Supports both MongoDB (via Mongoose) and Azure SQL Database (via mssql).
 *
 * Configuration via environment variables:
 *   DATABASE_TYPE=mongodb|mssql (default: mongodb)
 *   For MongoDB: MONGODB_URI
 *   For Azure SQL: AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD
 */
import { config, dbConfigured } from "./config.js";

let dbAdapter = null;
let ready = false;

export const isReady = () => ready;

/**
 * Get the appropriate database adapter based on configuration
 */
async function getAdapter() {
  if (dbAdapter) return dbAdapter;

  const dbType = process.env.DATABASE_TYPE || "mongodb";

  if (dbType === "mssql") {
    const { AzureSQLAdapter } = await import("./adapters/azure-sql.js");
    dbAdapter = new AzureSQLAdapter(config);
  } else {
    const { MongoDBAdapter } = await import("./adapters/mongodb.js");
    dbAdapter = new MongoDBAdapter(config);
  }

  return dbAdapter;
}

/**
 * Connect to the database
 */
export async function connectDB() {
  if (!dbConfigured()) {
    console.warn("[db] Database is not configured — enquiries will be stored in fallback file only.");
    return false;
  }

  try {
    const adapter = await getAdapter();
    const success = await adapter.connect();
    ready = success;
    return success;
  } catch (err) {
    console.error(`[db] connection failed: ${err.message}`);
    ready = false;
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDB() {
  if (dbAdapter) {
    await dbAdapter.disconnect();
    ready = false;
  }
}

/**
 * Get database adapter for model operations
 */
export async function getDatabase() {
  return getAdapter();
}

export default { connectDB, closeDB, isReady, getDatabase };
