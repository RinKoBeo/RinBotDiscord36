const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================================
//  CẤU HÌNH HỆ THỐNG LV — SỬA PHẦN NÀY CHO ĐÚNG SERVER
// ============================================================

// Kênh thông báo khi lên level
const LEVEL_UP_CHANNEL_ID = process.env.LEVEL_UP_CHANNEL_ID || '1545471984178044988';

// Role tự động theo tier 10 level (Lv1-10 → ROLE_LV10, Lv11-20 → ROLE_LV20, ...)
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
//  CÔNG THỨC XP
//  xpToNext(N) = 100 + N * 50
//  Lv 1→2  : 150 XP  | Lv 10→11: 600 XP
//  Lv 30→31: 1600 XP | Lv 50→51: 2600 XP | Lv 99→100: 5050 XP
//  Tổng lên Lv100: ~257,500 XP
//  → Chat 100 tin/ngày ≈ 8-9 tháng | 30 tin/ngày ≈ 2.5 năm
// ============================================================
function xpToNextLevel(currentLevel) {
  return 100 + currentLevel * 50;
}

function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpToNextLevel(i);
  return total;
}

function getLevelFromXp(totalXp) {
  let level = 0;
  let xp = totalXp;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    if (level >= 100) return 100;
  }
  return level;
}

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

