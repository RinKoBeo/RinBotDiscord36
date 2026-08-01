// grade.js - Lệnh /grade để xem thông tin grade của thành viên
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// ===== CẤU HÌNH THÔNG TIN GRADE (MÀY TỰ SỬA) =====
// Ở đây tao để ví dụ, mày sửa theo ý mày
const GRADE_INFO = {
  // Key là ID user (có thể thêm nhiều)
  '1517437552213098529': {
    grade: 'Owner',
    playstyle: 'Chơi game bằng não, toàn thắng',
    note: 'Đừng đùa với thằng này'
  },
  '895208486743457793': {
    grade: 'Admin',
    playstyle: 'Thích đấm nhau, hay chửi',
    note: 'Cẩn thận kẻo bị ban'
  },
  // Thêm các user khác nếu muốn
};

// ===== HÀM XỬ LÝ =====
async function handleGrade(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  // Lấy thông tin grade từ config hoặc mặc định
  const info = GRADE_INFO[targetUser.id] || {
    grade: 'Chưa xếp hạng',
    playstyle: 'Chưa có dữ liệu',
    note: 'Hãy chơi nhiều hơn để có đánh giá'
  };

  const embed = new EmbedBuilder()
    .setTitle(`📊 THÔNG TIN GRADE CỦA ${targetUser.username}`)
    .setDescription(
      `**👤 Người chơi:** ${targetUser}\n` +
      `**🏷️ Grade:** ${info.grade}\n` +
      `**🎮 Lối chơi:** ${info.playstyle}\n` +
      `**📌 Ghi chú:** ${info.note}`
    )
    .setColor(0xffffff) // Màu trắng
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: `ID: ${targetUser.id}` });

  await interaction.reply({ embeds: [embed] });
}

// ===== REGISTER SLASH COMMAND =====
const commandData = new SlashCommandBuilder()
  .setName('grade')
  .setDescription('Xem thông tin grade và lối chơi của thành viên')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Người cần xem thông tin (bỏ trống để xem của bạn)')
      .setRequired(false)
  );

// ===== EXPORT =====
module.exports = {
  data: commandData,
  execute: handleGrade
};