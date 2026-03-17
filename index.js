require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const noblox = require("noblox.js");
const fs = require("fs");

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const PREFIX = "!";

// ===== TOP DATA =====
let top = {};

try {
  top = JSON.parse(fs.readFileSync('top.json', 'utf8'));
} catch {
  for (let i = 1; i <= 10; i++) top[i] = null;
}

function saveTop() {
  fs.writeFileSync('top.json', JSON.stringify(top, null, 2));
}

// ===== ANTI NUKE =====
const antiNuke = {
  channelDeleteLimit: 3,
  channelCreateLimit: 3,
  roleDeleteLimit: 3,
  time: 10000
};

let logs = {};

// ===== CREATE CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

// ===== READY =====
client.once("ready", async () => {

  console.log(`✅ Bot online: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Verify Roblox")
      .addStringOption(option =>
        option.setName("username").setDescription("username roblox").setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("✅ Slash command loaded");
});

// ===== TIME PARSER =====
function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h|d|p)$/i);
  if (!match) return null;

  const value = Number(match[1]);
  let unit = match[2].toLowerCase();
  if (unit === "p") unit = "m";

  const times = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * times[unit];
}

// ===== PREFIX COMMAND =====
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const member = message.mentions.members.first();

  // ===== KICK =====
  if (cmd === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("❌ Đéo có Trình.");
    if (!member)
      return message.reply("❌ Tag thg cần kick.");
    if (!member.kickable)
      return message.reply("❌ Đéo thể kick người này.");

    try {
      await member.kick();
      message.reply(`✅ Đã kick ${member.user.tag}`);
    } catch {
      message.reply("❌ Kick Đéo đc.");
    }
  }

  // ===== BAN =====
  if (cmd === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ Đéo có Trình.");
    if (!member)
      return message.reply("❌ Tag thg cần ban.");
    if (!member.bannable)
      return message.reply("❌ Đéo thể ban người này.");

    try {
      await member.ban();
      message.reply(`🔨 Đã ban ${member.user.tag}`);
    } catch {
      message.reply("❌ Ban Đéo đc.");
    }
  }

  // ===== TIMEOUT =====
  if (cmd === "timeout") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    const timeArg = args[1];
    if (!member)
      return message.reply("❌ Tag thg cần timeout.");
    if (!timeArg)
      return message.reply("❌ Nhập vd: 10s, 5m, 2h");

    const duration = parseTime(timeArg);
    if (!duration)
      return message.reply("❌ Sai định dạng.");
    if (!member.moderatable)
      return message.reply("❌ Đéo timeout đc.");

    try {
      await member.timeout(duration);
      message.reply(`🔇 ${member.user.tag} Câm Mồm!! ${timeArg}`);
    } catch {
      message.reply("❌ Timeout thất bại.");
    }
  }

  // ===== UNTIMEOUT =====
  if (cmd === "untimeout") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ Đéo Đủ Trình.");
    if (!member)
      return message.reply("❌ Tag thg cần gỡ timeout.");

    try {
      await member.timeout(null);
      message.reply(`✅ ${member.user.tag} đã hết timeout`);
    } catch {
      message.reply("❌ Không gỡ timeout được.");
    }
  }

  // ===== GIVE ROLE =====
  if (cmd === "giverole") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply("❌ Đéo có Trình.");

    const role = message.mentions.roles.first();
    if (!member || !role)
      return message.reply("❌ Tag người + role.");

    try {
      await member.roles.add(role);
      message.reply(`✅ Đã cấp role ${role.name} cho ${member.user.tag}`);
    } catch {
      message.reply("❌ Cấp role thất bại.");
    }
  }

  // ===== REMOVE ROLE =====
  if (cmd === "removerole") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply("❌ Đéo có Trình.");

    const role = message.mentions.roles.first();
    if (!member || !role)
      return message.reply("❌ Tag người + role.");

    try {
      await member.roles.remove(role);
      message.reply(`🗑️ Đã xóa role ${role.name} của ${member.user.tag}`);
    } catch {
      message.reply("❌ Xóa role thất bại.");
    }
  }

  // ===== TOP =====
  if (cmd === "top") {
    let desc = '🏆 **BẢNG XẾP HẠNG TOP 10**\n\n';

    for (let i = 1; i <= 10; i++) {
      let icon = i === 1 ? '🥇' : i === 2 ? '🥈' : i === 3 ? '🥉' : `🔹 Top ${i}:`;
      desc += `${icon} ${top[i] ? `<@${top[i]}>` : 'Chưa có'}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 BXH FGS')
      .setDescription(desc)
      .setColor(0xffcc00)
      .setImage('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2Z2NHprdDM3eWtvcHNseDExaHJ6MzRudGdudWxmYmdjMDBkN25mayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VXqoSKc1DgEjJBmMJs/giphy.gif');

    message.channel.send({ embeds: [embed] });
  }

  // ===== SET TOP =====
  if (cmd === "settop") {
    const position = parseInt(args[0]);
    const user = message.mentions.users.first();

    if (!position || position < 1 || position > 10)
      return message.reply('❌ Chỉ có top 1 → 10');
    if (!user)
      return message.reply('❌ Tag người vào');

    top[position] = user.id;
    saveTop();
    message.reply(`✅ Set top ${position}: ${user.tag}`);
  }

  // ===== RESET TOP =====
  if (cmd === "resettop") {
    for (let i = 1; i <= 10; i++) top[i] = null;
    saveTop();
    message.reply('🔄 Reset bảng top');
  }
});

