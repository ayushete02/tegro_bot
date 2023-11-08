const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('market.db');

const Token = '6374334311:AAHl_pN-89lSK_o1ITPGNrQCbhIFiwwtZl4'
const bot = new Telegraf(Token); // Replace with your bot token

// Define X as the threshold percentage
const X = 0.08; // Change this value as needed
const targetChatId = -1002091612309;
// const targetChatId = 5967053862;

bot.start((ctx) => ctx.reply('Welcome!!'));

bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there'));

bot.hears('notify', async (ctx) => {
    try {
      // Define your custom message
      const customMessage = "This is a custom notification message.";
  
      // Replace the chat_id with your target chat ID
      const chatId = -1002091612309; // Replace with your target chat ID
  
      // Build the URL for sending a notification
      const apiUrl = `https://api.telegram.org/bot${Token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(customMessage)}`;
  
      // Send the notification
      const response = await fetch(apiUrl);
  
      if (response.ok) {
        ctx.reply('Custom notification sent successfully!');
      } else {
        ctx.reply('Failed to send a custom notification.');
      }
    } catch (error) {
      console.error('Error sending custom notification:', error);
      ctx.reply('An error occurred while sending the custom notification.');
    }
  });

bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    if (userMessage.startsWith('/')) {
        const command = userMessage.slice(1);
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            if (response.ok) {
                const data = await response.json();
                const coinData = data.find(item => item.symbol === `${command.toUpperCase()}`);
                if (coinData) {
                    const message = `<pre>Market       |  ${coinData.symbol}
------------ | --------------
Last Traded  |  ${(coinData.lastPrice).toFixed(4)}
24hr change  |  ${coinData.priceChangePercent >= 0 ? '+' : ''} ${coinData.priceChangePercent}% ${coinData.priceChangePercent >= 0 ? '⬆️' : '⬇️'}
</pre>
<pre>Buy at       |  ${(coinData.askPrice).toFixed(4)}
Sell at      |  ${(coinData.bidPrice).toFixed(4)}
24hr Low     |  ${(coinData.lowPrice).toFixed(4)}
24hr High    |  ${(coinData.highPrice).toFixed(4)}
24Hr Volume  |  ${(coinData.volume).toFixed(4)}</pre>`;

                    const binanceLink = `https://www.binance.com/en/trade/${coinData.symbol}`;
                    const keyboard = Markup.inlineKeyboard([Markup.button.url('Trade on Binance', binanceLink)]);
            
                    ctx.replyWithHTML(message, keyboard);
                  } else {
                    ctx.reply('Cryptocurrency not found or data not available.');
                  }
            }
        } catch (error) {   
            console.error('Error fetching data:', error);
            ctx.reply('An error occurred while fetching data.');
        }
    }
});

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

