const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================================
// CẤU HÌNH — SỬA CHO ĐÚNG SERVER CỦA MÀY
// ============================================================
// ID kênh bot sẽ gửi nhắc nhở 30 ngày (để null để dùng LOG_CHANNEL_ID từ env)
const WARN_NOTIFY_CHANNEL_ID = process.env.WARN_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID || null;

// ID Role admin/mod sẽ bị ping khi bot nhắc xoá warn sau 30 ngày.
// Set qua env WARN_NOTIFY_ROLE_ID dạng "id1,id2,id3" (nhiều role cach nhau
// bang dau phay) neu muon doi; khong set thi dung 3 role mac dinh ben duoi.
const WARN_NOTIFY_ROLE_IDS = process.env.WARN_NOTIFY_ROLE_ID
  ? process.env.WARN_NOTIFY_ROLE_ID.split(',').map(s => s.trim()).filter(Boolean)
  : ['1525871335354405174', '1533442002849628160', '1525888140211130550'];
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

// Ghep nhieu role ID thanh chuoi mention hop le: "<@&id1> <@&id2> ..."
// (Truoc day lam thang bien mang vao template string se ra "<@&id1,id2,id3>"
// khong phai cu phap mention that, Discord se KHONG ping duoc ai ca.)
function buildRoleTag(roleIds) {
  if (!roleIds || roleIds.length === 0) return '';
  return roleIds.map(id => `<@&${id}>`).join(' ') + ' ';
}

// Xay 1 trang cua /warnlist: embed liet ke toi da 25 nguoi, kem 1 menu xo
// xuong (chon 1 nguoi de xem ly do) va nut Trang truoc/Trang sau neu co
// nhieu hon 1 trang. Dung select menu thay vi nut-tren-tung-nguoi vi 1
// select menu gom duoc toi da 25 option nhung chi ton 1 hang, con du 4 hang
// cho nut phan trang - neu dung nut rieng cho tung nguoi thi 25 nguoi da
// chiem het ca 5 hang, khong con cho de dat nut chuyen trang nua.
function buildWarnlistPage(guild, warnedUsers, page) {
  const PAGE_SIZE = 25;
  const totalPages = Math.max(1, Math.ceil(warnedUsers.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageUsers = warnedUsers.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const lines = pageUsers
    .map(([userId, userData]) => ` <@${userId}> — **${userData.warns.length}** gậy`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(' DANH SÁCH TỘI PHẠM CLAN ⚠️')
    .setDescription(
      `Có **${warnedUsers.length}** thành viên đang bị warn:\n\n` +
      `${lines || '_Không có ai ở trang này._'}\n\n` +
      `_Chọn 1 người ở menu bên dưới để xem chi tiết lý do warn._`
    )
    .setColor(0xff6600)
    .setFooter({ text: `Trang ${safePage + 1}/${totalPages} · Chọn người ở menu để xem lý do` })
    .setTimestamp();

  const rows = [];

  if (pageUsers.length > 0) {
    const options = pageUsers.map(([userId, userData]) => {
      let label;
      const member = guild?.members.cache.get(userId);
      label = member ? (member.displayName || member.user.username) : `User ${userId.slice(-4)}`;
      if (label.length > 90) label = label.slice(0, 87) + '...';
      return {
        label,
        description: `${userData.warns.length} gậy`.slice(0, 100),
        value: userId,
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('warnlist_select')
        .setPlaceholder('Chọn 1 người để xem lý do warn...')
        .addOptions(options)
    );
    rows.push(selectRow);
  }

  if (totalPages > 1) {
    const navRow = new ActionRowBuilder();
    if (safePage > 0) {
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`warnlist_page_${safePage - 1}`)
          .setLabel('◀ Trang trước')
          .setStyle(ButtonStyle.Primary)
      );
    }
    if (safePage < totalPages - 1) {
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`warnlist_page_${safePage + 1}`)
          .setLabel('Trang sau ▶')
          .setStyle(ButtonStyle.Primary)
      );
    }
    rows.push(navRow);
  }

  return { embeds: [embed], components: rows };
}

function getWarnedUsers() {
  const warns = readWarns();
  return Object.entries(warns).filter(
    ([, userData]) => userData.warns && userData.warns.length > 0
  );
}

// ---- module export ----

module.exports = (client) => {

  // ============================================================
  // TIMER 30 NGÀY — Chạy mỗi 1 giờ, kiểm tra warn quá hạn
  // ============================================================
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  async function checkExpiredWarns() {
    const channel = WARN_NOTIFY_CHANNEL_ID
      ? client.channels.cache.get(WARN_NOTIFY_CHANNEL_ID)
      : null;
    if (!channel) return;

    const warns = readWarns();
    const now = Date.now();
    let changed = false;

    for (const [userId, userData] of Object.entries(warns)) {
      if (!userData.warns) continue;
      for (const warn of userData.warns) {
        // Danh dau "reminded" NGAY TREN CHINH warn do, luu vao warns.json,
        // thay vi mot Set trong RAM. Bien trong RAM se mat sach moi lan bot
        // restart/deploy lai (vd tren Render), khien nhung warn da qua 30
        // ngay bi nhac lai tu dau moi lan deploy du da nhac roi. Luu thang
        // vao file thi du restart bao nhieu lan cung khong bi nhac trung.
        if (warn.reminded) continue;
        if (now - warn.timestamp >= THIRTY_DAYS_MS) {
          warn.reminded = true;
          changed = true;

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

          const roleTag = buildRoleTag(WARN_NOTIFY_ROLE_IDS);
          channel.send({ content: roleTag, embeds: [embed] }).catch(() => {});
        }
      }
    }

    if (changed) saveWarns(warns);
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

    // ---- Chọn 1 người trong menu /warnlist để xem lý do ----
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== 'warnlist_select') return;

      const targetUserId = interaction.values[0];
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

    // ---- Nút chuyển trang /warnlist ----
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('warnlist_page_')) return;

      const page = parseInt(interaction.customId.replace('warnlist_page_', ''), 10);
      const warnedUsers = getWarnedUsers();
      const pageData = buildWarnlistPage(interaction.guild, warnedUsers, Number.isNaN(page) ? 0 : page);

      return interaction.update(pageData).catch(() => {});
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
        reminded: false,
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

      // Neu option "maso" chua ton tai (index.js chua dang ky, hoac cache
      // lenh cu tren Discord) thi getString tra ve null - phai chan o day
      // truoc khi goi .toUpperCase(), khong thi crash ngay lap tuc.
      const warnIdRaw = interaction.options.getString('maso');
      if (!warnIdRaw) {
        return interaction.reply({
          content: ' Bạn phải nhập mã số warn (option `maso`)! Dùng `/checkwarn` để xem mã số của người đó.',
          ephemeral: true,
        }).catch(() => {});
      }
      const warnIdInput = warnIdRaw.trim().toUpperCase();

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
    // LỆNH 4: /WARNLIST (phân trang, 25 người/trang)
    // ========================================================
    if (interaction.commandName === 'warnlist') {
      const warnedUsers = getWarnedUsers();

      if (warnedUsers.length === 0) {
        const embedEmpty = new EmbedBuilder()
          .setTitle(' DANH SÁCH TỘI PHẠM CLAN ')
          .setDescription(' Server đang trong sạch! Không có ai bị warn cả.')
          .setColor(0x00ff00)
          .setTimestamp();
        return interaction.reply({ embeds: [embedEmpty] }).catch(() => {});
      }

      const pageData = buildWarnlistPage(interaction.guild, warnedUsers, 0);
      return interaction.reply(pageData).catch(() => {});
    }
  });
};