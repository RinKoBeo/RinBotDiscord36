// alliance.js - Quan ly danh sach alliance (chi Admin dung duoc)
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'alliance_data.json');
const ALLIANCE_CHANNEL_ID = ""; // Dien ID kenh alliance vao day

function readData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = function(client, adminIds) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'alliance') return;

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'Bạn không có quyền dùng lệnh này!', ephemeral: true }).catch(() => {});
    }

    const subCmd = interaction.options.getSubcommand();

    // ===== ADD =====
    if (subCmd === 'add') {
      const tenClan = interaction.options.getString('tenclan');
      const nguoiLienHe = interaction.options.getUser('nguoilienhe');
      const ghiChu = interaction.options.getString('ghichu') || 'Không có';

      const data = readData();
      const khoa = tenClan.toLowerCase();
      data[khoa] = {
        tenClan: tenClan,
        nguoiLienHe: nguoiLienHe.id,
        ghiChu: ghiChu,
        nguoiThem: interaction.user.id,
        thoiGian: Date.now()
      };
      saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('Đã Thêm Alliance Mới')
        .setColor(0xffffff)
        .addFields(
          { name: 'Clan', value: tenClan, inline: true },
          { name: 'Người liên hệ', value: `<@${nguoiLienHe.id}>`, inline: true },
          { name: 'Ghi chú', value: ghiChu, inline: false }
        );

      await interaction.reply({ embeds: [embed] }).catch(() => {});

      if (ALLIANCE_CHANNEL_ID) {
        const channel = interaction.guild.channels.cache.get(ALLIANCE_CHANNEL_ID);
        if (channel) channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    // ===== REMOVE =====
    if (subCmd === 'remove') {
      const tenClan = interaction.options.getString('tenclan');
      const data = readData();
      const khoa = tenClan.toLowerCase();
      if (!data[khoa]) {
        return interaction.reply({ content: 'Không tìm thấy clan này trong danh sách alliance.', ephemeral: true }).catch(() => {});
      }
      delete data[khoa];
      saveData(data);
      return interaction.reply({ content: `Đã gỡ ${tenClan} khỏi danh sách alliance.` }).catch(() => {});
    }

    // ===== LIST =====
    if (subCmd === 'list') {
      const data = readData();
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return interaction.reply({ content: 'Danh sách alliance đang trống.' }).catch(() => {});
      }
      const moTa = keys.map(k => {
        const e = data[k];
        return `${e.tenClan} — <@${e.nguoiLienHe}> — ${e.ghiChu}`;
      }).join('\n').slice(0, 4000);

      const embed = new EmbedBuilder()
        .setTitle('Danh Sách Alliance')
        .setColor(0xffffff)
        .setDescription(moTa);

      return interaction.reply({ embeds: [embed] }).catch(() => {});
    }
  });
};