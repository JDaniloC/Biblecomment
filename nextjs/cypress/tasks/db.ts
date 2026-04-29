/**
 * DB tasks invoked from Cypress via cy.task("db:*", ...).
 * These run in the Node-side of Cypress, NOT in the browser.
 *
 * They connect to the Mongo instance pointed to by MONGODB_URI
 * (which MUST be a test database — never prod). Each task reuses
 * a single Mongoose connection across the test run.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { assertLocalMongoUri } from "./safety";

let connected = false;

async function ensureConnected(): Promise<void> {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  // Hard-stop if the URI isn't local. This guard is the last line of
  // defense against cy.task("db:reset") wiping a production database
  // when MONGODB_URI is inherited from .env or the shell.
  assertLocalMongoUri(uri, "Cypress db.ts");
  mongoose.set("strictQuery", false);
  await mongoose.connect(uri!);
  connected = true;
}

const COLLECTIONS = ["users", "books", "verses", "comments", "discussions", "notifications"];

export async function resetDatabase(): Promise<void> {
  await ensureConnected();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose connection has no db handle.");
  for (const name of COLLECTIONS) {
    try {
      await db.collection(name).deleteMany({});
    } catch {
      // Collection may not exist yet — fine.
    }
  }
}

export interface SeedUser {
  email: string;
  username: string;
  password: string;
  moderator?: boolean;
  state?: string;
  belief?: string;
}

export interface SeedBook {
  abbrev: string;
  name: string;
  chapters: number;
  testament: string;
  group: string;
  author: string;
}

export interface SeedVerse {
  abbrev: string;
  chapter: number;
  verseNumber: number;
  text: string;
  reference?: string;
}

export interface SeedPayload {
  users?: SeedUser[];
  books?: SeedBook[];
  verses?: SeedVerse[];
}

export async function findUserByEmail(email: string): Promise<{
  exists: boolean;
  passwordHashLength: number;
  passwordType: string | null;
  username: string | null;
}> {
  await ensureConnected();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose connection has no db handle.");
  const doc = await db
    .collection("users")
    .findOne({ email: email.toLowerCase().trim() });
  if (!doc) {
    return { exists: false, passwordHashLength: 0, passwordType: null, username: null };
  }
  return {
    exists: true,
    passwordHashLength: typeof doc.password === "string" ? doc.password.length : 0,
    passwordType: typeof doc.passwordType === "string" ? doc.passwordType : null,
    username: typeof doc.username === "string" ? doc.username : null,
  };
}

export async function seedDatabase(payload: SeedPayload): Promise<void> {
  await ensureConnected();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose connection has no db handle.");

  if (payload.users?.length) {
    const docs = await Promise.all(
      payload.users.map(async (u) => ({
        email: u.email.toLowerCase().trim(),
        username: u.username,
        password: await bcrypt.hash(u.password, 12),
        passwordType: "bcrypt",
        state: u.state ?? "",
        belief: u.belief ?? "",
        moderator: u.moderator ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await db.collection("users").insertMany(docs);
  }

  if (payload.books?.length) {
    await db.collection("books").insertMany(payload.books);
  }

  if (payload.verses?.length) {
    await db.collection("verses").insertMany(payload.verses);
  }
}