function formatTime(milliseconds) {
  // Calculate hours, minutes, and seconds
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  // Build a formatted string
  let result = '';
  if (hours > 0) {
    result += `${hours} hour${hours > 1 ? 's' : ''} `;
  }
  if (minutes > 0) {
    result += `${minutes} minute${minutes > 1 ? 's' : ''} `;
  }
  if (seconds > 0 || result === '') {
    result += `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  return result;
}



// Function to store or update market data in the databasefunction CheckPrice(marketSymbol, marketData) {
  function CheckPrice(marketSymbol, marketData) {
    db.serialize(function() {
      db.get('SELECT * FROM market_data WHERE market_symbol = ?', marketSymbol, function(err, row) {
        if (err) {
          console.log('Error querying database:', err);
          return;
        }

      if (!row) {
        // Insert a new record if the marketSymbol is not found
        db.run(
          'INSERT INTO market_data (market_name, market_symbol, market_price, last_update_timestamp, current_price, high_price, low_price, price_change, percent_change, is_send, last_notification_timestamp) VALUES (?, ?, ?, datetime("now", "utc"), ?, ?, ?, ?, ?, 0, datetime("now", "utc"))',
          [
            marketData.symbol,
            marketSymbol,
            marketData.lastPrice,
            marketData.lastPrice,
            marketData.highPrice,
            marketData.lowPrice,
            marketData.priceChange,
            marketData.percentChange,
          ],
          function(err) {
            if (err) {
              console.log('Error inserting data:', err);
            } else {
              console.log(`Inserted new data for ${marketSymbol}`);
            }
          }
        );
      } else {
        // Update the existing record
        const previousPrice = row.current_price;
        const currentPrice = marketData.lastPrice;
        const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;      
        const currentTime = new Date();
        const lastNotificationTime = new Date(row.last_notification_timestamp);
        const timeDifference = Math.abs(11 * 60 * 60 * 1000-(currentTime-lastNotificationTime));
        // Check if the price change is greater than X%
        if (Math.abs(priceChangePercent) >= X) {
          // Update the is_send flag to trigger an alert and update last notification timestamp
          db.run(
            'UPDATE market_data SET market_price = ?, last_update_timestamp = datetime("now", "utc"), high_price = ?, low_price = ?, price_change = ?, percent_change = ?, is_send = 1, last_notification_timestamp = datetime("now", "utc") WHERE market_symbol = ?',
            [currentPrice, marketData.highPrice, marketData.lowPrice, marketData.priceChange, priceChangePercent, marketSymbol],
            function(err) {
              if (err) {
                console.log('Error updating data:', err);
              } else {
                console.log(`Updated data for ${marketSymbol} with perent change: ${priceChangePercent}`);
                sendCustomNotification(`Change in price for ${marketSymbol} is ${priceChangePercent.toFixed(4)}% ${priceChangePercent >= 0 ? 'UP' : 'DOWN'} ${priceChangePercent >= 0 ? '🔼' : '🔽'} in the last ${formatTime(timeDifference)}`, true);
              }
            }
          );
        } else {
          // Update the current price and last notification timestamp
          db.run(
            'UPDATE market_data SET market_price = ?, last_update_timestamp = datetime("now", "utc"), high_price = ?, low_price = ?, price_change = ?, percent_change = ?, is_send = 0 WHERE market_symbol = ?',
            [currentPrice, marketData.highPrice, marketData.lowPrice, marketData.priceChange, priceChangePercent, marketSymbol],
            function(err) {
              if (err) {
                console.log('Error updating data:', err);
              } else {
                console.log(`Updated data for ${marketSymbol} with Percent change: ${priceChangePercent}`);
              }
            }
          );
        }
      }
    });
  });
}

// Now, you can call the PriceAlert function to fetch data and check prices
async function PriceAlert() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (response.ok) {
      const data = await response.json();
      const ethUsdtData = data.find((item) => item.symbol === 'ETHUSDT');
      const ethBtcData = data.find((item) => item.symbol === 'ETHBTC');

      if (ethUsdtData) {
        // Store or update the market data for ETHUSDT in the database
        CheckPrice('ETHUSDT', ethUsdtData);
      }

      // if (ethBtcData) {
      //   // Store or update the market data for ETHBTC in the database
      //   CheckPrice('ETHBTC', ethBtcData);
      // }
    }
  } catch (error) {
    console.log('Error fetching data:', error);
  }
}

// Function to send a custom notification
const sendCustomNotification = async (customMessage, isSend) => {
  try {
    if (isSend) {
      const apiUrl = `https://api.telegram.org/bot${Token}/sendMessage?chat_id=${targetChatId}&text=${encodeURIComponent(customMessage)}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        console.log('Custom notification sent successfully!');
      } else {
        console.error('Failed to send a custom notification.');
      }
    }
  } catch (error) {
    console.error('Error sending custom notification:', error);
  }
}

const notificationInterval = 2/20 * 60 *1000; // 2 minutes in milliseconds

setInterval(PriceAlert, notificationInterval);

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));