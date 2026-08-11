require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  Partials, 
  Collection 
} = require("discord.js");

const { joinVoiceChannel } = require("@discordjs/voice"); 
const noblox = require("noblox.js");
const fs = require("fs");
const shevdev = require("shevdev");

const express = require("express");
const app = express();
const WEB_PORT = 3000;

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const PREFIX = "!";

// ===== CONFIG QUYỀN HỆ THỐNG =====
const OWNER_ID = ["1517437552213098529" ,"1146359469945667644"];
const WHITELIST = ["1146359469945667644", "1517437552213098529"];

// ===== CONFIG RIÊNG CHO HỆ THỐNG TOP MỚI =====
// Dan cac ID Discord duoc phep dung lenh /settop vao day, cach nhau bang dau phay
const TOP_ADMIN_IDS = [
  "1517437552213098529",
  "1146359469945667644"
  // "ID_KHAC_O_DAY",
];

// 5 BANG TOP KHAC NHAU, MOI BANG 1 KENH RIENG + DU LIEU RIENG (khong bi trung)
// Vi tri trong mang nay quyet dinh so thu tu bang (1 den 5) khi dung lenh /settop va /top
const TOP_BOARD_CHANNELS = [
  "1525859026691424418", // Bang 1
  "1532703834005045338", // Bang 2
  "1532716870992527462", // Bang 3
  "1532717134537560175", // Bang 4
  "1532717158780502047"  // Bang 5
];

// Anh mac dinh khi chua set anh rieng cho 1 top
const DEFAULT_TOP_IMAGE = "https://image2url.com/r2/bucket2/gifs/1767827050143-96933576-19be-43b5-a12e-5259d520119b.gif";

// ===== TU DONG SAO LUU top.json LEN GITHUB (de khong mat du lieu moi lan Render deploy lai) =====
// Can 3 bien moi truong nay tren Render (Environment):
//   GITHUB_TOKEN  = Personal Access Token co quyen "Contents: Read and write"
//   GITHUB_REPO   = "TenChuTaiKhoan/TenRepo" (vd: "RinKoBeo/RinBotDiscord36")
//   GITHUB_BRANCH = "main" (co the bo trong, mac dinh la "main")
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_DATA_PATH = "top.json";

