// grade.js - Slash command để set grade cho người chơi (chỉ admin)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ===== DANH SÁCH GRADE VÀ MÔ TẢ (MÀY TỰ SỬA) =====
const GRADES = {
  'S': { name: 'SSS', description: 'Cao thủ huyền thoại' },
  'A': { name: 'A', description: 'Game thủ chuyên nghiệp' },
  'B': { name: 'B', description: 'Tay chơi khá' },
  'C': { name: 'C', description: 'Nghiệp dư' },
  'D': { name: 'D', description: 'Tập sự' }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grade')
    .setDescription('Set grade cho thành viên (chỉ Admin)')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Người cần set grade')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('grade')
        .setDescription('Grade muốn set')
        .setRequired(true)
        .addChoices(
          { name: 'SSS', value: 'S' },
          { name: 'A', value: 'A' },
          { name: 'B', value: 'B' },
          { name: 'C', value: 'C' },
          { name: 'D', value: 'D' }
        )
    )
    .addStringOption(option =>
      option.setName('lối_chơi')
        .setDescription('Mô tả lối chơi (tùy chọn)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // ===== KIỂM TRA QUYỀN ADMIN =====
    const ADMIN_IDS = ['1517437552213098529']; // 👈 Thêm ID admin vào đây
    if (!ADMIN_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Mày đéo có quyền dùng lệnh này!',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('target');
    const gradeKey = interaction.options.getString('grade');
    const lốiChơi = interaction.options.getString('lối_chơi') || 'Chưa có mô tả';

    const grade = GRADES[gradeKey];
    if (!grade) {
      return interaction.reply({
        content: '❌ Grade không hợp lệ!',
        ephemeral: true
      });
    }

    // ===== TẠO EMBED THÔNG BÁO =====
    const embed = new EmbedBuilder()
      .setTitle('🏅 SET GRADE THÀNH CÔNG')
      .setDescription(
        `**Người chơi:** ${target}\n` +
        `**Grade:** ${grade.name}\n` +
        `**Mô tả:** ${grade.description}\n` +
        `**Lối chơi:** ${lốiChơi}`
      )
      .setColor(0x00ffcc)
      .setTimestamp()
      .setFooter({ text: `Được set bởi ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  }
};