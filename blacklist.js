// blacklist.js - Quan ly danh sach blacklist (chi Admin dung duoc)
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'blacklist_data.json');
const BLACKLIST_CHANNEL_ID = ""; // Dien ID kenh black-list vao day

function readData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function layKhoa(nguoi, ten) {
  if (nguoi) return `user:${nguoi.id}`;
  if (ten) return `ten:${ten.toLowerCase()}`;
  return null;
}

module.exports = function(client, adminIds) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'blacklist') return;

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'Bạn không có quyền dùng lệnh này!', ephemeral: true }).catch(() => {});
    }

    const subCmd = interaction.options.getSubcommand();

    // ===== ADD =====
    if (subCmd === 'add') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const lydo = interaction.options.getString('lydo');
      const anh = interaction.options.getAttachment('anh');

      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.reply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.', ephemeral: true }).catch(() => {});
      }

      const data = readData();
      data[khoa] = {
        userId: nguoi ? nguoi.id : null,
        ten: ten || (nguoi ? nguoi.tag : ''),
        lydo: lydo,
        anh: anh ? anh.url : null,
        nguoiThem: interaction.user.id,
        thoiGian: Date.now()
      };
      saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('Đã Thêm Vào Blacklist')
        .setColor(0xffffff)
        .addFields(
          { name: 'Đối tượng', value: nguoi ? `<@${nguoi.id}>` : ten, inline: true },
          { name: 'Lý do', value: lydo, inline: true },
          { name: 'Người thêm', value: `<@${interaction.user.id}>`, inline: true }
        );
      if (anh) embed.setImage(anh.url);

      await interaction.reply({ embeds: [embed] }).catch(() => {});

      if (BLACKLIST_CHANNEL_ID) {
        const channel = interaction.guild.channels.cache.get(BLACKLIST_CHANNEL_ID);
        if (channel) channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // ===== REMOVE =====
    if (subCmd === 'remove') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.reply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.', ephemeral: true }).catch(() => {});
      }

      const data = readData();
      if (!data[khoa]) {
        return interaction.reply({ content: 'Không tìm thấy trong blacklist.', ephemeral: true }).catch(() => {});
      }
      delete data[khoa];
      saveData(data);
      return interaction.reply({ content: 'Đã gỡ khỏi blacklist.' }).catch(() => {});
    }

    // ===== CHECK =====
    if (subCmd === 'check') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.reply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.', ephemeral: true }).catch(() => {});
      }

      const data = readData();
      const entry = data[khoa];
      if (!entry) {
        return interaction.reply({ content: 'Không có trong blacklist.', ephemeral: true }).catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setTitle('Kết Quả Tra Cứu Blacklist')
        .setColor(0xffffff)
        .addFields(
          { name: 'Đối tượng', value: entry.userId ? `<@${entry.userId}>` : entry.ten, inline: true },
          { name: 'Lý do', value: entry.lydo, inline: true },
          { name: 'Người thêm', value: `<@${entry.nguoiThem}>`, inline: true }
        );
      if (entry.anh) embed.setImage(entry.anh);

      return interaction.reply({ embeds: [embed] }).catch(() => {});
    }

    // ===== LIST =====
    if (subCmd === 'list') {
      const data = readData();
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return interaction.reply({ content: 'Blacklist đang trống.' }).catch(() => {});
      }
      const moTa = keys.map(k => {
        const e = data[k];
        const doiTuong = e.userId ? `<@${e.userId}>` : e.ten;
        return `${doiTuong} — ${e.lydo}`;
      }).join('\n').slice(0, 4000);

      const embed = new EmbedBuilder()
        .setTitle('Danh Sách Blacklist')
        .setColor(0xffffff)
        .setDescription(moTa);

      return interaction.reply({ embeds: [embed] }).catch(() => {});
    }
  });
};