async function pushTopJsonToGitHub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return; // chua cau hinh env -> bo qua, khong crash
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}`;

    // Buoc 1: lay "sha" hien tai cua file tren GitHub (bat buoc phai co de sua dung file)
    const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });
    let sha;
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }

    // Buoc 2: day noi dung moi len (co kem sha neu file da ton tai, khong thi tao moi)
    const content = fs.readFileSync('top.json', 'utf8');
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Tu dong cap nhat du lieu TOP",
        content: contentBase64,
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {})
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error("Loi day top.json len GitHub:", errText);
    }
  } catch (err) {
    console.error("Loi ket noi GitHub API:", err.message);
  }
}

// ===== DATA BẢNG XẾP HẠNG (5 bang, moi bang co 10 vi tri rieng) =====
// Cau truc: top["1"][1] = {...}, top["1"][2] = {...}, ..., top["5"][10] = {...}
let top = {};
try {
  const rawTop = JSON.parse(fs.readFileSync('top.json', 'utf8'));
  const isOldSingleBoard = rawTop && rawTop[1] !== undefined && rawTop["1"] === undefined;

  if (isOldSingleBoard) {
    // Du lieu cu (chi 1 bang duy nhat) -> chuyen het vao Bang 1, cac bang 2-5 de trong
    top["1"] = {};
    for (let i = 1; i <= 10; i++) {
      const val = rawTop[i];
      if (val && typeof val === 'object') top["1"][i] = val;
      else if (val) top["1"][i] = { userId: val, country: "", rank: "", image: DEFAULT_TOP_IMAGE };
      else top["1"][i] = null;
    }
    for (let b = 2; b <= 5; b++) {
      top[String(b)] = {};
      for (let i = 1; i <= 10; i++) top[String(b)][i] = null;
    }
  } else {
    for (let b = 1; b <= 5; b++) {
      const key = String(b);
      top[key] = {};
      const boardRaw = rawTop[key] || {};
      for (let i = 1; i <= 10; i++) {
        top[key][i] = boardRaw[i] || null;
      }
    }
  }
} catch {
  for (let b = 1; b <= 5; b++) {
    top[String(b)] = {};
    for (let i = 1; i <= 10; i++) top[String(b)][i] = null;
  }
}

function saveTop() {
  fs.writeFileSync('top.json', JSON.stringify(top, null, 2));
  pushTopJsonToGitHub(); // chay ngam, khong doi ket qua, khong lam cham /settop
}

// Tao 10 embed rieng biet cho 10 vi tri cua 1 BANG cu the (mau trang, khong emoji)
// Neu chua set: van hien Country/Rank la "Chua co", chi nguoi la de trong den khi duoc set
// Country/Rank hien thanh 2 truong canh nhau, co footer thoi gian cap nhat,
// va thumbnail la avatar Roblox neu da duoc gan luc /settop
function buildTopEmbeds(boardKey) {
  const embeds = [];
  const board = top[boardKey] || {};
  for (let i = 1; i <= 10; i++) {
    const entry = board[i];
    const embed = new EmbedBuilder()
      .setTitle(`Top ${i}`)
      .setColor(0xffffff)
      .setImage((entry && entry.image) || DEFAULT_TOP_IMAGE)
      .setFooter({ text: `Top ${i}` })
      .setTimestamp();

    if (entry && entry.userId) {
      embed.setDescription(`**<@${entry.userId}>**\nRoblox: ${entry.robloxUsername || "Chua co"}`);
      embed.addFields(
        { name: "Country", value: entry.country || "Chua co", inline: true },
        { name: "Rank", value: entry.rank || "Chua co", inline: true }
      );
      if (entry.robloxAvatar) embed.setThumbnail(entry.robloxAvatar);
    } else {
      embed.setDescription("Chua co nguoi");
      embed.addFields(
        { name: "Country", value: "Chua co", inline: true },
        { name: "Rank", value: "Chua co", inline: true }
      );
    }
    embeds.push(embed);
  }
  return embeds;
}

// Cap nhat "bang top song" trong dung kenh rieng cua bang do - tu tao moi neu chua co,
// hoac SUA lai tin nhan cu neu da ton tai (khong spam tin nhan moi moi lan settop)
//
// LUU Y: Render xoa sach o dia moi lan deploy lai, nen KHONG dua vao file
// top_board.json de nho ID tin nhan cu (se mat sau moi lan deploy). Thay vao
// do, moi lan can sua bang, bot tu quet lai 20 tin nhan gan nhat trong kenh,
// tim dung tin nhan CU CUA CHINH NO (co dung 10 embed) de sua, khong tao moi.
async function findOldBoardMessage(channel, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const found = messages.find(m => m.author.id === client.user.id && m.embeds.length === 10);
    return found || null;
  } catch {
    return null;
  }
}

async function updateTopBoard(client, boardNumber) {
  const channelId = TOP_BOARD_CHANNELS[boardNumber - 1];
  if (!channelId) return;
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.error(`Khong tim thay kenh cho Bang ${boardNumber} (ID: ${channelId})`);
      return;
    }

    const embeds = buildTopEmbeds(String(boardNumber));

    const oldMsg = await findOldBoardMessage(channel, client);
    if (oldMsg) {
      await oldMsg.edit({ embeds }).catch(async () => {
        await channel.send({ embeds });
      });
      return;
    }

    await channel.send({ embeds });
  } catch (err) {
    console.error("Loi cap nhat bang top:", err.message);
  }
}

// Khi bot vua khoi dong, dam bao ca 5 bang deu da co san tin nhan trong kenh cua no
// (se tu tim va sua lai tin nhan cu neu co, khong tao moi)
async function initAllTopBoards(client) {
  for (let b = 1; b <= 5; b++) {
    await updateTopBoard(client, b);
  }
}

// ===== ANTI NUKE CONFIG =====
const antiNuke = {
  channelDelete: { limit: 2, time: 10000 },
  channelCreate: { limit: 2, time: 10000 },
  roleDelete: { limit: 1, time: 10000 },
  memberBan: { limit: 1, time: 10000 },
  memberKick: { limit: 2, time: 10000 }
};

let logs = {};
let joinLogs = {};
let msgLogs = {}; 

// ===== KHỞI TẠO CLIENT BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,      
    GatewayIntentBits.GuildVoiceStates,     
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message, 
    Partials.Channel, 
    Partials.Reaction
  ], 
});

client.setMaxListeners(30); 

// ============================================================
// ANTI-NUKE CÓ GIỚI HẠN 10 LẦN/30s
// ============================================================
const actionCounts = {};

function check(guild, userId, type) {
  if (!userId || userId === client.user.id || WHITELIST.includes(userId) || OWNER_ID.includes(userId)) return;

  const now = Date.now();
  const key = `${userId}_${type}`;
  if (!actionCounts[key]) {
    actionCounts[key] = { count: 1, firstTime: now };
  } else {
    if (now - actionCounts[key].firstTime > 30000) {
      actionCounts[key] = { count: 1, firstTime: now };
    } else {
      actionCounts[key].count++;
    }
  }

  if (actionCounts[key].count > 10) {
    punish(guild, userId, type);
    delete actionCounts[key];
  }
}

async function lockServer(guild) {
  try {
    await guild.roles.everyone.setPermissions(["ViewChannel"]);
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send("Server da bi LOCK do nghi ngo pha!");
  } catch {}
}

async function punish(guild, userId, reason) {
  if (!userId || WHITELIST.includes(userId) || OWNER_ID.includes(userId) || userId === client.user.id) return;

  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member || OWNER_ID.includes(member.id) || WHITELIST.includes(member.id)) return;
    
    await member.roles.set([]).catch(() => {});
    await member.ban({ reason: "AntiNuke: " + reason }).catch(() => {});
    await lockServer(guild);
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(`<@${userId}> bi BAN | Ly do: ${reason}`);
  } catch {}
}

// ===== SỰ KIỆN READY =====
client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Verify Roblox")
      .addStringOption(option =>
        option.setName("username").setDescription("username roblox").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("settop")
      .setDescription("Set 1 vi tri trong 1 bang TOP")
      .addIntegerOption(option =>
        option.setName("bang").setDescription("Bang TOP (1-5)").setRequired(true).setMinValue(1).setMaxValue(5)
      )
      .addIntegerOption(option =>
        option.setName("vitri").setDescription("Vi tri TOP (1-10)").setRequired(true).setMinValue(1).setMaxValue(10)
      )
      .addUserOption(option =>
        option.setName("nguoi").setDescription("Nguoi duoc set vao vi tri nay").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("quocgia").setDescription("Quoc gia").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("rank").setDescription("Rank trong game").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("anh").setDescription("Link anh (bo trong se dung anh mac dinh)").setRequired(false)
      )
      .addStringOption(option =>
        option.setName("roblox").setDescription("Ten Roblox de lay avatar (bat buoc)").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("top")
      .setDescription("Xem 1 bang xep hang TOP 1-10")
      .addIntegerOption(option =>
        option.setName("bang").setDescription("Bang TOP (1-5)").setRequired(true).setMinValue(1).setMaxValue(5)
      ),
    new SlashCommandBuilder()
      .setName("rankset")
      .setDescription("Gan rank cho 1 nguoi")
      .addUserOption(option =>
        option.setName("nguoi").setDescription("Nguoi duoc gan rank").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("rank").setDescription("Rank muon gan").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("dieuchinh").setDescription("Ghi chu them (vd: Mid, High, Low)").setRequired(false)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, "1525856288444125197"),
    { body: commands }
  ).catch(err => console.error("Loi load lenh Slash:", err.message));

  // Xoa sach bo lenh GLOBAL cu (neu con sot lai tu truoc), tranh bi hien trung
  // voi bo lenh GUILD moi vua dang ky o tren
  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: [] }
  ).catch(err => console.error("Loi xoa lenh global cu:", err.message));

  console.log("Slash command loaded");

  // Dam bao ca 5 bang TOP deu co san tin nhan trong kenh rieng cua no ngay tu luc bot online
  await initAllTopBoards(client);

  const ID_SERVER_CỦA_MÀY = "1525856288444125197"; 
  const ID_PHÒNG_VOICE_MUỐN_BOT_NGỒI = "1505850307765080194"; 

  try {
    const guild = await client.guilds.fetch(ID_SERVER_CỦA_MÀY).catch(() => null);
    if (guild) {
      const voiceChannel = await guild.channels.fetch(ID_PHÒNG_VOICE_MUỐN_BOT_NGỒI).catch(() => null);
      if (voiceChannel) {
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfMute: false, 
          selfDeaf: true   
        });
        console.log(`[VOICE 24/7] Rin da ngoi phong voice: ${voiceChannel.name}`);
      }
    }
  } catch (voiceFetchErr) {
    console.error("Loi luong fetch voice ready:", voiceFetchErr.message);
  }
  
  console.log("AI shevdev da san sang!");
}); 

// ===== HÀM PARSE THỜI GIAN =====
function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h|d|p)$/i);
  if (!match) return null;

  const value = Number(match[1]);
  let unit = match[2].toLowerCase();
  if (unit === "p") unit = "m";

  const times = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * times[unit];
}

// ============================================================
// DANH SÁCH TỪ CẤM (GIỮ NGUYÊN CẤU TRÚC CŨ + THÊM BIẾN THỂ)
// ============================================================
const VIOLATION_FILE = 'violators.json';
const bannedWords = [
  "pedo", "cp", "loli", "shota", "hentai", "18+", "nsfw", "sex",
  "owner ấm dâu", "bú lồn",  "đĩ", 
  "thèm chịch", "chịch", "thèm nắc", "muốn ma thuý", "ma thuý",
  "thèm thuốc",  "đâm vào lồn", "đâm vào mông", "đâm vào đít",
  "đâm vào vếu", "đâm vào ngực", "đâm vào bướm", "đâm vào cu",
  "đâm vào chim", "đâm vào dương vật", "đâm vào cặc", "đâm vào chịch",
  "đâm vào thằng nào đó", "thằng nào đó đâm vào đít", "thằng nào đó đâm vào lồn",
  "nungws", "nungws qua", "them bu lon", "bu cac",
  "muon dit tre em", "thèm trẻ em", "djt tre em", "ma tuy",
  "nigger", "nigga", "niga",
  "n18g3r", "n1gg3r", "n1gg4", "n1gga", "nigg3r", "nigg4",
  "n18ga", "n18g4", "p3d0", "p3do", "ped0",
  "l0l1", "l0l!", "sh0t4", "sh0ta", "h3nt41", "h3ntai",
  "s3x", "c.p", "c@p", "c-p", "c_p",
  "d.u", "d-u", "d_u", "ma túy", "ma tui", "matuy",
  "chech", "chich", "dit", "djt",
  "bu lon", "bu lồn", "bú lon", "bú lồn",
  "đụ má", "duma", "du ma"
];

console.log(`Da load ${bannedWords.length} tu cam (bao gom bien the leetspeak)`);

// ============================================================
// SỰ KIỆN TIN NHẮN
// ============================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();

  // 1. AUTO CHAT KHI BỊ TAG PING
  const pingUserIds = ["1517437552213098529", "895208486743457793"];
  const isPinged = pingUserIds.some(id => message.content.includes(`<@${id}>`) || message.content.includes(`<@!${id}>`));

  if (isPinged) {
    const replies = [
      `${message.author} Không quan trọng bảo bối là ai, nhưng nếu PING quá nhiều em sẽ thuộc quyền sở hữu của anh mất`,
      `${message.author} ping ít thôi không là e sẽ trở thành của anh ấyy mất thôi~`,
      `${message.author} đang làm phiền tổng tài mất rồi`,
      `${message.author} có biết là mình đang ping Rin quá nhiều không hả`,
      `${message.author} này cô bé~~ , e có bt là đang ping tổng tài quá nhiều không hả `,
      `${message.author} ping nhiều thế này thì e sẽ bị Rin bắt làm nô lệ đấy`,
      `${message.author}  e sẽ bị bỏ rơi nếu cứ ping anh chàng tài sắc vẹn toàn này`
    ];
    const random = replies[Math.floor(Math.random() * replies.length)];
    message.reply(random).catch(() => {});
  }

  // 2. CHỐNG SPAM CHAT GỐC
  if (!msgLogs[userId]) msgLogs[userId] = [];
  msgLogs[userId].push(now);
  msgLogs[userId] = msgLogs[userId].filter(t => now - t < 5000);

  if (msgLogs[userId].length >= 6) {
    try {
      await message.member.timeout(100000).catch(() => {});
      const ch = message.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (ch) ch.send(`${message.author.tag} spam qua nhieu`);
      return; 
    } catch {}
  }

  // 3. HỆ THỐNG QUÉT TỪ CẤM
  const contentLower = message.content.toLowerCase();
  const hasBannedWord = bannedWords.some(word => contentLower.includes(word));

  if (hasBannedWord && !OWNER_ID.includes(userId) && !WHITELIST.includes(userId)) {
    let violators = {};
    try { violators = JSON.parse(fs.readFileSync(VIOLATION_FILE, 'utf8')); } catch { violators = {}; }

    if (!violators[userId]) violators[userId] = 0;
    violators[userId]++;
    const count = violators[userId];
    fs.writeFileSync(VIOLATION_FILE, JSON.stringify(violators, null, 2));

    try { await message.delete().catch(() => {}); } catch {}

    if (count === 1) {
      if (message.member.moderatable) {
        await message.member.timeout(3600000, "Vi phạm từ ngữ cấm (Lần 1)").catch(() => {});
        return message.channel.send(`<@${userId}> bi MUTE 1 GIO vi phat ngon tu ngu cam (Lan 1/3).`).catch(() => {});
      }
    } else if (count === 2) {
      if (message.member.moderatable) {
        await message.member.timeout(86400000, "Vi phạm từ ngữ cấm (Lần 2)").catch(() => {});
        return message.channel.send(`<@${userId}> bi MUTE 24 GIO vi tai pham tu ngu cam (Lan 2/3).`).catch(() => {});
      }
    } else if (count >= 3) {
      if (message.member.kickable) {
        await message.member.kick("Vi phạm từ ngữ cấm quá 3 lần").catch(() => {});
        violators[userId] = 0;
        fs.writeFileSync(VIOLATION_FILE, JSON.stringify(violators, null, 2));
        return message.channel.send(`<@${userId}> da bi KICK khoi server vi vi pham tu ngu cam den lan thu 3!`).catch(() => {});
      }
    }
    return; 
  }

  // ===== LỆNH !ai =====
  if (message.content.startsWith("!ai")) {
    const question = message.content.slice(3).trim();
    if (!question) return message.reply("Hỏi gì thì hỏi đi mày!");
    
    await message.channel.sendTyping();
    
    try {
      const reply = await shevdev.chatbot(message.guild.id, message);
      await message.reply(reply);
    } catch (error) {
      console.error("Lỗi AI:", error);
      await message.reply("RIN AI đang bận, thử lại sau nhé!");
    }
    return;
  }

  // 4. PREFIX COMMANDS
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const member = message.mentions.members.first();

  // === LỆNH GÕ CỬA ===
  if (cmd === "gocua" || cmd === "ping") {
    return message.reply("Cửa đã mở! Bot Rin vẫn online chạy tẹt ga nha ní!").catch(() => {});
  }

  // === LỆNH INFO ROBLOX ===
  if (cmd === "info") {
    const username = args[0];
    if (!username) return message.reply("Nhập tên user roblox cần check ní ơi!");
    const user = message.mentions.users.first() || message.author;

    try {
      const rbUserId = await noblox.getIdFromUsername(username);
      const avatar = await noblox.getPlayerThumbnail(rbUserId, "420x420", "png", false, "headshot");
      const playerInfo = await noblox.getPlayerInfo(rbUserId);
      const joinDate = new Date(playerInfo.joinDate);
      
      const diffTime = Math.abs(new Date() - joinDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffYears = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      let ageString = diffYears > 0 ? `${diffYears} năm ${remainingDays} ngày trước` : `${diffDays} ngày trước`;

      let friendsListString = "Không có hoặc tài khoản riêng tư";
      let attachment = null; 

      try {
        const friendsData = await noblox.getFriends(rbUserId);
        if (friendsData && friendsData.data && friendsData.data.length > 0) {
          const totalFriends = friendsData.data.length;
          const validFriends = friendsData.data.filter(f => f.name && f.name.trim() !== "");
          
          if (validFriends.length > 0) {
            const limitFriends = validFriends.slice(0, 4); 
            const friendsLines = limitFriends.map((f, index) => `${index + 1}. ${f.displayName ? `${f.displayName}` : f.name}`).join(" | ");
            friendsListString = `Tổng số bạn: ${totalFriends} người\nBạn thân đại diện: ${friendsLines}`;

            const friendIds = limitFriends.map(f => f.id).filter(id => id !== undefined && id !== null);
            if (friendIds.length > 0) {
              try {
                const Jimp = require("jimp");
                const { AttachmentBuilder } = require("discord.js");
                const thumbnails = await noblox.getPlayerThumbnail(friendIds, "150x150", "png", false, "headshot");
                
                if (thumbnails && thumbnails.length > 0) {
                  const baseImage = new Jimp(thumbnails.length * 150, 150, 0x2f3136ff); 
                  for (let i = 0; i < thumbnails.length; i++) {
                    if (thumbnails[i] && thumbnails[i].imageUrl) {
                      const friendImg = await Jimp.read(thumbnails[i].imageUrl);
                      baseImage.composite(friendImg, i * 150, 0); 
                    }
                  }
                  const buffer = await baseImage.getBufferAsync(Jimp.MIME_PNG);
                  attachment = new AttachmentBuilder(buffer, { name: "friends-avatar.png" });
                }
              } catch (imgErr) {}
            }
          }
        }
      } catch (friendErr) {
        friendsListString = "Không thể kiểm tra bạn bè (Danh sách bị ẩn)";
      }

      const embed = new EmbedBuilder()
        .setTitle("THÔNG TIN TÀI KHOẢN ROBLOX")
        .addFields(
          { name: "Tên Trong Game (Display)", value: `${playerInfo.displayName || "Không có"}`, inline: true },
          { name: "Tên Đăng Nhập (User)", value: `${playerInfo.username || username}`, inline: true },
          { name: "Người Check (Discord)", value: `${user.username}`, inline: true },
          { name: "Ngày Tạo Acc", value: `${joinDate.toLocaleDateString('vi-VN')} (${ageString})`, inline: false },
          { name: "Mô Tả Bản Thân (Bio)", value: `${playerInfo.blurb || "Trống trơn"}`, inline: false },
          { name: "Danh Sách Bạn Bè", value: friendsListString, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setImage(avatar[0]?.imageUrl || null)
        .setColor(0x00AE86)
        .setFooter({ text: `Roblox ID: ${rbUserId} | Hệ thống VOL` })
        .setTimestamp();

      if (attachment) {
        message.reply({ embeds: [embed], files: [attachment] }).catch(() => {});
      } else {
        message.reply({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      message.reply("Không tìm thấy user Roblox hoặc hệ thống gặp lỗi rồi ní ơi!").catch(() => {});
    }
  }

  // === CÁC LỆNH QUẢN LÝ ===
  if (cmd === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("Đéo có Trình.");
    if (!member) return message.reply("Tag thg cần kick.");
    if (!member.kickable) return message.reply("Đéo thể kick người này.");
    try { await member.kick(); message.reply(`Đã kick ${member.user.tag}`); } catch { message.reply("Kick Đéo đc."); }
  }

  if (cmd === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("Đéo có Trình.");
    if (!member) return message.reply("Tag thg cần ban.");
    if (!member.bannable) return message.reply("Đéo thể ban người này.");
    try { await member.ban(); message.reply(`Đã ban ${member.user.tag}`); } catch { message.reply("Ban Đéo đc."); }
  }

  if (cmd === "unban") {
    const userIdToUnban = args[0]; 
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("Đéo có Trình.");
    if (!userIdToUnban) return message.reply("Nhập ID của thằng cần unban!");
    try {
      const banList = await message.guild.bans.fetch();
      if (!banList.has(userIdToUnban)) return message.reply("Thằng này có bị ban đéo đâu?");
      await message.guild.members.unban(userIdToUnban);
      message.reply(`Đã gỡ ban cho khứa mang ID: ${userIdToUnban}!`);
    } catch { message.reply("Unban Đéo đc."); }
  }

  if (cmd === "mute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("Đéo Đủ Trình.");
    const timeArg = args[1];
    if (!member) return message.reply("Tag thg cần timeout.");
    if (!timeArg) return message.reply("Nhập mẫu: 10s, 5m, 2h");
    const duration = parseTime(timeArg);
    if (!duration || !member.moderatable) return message.reply("Sai cú pháp hoặc đéo bóp họng được nó.");
    try { await member.timeout(duration); message.reply(`${member.user.tag} Câm Mồm!! ${timeArg}`); } catch { message.reply("Mute thất bại."); }
  }

  if (cmd === "unmute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("Đéo Đủ Trình.");
    if (!member) return message.reply("Tag thg cần gỡ.");
    try { await member.timeout(null); message.reply(`${member.user.tag} đã hết mute`); } catch { message.reply("Lỗi gỡ mute."); }
  }

});

// ============================================================
// ANTI-NUKE EVENTS
// ============================================================
client.on("channelDelete", async (channel) => {
  try {
    const logsAudit = await channel.guild.fetchAuditLogs({ limit: 5, type: 12 }).catch(() => null);
    if (!logsAudit) return;
    const log = logsAudit.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    if (log && log.executor) check(channel.guild, log.executor.id, "channelDelete");
  } catch {}
});

client.on("channelCreate", async (channel) => {
  try {
    const logsAudit = await channel.guild.fetchAuditLogs({ limit: 3, type: 10 }).catch(() => null);
    if (!logsAudit) return;
    const log = logsAudit.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    if (log && log.executor) check(channel.guild, log.executor.id, "channelCreate");
  } catch {}
});

client.on("roleDelete", async (role) => {
  try {
    const logsAudit = await role.guild.fetchAuditLogs({ limit: 3, type: 32 }).catch(() => null);
    if (!logsAudit) return;
    const log = logsAudit.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    if (log && log.executor) check(role.guild, log.executor.id, "roleDelete");
  } catch {}
});

client.on("guildBanAdd", async (ban) => {
  try {
    const logsAudit = await ban.guild.fetchAuditLogs({ limit: 3, type: 22 }).catch(() => null);
    if (!logsAudit) return;
    const log = logsAudit.entries.find(e => e.target.id === ban.user.id && Date.now() - e.createdTimestamp < 5000);
    if (log && log.executor) check(ban.guild, log.executor.id, "memberBan");
  } catch {}
});

client.on("guildMemberRemove", async (member) => {
  try {
    const logsAudit = await member.guild.fetchAuditLogs({ limit: 3, type: 20 }).catch(() => null);
    if (!logsAudit) return;
    const log = logsAudit.entries.find(e => e.target.id === member.id && Date.now() - e.createdTimestamp < 5000);
    if (log && log.executor) check(member.guild, log.executor.id, "memberKick");
  } catch {}
});

client.on("guildMemberAdd", (member) => {
  const now = Date.now();
  if (!joinLogs[member.guild.id]) joinLogs[member.guild.id] = [];
  joinLogs[member.guild.id].push(now);
  joinLogs[member.guild.id] = joinLogs[member.guild.id].filter(t => now - t < 5000);
  if (joinLogs[member.guild.id].length >= 5) lockServer(member.guild).catch(() => {});
});

// ======================================================
// CHO PHÉP OWNER/WHITELIST THÊM BOT KHÔNG BỊ KICK
// ======================================================
client.on("guildMemberAdd", async (member) => {
  if (member.user.bot && !WHITELIST.includes(member.id)) {
    try {
      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 28
      });
      const botAddLog = fetchedLogs.entries.first();
      if (
        botAddLog &&
        (
          botAddLog.executor.id === member.guild.ownerId ||
          OWNER_ID.includes(botAddLog.executor.id) ||
          WHITELIST.includes(botAddLog.executor.id)
        )
      ) {
        console.log(`Bot ${member.user.tag} duoc ${botAddLog.executor.tag} (Owner/Whitelist) them vao, bo qua kick.`);
        return;
      }
    } catch (err) {
      console.error("Loi fetch audit log khi them bot:", err.message);
    }
    await member.ban({ reason: "Bot lạ nhập cư trái phép" }).catch(() => {});
  }
});

// ===== SLASH COMMANDS: VERIFY / SETTOP / TOP =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ----- /verify -----
  if (interaction.commandName === "verify") {
    const username = interaction.options.getString("username");
    await interaction.deferReply().catch(() => {});

    try {
      const userId = await noblox.getIdFromUsername(username);
      const avatar = await noblox.getPlayerThumbnail(userId,"420x420","png",false,"headshot");

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) return;
      await member.setNickname(username).catch(() => {});

      if (VERIFIED_ROLE_ID) await member.roles.add(VERIFIED_ROLE_ID).catch(() => {});

      await interaction.editReply({ content: `Verify thanh cong!: ${username}` }).catch(() => {});

      const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: username, iconURL: avatar[0].imageUrl })
        .setTitle("Member Updated")
        .addFields({ name: "Nickname", value: `${username} (@${interaction.user.username})` })
        .setThumbnail(avatar[0].imageUrl)
        .setColor("Green")
        .setTimestamp();

      channel.send({ embeds: [embed] }).catch(() => {});
    } catch {
      await interaction.editReply({ content: "Username Roblox khong ton tai!" }).catch(() => {});
    }
    return;
  }

  // ----- /settop -----
  if (interaction.commandName === "settop") {
    if (!TOP_ADMIN_IDS.includes(interaction.user.id)) {
      return interaction.reply({ content: "Ban khong co quyen dung lenh nay!", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const bang = interaction.options.getInteger("bang");
    const vitri = interaction.options.getInteger("vitri");
    const nguoi = interaction.options.getUser("nguoi");
    const quocgia = interaction.options.getString("quocgia");
    const rank = interaction.options.getString("rank");
    const anh = interaction.options.getString("anh") || DEFAULT_TOP_IMAGE;
    const robloxUsername = interaction.options.getString("roblox");

    let robloxAvatar = null;
    try {
      const rbId = await noblox.getIdFromUsername(robloxUsername);
      const avatarData = await noblox.getPlayerThumbnail(rbId, "150x150", "png", false, "headshot");
      robloxAvatar = avatarData[0]?.imageUrl || null;
    } catch {
      return interaction.editReply({ content: `Khong tim thay user Roblox "${robloxUsername}". Vui long kiem tra lai ten va thu lai.` }).catch(() => {});
    }

    const boardKey = String(bang);
    if (!top[boardKey]) top[boardKey] = {};
    top[boardKey][vitri] = { userId: nguoi.id, country: quocgia, rank: rank, image: anh, robloxAvatar, robloxUsername };
    saveTop();

    await interaction.editReply({ content: `Da cap nhat Bang ${bang} - TOP ${vitri} cho <@${nguoi.id}>` }).catch(() => {});
    await updateTopBoard(client, bang);
    return;
  }

  // ----- /top -----
  if (interaction.commandName === "top") {
    const bang = interaction.options.getInteger("bang");
    const embeds = buildTopEmbeds(String(bang));
    await interaction.reply({ embeds }).catch(() => {});
    return;
  }
});

// ===== HỆ THỐNG PHÒNG VOICE TỰ ĐỘNG =====
const CHANNELS_CREATE_VOICE_ID = process.env.CHANNELS_CREATE_VOICE_ID;
let dynamicVoices = new Set(); 

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    if (newState.channelId === CHANNELS_CREATE_VOICE_ID && newState.member) {
      const member = newState.member;
      const guild = newState.guild;

      const newChannel = await guild.channels.create({
        name: `Room cua ${member.user.username}`,
        type: 2, 
        parent: newState.channel?.parentId || null, 
        permissionOverwrites: [
          {
            id: member.id,
            allow: ["ManageChannels", "MuteMembers", "DeafenMembers", "MoveMembers"], 
          }
        ]
      });

      dynamicVoices.add(newChannel.id);
      await member.voice.setChannel(newChannel).catch(() => {});
    }

    if (oldState.channelId && dynamicVoices.has(oldState.channelId)) {
      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
      if (oldChannel && oldChannel.members.size === 0) {
        await oldChannel.delete("Phòng trống tự động xóa").catch(() => {});
        dynamicVoices.delete(oldState.channelId); 
      }
    }
  } catch (err) {
    console.error("Loi sap luong tao Voice:", err.message);
  }
});

// ========================================================
// WEB SERVER
// ========================================================
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Bot Rin đang hoạt động ngon lành cành đào 24/7 vĩnh viễn!");
});

app.get("/api/top", (req, res) => {
  try {
    const currentTop = JSON.parse(fs.readFileSync('top.json', 'utf8'));
    res.json(currentTop);
  } catch {
    res.status(500).json({ error: "Không thể lấy dữ liệu BXH" });
  }
});

app.listen(WEB_PORT, () => {
  console.log(`[WEB] Website cua Rin dang chay tai: http://localhost:${WEB_PORT}`);
});

// ===== CÁC MODULE CON =====
require("./unlock.js")(client);
require("./lock.js")(client);
require("./logger.js")(client);
require("./warn.js")(client);
require("./taophong.js")(client);
require("./wellcome.js")(client);
require("./autorole.js")(client);
require("./rankset.js")(client, TOP_ADMIN_IDS);
// ===== LOGIN =====
client.login(TOKEN);