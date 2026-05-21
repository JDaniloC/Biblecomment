import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bible-comment";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Serverless tuning. Netlify spins one function instance per concurrent
    // request burst, and EACH instance opens its own connection pool. The
    // Mongoose default maxPoolSize is 100, so ~5 warm instances would
    // exhaust the 500-connection cap of an Atlas M0 cluster. A small pool
    // (10 covers the app's Promise.all fan-outs) plus maxIdleTimeMS — so a
    // cooling-down instance releases its sockets — keeps us well under cap.
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 30_000,
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