function makeProgressBar(current, max, length = 15) {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

// Tính tier role của 1 level:
// Lv 0     → không có role
// Lv 1-10  → tier 10
// Lv 11-20 → tier 20 ... v.v.
function getRoleTier(level) {
  if (level <= 0) return null;
  return Math.min(Math.ceil(level / 10) * 10, 100);
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

// Kiểm tra role ID có phải placeholder không
function isValidRoleId(id) {
  return id && !id.startsWith('ROLE_ID');
}

// ============================================================
//  MODULE EXPORT
// ============================================================
module.exports = (client) => {
  const cooldowns = new Map(); // userId → lastXpTimestamp

  // ── XP mỗi tin nhắn ──
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content || message.content.trim().length === 0) return;

    const userId = message.author.id;
    const now = Date.now();

    // Cooldown
    const lastTime = cooldowns.get(userId) || 0;
    if (now - lastTime < XP_COOLDOWN_MS) return;
    cooldowns.set(userId, now);

    // Đọc & cập nhật XP
    const xpData = readXp();
    if (!xpData[userId]) xpData[userId] = { xp: 0 };

    const oldLevel = getLevelFromXp(xpData[userId].xp);
    xpData[userId].xp += XP_PER_MESSAGE;
    const newLevel = getLevelFromXp(xpData[userId].xp);

    saveXp(xpData);

    // Nếu lên level
    if (newLevel > oldLevel) {
      const channel = client.channels.cache.get(LEVEL_UP_CHANNEL_ID);

      // ── Thông báo lên level (ping người đó) ──
      if (channel) {
        const embedLvUp = new EmbedBuilder()
          .setTitle('🎉 LÊN CẤP!')
          .setColor(0xf5c518)
          .setDescription(
            `Chúc mừng <@${userId}>! 🎊\n` +
            `✨ Đã đạt **Level ${newLevel}** / 100!`
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Tiếp tục chat để lên cấp cao hơn nữa nhé!' })
          .setTimestamp();

        // Ping người lên level để họ biết
        channel.send({ content: `<@${userId}>`, embeds: [embedLvUp] }).catch(() => {});
      }

      // ── Cấp role theo tier ──
      const oldTier = getRoleTier(oldLevel);
      const newTier = getRoleTier(newLevel);

      // Tier thay đổi → đổi role
      if (newTier !== oldTier) {
        try {
          const member = await message.guild.members.fetch(userId).catch(() => null);
          if (member) {
            // Xoá role tier cũ
            if (oldTier && LEVEL_ROLES[oldTier] && isValidRoleId(LEVEL_ROLES[oldTier])) {
              await member.roles.remove(LEVEL_ROLES[oldTier]).catch(() => {});
            }
            // Cấp role tier mới
            const newRoleId = LEVEL_ROLES[newTier];
            if (isValidRoleId(newRoleId)) {
              await member.roles.add(newRoleId).catch(() => {});

              // Thông báo nhận role mới
              if (channel) {
                const embedRole = new EmbedBuilder()
                  .setTitle(' NHẬN ROLE MỚI!')
                  .setColor(0x00d4ff)
                  .setDescription(
                    `<@${userId}> đã đạt **Level ${newLevel}** và nhận được role <@&${newRoleId}>! 🌟\n` +
                    `_(Lv ${newTier - 9} – ${newTier})_`
                  )
                  .setTimestamp();
                channel.send({ content: `<@${userId}>`, embeds: [embedRole] }).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('Lỗi cấp role level:', err.message);
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

      const allUsers = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      const rankPos = allUsers.findIndex(([id]) => id === targetUser.id) + 1;

      const currentTier = getRoleTier(level);
      const nextTier = currentTier ? Math.min(currentTier + 10, 100) : 10;
      const xpToNextTier = totalXpForLevel(nextTier === 10 ? 1 : nextTier - 9) > totalXp
        ? totalXpForLevel(nextTier === 10 ? 1 : nextTier - 9) - totalXp
        : totalXpForLevel(nextTier) - totalXp;

      // Tính XP còn thiếu để đạt tier tiếp theo
      const tierStartLevel = currentTier ? currentTier + 1 : 1;
      const xpToNextRole = level < 100 && nextTier <= 100
        ? Math.max(0, totalXpForLevel(tierStartLevel) - totalXp)
        : 0;

      const embedRank = new EmbedBuilder()
        .setTitle(` Thống kê Level — ${targetUser.username}`)
        .setColor(0xf5c518)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⭐ Level', value: `**${level}** / 100`, inline: true },
          { name: '🏆 Xếp hạng', value: rankPos > 0 ? `**#${rankPos}**` : '_Chưa có XP_', inline: true },
          { name: '✨ Tổng XP', value: `**${totalXp.toLocaleString()}** XP`, inline: true },
          {
            name: level < 100
              ? ` Tiến độ Lv${level} → Lv${level + 1}`
              : ' Đã đạt cấp tối đa!',
            value: level < 100
              ? `${progressBar}\n**${currentXp.toLocaleString()}** / **${neededXp.toLocaleString()}** XP`
              : '`▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰ MAX`',
            inline: false,
          },
          level < 100 && nextTier <= 100 && xpToNextRole > 0
            ? {
                name: `🏅 Role tier tiếp theo (Lv${nextTier})`,
                value: `Còn **${xpToNextRole.toLocaleString()}** XP (~${Math.ceil(xpToNextRole / XP_PER_MESSAGE).toLocaleString()} tin nhắn)`,
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
              .setTitle(' BẢNG XẾP HẠNG XP')
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

      const allSorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
      const myPos = allSorted.findIndex(([id]) => id === interaction.user.id) + 1;
      const myData = xpData[interaction.user.id] || { xp: 0 };
      const myLevel = getLevelFromXp(myData.xp);

      const embedLB = new EmbedBuilder()
        .setTitle(' BẢNG XẾP HẠNG TOP 10 XP')
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
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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
            .setTitle(' Đã cập nhật XP')
            .setDescription(`<@${targetUser.id}> hiện có **${amount.toLocaleString()} XP** (Level **${newLevel}**)`)
            .setColor(0x00ff00)
            .setTimestamp()
        ]
      }).catch(() => {});
    }

    // ============================================================
    // LỆNH: /massrole — Thêm 2 role vào TẤT CẢ member trong server
    // ============================================================
    if (interaction.commandName === 'massrole') {
      // Chi chu so huu server (Owner) moi duoc dung lenh nay, khong tinh Admin thuong
      if (interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: ' Lệnh này chỉ dành riêng cho chủ sở hữu (Owner) của server!', ephemeral: true }).catch(() => {});
      }

      const role1 = interaction.options.getRole('role1');
      const role2 = interaction.options.getRole('role2');

      // Defer vì sẽ mất thời gian
      await interaction.deferReply().catch(() => {});

      let successCount = 0;
      let failCount = 0;

      try {
        // Fetch toàn bộ member
        const members = await interaction.guild.members.fetch().catch(() => null);
        if (!members) {
          return interaction.editReply({ content: '❌ Không thể lấy danh sách member!' }).catch(() => {});
        }

        const humanMembers = members.filter(m => !m.user.bot);
        const total = humanMembers.size;

        // Cập nhật tiến trình ban đầu
        await interaction.editReply({
          content: ` Đang thêm role cho **${total}** member... (0/${total})`
        }).catch(() => {});

        let processed = 0;
        for (const [, member] of humanMembers) {
          try {
            const rolesToAdd = [];
            if (role1 && !member.roles.cache.has(role1.id)) rolesToAdd.push(role1.id);
            if (role2 && !member.roles.cache.has(role2.id)) rolesToAdd.push(role2.id);
            if (rolesToAdd.length > 0) {
              await member.roles.add(rolesToAdd).catch(() => { failCount++; return; });
            }
            successCount++;
          } catch {
            failCount++;
          }
          processed++;

          // Cập nhật progress mỗi 20 member
          if (processed % 20 === 0) {
            await interaction.editReply({
              content: ` Đang xử lý... (${processed}/${total})`
            }).catch(() => {});
          }
        }

        const embedDone = new EmbedBuilder()
          .setTitle(' MASS ROLE HOÀN THÀNH')
          .setColor(0x00ff00)
          .setDescription(
            ` **Role 1:** ${role1 ? `<@&${role1.id}>` : '_Không có_'}\n` +
            ` **Role 2:** ${role2 ? `<@&${role2.id}>` : '_Không có_'}\n\n` +
            ` Thành công: **${successCount}** member\n` +
            ` Thất bại: **${failCount}** member`
          )
          .setTimestamp();

        return interaction.editReply({ content: '', embeds: [embedDone] }).catch(() => {});

      } catch (err) {
        console.error('Lỗi massrole:', err.message);
        return interaction.editReply({ content: `❌ Lỗi: ${err.message}` }).catch(() => {});
      }
    }
  });
};