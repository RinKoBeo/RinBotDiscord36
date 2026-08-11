const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ===== /LOCK (KHOA CHINH KENH NAY) =====
    if (interaction.commandName === "lock") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "🛑 Tuổi lờ đòi khóa kênh! Quyền này chỉ dành cho Ban Quản Trị thôi khứa.", ephemeral: true }).catch(() => {});
      }

      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false
        });

        const embedLock = new EmbedBuilder()
          .setTitle("🔒 KÊNH ĐÃ BỊ KHÓA XÍCH 🔒")
          .setDescription(`🛑 Kênh chat <#${interaction.channel.id}> đã bị Admin thiết quân luật!\n` +
            `🤫 Toàn bộ thành viên miễn chat chít tại đây cho đến khi có lệnh mới.`)
          .setColor(0xff0000)
          .setTimestamp();

        return interaction.reply({ embeds: [embedLock] }).catch(() => {});
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "❌ Không thể khóa kênh này, check lại quyền của bot xem khứa!", ephemeral: true }).catch(() => {});
      }
    }

    // ===== /UNLOCK (MO LAI CHINH KENH NAY) =====
    if (interaction.commandName === "unlock") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "🛑 Tuổi lờ đòi mở khóa kênh! Quyền này chỉ dành cho Ban Quản Trị thôi khứa.", ephemeral: true }).catch(() => {});
      }

      try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: true
        });

        const embedUnlock = new EmbedBuilder()
          .setTitle("🔓 KÊNH ĐÃ MỞ KHÓA 🔓")
          .setDescription(`🎉 Kênh chat <#${interaction.channel.id}> đã được đại xá thành công!\n` +
            `🔥 Anh em vào quẩy tiếp, chat chít bình thường trở lại đi nào!`)
          .setColor(0x00ff00)
          .setTimestamp();

        return interaction.reply({ embeds: [embedUnlock] }).catch(() => {});
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "❌ Không thể mở khóa kênh này khứa ơi!", ephemeral: true }).catch(() => {});
      }
    }
  });
};