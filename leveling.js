const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================================
//  CẤU HÌNH HỆ THỐNG LV — SỬA PHẦN NÀY CHO ĐÚNG SERVER
// ============================================================

// Kênh thông báo khi lên level
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL_ID || '1545471984178044988';

// Role tự động cấp mỗi 10 level (thay ROLE_ID bằng ID thật của mày)
const LEVEL_ROLES = {
  10:  process.env.ROLE_LV10  || '1545469901869813770',
  20:  process.env.ROLE_LV20  || '1545469986053820456',
  30:  process.env.ROLE_LV30  || '1545470039338131526',
  40:  process.env.ROLE_LV40  || '1545470090835796089',
  50:  process.env.ROLE_LV50  || '1545470137375785031',
  60:  process.env.ROLE_LV60  || '1545470190937186445',
  70:  process.env.ROLE_LV70  || '1545470267076124702',
  80:  process.env.ROLE_LV80  || '1545470333648240721',
  90:  process.env.ROLE_LV90  || '1545470404863205446',
  100: process.env.ROLE_LV100 || '1545470451265048656',
};

// Cooldown giữa 2 tin nhắn được cộng XP (ms) — chống spam farm XP
const XP_COOLDOWN_MS = 5_000; // 5 giây

// XP mỗi tin nhắn hợp lệ
const XP_PER_MESSAGE = 10;

// ============================================================
//  CÔNG THỨC XP — cân bằng cho 100 level
//
//  XP cần để lên từ level N lên N+1:
//    xpToNext(N) = 100 + N * 50
//
//  Bảng tham khảo (với 10 XP/tin nhắn):
//  Lv 1→2  : 150 XP  (~15 tin nhắn)
//  Lv 5→6  : 350 XP  (~35 tin nhắn)
//  Lv 10→11: 600 XP  (~60 tin nhắn)    ← Role Lv10
//  Lv 20→21: 1100 XP (~110 tin nhắn)   ← Role Lv20
//  Lv 30→31: 1600 XP (~160 tin nhắn)   ← Role Lv30
//  Lv 50→51: 2600 XP (~260 tin nhắn)   ← Role Lv50
//  Lv 99→100: 5050 XP (~505 tin nhắn)  ← Role Lv100
//
//  Tổng XP để đạt Lv100: ~257,500 XP
//  → Chat 100 tin/ngày: ~8-9 tháng
//  → Chat 30 tin/ngày : ~2.5 năm (casual)
// ============================================================
function xpToNextLevel(currentLevel) {
  return 100 + currentLevel * 50;
}

// Tính tổng XP cần để đạt đúng level N (để /rank progress bar)
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpToNextLevel(i);
  return total;
}

// Tính level từ tổng XP đang có
function getLevelFromXp(totalXp) {
  let level = 0;
  let xp = totalXp;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    if (level >= 100) return 100; // cap lv100
  }
  return level;
}

// XP còn dư trong level hiện tại (để hiện progress)
function getCurrentLevelXp(totalXp) {
  let level = 0;
  let xp = totalXp;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    if (level >= 100) return 0;
  }
  return xp;
}

