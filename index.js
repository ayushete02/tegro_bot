const { Telegraf, Markup } = require('telegraf');

const Token = '6374334311:AAHl_pN-89lSK_o1ITPGNrQCbhIFiwwtZl4'
const bot = new Telegraf(Token); // Replace with your bot token

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
                    const message = `<pre>
Market       |  ${coinData.symbol}
---- ------- | --------------
Last Traded  |  ${coinData.lastPrice}
24hr change  |  ${coinData.priceChangePercent >= 0 ? '+' : ''} ${coinData.priceChangePercent}% ${coinData.priceChangePercent >= 0 ? '⬆️' : '⬇️'}
</pre>
<pre>
Buy at       |  ${coinData.askPrice}
Sell at      |  ${coinData.bidPrice}
24hr Low     |  ${coinData.lowPrice}
24hr High    |  ${coinData.highPrice}
24Hr Volume  |  ${coinData.volume}
</pre>`;

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


  

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));