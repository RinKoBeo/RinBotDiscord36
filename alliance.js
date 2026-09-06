// alliance.js - QUẢN LÝ ALLIANCE
// Discord.js v14
//
// Chức năng:
// - Chỉ Admin được sử dụng /alliance
// - /alliance add: thêm alliance
// - Ảnh bắt buộc
// - Nội dung thông báo bắt buộc
// - Gửi thông báo vào ALLIANCE_CHANNEL_ID
// - Thông tin hiển thị theo hàng dọc
// - /alliance remove: gỡ alliance
// - /alliance list: xem danh sách alliance

const { EmbedBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG
// ============================================================

const DATA_FILE = path.join(__dirname, 'alliance_data.json');

// ⚠️ ĐỔI THÀNH ID KÊNH ALLIANCE CỦA M
const ALLIANCE_CHANNEL_ID = 'DAN_ID_KENH_ALLIANCE';

// ============================================================
// ĐỌC DATA
// ============================================================

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(DATA_FILE, 'utf8')
    );
  } catch (err) {
    console.error(
      ' Không thể đọc alliance_data.json:',
      err
    );

    return {};
  }
}

// ============================================================
// LƯU DATA
// ============================================================

function saveData(data) {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;
  } catch (err) {
    console.error(
      ' Không thể lưu alliance_data.json:',
      err
    );

    return false;
  }
}

// ============================================================
// TẠO EMBED THÔNG BÁO ALLIANCE
// ============================================================

function taoAllianceEmbed(entry) {
  return new EmbedBuilder()
    .setTitle(' ALLIANCE')
    .setColor(0xFFFFFF)
    .addFields(
      {
        name: ' Clan',
        value: String(
          entry.tenClan || 'Không có'
        ),
        inline: false
      },
      {
        name: ' Leader',
        value: entry.leader
          ? `<@${entry.leader}>`
          : 'Không có',
        inline: false
      },
      {
        name: ' Người liên hệ',
        value: entry.nguoiLienHe
          ? `<@${entry.nguoiLienHe}>`
          : 'Không có',
        inline: false
      },
      {
        name: ' Nội dung',
        value: String(
          entry.noiDung || 'Không có'
        ),
        inline: false
      },
      {
        name: ' Người thêm',
        value: entry.nguoiThem
          ? `<@${entry.nguoiThem}>`
          : 'Không xác định',
        inline: false
      }
    )
    .setTimestamp(
      entry.thoiGian
        ? new Date(entry.thoiGian)
        : new Date()
    );
}

// ============================================================
// MODULE
// ============================================================

