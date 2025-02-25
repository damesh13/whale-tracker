require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const FILE_PATH = "whale_transactions.json";

console.log("Listening for whale transactions...");

provider.on("pending", async (txHash) => {
    try {
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.value) {
            const ethValue = parseFloat(ethers.formatEther(tx.value));
            if (ethValue > 30) { // Transactions above ~50,000 USD
                const transactionData = {
                    from: tx.from,
                    to: tx.to,
                    value: ethValue,
                    timestamp: new Date().toISOString()
                };

                console.log(`🐋 Whale Alert: ${ethValue} ETH sent from ${tx.from} to ${tx.to}`);

                // Save to JSON file
                saveTransaction(transactionData);

                // Send Telegram Alert
                sendTelegramAlert(transactionData);
            }
        }
    } catch (error) {
        console.error("Error fetching transaction:", error);
    }
});

// Function to save transaction data
function saveTransaction(transaction) {
    let transactions = [];

    if (fs.existsSync(FILE_PATH)) {
        const fileData = fs.readFileSync(FILE_PATH);
        if (fileData.length > 0) {
            transactions = JSON.parse(fileData);
        }
    }

    transactions.push(transaction);
    fs.writeFileSync(FILE_PATH, JSON.stringify(transactions, null, 2));
}

// Function to send a Telegram alert
function sendTelegramAlert(transaction) {
    const message = `🐋 *Whale Alert!*\n\n🚀 *${transaction.value} ETH* moved!\n\n📤 From: \`${transaction.from}\`\n📥 To: \`${transaction.to}\`\n⏳ Time: ${transaction.timestamp}`;
    
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: "Markdown" })
        .then(() => console.log("📩 Telegram alert sent!"))
        .catch((error) => console.error("❌ Error sending Telegram message:", error));
}
