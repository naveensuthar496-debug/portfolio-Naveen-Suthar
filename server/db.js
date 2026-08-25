/**
 * MongoDB connection.
 *
 * Works unchanged against MongoDB Atlas or a local mongod — only the
 * MONGODB_URI in .env differs. The app degrades gracefully: if the
 * database is unreachable the enquiry route still runs and falls back
 * to an append-only file so a lead is never lost.
 */
import mongoose from "mongoose";
import { config, dbConfigured } from "./config.js";

let connecting = null;
let ready = false;

mongoose.set("strictQuery", true);

export const isReady = () => ready && mongoose.connection.readyState === 1;

/**
 * Connect once; concurrent callers share the same promise.
 * Resolves to `true` on success, `false` if unconfigured/unreachable.
 */
export async function connectDB() {
  if (!dbConfigured()) {
    console.warn("[db] MONGODB_URI is not set — enquiries will be stored in the fallback file only.");
    return false;
  }
  if (isReady()) return true;
  if (connecting) return connecting;

  connecting = mongoose
    .connect(config.mongoUri, {
      dbName: config.dbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
    })
    .then(() => {
      ready = true;
      const { host, name } = mongoose.connection;
      console.log(`[db] connected → ${host}/${name}`);
      return true;
    })
    .catch((err) => {
      ready = false;
      console.error(`[db] connection failed: ${err.message}`);
      return false;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

mongoose.connection.on("disconnected", () => {
  ready = false;
  console.warn("[db] disconnected");
});
mongoose.connection.on("reconnected", () => {
  ready = true;
  console.log("[db] reconnected");
});

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    ready = false;
  }
}

export default { connectDB, closeDB, isReady };
