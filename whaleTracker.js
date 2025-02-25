const { ethers } = require("ethers");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_BOT_TOKEN = "7202620864:AAE6Bjw3jhF4HRCiwEeru4pXYsNSc2-e4zY";
const TELEGRAM_CHAT_ID = "1149594916";
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

const ALCHEMY_API_KEY = "SlBiqBJYy9u1S0_tkDKcM_12CwmKMtKP";
const provider = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`);

const MIN_TX_AMOUNT = 100000; // Minimum transaction value in USD
const TRACKED_TOKENS = ["USDT", "USDC", "DAI", "WETH", "WBTC"];
const EXCHANGE_ADDRESSES = ["binance-address", "coinbase-address", "uniswap-address"];

async function getTokenPrice(symbol) {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
        return response.data[symbol].usd;
    } catch (error) {
        console.error("Error fetching token price:", error);
        return null;
    }
}

async function processTransaction(txHash) {
    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.to) return;
    
    const valueInEth = ethers.utils.formatEther(tx.value);
    const usdValue = valueInEth * (await getTokenPrice("ethereum"));
    if (usdValue < MIN_TX_AMOUNT) return;
    
    const isToExchange = EXCHANGE_ADDRESSES.includes(tx.to.toLowerCase());
    const alertType = isToExchange ? "🚨 Whale Deposit to Exchange 🚨" : "🐋 Whale Transaction 🐋";
    
    const message = `${alertType}\n🔹 From: ${tx.from}\n🔹 To: ${tx.to}\n💰 Amount: ${valueInEth} ETH (~$${usdValue.toFixed(2)})\n🔗 [View Transaction](https://etherscan.io/tx/${tx.hash})`;
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: "Markdown" });
}

provider.on("pending", async (txHash) => {
    try {
        await processTransaction(txHash);
    } catch (error) {
        console.error("Error processing transaction:", error);
    }
});

console.log("🚀 Whale tracker started...");
