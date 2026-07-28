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
const thongbao = require("./thongbao");
const shevdev = require("shevdev");

const express = require("express");
const app = express();
const WEB_PORT = 3000;

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const PREFIX = "!";

// ===== CONFIG QUYỀN HỆ THỐNG =====
const OWNER_ID = "895208486743457793";
const WHITELIST = ["1226360140387844167", "895208486743457793", "928258903941210186", "1487337137601773720"];

// ===== DATA BẢNG XẾP HẠNG =====
let top = {};
try {
  top = JSON.parse(fs.readFileSync('top.json', 'utf8'));
} catch {
  for (let i = 1; i <= 10; i++) top[i] = null;
}

function saveTop() {
  fs.writeFileSync('top.json', JSON.stringify(top, null, 2));
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
  if (!userId || userId === client.user.id || WHITELIST.includes(userId) || userId === OWNER_ID) return;

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
    if (ch) ch.send("🔒 Server đã bị LOCK do nghi ngờ phá!");
  } catch {}
}

async function punish(guild, userId, reason) {
  if (!userId || WHITELIST.includes(userId) || userId === OWNER_ID || userId === client.user.id) return;

  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member || member.id === OWNER_ID || WHITELIST.includes(member.id)) return;
    
    await member.roles.set([]).catch(() => {});
    await member.ban({ reason: "AntiNuke: " + reason }).catch(() => {});
    await lockServer(guild);
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(`🚨 <@${userId}> bị BAN | Lý do: ${reason}`);
  } catch {}
}

// ===== SỰ KIỆN READY =====
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
  ).catch(err => console.error("❌ Lỗi load lệnh Slash:", err.message));

  console.log("✅ Slash command loaded");

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
        console.log(`🤖 [VOICE 24/7] Rin đã ngồi phòng voice: ${voiceChannel.name}`);
      }
    }
  } catch (voiceFetchErr) {
    console.error("❌ Lỗi luồng fetch voice ready:", voiceFetchErr.message);
  }
  
  console.log("🤖 AI shevdev đã sẵn sàng!");
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

// ========================================================
// 🔥 SỰ KIỆN TIN NHẮN 
// ========================================================
const VIOLATION_FILE = 'violators.json';
// ===== DANH SÁCH TỪ GỐC (VIẾT THƯỜNG, KHÔNG DẤU) =====
const baseWords = [
  "pedo", "cp", "loli", "shota", "hentai", "18+", "nsfw", "sex",
  "owner ấm dâu", "bú lồn", "đụ", "đĩ", "lồn mẹ mày",
  "thèm chịch", "chịch", "thèm nắc", "muốn ma thuý", "ma thuý",
  "thèm thuốc", "thuốc", "đâm vào lồn", "đâm vào mông", "đâm vào đít",
  "đâm vào vếu", "đâm vào ngực", "đâm vào bướm", "đâm vào cu",
  "đâm vào chim", "đâm vào dương vật", "đâm vào cặc", "đâm vào chịch",
  "đâm vào thằng nào đó", "thằng nào đó đâm vào đít", "thằng nào đó đâm vào lồn",
  "nungws", "nungws qua", "them bu lon", "bu cac",
  "muon dit tre em", "thèm trẻ em", "djt tre em", "ma tuy",
  "nigger", "nigga", "niga"
];

