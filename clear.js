// index.js
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(path.join(commandsPath, file));
        if (command.name && command.execute) {
            client.commands.set(command.name, command);
            console.log(`✅ Loaded command: ${command.name}`);
        }
    } catch (error) {
        console.error(`❌ Lỗi load ${file}:`, error.message);
    }
}

// Xử lý lệnh prefix
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`❌ Lỗi execute ${commandName}:`, error);
        await message.reply('❌ Có lỗi xảy ra!');
    }
});

// Ready
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} đã online!`);
    console.log(`📊 ${client.guilds.cache.size} servers`);
    console.log(`📋 ${client.commands.size} commands`);
});

// Login
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ THIẾU DISCORD_TOKEN!');
    process.exit(1);
}

client.login(TOKEN).catch(error => {
    console.error('❌ Lỗi login:', error);
    process.exit(1);
});

// Bắt lỗi toàn cục
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});