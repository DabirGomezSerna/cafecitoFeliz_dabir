/**
 * Database seed script — Cafecito Feliz
 *
 * Safe to re-run: uses findOne checks before every insert — no duplicates.
 * Destructive reset is opt-in: SEED_ALLOW_RESET=true
 *
 * Usage:
 *   node scripts/seed.js
 *   SEED_ALLOW_RESET=true node scripts/seed.js   (Linux/macOS)
 *   $env:SEED_ALLOW_RESET="true"; node scripts/seed.js   (PowerShell)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.config.js";
import User from "../models/User.js";
import Product from "../models/Product.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = {
  created: (label, value) => console.log(`  [+] Created  ${label}: ${value}`),
  skipped: (label, value) =>
    console.log(`  [~] Skipped  ${label}: ${value} (already exists)`),
  section: (title) =>
    console.log(`\n── ${title} ─────────────────────────────`),
  error: (label, err) =>
    console.error(`  [!] Error    ${label}: ${err.message}`),
};

// ---------------------------------------------------------------------------
// Seed data — Users
// ---------------------------------------------------------------------------

const USERS = [
  {
    displayName: "Maxwell Dobron",
    email: "maxwell.dob@gmail.com",
    purchases: 2,
  },
  {
    displayName: "John Doe",
    email: "john.doe@example.com",
    purchases: 0,
  },
  {
    displayName: "Jane Smith",
    email: "jane.smith@example.com",
    purchases: 6,
  },
];

// ---------------------------------------------------------------------------
// Seed data — Products (reference category by the name key used above)
// ---------------------------------------------------------------------------

const PRODUCTS = [
  // Laptops
  {
    name: "Macha latte",
    description:
      "Te macha con leche",
    price: 149.99,
    stock: 15,
  },
  {
    name: "Cafe Espresso",
    description:
      "Cafe espresso clasico.",
    price: 199.99,
    stock: 10,
  },
  {
    name: "Mocha blanco",
    description:
      "Cafe mocha con chocolate blanco.",
    price: 229.99,
    stock: 25,
  },
  {
    name: "Cafe Mocha",
    description:
      "Cafe mocha clasico.",
    price: 349.99,
    stock: 20,
  },
  {
    name: "Cafe Colombiano",
    description:
      "Cafe colombiano autentico.",
    price: 349.99,
    stock: 30,
  },
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedUsers() {
  log.section("Users");
  const results = {};

  for (const userData of USERS) {
    const existing = await User.findOne({ email: userData.email });

    if (existing) {
      log.skipped("user", userData.email);
      results[userData.email] = existing;
      continue;
    }

    const user = await User.create({
      displayName: userData.displayName,
      email: userData.email,
      purchases: userData.purchases,
    });

    log.created("user", `${userData.email} [${userData.displayName}]`);
    results[userData.email] = user;
  }

  return results;
}

async function seedProducts() {
  log.section("Products");

  for (const prodData of PRODUCTS) {
    const existing = await Product.findOne({ name: prodData.name });

    if (existing) {
      log.skipped("product", prodData.name);
      continue;
    }

    await Product.create({
      name: prodData.name,
      description: prodData.description,
      price: prodData.price,
      stock: prodData.stock,
    });

    log.created("product", `${prodData.name} ($${prodData.price})`);
  }
}

// ---------------------------------------------------------------------------
// Optional destructive reset (SEED_ALLOW_RESET=true)
// ---------------------------------------------------------------------------

async function resetCollections() {
  console.log("\n  [!] SEED_ALLOW_RESET=true — deleting existing data...");

  // Reverse dependency order: Products → Categories → Users
  // Cart, Order, ShippingAddress, PaymentMethod are left untouched
  // (user-generated data should not be wiped by default reset)
  const result = {
    products: await Product.deleteMany({}),
    users: await User.deleteMany({}),
  };

  console.log(
    `  [!] Deleted: ${result.products.deletedCount} products, ` +
      `${result.categories.deletedCount} categories, ` +
      `${result.users.deletedCount} users`,
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function printSummary() {
  log.section("Summary");

  const [userCount, productCount] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
  ]);

  console.log(`  Users:      ${userCount}`);
  console.log(`  Products:   ${productCount}`);

  const admin = await User.findOne({ role: "admin" }).select(
    "displayName email role",
  );
  if (admin) {
    console.log(`\n  Admin account:`);
    console.log(`    Email:    ${admin.email}`);
    console.log(`    Password: Admin1234!`);
  }

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

  await seedUsers();
  await seedProducts();
  await printSummary();

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("\n[FATAL] Seed failed:", err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
