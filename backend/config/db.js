const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Exits the process on failure since the API cannot function without a DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Attempting to reconnect is handled by the driver.');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
