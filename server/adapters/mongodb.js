/**
 * MongoDB adapter using Mongoose
 */
import mongoose from "mongoose";

export class MongoDBAdapter {
  constructor(config) {
    this.config = config;
    this.connecting = null;
    mongoose.set("strictQuery", true);
  }

  async connect() {
    if (!this.config.mongoUri) {
      console.warn("[db] MONGODB_URI is not set");
      return false;
    }

    if (mongoose.connection.readyState === 1) {
      return true;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = mongoose
      .connect(this.config.mongoUri, {
        dbName: this.config.dbName,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
      })
      .then(() => {
        const { host, name } = mongoose.connection;
        console.log(`[db] MongoDB connected → ${host}/${name}`);
        return true;
      })
      .catch((err) => {
        console.error(`[db] MongoDB connection failed: ${err.message}`);
        return false;
      })
      .finally(() => {
        this.connecting = null;
      });

    return this.connecting;
  }

  async disconnect() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("[db] MongoDB disconnected");
    }
  }

  getModel(name) {
    return mongoose.models[name];
  }
}

export default MongoDBAdapter;