// ===== ANTI NUKE EVENTS =====
client.on("channelDelete", async (channel) => {
  const log = (await channel.guild.fetchAuditLogs({ limit: 1, type: 12 })).entries.first();
  if (!log) return;
  handleAntiNuke(channel.guild, log.executor.id, "channelDelete");
});

client.on("channelCreate", async (channel) => {
  const log = (await channel.guild.fetchAuditLogs({ limit: 1, type: 10 })).entries.first();
  if (!log) return;
  handleAntiNuke(channel.guild, log.executor.id, "channelCreate");
});

client.on("roleDelete", async (role) => {
  const log = (await role.guild.fetchAuditLogs({ limit: 1, type: 32 })).entries.first();
  if (!log) return;
  handleAntiNuke(role.guild, log.executor.id, "roleDelete");
});

async function handleAntiNuke(guild, id, type) {
  if (!logs[id]) logs[id] = { channelDelete: 0, channelCreate: 0, roleDelete: 0, time: Date.now() };

  let user = logs[id];

  if (Date.now() - user.time > antiNuke.time) {
    user.channelDelete = 0;
    user.channelCreate = 0;
    user.roleDelete = 0;
    user.time = Date.now();
  }

  user[type]++;

  if (
    user.channelDelete >= antiNuke.channelDeleteLimit ||
    user.channelCreate >= antiNuke.channelCreateLimit ||
    user.roleDelete >= antiNuke.roleDeleteLimit
  ) {
    try {
      let member = await guild.members.fetch(id);
      await member.roles.set([]);
      console.log("🚨 AntiNuke triggered");
    } catch {}
  }
}

// ===== VERIFY =====
client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "verify") return;

  const username = interaction.options.getString("username");
  await interaction.deferReply();

  try {
    const userId = await noblox.getIdFromUsername(username);
    const avatar = await noblox.getPlayerThumbnail(userId,"420x420","png",false,"headshot");

    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.setNickname(username);

    if (VERIFIED_ROLE_ID) await member.roles.add(VERIFIED_ROLE_ID);

    await interaction.editReply({ content: `✅ Verify thành Gay!: ${username}` });

    const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: username, iconURL: avatar[0].imageUrl })
      .setTitle("Member Updated")
      .addFields({ name: "Nickname", value: `${username} (@${interaction.user.username})` })
      .setThumbnail(avatar[0].imageUrl)
      .setColor("Green")
      .setTimestamp();

    channel.send({ embeds: [embed] });

  } catch {
    await interaction.editReply({ content: "❌ Username Roblox không tồn tại" });
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);