module.exports = function(client, adminIds) {

  // LUU Y: Lenh /alliance da duoc dang ky tap trung trong index.js (guild
  // command cho moi server bot dang o, giong blacklist.js). File nay
  // KHONG tu dang ky lenh rieng nua - truoc day co doan tu goi
  // rest.put(Routes.applicationCommands(...)) o day, dang ky GLOBAL voi
  // option KHAC voi ban trong index.js (thieu noidung/anh), gay ra 2 phien
  // ban /alliance khac nhau tren Discord, chon nham ban thieu option se
  // luon bao loi "bat buoc phai tai anh" du co dinh tai hay khong.

  // ==========================================================
  // INTERACTION
  // ==========================================================

  client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName !== 'alliance') {
      return;
    }

    // ========================================================
    // CHECK ADMIN
    // ========================================================

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: ' Bạn không có quyền sử dụng lệnh này!',
        ephemeral: true
      }).catch(() => {});
    }

    const subCmd =
      interaction.options.getSubcommand();

    // ========================================================
    // ADD
    // ========================================================

    if (subCmd === 'add') {

      const tenClan =
        interaction.options.getString('tenclan');

      const nguoiLienHe =
        interaction.options.getUser('nguoilienhe');

      const leader =
        interaction.options.getUser('leader');

      const noiDung =
        interaction.options.getString('noidung');

      const anh =
        interaction.options.getAttachment('anh');

      // ------------------------------------------------------
      // KIỂM TRA ẢNH
      // ------------------------------------------------------

      if (!anh) {
        return interaction.reply({
          content:
            ' Bạn **bắt buộc phải tải ảnh lên** trước khi gửi lệnh!',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // CHỈ NHẬN ẢNH
      // ------------------------------------------------------

      if (
        !anh.contentType ||
        !anh.contentType.startsWith('image/')
      ) {
        return interaction.reply({
          content:
            ' File Alliance phải là **ảnh** (PNG, JPG, JPEG, GIF hoặc WEBP)!',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // KIỂM TRA KÊNH
      // ------------------------------------------------------

      if (
        !ALLIANCE_CHANNEL_ID ||
        ALLIANCE_CHANNEL_ID === 'DAN_ID_KENH_ALLIANCE'
      ) {
        return interaction.reply({
          content:
            ' Chưa cấu hình `ALLIANCE_CHANNEL_ID` trong alliance.js!',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // ĐỌC DATA
      // ------------------------------------------------------

      const data = readData();

      const khoa =
        tenClan.trim().toLowerCase();

      // ------------------------------------------------------
      // KIỂM TRA TRÙNG
      // ------------------------------------------------------

      if (data[khoa]) {
        return interaction.reply({
          content:
            ` Clan **${tenClan}** đã tồn tại trong danh sách Alliance!`,
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // LƯU DATA
      // ------------------------------------------------------

      data[khoa] = {
        tenClan: tenClan.trim(),
        nguoiLienHe: nguoiLienHe.id,
        leader: leader.id,
        noiDung: noiDung.trim(),
        anh: anh.url,
        nguoiThem: interaction.user.id,
        thoiGian: Date.now()
      };

      if (!saveData(data)) {
        return interaction.reply({
          content:
            ' Không thể lưu dữ liệu Alliance.',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // TẠO EMBED
      // ------------------------------------------------------

      const embed =
        taoAllianceEmbed(data[khoa]);

      // Gắn ảnh vào embed
      embed.setImage(anh.url);

      // ------------------------------------------------------
      // LẤY KÊNH ALLIANCE
      // ------------------------------------------------------

      const channel =
        interaction.guild.channels.cache.get(
          ALLIANCE_CHANNEL_ID
        );

      if (!channel) {
        return interaction.reply({
          content:
            ' Không tìm thấy kênh Alliance. Kiểm tra lại ID kênh!',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // GỬI THÔNG BÁO
      // ------------------------------------------------------

      try {

        await channel.send({
          embeds: [embed]
        });

      } catch (err) {

        console.error(
          ' Không thể gửi thông báo Alliance:',
          err
        );

        return interaction.reply({
          content:
            ' Đã lưu Alliance nhưng bot không thể gửi thông báo vào kênh Alliance. Kiểm tra quyền của bot.',
          ephemeral: true
        }).catch(() => {});
      }

      // ------------------------------------------------------
      // BÁO CHO ADMIN
      // ------------------------------------------------------

      return interaction.reply({
        content:
          ` Đã thêm Alliance **${tenClan}** và gửi thông báo vào kênh Alliance.`,
        ephemeral: true
      }).catch(() => {});
    }

    // ========================================================
    // REMOVE
    // ========================================================

    if (subCmd === 'remove') {

      const tenClan =
        interaction.options.getString('tenclan');

      const data =
        readData();

      const khoa =
        tenClan.trim().toLowerCase();

      if (!data[khoa]) {
        return interaction.reply({
          content:
            ` Không tìm thấy clan **${tenClan}** trong danh sách Alliance.`,
          ephemeral: true
        }).catch(() => {});
      }

      delete data[khoa];

      if (!saveData(data)) {
        return interaction.reply({
          content:
            ' Không thể lưu dữ liệu sau khi xóa.',
          ephemeral: true
        }).catch(() => {});
      }

      return interaction.reply({
        content:
          ` Đã gỡ **${tenClan}** khỏi danh sách Alliance.`,
        ephemeral: true
      }).catch(() => {});
    }

    // ========================================================
    // LIST
    // ========================================================

    if (subCmd === 'list') {

      const data =
        readData();

      const keys =
        Object.keys(data);

      if (keys.length === 0) {
        return interaction.reply({
          content:
            ' Danh sách Alliance đang trống.'
        }).catch(() => {});
      }

      const embed =
        new EmbedBuilder()
          .setTitle(' DANH SÁCH ALLIANCE')
          .setColor(0xFFFFFF)
          .setTimestamp();

      // ------------------------------------------------------
      // MỖI ALLIANCE XỔ DỌC
      // ------------------------------------------------------

      for (const key of keys) {

        const e =
          data[key];

        embed.addFields(

          {
            name: '━━━━━━━━━━━━━━━━━━━━',
            value: '\u200B',
            inline: false
          },

          {
            name: ' Clan',
            value: String(
              e.tenClan || 'Không có'
            ),
            inline: false
          },

          {
            name: ' Leader',
            value: e.leader
              ? `<@${e.leader}>`
              : 'Không có',
            inline: false
          },

          {
            name: ' Người liên hệ',
            value: e.nguoiLienHe
              ? `<@${e.nguoiLienHe}>`
              : 'Không có',
            inline: false
          },

          {
            name: ' Nội dung',
            value: String(
              e.noiDung ||
              e.ghiChu ||
              'Không có'
            ),
            inline: false
          }

        );
      }

      return interaction.reply({
        embeds: [embed]
      }).catch(() => {});
    }

  });
};