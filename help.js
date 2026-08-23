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
            '/kick nguoi — Kick một thành viên\n' +
            '/ban nguoi — Ban một thành viên\n' +
            '/unban id — Gỡ ban theo ID\n' +
            '/mute nguoi thoigian — Timeout một thành viên (vd: 10s, 5m, 2h)\n' +
            '/unmute nguoi — Gỡ timeout một thành viên\n' +
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
          value: 'Bấm nút "Tạo Ticket" trong kênh ticket để mở một cuộc trò chuyện riêng với đội ngũ hỗ trợ.',
          inline: false
        },
        {
          name: 'Roblox',
          value: '/info username — Xem thông tin tài khoản Roblox',
          inline: false
        },
        {
          name: 'Xác Nhận Thành Viên',
          value: 'Bấm nút "Nhận Role" trong kênh xác nhận để tự động nhận role thành viên.',
          inline: false
        },
        {
          name: 'Blacklist',
          value:
            '/blacklist add nguoi/ten lydo anh — Chỉ Admin: thêm vào blacklist\n' +
            '/blacklist remove nguoi/ten — Chỉ Admin: gỡ khỏi blacklist\n' +
            '/blacklist check nguoi/ten — Chỉ Admin: tra cứu blacklist\n' +
            '/blacklist list — Chỉ Admin: xem toàn bộ danh sách',
          inline: false
        },
        {
          name: 'Alliance',
          value:
            '/alliance add tenclan nguoilienhe ghichu — Chỉ Admin: thêm alliance mới\n' +
            '/alliance remove tenclan — Chỉ Admin: gỡ một alliance\n' +
            '/alliance list — Chỉ Admin: xem toàn bộ danh sách',
          inline: false
        },
        {
          name: 'Khác',
          value:
            '/ai cauhoi — Hỏi AI của Rin\n' +
            '/gocua hoặc /ping — Kiểm tra bot còn online không',
          inline: false
        }
      )
      .setFooter({ text: 'Dùng dấu / trước tên lệnh để gọi ra trong Discord' });

    await interaction.reply({ embeds: [embed] }).catch(() => {});
  });
};