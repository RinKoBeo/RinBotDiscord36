const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================================
// CẤU HÌNH — SỬA 2 DÒNG NÀY CHO ĐÚNG SERVER CỦA MÀY
// ============================================================
// ID kênh bot sẽ gửi nhắc nhở 30 ngày (để null để dùng LOG_CHANNEL_ID từ env)
const WARN_NOTIFY_CHANNEL_ID = process.env.WARN_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID || null;
// ID Role admin/mod sẽ bị ping khi bot nhắc xoá warn sau 30 ngày
const WARN_NOTIFY_ROLE_ID = process.env.WARN_NOTIFY_ROLE_ID || ['1525871335354405174','1533442002849628160','1525888140211130550'];
// ============================================================

// File riêng biệt cho hệ thống warn — KHÔNG dùng chung với violators.json của index.js
const warnsPath = path.join(__dirname, 'warns.json');

// ---- helpers ----

function generateWarnId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'WRN-';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function readWarns() {
  try {
    if (!fs.existsSync(warnsPath)) return {};
    const data = fs.readFileSync(warnsPath, 'utf8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Lỗi đọc file warns.json:', err);
    return {};
  }
}

function saveWarns(data) {
  try {
    fs.writeFileSync(warnsPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Lỗi ghi file warns.json:', err);
  }
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

// ---- module export ----

module.exports = (client) => {

  // ============================================================
  // TIMER 30 NGÀY — Chạy mỗi 1 giờ, kiểm tra warn quá hạn
  // ============================================================
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const notifiedWarns = new Set(); // tránh spam nhắc lại cùng 1 warn

  async function checkExpiredWarns() {
    const channel = WARN_NOTIFY_CHANNEL_ID
      ? client.channels.cache.get(WARN_NOTIFY_CHANNEL_ID)
      : null;
    if (!channel) return;

    const warns = readWarns();
    const now = Date.now();

    for (const [userId, userData] of Object.entries(warns)) {
      if (!userData.warns) continue;
      for (const warn of userData.warns) {
        if (notifiedWarns.has(warn.id)) continue;
        if (now - warn.timestamp >= THIRTY_DAYS_MS) {
          notifiedWarns.add(warn.id);
          const embed = new EmbedBuilder()
            .setTitle(' NHẮC NHỞ — WARN QUÁ 30 NGÀY')
            .setColor(0xff6600)
            .setDescription(
              ` **Người bị warn:** <@${userId}>\n` +
              ` **Mã warn:** \`${warn.id}\`\n` +
              ` **Lý do:** ${warn.reason}\n` +
              ` **Ngày warn:** ${formatDate(warn.timestamp)}\n\n` +
              ` Warn này đã qua **30 ngày**, ban quản trị cân nhắc xem có nên xoá không!\n` +
              `Dùng \`/unwarn maso:${warn.id}\` để xoá warn này.`
            )
            .setFooter({ text: 'Hệ thống nhắc nhở tự động của Rin' })
            .setTimestamp();

          const roleTag = WARN_NOTIFY_ROLE_ID && WARN_NOTIFY_ROLE_ID !== 'ROLE_ID_CUA_MAY_O_DAY'
            ? `<@&${WARN_NOTIFY_ROLE_ID}> `
            : '';
          channel.send({ content: roleTag, embeds: [embed] }).catch(() => {});
        }
      }
    }
  }

  // Chạy sau 30 giây khi bot online (để client sẵn sàng), sau đó mỗi 1 giờ
  client.once('ready', () => {
    setTimeout(() => {
      checkExpiredWarns();
      setInterval(checkExpiredWarns, 60 * 60 * 1000);
    }, 30_000);
  });

  // ============================================================
  // INTERACTION HANDLER
  // ============================================================
  client.on('interactionCreate', async (interaction) => {

    // ---- Xử lý nút bấm "Xem lý do" trong /warnlist ----
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('warnreasons_')) return;
      const targetUserId = interaction.customId.replace('warnreasons_', '');
      const warns = readWarns();
      const userData = warns[targetUserId];

      if (!userData || !userData.warns || userData.warns.length === 0) {
        return interaction.reply({ content: 'Người này không còn warn nào!', ephemeral: true }).catch(() => {});
      }

      const lines = userData.warns.map((w, i) =>
        `**${i + 1}.** 🔖 \`${w.id}\` —  ${w.reason}\n` +
        `   👮 Bởi: ${w.by ? `<@${w.by}>` : '_không rõ_'} |  ${formatDate(w.timestamp)}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(` Chi tiết warn của <@${targetUserId}>`)
        .setDescription(lines)
        .setColor(0xffaa00)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }

    if (!interaction.isChatInputCommand()) return;

    // ========================================================
    // LỆNH 1: /WARN
    // ========================================================
    if (interaction.commandName === 'warn') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return interaction.reply({ content: ' Tuổi lờ đòi thực thi công lý! Lệnh này chỉ dành cho Ban Quản Trị Clan thôi.', ephemeral: true }).catch(() => {});
      }

      const targetUser = interaction.options.getUser('nguoi');
      const lyDo = interaction.options.getString('lydo') || 'Không có lý do cụ thể';

      if (targetUser.id === interaction.user.id) return interaction.reply({ content: 'Ngáo à? Tự warn chính mình làm mẹ gì!', ephemeral: true }).catch(() => {});
      if (targetUser.bot) return interaction.reply({ content: 'Bot ngoan vcl warn nó làm gì?', ephemeral: true }).catch(() => {});

      let warns = readWarns();
      if (!warns[targetUser.id]) warns[targetUser.id] = { warns: [] };

      const warnId = generateWarnId();
      warns[targetUser.id].warns.push({
        id: warnId,
        reason: lyDo,
        by: interaction.user.id,
        timestamp: Date.now(),
      });

      saveWarns(warns);

      const soWarn = warns[targetUser.id].warns.length;

      const embedWarn = new EmbedBuilder()
        .setTitle(' PHÁT GẬY CẢNH CÁO THÀNH VIÊN ⚠️')
        .setDescription(
          ` **Thành viên bị phạt:** <@${targetUser.id}>\n` +
          ` **Người gõ đầu:** <@${interaction.user.id}>\n` +
          ` **Mã warn:** \`${warnId}\`\n` +
          ` **Lý do:** ${lyDo}\n` +
          ` **Tổng số gậy hiện tại:**  **${soWarn}** gậy!\n\n` +
          `_Dùng \`/unwarn maso:${warnId}\` để xoá đúng warn này._`
        )
        .setFooter({ text: 'Gậy đã được tích vào sổ Rin, Admin sẽ xử lý theo luật Clan!' })
        .setColor(0xffaa00)
        .setTimestamp();

      return interaction.reply({ embeds: [embedWarn] }).catch(() => {});
    }

    // ========================================================
    // LỆNH 2: /CHECKWARN
    // ========================================================
    if (interaction.commandName === 'checkwarn') {
      const targetUser = interaction.options.getUser('nguoi') || interaction.user;

      const warns = readWarns();
      const userData = warns[targetUser.id];
      const warnList = userData ? (userData.warns || []) : [];

      const embedCheck = new EmbedBuilder()
        .setTitle(' KIỂM TRA SỔ TỘI PHẠM CLAN ')
        .setColor(0x00ffff)
        .setTimestamp();

      if (warnList.length === 0) {
        embedCheck
          .setDescription(` **Thành viên:** <@${targetUser.id}>\n **Tình trạng:** Trong sạch vcl, chưa ăn gậy nào!`)
          .setColor(0x00ff00);
      } else {
        const lines = warnList.map((w, i) =>
          `**${i + 1}.** 🔖 \`${w.id}\`\n` +
          `    ${w.reason}\n` +
          `    ${w.by ? `<@${w.by}>` : '_không rõ_'} —  ${formatDate(w.timestamp)}`
        ).join('\n\n');

        embedCheck.setDescription(
          ` **Thành viên:** <@${targetUser.id}>\n` +
          ` **Số gậy đang gánh:**  **${warnList.length}** gậy!\n\n` +
          `${lines}`
        );
      }

      return interaction.reply({ embeds: [embedCheck] }).catch(() => {});
    }

    // ========================================================
    // LỆNH 3: /UNWARN (theo mã warn cụ thể)
    // ========================================================
    if (interaction.commandName === 'unwarn') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return interaction.reply({ content: ' Tuổi lờ đòi xóa tội! Quyền đại xá chỉ dành cho Admin thôi khứa.', ephemeral: true }).catch(() => {});
      }

      const targetUser = interaction.options.getUser('nguoi');
      const warnIdInput = interaction.options.getString('maso').toUpperCase().trim();

      let warns = readWarns();
      const userData = warns[targetUser.id];

      if (!userData || !userData.warns || userData.warns.length === 0) {
        return interaction.reply({ content: ` Khứa <@${targetUser.id}> này vốn dĩ trong sạch, có gậy nào đâu mà xóa!`, ephemeral: true }).catch(() => {});
      }

      const idx = userData.warns.findIndex(w => w.id === warnIdInput);
      if (idx === -1) {
        return interaction.reply({
          content: ` Không tìm thấy warn có mã \`${warnIdInput}\` cho <@${targetUser.id}>!\nDùng \`/checkwarn\` để xem danh sách mã warn của người đó.`,
          ephemeral: true,
        }).catch(() => {});
      }

      const removed = userData.warns.splice(idx, 1)[0];
      notifiedWarns.delete(removed.id); // reset để tránh nhắc lại nếu được warn lại
      saveWarns(warns);

      const embedUnwarn = new EmbedBuilder()
        .setTitle(' XOÁ WARN THÀNH CÔNG ')
        .setDescription(
          ` **Mã warn đã xoá:** \`${removed.id}\`\n` +
          ` **Thành viên:** <@${targetUser.id}>\n` +
          ` **Lý do warn cũ:** ${removed.reason}\n` +
          ` **Người xoá:** <@${interaction.user.id}>\n` +
          ` **Số gậy còn lại:** ${userData.warns.length} gậy`
        )
        .setColor(0x00ff00)
        .setTimestamp();

      return interaction.reply({ embeds: [embedUnwarn] }).catch(() => {});
    }

    // ========================================================
    // LỆNH 4: /WARNLIST
    // ========================================================
    if (interaction.commandName === 'warnlist') {
      const warns = readWarns();

      const warnedUsers = Object.entries(warns).filter(
        ([, userData]) => userData.warns && userData.warns.length > 0
      );

      if (warnedUsers.length === 0) {
        const embedEmpty = new EmbedBuilder()
          .setTitle(' DANH SÁCH TỘI PHẠM CLAN ')
          .setDescription(' Server đang trong sạch! Không có ai bị warn cả.')
          .setColor(0x00ff00)
          .setTimestamp();
        return interaction.reply({ embeds: [embedEmpty] }).catch(() => {});
      }

      const lines = warnedUsers.map(([userId, userData]) =>
        ` <@${userId}> — **${userData.warns.length}** gậy`
      ).join('\n');

      const embedList = new EmbedBuilder()
        .setTitle(' DANH SÁCH TỘI PHẠM CLAN ⚠️')
        .setDescription(
          `Có **${warnedUsers.length}** thành viên đang bị warn:\n\n${lines}\n\n` +
          `_Bấm nút bên dưới để xem chi tiết lý do warn của từng người._`
        )
        .setColor(0xff6600)
        .setFooter({ text: 'Lý do warn được ẩn để tiết kiệm không gian — bấm nút để xem' })
        .setTimestamp();

      // Tạo nút "Xem lý do" cho từng user (tối đa 25 nút = 5 hàng x 5 nút)
      const rows = [];
      let currentRow = new ActionRowBuilder();
      let btnCount = 0;

      for (const [userId, userData] of warnedUsers) {
        if (btnCount > 0 && btnCount % 5 === 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
          if (rows.length >= 5) break;
        }

        let label;
        try {
          const member = interaction.guild?.members.cache.get(userId);
          label = member ? (member.displayName || member.user.username) : `User ${userId.slice(-4)}`;
        } catch {
          label = `User ${userId.slice(-4)}`;
        }
        if (label.length > 20) label = label.slice(0, 17) + '...';

        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`warnreasons_${userId}`)
            .setLabel(` ${label} (${userData.warns.length})`)
            .setStyle(ButtonStyle.Secondary)
        );
        btnCount++;
      }

      if (currentRow.components.length > 0) rows.push(currentRow);

      return interaction.reply({ embeds: [embedList], components: rows }).catch(() => {});
    }
  });
};