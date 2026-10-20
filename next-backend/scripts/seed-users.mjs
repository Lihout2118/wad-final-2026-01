
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("ERROR: MONGODB_URI is missing from .env.local");
  process.exit(1);
}

const users = [
  {
    username: "teacher1",
    email: "teacher1@example.com",
    password: "Teacher123!",
    role: "Teacher",
  },
  {
    username: "teacher2",
    email: "teacher2@example.com",
    password: "Teacher123!",
    role: "Teacher",
  },
  {
    username: "teacher3",
    email: "teacher3@example.com",
    password: "Teacher123!",
    role: "Teacher",
  },
  {
    username: "student1",
    email: "student1@example.com",
    password: "Student123!",
    role: "Student",
  },
  {
    username: "student2",
    email: "student2@example.com",
    password: "Student123!",
    role: "Student",
  },
  {
    username: "student3",
    email: "student3@example.com",
    password: "Student123!",
    role: "Student",
  },
];

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db();
  const collection = db.collection("users");

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await collection.updateOne(
      { username: user.username },
      {
        $set: {
          username: user.username,
          email: user.email,
          password: hashedPassword,
          role: user.role,
        },
      },
      { upsert: true }
    );

    console.log(`Created/updated: ${user.username} (${user.role})`);
  }

  console.log("\nAll six test users are ready!");
} catch (error) {
  console.error("Failed to seed users:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