// ===== TẠO BIẾN THỂ LEETSPEAK VÀ HOMOGLYPH =====
function generateLeetVariants(word) {
  const variants = new Set();
  const w = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // bỏ dấu tiếng Việt

  // Bảng ánh xạ ký tự -> biến thể
  const map = {
    'a': ['4', '@', 'á', 'à', 'ạ', 'ả', 'ã', 'â', 'ầ', 'ẩ', 'ẫ', 'ậ', 'ă', 'ằ', 'ẳ', 'ẵ', 'ặ'],
    'e': ['3', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ể', 'ễ', 'ệ'],
    'i': ['1', '!', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
    'o': ['0', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ờ', 'ở', 'ỡ', 'ợ'],
    'u': ['v', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ừ', 'ử', 'ữ', 'ự'],
    'y': ['j', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],
    's': ['5', 'z', 'š'],
    't': ['7', '+', 'ť'],
    'g': ['9', 'ğ'],
    'b': ['8', 'ḅ'],
    'c': ['(', 'ć', 'č'],
    'd': ['ḋ'],
    'h': ['#', 'ḧ'],
    'l': ['1', 'ł'],
    'n': ['ñ', 'ń'],
    'm': ['ṃ'],
    'p': ['ṗ'],
    'r': ['ṛ'],
    'x': ['×', '*'],
    'k': ['ķ'],
    'f': ['ƒ'],
    'v': ['ν'],
    'w': ['ω']
  };

  // Sinh tất cả tổ hợp thay thế (giới hạn để tránh bùng nổ)
  function generate(index, current) {
    if (index === w.length) {
      variants.add(current);
      return;
    }
    const char = w[index];
    // Giữ nguyên ký tự
    generate(index + 1, current + char);
    // Thay thế nếu có
    if (map[char]) {
      for (const repl of map[char]) {
        generate(index + 1, current + repl);
      }
    }
    // Thêm biến thể viết hoa (Discord sẽ toLowerCase, nhưng vẫn thêm cho chắc)
    generate(index + 1, current + char.toUpperCase());
  }

  generate(0, '');

  // Thêm các biến thể đặc biệt cho từ ghép (bỏ dấu cách)
  if (word.includes(' ')) {
    const noSpace = w.replace(/ /g, '');
    variants.add(noSpace);
    // Thêm biến thể viết tắt (lấy chữ cái đầu)
    const acronym = w.split(' ').map(s => s[0]).join('');
    variants.add(acronym);
  }

  return Array.from(variants);
}

// ===== TẠO DANH SÁCH TỪ CẤM ĐẦY ĐỦ =====
let bannedWords = [];
for (const word of baseWords) {
  bannedWords = bannedWords.concat(generateLeetVariants(word));
}

// Thêm thủ công các biến thể leetspeak cực kỳ phổ biến
const extraVariants = [
  "n18g3r", "n1gg3r", "n1gg4", "n1gga", "nigg3r", "nigg4",
  "n18ga", "n18g4", "n1gg3r", "n1gga", "n1gg4", "n1gg3r",
  "p3d0", "p3do", "ped0", "p3do", "p3d0",
  "l0l1", "l0l!", "l0l1", "l0l!",
  "sh0t4", "sh0ta", "sh0t4", "sh0ta",
  "h3nt41", "h3ntai", "h3nt41", "hent41",
  "s3x", "s3x", "seX", "s3x",
  "c.p", "c@p", "c-p", "c_p",
  "d.u", "d-u", "d_u", "d.ụ", "d-ụ", "d_ụ",
  "ma túy", "ma tui", "matuy", "ma tuý",
  "chech", "chich", "dit", "djt", "djt",
  "bu lon", "bu lồn", "bú lon", "bú lồn",
  "cac", "cắc", "cac", "cặc",
  "loz", "lồn", "lon",
  "cl", "cặc lồn", "cl",
  "đụ má", "duma", "du ma", "duma",
  "vcl", "vcl", "vặc lồn",
];
bannedWords = bannedWords.concat(extraVariants);

// Loại bỏ trùng lặp và sắp xếp
bannedWords = [...new Set(bannedWords)];
console.log(`✅ Đã tạo ${bannedWords.length} từ cấm (bao gồm biến thể leetspeak)`);

// ============================================================
// SỰ KIỆN MESSAGE CREATE
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
      `${message.author} Không quan trọng bảo bối là ai, nhưng nếu PING quá nhiều em sẽ thuộc quyền sở hữu của anh mất 😔`,
      `${message.author} ping ít thôi không là e sẽ trở thành của anh ấyy mất thôi~ 😭`,
      `${message.author} đang làm phiền tổng tài mất rồi  😭`,
      `${message.author} có biết là mình đang ping Rin quá nhiều không hả 😔`,
      `${message.author} này cô bé~~ , e có bt là đang ping tổng tài quá nhiều không hả `,
      `${message.author} ping nhiều thế này thì e sẽ bị Rin bắt làm nô lệ đấy 😭`,
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
      if (ch) ch.send(`🚨 ${message.author.tag} spam quá nhiều`);
      return; 
    } catch {}
  }

  // 3. HỆ THỐNG QUÉT TỪ CẤM
  const contentLower = message.content.toLowerCase();
  const hasBannedWord = bannedWords.some(word => contentLower.includes(word));

  if (hasBannedWord && userId !== OWNER_ID && !WHITELIST.includes(userId)) {
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
        return message.channel.send(`⚠️ <@${userId}> bị **MUTE 1 GIỜ** vì phát ngôn từ ngữ cấm (Lần 1/3).`).catch(() => {});
      }
    } else if (count === 2) {
      if (message.member.moderatable) {
        await message.member.timeout(86400000, "Vi phạm từ ngữ cấm (Lần 2)").catch(() => {});
        return message.channel.send(`🚨 <@${userId}> bị **MUTE 24 GIỜ** vì tái phạm từ ngữ cấm (Lần 2/3).`).catch(() => {});
      }
    } else if (count >= 3) {
      if (message.member.kickable) {
        await message.member.kick("Vi phạm từ ngữ cấm quá 3 lần").catch(() => {});
        violators[userId] = 0;
        fs.writeFileSync(VIOLATION_FILE, JSON.stringify(violators, null, 2));
        return message.channel.send(`🔨 Thằng súc vật <@${userId}> đã bị **KICK** khỏi server vì vi phạm từ ngữ cấm đến lần thứ 3!`).catch(() => {});
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
      await message.reply("❌ RIN AI đang bận, thử lại sau nhé!");
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
    return message.reply("🚪 Cửa đã mở! Bot Rin vẫn online chạy tẹt ga nha ní!").catch(() => {});
  }

  // === LỆNH INFO ROBLOX ===
  if (cmd === "info") {
    const username = args[0];
    if (!username) return message.reply("🛑 Nhập tên user roblox cần check ní ơi!");
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

      let friendsListString = "❌ Không có hoặc tài khoản riêng tư";
      let attachment = null; 

      try {
        const friendsData = await noblox.getFriends(rbUserId);
        if (friendsData && friendsData.data && friendsData.data.length > 0) {
          const totalFriends = friendsData.data.length;
          const validFriends = friendsData.data.filter(f => f.name && f.name.trim() !== "");
          
          if (validFriends.length > 0) {
            const limitFriends = validFriends.slice(0, 4); 
            const friendsLines = limitFriends.map((f, index) => `👤 **${index + 1}.** ${f.displayName ? `${f.displayName}` : f.name}`).join(" | ");
            friendsListString = `👥 **Tổng số bạn:** ${totalFriends} người\n**✨ Bạn thân đại diện:** ${friendsLines}`;

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
        friendsListString = "🔒 Không thể kiểm tra bạn bè (Danh sách bị ẩn)";
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 THÔNG TIN TÀI KHOẢN ROBLOX")
        .addFields(
          { name: "✨ Tên Trong Game (Display)", value: `**${playerInfo.displayName || "Không có"}**`, inline: true },
          { name: "👤 Tên Đăng Nhập (User)", value: `\`${playerInfo.username || username}\``, inline: true },
          { name: "💬 Người Check (Discord)", value: `${user.username}`, inline: true },
          { name: "📅 Ngày Tạo Acc", value: `📅 ${joinDate.toLocaleDateString('vi-VN')} (${ageString})`, inline: false },
          { name: "📝 Mô Tả Bản Thân (Bio)", value: `\`\`\`text\n${playerInfo.blurb || "Trống trơn"}\n\`\`\``, inline: false },
          { name: "👥 Danh Sách Bạn Bè", value: friendsListString, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setImage(avatar[0]?.imageUrl || null)
        .setColor(0x00AE86)
        .setFooter({ text: `Roblox ID: ${rbUserId} | Hệ thống FGS` })
        .setTimestamp();

      if (attachment) {
        message.reply({ embeds: [embed], files: [attachment] }).catch(() => {});
      } else {
        message.reply({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      message.reply("❌ Không tìm thấy user Roblox hoặc hệ thống gặp lỗi rồi ní ơi!").catch(() => {});
    }
  }

  // === LỆNH SETTOP ===
  if (cmd === "settop") {
    if (userId !== OWNER_ID && !WHITELIST.includes(userId)) {
      return message.reply(`❌ Tuổi gì đòi set? ID của mày là \`${userId}\` đéo nằm trong hệ thống Whitelist!`);
    }

    const topNumber = parseInt(args[0]); 
    const targetMember = message.mentions.members.first() || args[1]; 

    if (isNaN(topNumber) || topNumber < 1 || topNumber > 10) {
      return message.reply("❌ Số thứ tự TOP phải từ 1 đến 10! VD: `!settop 1 @Ringada` ");
    }

    if (!targetMember) return message.reply("❌ Tag thiếu người cần set top kìa khứa.");

    const targetId = typeof targetMember === "string" ? targetMember : targetMember.id;
    top[topNumber] = targetId;
    saveTop(); 

    return message.reply(`✅ Xác nhận quyền lực! Đã đưa <@${targetId}> vào vị trí **TOP ${topNumber}**!`);
  }

  // === LỆNH TOP ===
  if (cmd === "top") {
    let desc = '';
    for (let i = 1; i <= 10; i++) {
      let line = '';
      if (i === 1) line = `👑 **TOP 1** → ${top[i] ? `<@${top[i]}>` : 'Chưa có'} 🔥`;
      else if (i === 2) line = `🥈 TOP 2 → ${top[i] ? `<@${top[i]}>` : 'Chưa có'}`;
      else if (i === 3) line = `🥉 TOP 3 → ${top[i] ? `<@${top[i]}>` : 'Chưa có'}`;
      else line = `🔹 TOP ${i} → ${top[i] ? `<@${top[i]}>` : 'Chưa có'}`;
      desc += line + "\n";
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 BXH FGS - TOP SERVER")
      .setDescription(desc)
      .setColor(0xffcc00)
      .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGd0ZGhxd2J0dXVnM29vYTllcHgzdTc1ajAyNHVkZXJuemRpbWw4NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oEPyO83kEnoyfwmewB/giphy.gif")
      .setImage("https://media.giphy.com/media/v1.Y2lkPTc5MGI3KA11d2JidXdieXhiNWMzeDVpajNlZ3d3aDZja21ic2IxcGh2cjNzdWJ1eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QSwBid1bso4h5ePFnN/giphy.gif")
      .setFooter({ text: "🔥 Top sẽ thay đổi do Rin set" })
      .setTimestamp();

    message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  // === CÁC LỆNH QUẢN LÝ ===
  if (cmd === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("❌ Đéo có Trình.");
    if (!member) return message.reply("❌ Tag thg cần kick.");
    if (!member.kickable) return message.reply("❌ Đéo thể kick người này.");
    try { await member.kick(); message.reply(`✅ Đã kick ${member.user.tag}`); } catch { message.reply("❌ Kick Đéo đc."); }
  }

  if (cmd === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Đéo có Trình.");
    if (!member) return message.reply("❌ Tag thg cần ban.");
    if (!member.bannable) return message.reply("❌ Đéo thể ban người này.");
    try { await member.ban(); message.reply(`🔨 Đã ban ${member.user.tag}`); } catch { message.reply("❌ Ban Đéo đc."); }
  }

  if (cmd === "unban") {
    const userIdToUnban = args[0]; 
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Đéo có Trình.");
    if (!userIdToUnban) return message.reply("❌ Nhập ID của thằng cần unban!");
    try {
      const banList = await message.guild.bans.fetch();
      if (!banList.has(userIdToUnban)) return message.reply("❌ Thằng này có bị ban đéo đâu?");
      await message.guild.members.unban(userIdToUnban);
      message.reply(`🔓 Đã gỡ ban cho khứa mang ID: \`${userIdToUnban}\`!`);
    } catch { message.reply("❌ Unban Đéo đc."); }
  }

  if (cmd === "mute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("❌ Đéo Đủ Trình.");
    const timeArg = args[1];
    if (!member) return message.reply("❌ Tag thg cần timeout.");
    if (!timeArg) return message.reply("❌ Nhập mẫu: 10s, 5m, 2h");
    const duration = parseTime(timeArg);
    if (!duration || !member.moderatable) return message.reply("❌ Sai cú pháp hoặc đéo bóp họng được nó.");
    try { await member.timeout(duration); message.reply(`🔇 ${member.user.tag} Câm Mồm!! ${timeArg}`); } catch { message.reply("❌ Mute thất bại."); }
  }

  if (cmd === "unmute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("❌ Đéo Đủ Trình.");
    if (!member) return message.reply("❌ Tag thg cần gỡ.");
    try { await member.timeout(null); message.reply(`✅ ${member.user.tag} đã hết mute`); } catch { message.reply("❌ Lỗi gỡ mute."); }
  }

  await thongbao(message, args, cmd).catch(() => {});
});

// ============================================================
// ANTI-NUKE EVENTS (SỬ DỤNG HÀM CHECK MỚI)
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
// CHO PHÉP OWNER THÊM BOT KHÔNG BỊ KICK
// ======================================================
client.on("guildMemberAdd", async (member) => {
  if (member.user.bot && !WHITELIST.includes(member.id)) {
    try {
      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 28
      });
      const botAddLog = fetchedLogs.entries.first();
      if (botAddLog && botAddLog.executor.id === member.guild.ownerId) {
        console.log(`✅ Bot ${member.user.tag} được Owner thêm vào, bỏ qua kick.`);
        return;
      }
    } catch (err) {
      console.error("❌ Lỗi fetch audit log khi thêm bot:", err.message);
    }
    await member.ban({ reason: "Bot lạ nhập cư trái phép" }).catch(() => {});
  }
});

// ===== SLASH COMMAND VERIFY =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "verify") return;

  const username = interaction.options.getString("username");
  await interaction.deferReply().catch(() => {});

  try {
    const userId = await noblox.getIdFromUsername(username);
    const avatar = await noblox.getPlayerThumbnail(userId,"420x420","png",false,"headshot");

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return;
    await member.setNickname(username).catch(() => {});

    if (VERIFIED_ROLE_ID) await member.roles.add(VERIFIED_ROLE_ID).catch(() => {});

    await interaction.editReply({ content: `✅ Verify thành công!: ${username}` }).catch(() => {});

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
    await interaction.editReply({ content: "❌ Username Roblox đéo tồn tại!" }).catch(() => {});
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
        name: `🎤 Room của ${member.user.username}`,
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
    console.error("❌ Lỗi sập luồng tạo Voice:", err.message);
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
    
    let webTopData = [];
    for (let i = 1; i <= 10; i++) {
      const userId = currentTop[i];
      const userObj = userId ? client.users.cache.get(userId) : null;
      webTopData.push({
        rank: i,
        userId: userId || "Chưa có",
        username: userObj ? userObj.username : "Ẩn danh / Chưa có"
      });
    }
    res.json(webTopData);
  } catch {
    res.status(500).json({ error: "Không thể lấy dữ liệu BXH" });
  }
});

app.listen(WEB_PORT, () => {
  console.log(`🌐 [WEB] Website của Rin đang chạy tại: http://localhost:${WEB_PORT}`);
});

// ===== CÁC MODULE CON =====
require("./video.js")(client);
require("./unlock.js")(client);
require("./help.js")(client);
require("./lock.js")(client);
require("./music.js")(client);
require("./logger.js")(client);
require("./warn.js")(client);
require("./taophong.js")(client);
require("./wellcome.js")(client);
require("./clear.js")(client);
require("./ticket.js")(client);
require("./autorole.js")(client);
require("./keepalive.js")(client);

// ===== LOGIN =====
client.login(TOKEN);