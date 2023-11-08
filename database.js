const sqlite3 = require('sqlite3').verbose();

// Create an SQLite database and a table for market data
const db = new sqlite3.Database('market.db');

db.serialize(function() {
    db.run(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY,
        market_name TEXT,
        market_symbol TEXT,
        market_price REAL,
        last_update_timestamp DATETIME,
        current_price REAL,
        high_price REAL,
        low_price REAL,
        price_change REAL,
        percent_change REAL,
        is_send BOOLEAN,
        last_notification_timestamp DATETIME
      )
    `);
  });

// Close the database when done
db.close();
