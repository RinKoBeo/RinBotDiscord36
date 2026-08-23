// verify.js - Bang nhan Role qua nut bam (khong can nhap gi, khong doi nickname)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const VERIFY_PANEL_CHANNEL_ID = ""; // Dien ID kenh se hien bang nhan role

let panelMessageId = null;

module.exports = function(client, verifiedRoleId) {
  async function guiBangVerify() {
    try {
      if (!VERIFY_PANEL_CHANNEL_ID) return;
      const channel = client.channels.cache.get(VERIFY_PANEL_CHANNEL_ID);
      if (!channel) return;

      if (panelMessageId) {
        try {
          const tinCu = await channel.messages.fetch(panelMessageId);
          if (tinCu) return;
        } catch {}
      }

      const messages = await channel.messages.fetch({ limit: 20 });
      const tinCuCuaBot = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (tinCuCuaBot) {
        panelMessageId = tinCuCuaBot.id;
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Xác Nhận Thành Viên')
        .setDescription('Bấm nút bên dưới để nhận role thành viên đã xác nhận.')
        .setColor(0xffffff);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_get_role')
          .setLabel('Nhận Role')
          .setStyle(ButtonStyle.Primary)
      );

      const sent = await channel.send({ embeds: [embed], components: [row] });
      panelMessageId = sent.id;
    } catch (err) {
      console.error('Lỗi gửi bảng verify:', err.message);
    }
  }

  client.once('ready', () => {
    setTimeout(guiBangVerify, 3000);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verify_get_role') return;

    if (!verifiedRoleId) {
      return interaction.reply({ content: 'Chưa cấu hình role xác nhận, liên hệ Admin.', ephemeral: true }).catch(() => {});
    }

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'Có lỗi xảy ra, thử lại sau.', ephemeral: true }).catch(() => {});

      if (member.roles.cache.has(verifiedRoleId)) {
        return interaction.reply({ content: 'Bạn đã có role này rồi!', ephemeral: true }).catch(() => {});
      }

      await member.roles.add(verifiedRoleId);
      await interaction.reply({ content: 'Đã nhận role thành công!', ephemeral: true }).catch(() => {});
    } catch (err) {
      console.error('Lỗi gán role verify:', err.message);
      await interaction.reply({ content: 'Có lỗi xảy ra khi gán role.', ephemeral: true }).catch(() => {});
    }
  });
};