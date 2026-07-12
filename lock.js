const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ===== 🔒 LỆNH LOCK (KHÓA CHÍNH KÊNH NÀY) =====
    if (cmd === "lock") {
      // Check quyền quản lý kênh hoặc Admin
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("🛑 Tuổi lờ đòi khóa kênh! Quyền này chỉ dành cho Ban Quản Trị thôi khứa.");
      }

      try {
        // Ép quyền vai trò @everyone đéo được gửi tin nhắn trong kênh này nữa
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false // Khóa mõm tại đây!
        });

        const embedLock = new EmbedBuilder()
          .setTitle("🔒 KÊNH ĐÃ BỊ KHÓA XÍCH 🔒")
          .setDescription(`🛑 Kênh chat <#${message.channel.id}> đã bị Admin thiết quân luật!\n` +
            `🤫 Toàn bộ thành viên miễn chat chít tại đây cho đến khi có lệnh mới.`)
          .setColor(0xff0000) // Màu đỏ báo động
          .setTimestamp();

        return message.reply({ embeds: [embedLock] });
      } catch (err) {
        console.error(err);
        return message.reply("❌ Không thể khóa kênh này, check lại quyền của bot xem khứa!");
      }
    }

    // ===== 🔓 LỆNH UNLOCK (MỞ LẠI CHÍNH KÊNH NÀY) =====
    if (cmd === "unlock") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("🛑 Tuổi lờ đòi mở khóa kênh! Quyền này chỉ dành cho Ban Quản Trị thôi khứa.");
      }

      try {
        // Trả lại quyền gõ chữ bình thường cho @everyone
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: true // Mở khóa mõm!
        });

        const embedUnlock = new EmbedBuilder()
          .setTitle("🔓 KÊNH ĐÃ MỞ KHÓA 🔓")
          .setDescription(`🎉 Kênh chat <#${message.channel.id}> đã được đại xá thành công!\n` +
            `🔥 Anh em vào quẩy tiếp, chat chít bình thường trở lại đi nào!`)
          .setColor(0x00ff00) // Màu xanh ngọc lục bảo
          .setTimestamp();

        return message.reply({ embeds: [embedUnlock] });
      } catch (err) {
        console.error(err);
        return message.reply("❌ Không thể mở khóa kênh này khứa ơi!");
      }
    }
  });
};