const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf("6374334311:AAHl_pN-89lSK_o1ITPGNrQCbhIFiwwtZl4"); // Replace with your bot token

bot.start((ctx) => ctx.reply('Welcome!!'));

bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there'));

// Define a catch-all command to search for specific data
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    if (userMessage.startsWith('/')) {
        const command = userMessage.slice(1); // Remove the leading '/'
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price');
            if (response.ok) {
                const data = await response.json();
                const coinData = data.find(item => item.symbol === `${command.toUpperCase()}`);
                if (coinData) {
                    const message = `${coinData.symbol} Price: ${coinData.price} USDT`;
            
                    // Create an inline keyboard button with a link to Binance
                    const binanceLink = `https://www.binance.com/en/trade/${coinData.symbol}`;
                    const keyboard = Markup.inlineKeyboard([Markup.button.url('Trade on Binance', binanceLink)]);
            
                    ctx.reply(message, keyboard);
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