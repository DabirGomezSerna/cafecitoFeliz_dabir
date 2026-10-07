/**
 * Database seed script — Cafecito Feliz
 *
 * Safe to re-run: checks before every insert, so no duplicates.
 * Destructive reset is opt-in: SEED_ALLOW_RESET=true
 *
 * Usage:
 *   npm run seed
 *   SEED_ALLOW_RESET=true node scripts/seed.js                (bash)
 *   $env:SEED_ALLOW_RESET="true"; node scripts/seed.js        (PowerShell)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.config.js";
import Client from "../models/Client.js";
import Product from "../models/Product.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = {
  created: (label, value) => console.log(`  [+] Created  ${label}: ${value}`),
  skipped: (label, value) =>
    console.log(`  [~] Skipped  ${label}: ${value} (already exists)`),
  section: (title) => console.log(`\n-- ${title} ${"-".repeat(Math.max(0, 40 - title.length))}`),
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

/**
 * Purchase counts are chosen to cover every discount tier, so the loyalty rules
 * can be verified end to end straight after seeding:
 *   0 purchases  -> 0%    (and a first sale stays at 0%)
 *   2 purchases  -> 5%
 *   6 purchases  -> 10%
 *   9 purchases  -> 15%
 */
const CLIENTS = [
  { display_name: "Maxwell Dobron", email: "maxwell.dob@gmail.com", purchases: 2 },
  { display_name: "John Doe", email: "john.doe@example.com", purchases: 0 },
  { display_name: "Jane Smith", email: "jane.smith@example.com", purchases: 6 },
  { display_name: "Lucia Herrera", email: "lucia.herrera@example.com", purchases: 9 },
];

const PRODUCTS = [
  { name: "Macha latte", description: "Te macha con leche", price: 149.99, stock: 15 },
  { name: "Cafe Espresso", description: "Cafe espresso clasico.", price: 199.99, stock: 10 },
  { name: "Mocha blanco", description: "Cafe mocha con chocolate blanco.", price: 229.99, stock: 25 },
  { name: "Cafe Mocha", description: "Cafe mocha clasico.", price: 349.99, stock: 20 },
  { name: "Cafe Colombiano", description: "Cafe colombiano autentico.", price: 349.99, stock: 30 },
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedClients() {
  log.section("Clients");

  for (const data of CLIENTS) {
    const existing = await Client.findOne({ email: data.email });

    if (existing) {
      log.skipped("client", data.email);
      continue;
    }

    // `purchases` is set directly here, which is deliberate and is the only place
    // it is ever assigned rather than incremented. The API does not accept it
    // from a request body, because it drives the loyalty discount.
    await Client.create(data);

    log.created("client", `${data.email} [${data.display_name}, ${data.purchases} compras]`);
  }
}

async function seedProducts() {
  log.section("Products");

  for (const data of PRODUCTS) {
    const existing = await Product.findOne({ name: data.name });

    if (existing) {
      log.skipped("product", data.name);
      continue;
    }

    await Product.create(data);

    log.created("product", `${data.name} ($${data.price}, stock ${data.stock})`);
  }
}

// ---------------------------------------------------------------------------
// Optional destructive reset (SEED_ALLOW_RESET=true)
// ---------------------------------------------------------------------------

async function resetCollections() {
  console.log("\n  [!] SEED_ALLOW_RESET=true - deleting existing products and clients...");

  const products = await Product.deleteMany({});
  const clients = await Client.deleteMany({});

  console.log(
    `  [!] Deleted: ${products.deletedCount} products, ${clients.deletedCount} clients`,
  );
  console.log("  [!] Sales and users are left untouched.");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function printSummary() {
  log.section("Summary");

  const [clientCount, productCount] = await Promise.all([
    Client.countDocuments(),
    Product.countDocuments(),
  ]);

  console.log(`  Clients:  ${clientCount}`);
  console.log(`  Products: ${productCount}`);
  console.log("\n  Seed completed successfully.\n");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function seed() {
  await connectDB();

  if (process.env.SEED_ALLOW_RESET === "true") {
    await resetCollections();
  }

  await seedClients();
  await seedProducts();
  await printSummary();

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("\n[FATAL] Seed failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
