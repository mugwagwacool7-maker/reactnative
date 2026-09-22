const fs = require("fs");
const path = require("path");
const { Client, Databases, ID } = require("node-appwrite");

const PERMISSIONS = [
  'read("any")',
  'create("any")',
  'update("any")',
  'delete("any")',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const envPath = path.join(__dirname, "..", ".env.local");
const envMap = {};

const envContent = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");

envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([A-Z0-9_]+)=?(.*)$/);
  if (match) envMap[match[1]] = match[2];
});

const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) {
  console.error(
    "Missing APPWRITE_API_KEY. Create an API key in the Appwrite console " +
      "(Project Settings -> API Keys) with scopes `collections.read/write`, " +
      "`attributes.read/write`, `indexes.read/write` and set it in your environment."
  );
  process.exitCode = 1;
  return;
}

const { EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID, EXPO_PUBLIC_APPWRITE_DATABASE_ID } = envMap;

if (!EXPO_PUBLIC_APPWRITE_ENDPOINT || !EXPO_PUBLIC_APPWRITE_PROJECT_ID || !EXPO_PUBLIC_APPWRITE_DATABASE_ID) {
  console.error("Missing Appwrite endpoint/project/database config in .env.local");
  process.exitCode = 1;
  return;
}

const client = new Client()
  .setEndpoint(EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(apiKey);

const databases = new Databases(client);
const db = EXPO_PUBLIC_APPWRITE_DATABASE_ID;

async function waitForAttribute(collectionId, key) {
  for (let i = 0; i < 40; i++) {
    try {
      const attr = await databases.getAttribute(db, collectionId, key);
      if (attr.status === "available") return;
    } catch (error) {
      // ignore transient failures, keep waiting
    }
    await sleep(500);
  }
  throw new Error(`Attribute "${key}" did not become available`);
}

async function waitForIndex(collectionId, key) {
  for (let i = 0; i < 40; i++) {
    try {
      const index = await databases.getIndex(db, collectionId, key);
      if (index.status === "available") return;
    } catch (error) {
      // ignore transient failures, keep waiting
    }
    await sleep(500);
  }
  throw new Error(`Index "${key}" did not become available`);
}

async function collectionById(collectionId) {
  try {
    return await databases.getCollection(db, collectionId);
  } catch (error) {
    return null;
  }
}

async function ensureCollection({ name, attributes, indexes }) {
  const { collections } = await databases.listCollections(db);
  let collection = collections.find((col) => col.name === name);

  if (!collection) {
    collection = await databases.createCollection(db, ID.unique(), name, PERMISSIONS);
    console.log(`Created collection "${name}" (${collection.$id})`);
  } else {
    console.log(`Using existing collection "${name}" (${collection.$id})`);
  }

  const collectionId = collection.$id;
  const live = await collectionById(collectionId) || collection;
  const existingAttrs = (live.attributes || []).map((a) => a.key);
  const existingIndexes = (live.indexes || []).map((i) => i.key);

  for (const attr of attributes(collectionId)) {
    if (existingAttrs.includes(attr.key)) {
      console.log(`  attribute "${attr.key}" already exists`);
      continue;
    }
    await attr.create();
    await waitForAttribute(collectionId, attr.key);
    console.log(`  attribute "${attr.key}" ready`);
  }

  for (const index of indexes(collectionId)) {
    if (existingIndexes.includes(index.key)) {
      console.log(`  index "${index.key}" already exists`);
      continue;
    }
    await index.create();
    await waitForIndex(collectionId, index.key);
    console.log(`  index "${index.key}" ready`);
  }

  return collectionId;
}

function stringAttr(collectionId, key, size, required, defaultValue) {
  return {
    key,
    create: () => databases.createStringAttribute(db, collectionId, key, size, required, defaultValue),
  };
}

function intAttr(collectionId, key, required, min) {
  return {
    key,
    create: () => databases.createIntegerAttribute(db, collectionId, key, required, min),
  };
}

function boolAttr(collectionId, key, required, defaultValue) {
  return {
    key,
    create: () => databases.createBooleanAttribute(db, collectionId, key, required, defaultValue),
  };
}

function indexOn(collectionId, key, attributes, orders) {
  return {
    key,
    create: () => databases.createIndex(db, collectionId, key, "key", attributes, orders),
  };
}

const BOOKINGS_ATTRIBUTES = (collectionId) => [
  stringAttr(collectionId, "user", 64, true),
  stringAttr(collectionId, "property", 64, true),
  stringAttr(collectionId, "propertyName", 256, true),
  stringAttr(collectionId, "propertyAddress", 512, true),
  stringAttr(collectionId, "propertyImage", 2048, true),
  intAttr(collectionId, "price", true, 0),
  stringAttr(collectionId, "status", 16, true),
];

const BOOKINGS_INDEXES = (collectionId) => [
  indexOn(collectionId, "user_created", ["user", "$createdAt"], ["ASC", "DESC"]),
];

const PAYMENT_ATTRIBUTES = (collectionId) => [
  stringAttr(collectionId, "user", 64, true),
  stringAttr(collectionId, "type", 16, true),
  stringAttr(collectionId, "brand", 32, true),
  stringAttr(collectionId, "cardholderName", 256, true),
  stringAttr(collectionId, "phone", 32, false),
  stringAttr(collectionId, "last4", 4, true),
  stringAttr(collectionId, "expiryMonth", 2, true),
  stringAttr(collectionId, "expiryYear", 4, true),
  boolAttr(collectionId, "isDefault", true),
];

const PAYMENT_INDEXES = (collectionId) => [
  indexOn(collectionId, "user_created", ["user", "$createdAt"], ["ASC", "DESC"]),
];

async function main() {
  let bookingsId = envMap.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID;
  let paymentMethodsId = envMap.EXPO_PUBLIC_APPWRITE_PAYMENT_METHODS_COLLECTION_ID;

  const bookings = await ensureCollection({
    name: "bookings",
    attributes: BOOKINGS_ATTRIBUTES,
    indexes: BOOKINGS_INDEXES,
  });
  const payments = await ensureCollection({
    name: "payment_methods",
    attributes: PAYMENT_ATTRIBUTES,
    indexes: PAYMENT_INDEXES,
  });

  bookingsId = bookings;
  paymentMethodsId = payments;

  const lines = envContent
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID=")) {
        return `EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID=${bookingsId}`;
      }
      if (line.startsWith("EXPO_PUBLIC_APPWRITE_PAYMENT_METHODS_COLLECTION_ID=")) {
        return `EXPO_PUBLIC_APPWRITE_PAYMENT_METHODS_COLLECTION_ID=${paymentMethodsId}`;
      }
      return line;
    });

  fs.writeFileSync(envPath, lines.join("\n"));

  console.log("\nDone! Collection IDs written to .env.local:");
  console.log(`EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID=${bookingsId}`);
  console.log(`EXPO_PUBLIC_APPWRITE_PAYMENT_METHODS_COLLECTION_ID=${paymentMethodsId}`);
  return true;
}

main().then((success) => {
  if (!success) process.exitCode = 1;
});