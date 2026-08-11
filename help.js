// help.js - Lenh /help: hien danh sach chuc nang va cach su dung bot,
// gom nhom theo loai, mau trang, khong emoji, chu co dau
const { EmbedBuilder } = require('discord.js');

module.exports = function(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'help') return;

    const embed = new EmbedBuilder()
      .setTitle('Danh Sách Chức Năng')
      .setColor(0xffffff)
      .addFields(
        {
          name: 'Quản Lý',
          value:
            '/lock — Khóa kênh hiện tại, không cho gửi tin nhắn\n' +
            '/unlock — Mở khóa kênh hiện tại\n' +
            '/unlockall — Chỉ Admin: sắp xếp lại quyền toàn bộ server\n' +
            '/warn nguoi lydo — Cảnh cáo một thành viên\n' +
            '/checkwarn nguoi — Xem số lần cảnh cáo của một thành viên\n' +
            '/unwarn nguoi — Xóa hết cảnh cáo của một thành viên',
          inline: false
        },
        {
          name: 'Xếp Hạng',
          value:
            '/settop bang vitri nguoi quocgia rank roblox — Chỉ người có quyền: cập nhật một vị trí trong bảng xếp hạng\n' +
            '/top bang — Xem một bảng xếp hạng cụ thể\n' +
            '/rankset nguoi rank dieuchinh — Gán rank cho một người',
          inline: false
        },
        {
          name: 'Ticket',
          value: 'Bấm nút "Tạo ticket" trong kênh ticket để mở một cuộc trò chuyện riêng với đội ngũ hỗ trợ.',
          inline: false
        },
        {
          name: 'Roblox',
          value: '/verify username — Liên kết tài khoản Roblox với Discord của bạn',
          inline: false
        }
      )
      .setFooter({ text: 'Dùng dấu / trước tên lệnh để gọi ra trong Discord' });

    await interaction.reply({ embeds: [embed] }).catch(() => {});
  });
};