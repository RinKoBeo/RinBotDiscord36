// autorole.js - Tự động cấp role cho member mới + thông báo ra kênh log
const { EmbedBuilder } = require('discord.js');

// 👇 Sửa ID role và kênh log vào đây
const AUTO_ROLE_ID = '1526110631529414676';     // ID role sẽ cấp
const LOG_CHANNEL_ID = '1526991038680400044'; // ID kênh sẽ nhận thông báo

module.exports = function(client) {
  client.on('guildMemberAdd', async (member) => {
    if (!AUTO_ROLE_ID || !LOG_CHANNEL_ID) {
      console.error('⚠️ Chưa set AUTO_ROLE_ID hoặc LOG_CHANNEL_ID trong autorole.js');
      return;
    }

    try {
      const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
      if (!role) {
        console.error(`❌ Không tìm thấy role ID ${AUTO_ROLE_ID}`);
        return;
      }

      // Cấp role
      await member.roles.add(role);
      console.log(`✅ Đã cấp role ${role.name} cho ${member.user.tag}`);

      // Gửi thông báo vào kênh log
      const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🎫 ĐÃ CẤP ROLE')
          .setDescription(
            `**Người dùng:** ${member.user} (${member.user.tag})\n` +
            `**Role được cấp:** ${role.name}`
          )
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({ text: `ID: ${member.id}` });

        await logChannel.send({ embeds: [embed] });
      } else {
        console.error(`❌ Không tìm thấy kênh log ID ${LOG_CHANNEL_ID}`);
      }

    } catch (error) {
      console.error(`❌ Lỗi cấp role cho ${member.user.tag}:`, error.message);
    }
  });
};