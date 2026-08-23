// verify.js - Bảng nhận Role qua nút bấm (không cần nhập, không đổi nickname)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ===== CẤU HÌNH (SỬA 2 DÒNG NÀY) =====
const VERIFY_PANEL_CHANNEL_ID = '1541018299284979782'; // 👈 Thay ID kênh chứa bảng verify
const VERIFIED_ROLE_ID = '1526109471401840691';      // 👈 Thay ID role sẽ được cấp

let panelMessageId = null;

module.exports = function(client) {
  async function guiBangVerify() {
    try {
      if (!VERIFY_PANEL_CHANNEL_ID) {
        console.error('❌ VERIFY_PANEL_CHANNEL_ID chưa được cấu hình trong verify.js');
        return;
      }
      if (!VERIFIED_ROLE_ID) {
        console.error('❌ VERIFIED_ROLE_ID chưa được cấu hình trong verify.js');
        return;
      }

      const channel = client.channels.cache.get(VERIFY_PANEL_CHANNEL_ID);
      if (!channel) {
        console.error(`❌ Không tìm thấy kênh ID ${VERIFY_PANEL_CHANNEL_ID}`);
        return;
      }

      // Kiểm tra nếu đã có panel thì không gửi lại
      if (panelMessageId) {
        try {
          const tinCu = await channel.messages.fetch(panelMessageId);
          if (tinCu) return;
        } catch {}
      }

      // Xóa tin nhắn cũ của bot có button
      const messages = await channel.messages.fetch({ limit: 20 });
      const tinCuCuaBot = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (tinCuCuaBot) {
        panelMessageId = tinCuCuaBot.id;
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(' Verify')
        .setDescription('Bấm nút bên dưới để nhận role Verify.')
        .setColor(0xffffff)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_get_role')
          .setLabel(' Nhận Role')
          .setStyle(ButtonStyle.Primary)
      );

      const sent = await channel.send({ embeds: [embed], components: [row] });
      panelMessageId = sent.id;
      console.log(' Đã gửi bảng verify vào kênh:', channel.name);
    } catch (err) {
      console.error(' Lỗi gửi bảng verify:', err.message);
    }
  }

  // Khi bot ready, gửi bảng
  client.once('ready', () => {
    setTimeout(guiBangVerify, 4000);
  });

  // Xử lý khi bấm nút
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verify_get_role') return;

    // Kiểm tra đã cấu hình role chưa
    if (!VERIFIED_ROLE_ID) {
      return interaction.reply({
        content: ' Chưa cấu hình role xác nhận, vui lòng liên hệ Admin.',
        ephemeral: true
      }).catch(() => {});
    }

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member) {
        return interaction.reply({
          content: '❌ Không tìm thấy thành viên, thử lại sau.',
          ephemeral: true
        }).catch(() => {});
      }

      // Kiểm tra đã có role chưa
      if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return interaction.reply({
          content: ' Bạn đã có role này rồi!',
          ephemeral: true
        }).catch(() => {});
      }

      // Cấp role
      await member.roles.add(VERIFIED_ROLE_ID);
      await interaction.reply({
        content: ` Đã cấp role <@&${VERIFIED_ROLE_ID}> thành công!`,
        ephemeral: true
      }).catch(() => {});

    } catch (err) {
      console.error(' Lỗi gán role verify:', err.message);
      await interaction.reply({
        content: ' Có lỗi xảy ra khi gán role, vui lòng thử lại.',
        ephemeral: true
      }).catch(() => {});
    }
  });
};