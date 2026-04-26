import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./db/db.js";

const testConnection = async () => {
  console.log("🔄 Starting MongoDB connection test...");
  
  try {
    // 1. Establish connection
    await connectDB();
    
    // 2. Ping the database
    const db = mongoose.connection.db;
    const admin = db.admin();
    const pingResult = await admin.ping();
    
    if (pingResult && pingResult.ok === 1) {
      console.log("✅ MongoDB ping successful! The database is fully connected and responding.");
      
      // 3. List existing collections and fetch the first document from each
      const collections = await db.listCollections().toArray();
      if (collections.length === 0) {
        console.log("📂 Current collections: None (Database is currently empty)");
      } else {
        const names = collections.map(c => c.name).join(", ");
        console.log(`📂 Current collections: ${names}\n`);
        
        console.log("🔍 Fetching the first document from each collection:");
        for (const collection of collections) {
          const firstDoc = await db.collection(collection.name).findOne({});
          console.log(`\n--- First document in '${collection.name}' ---`);
          if (firstDoc) {
            console.log(JSON.stringify(firstDoc, null, 2));
          } else {
            console.log("(Collection is empty)");
          }
        }
      }
      
    } else {
      console.error("❌ MongoDB ping failed or returned unexpected result:", pingResult);
    }

    // 4. Close connection cleanly
    await mongoose.connection.close();
    console.log("🔌 Connection closed gracefully. Test complete!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  }
};

testConnection();