// Progress bar ASCII đẹp
function makeProgressBar(current, max, length = 15) {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

// ============================================================
//  FILE DATA
// ============================================================
const xpPath = path.join(__dirname, 'xp.json');

function readXp() {
  try {
    if (!fs.existsSync(xpPath)) return {};
    const data = fs.readFileSync(xpPath, 'utf8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Lỗi đọc xp.json:', err);
    return {};
  }
}

function saveXp(data) {
  try {
    fs.writeFileSync(xpPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Lỗi ghi xp.json:', err);
  }
}

// ============================================================
//  MODULE EXPORT
// ============================================================
module.exports = (client) => {
  // Cooldown tracker (in-memory)
  const cooldowns = new Map(); // userId → lastXpTimestamp

  // ── XP mỗi tin nhắn ──
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content || message.content.trim().length === 0) return;

    const userId = message.author.id;
    const now = Date.now();

    // Kiểm tra cooldown
    const lastTime = cooldowns.get(userId) || 0;
    if (now - lastTime < XP_COOLDOWN_MS) return;
    cooldowns.set(userId, now);

    // Đọc dữ liệu
    const xpData = readXp();
    if (!xpData[userId]) xpData[userId] = { xp: 0 };

    const oldLevel = getLevelFromXp(xpData[userId].xp);
    xpData[userId].xp += XP_PER_MESSAGE;
    const newLevel = getLevelFromXp(xpData[userId].xp);

    saveXp(xpData);

    // Nếu lên level
    if (newLevel > oldLevel) {
      // Gửi thông báo vào kênh level-up
      const channel = client.channels.cache.get(LEVEL_UP_CHANNEL_ID);
      if (channel) {
        const embedLvUp = new EmbedBuilder()
          .setTitle('🎉 LÊN CẤP!')
          .setColor(0xf5c518)
          .setDescription(
            `Chúc mừng <@${userId}>! 🎊\n` +
            `✨ Đã đạt **Level ${newLevel}**!`
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `Tiếp tục chat để lên cấp cao hơn nữa nhé!` })
          .setTimestamp();
        channel.send({ embeds: [embedLvUp] }).catch(() => {});
      }

      // Kiểm tra milestone role (mỗi 10 level)
      const milestone = Math.floor(newLevel / 10) * 10;
      if (newLevel % 10 === 0 && LEVEL_ROLES[milestone]) {
        const roleId = LEVEL_ROLES[milestone];
        // Kiểm tra placeholder
        if (!roleId.startsWith('ROLE_ID')) {
          try {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (member) {
              // Xoá role milestone cũ (nếu có), cấp role mới
              const oldMilestone = milestone - 10;
              if (oldMilestone > 0 && LEVEL_ROLES[oldMilestone] && !LEVEL_ROLES[oldMilestone].startsWith('ROLE_ID')) {
                await member.roles.remove(LEVEL_ROLES[oldMilestone]).catch(() => {});
              }
              await member.roles.add(roleId).catch(() => {});

              // Thông báo role mới trong kênh level-up
              if (channel) {
                const embedRole = new EmbedBuilder()
                  .setTitle('🏅 NHẬN ROLE MỚI!')
                  .setColor(0x00d4ff)
                  .setDescription(
                    `<@${userId}> đã đạt **Level ${newLevel}** và nhận được role <@&${roleId}>! 🌟`
                  )
                  .setTimestamp();
                channel.send({ embeds: [embedRole] }).catch(() => {});
              }
            }
          } catch (err) {
            console.error('Lỗi cấp role level:', err.message);
          }
        }
      }
    }
  });

  // ── INTERACTION HANDLER ──
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ============================================================
    // LỆNH: /rank
    // ============================================================
    if (interaction.commandName === 'rank') {
      const targetUser = interaction.options.getUser('nguoi') || interaction.user;
      const xpData = readXp();
      const userData = xpData[targetUser.id] || { xp: 0 };

      const totalXp = userData.xp;
      const level = getLevelFromXp(totalXp);
      const currentXp = getCurrentLevelXp(totalXp);
      const neededXp = level < 100 ? xpToNextLevel(level) : 0;
      const progressBar = level < 100
        ? makeProgressBar(currentXp, neededXp)
        : '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰ MAX';

      // Tính rank (vị trí trong leaderboard)
      const allUsers = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      const rankPos = allUsers.findIndex(([id]) => id === targetUser.id) + 1;

      // Milestone role tiếp theo
      const nextMilestone = Math.ceil((level + 1) / 10) * 10;
      const xpToMilestone = totalXpForLevel(nextMilestone) - totalXp;

      const embedRank = new EmbedBuilder()
        .setTitle(` Thống kê Level — ${targetUser.username}`)
        .setColor(0xf5c518)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⭐ Level hiện tại', value: `**${level}** / 100`, inline: true },
          { name: '🏆 Xếp hạng', value: rankPos > 0 ? `**#${rankPos}**` : '_Chưa có XP_', inline: true },
          { name: '✨ Tổng XP', value: `**${totalXp.toLocaleString()}** XP`, inline: true },
          {
            name: level < 100
              ? `📈 Tiến độ Lv${level} → Lv${level + 1}`
              : ' Đã đạt cấp tối đa!',
            value: level < 100
              ? `${progressBar}\n**${currentXp.toLocaleString()}** / **${neededXp.toLocaleString()}** XP`
              : '`▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰ MAX`',
            inline: false,
          },
          level < 100 && nextMilestone <= 100
            ? {
                name: `🏅 Role milestone tiếp theo (Lv${nextMilestone})`,
                value: `Còn **${xpToMilestone.toLocaleString()}** XP (~${Math.ceil(xpToMilestone / XP_PER_MESSAGE).toLocaleString()} tin nhắn)`,
                inline: false,
              }
            : { name: '\u200B', value: '\u200B', inline: false }
        )
        .setFooter({ text: '+10 XP mỗi tin nhắn (cooldown 30 giây)' })
        .setTimestamp();

      return interaction.reply({ embeds: [embedRank] }).catch(() => {});
    }

    // ============================================================
    // LỆNH: /leaderboard
    // ============================================================
    if (interaction.commandName === 'leaderboard') {
      const xpData = readXp();
      const sorted = Object.entries(xpData)
        .filter(([, d]) => d.xp > 0)
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🏆 BẢNG XẾP HẠNG XP')
              .setDescription('Chưa có ai chat để tích XP cả!')
              .setColor(0xf5c518)
          ]
        }).catch(() => {});
      }

      const medals = ['🥇', '🥈', '🥉'];
      const lines = sorted.map(([userId, data], i) => {
        const level = getLevelFromXp(data.xp);
        const icon = medals[i] || `**${i + 1}.**`;
        return `${icon} <@${userId}> — Lv **${level}** | **${data.xp.toLocaleString()}** XP`;
      }).join('\n');

      // Tìm vị trí của người dùng lệnh
      const allSorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      const myPos = allSorted.findIndex(([id]) => id === interaction.user.id) + 1;
      const myData = xpData[interaction.user.id] || { xp: 0 };
      const myLevel = getLevelFromXp(myData.xp);

      const embedLB = new EmbedBuilder()
        .setTitle('🏆 BẢNG XẾP HẠNG TOP 10 XP')
        .setDescription(lines)
        .setColor(0xf5c518)
        .setFooter({
          text: myPos > 0
            ? `Vị trí của bạn: #${myPos} | Lv ${myLevel} | ${myData.xp.toLocaleString()} XP`
            : 'Bạn chưa có XP'
        })
        .setTimestamp();

      return interaction.reply({ embeds: [embedLB] }).catch(() => {});
    }

    // ============================================================
    // LỆNH: /setxp (Admin)
    // ============================================================
    if (interaction.commandName === 'setxp') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return interaction.reply({ content: 'Lệnh này chỉ dành cho Admin!', ephemeral: true }).catch(() => {});
      }

      const targetUser = interaction.options.getUser('nguoi');
      const amount = interaction.options.getInteger('xp');

      const xpData = readXp();
      if (!xpData[targetUser.id]) xpData[targetUser.id] = { xp: 0 };
      xpData[targetUser.id].xp = Math.max(0, amount);
      saveXp(xpData);

      const newLevel = getLevelFromXp(xpData[targetUser.id].xp);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Đã cập nhật XP')
            .setDescription(`<@${targetUser.id}> hiện có **${amount.toLocaleString()} XP** (Level **${newLevel}**)`)
            .setColor(0x00ff00)
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  });
};

