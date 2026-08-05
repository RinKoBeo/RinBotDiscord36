// rankset.js - Lenh /rankset: hien bang trang kieu "Rank Assigned" giong mau
const { EmbedBuilder } = require('discord.js');

module.exports = function(client, adminIds) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'rankset') return;

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: "Bạn không có quyền dùng lệnh này!", ephemeral: true }).catch(() => {});
    }

    const nguoiDuocGan = interaction.options.getUser('nguoi');
    const rank = interaction.options.getString('rank');
    const dieuChinh = interaction.options.getString('dieuchinh') || "Không có";
    const nguoiGan = interaction.user;

    const embed = new EmbedBuilder()
      .setTitle('Rank Assigned')
      .setColor(0xffffff)
      .addFields(
        { name: 'Discord', value: `<@${nguoiDuocGan.id}>`, inline: true },
        { name: 'Roblox', value: '`Chưa Liên Kết`', inline: true },
        { name: 'Rank', value: rank, inline: true },
        { name: 'Modifier', value: dieuChinh, inline: false },
        { name: 'Assigned by', value: `<@${nguoiGan.id}>`, inline: false }
      );

    await interaction.reply({ embeds: [embed] }).catch(() => {});
  });
};