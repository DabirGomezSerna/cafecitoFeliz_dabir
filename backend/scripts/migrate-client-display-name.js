/**
 * One-off migration: clients.displayName -> clients.display_name
 *
 * An earlier version of scripts/seed.js wrote clients using the key
 * `displayName`, while the Client schema requires `display_name`. Those
 * documents are therefore invalid against the current model: the required field
 * is absent, so they render with a blank name, the ?q= name search cannot match
 * them, and any .save() on one fails validation.
 *
 * This renames the field on every affected document and drops the stray key.
 * Idempotent — re-running it finds nothing to do.
 *
 * Usage:
 *   node scripts/migrate-client-display-name.js
 *   node scripts/migrate-client-display-name.js --dry-run
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.config.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");

async function migrate() {
  await connectDB();

  const clients = mongoose.connection.db.collection("clients");

  // Target documents that have the wrong key and are missing the right one.
  const filter = {
    displayName: { $exists: true },
    $or: [{ display_name: { $exists: false } }, { display_name: null }],
  };

  const affected = await clients.find(filter).toArray();

  if (affected.length === 0) {
    console.log("Nothing to migrate: no client has a stray `displayName`.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${affected.length} client(s) to migrate:`);
  affected.forEach((c) =>
    console.log(`  ${c._id}  ${c.email}  displayName="${c.displayName}"`),
  );

  if (dryRun) {
    console.log("\n--dry-run: no changes written.");
    await mongoose.disconnect();
    return;
  }

  // $rename moves the value and removes the old key in one operation.
  const result = await clients.updateMany(filter, {
    $rename: { displayName: "display_name" },
  });

  console.log(`\nMigrated ${result.modifiedCount} client(s).`);

  // Clean up any document that somehow carries both keys.
  const leftover = await clients.updateMany(
    { displayName: { $exists: true } },
    { $unset: { displayName: "" } },
  );
  if (leftover.modifiedCount > 0) {
    console.log(`Removed a redundant displayName from ${leftover.modifiedCount} client(s).`);
  }

  // Verify every client now satisfies the schema's required field.
  const stillBroken = await clients.countDocuments({
    $or: [{ display_name: { $exists: false } }, { display_name: null }, { display_name: "" }],
  });
  console.log(
    stillBroken === 0
      ? "Verified: every client now has a display_name."
      : `WARNING: ${stillBroken} client(s) still lack a display_name.`,
  );

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error("\n[FATAL] Migration failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
