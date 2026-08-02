
// autorole.js - Tự động cấp nhiều role cho member mới + thông báo ra kênh log
const { EmbedBuilder } = require('discord.js');

// 👇 Danh sách role sẽ cấp (thêm ID vào đây)
const AUTO_ROLE_IDS = [
  '1526110631529414676',
  '1532698979991683092',
  '1532698962040193156',
  '1532696621865893959',
  '1532698973503098960',
  '1529149265241313411',
  '1533010878402789466'
];

const LOG_CHANNEL_ID = '1526991038680400044'; // ID kênh log

module.exports = function(client) {
  client.on('guildMemberAdd', async (member) => {
    if (!AUTO_ROLE_IDS.length || !LOG_CHANNEL_ID) {
      console.error('⚠️ Chưa set AUTO_ROLE_IDS hoặc LOG_CHANNEL_ID trong autorole.js');
      return;
    }

    try {
      const rolesToAdd = [];
      const failedRoles = [];

      for (const roleId of AUTO_ROLE_IDS) {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) {
          failedRoles.push(roleId);
          continue;
        }
        rolesToAdd.push(role);
      }

      if (failedRoles.length > 0) {
        console.error(`❌ Không tìm thấy các role: ${failedRoles.join(', ')}`);
      }

      if (rolesToAdd.length === 0) {
        console.error(`❌ Không có role hợp lệ nào để cấp cho ${member.user.tag}`);
        return;
      }

      // Cấp tất cả role
      await member.roles.add(rolesToAdd);
      const roleNames = rolesToAdd.map(r => r.name).join(', ');
      console.log(`✅ Đã cấp role (${roleNames}) cho ${member.user.tag}`);

      // Gửi thông báo vào kênh log
      const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🎫 ĐÃ CẤP ROLE')
          .setDescription(
            `**Người dùng:** ${member.user} (${member.user.tag})\n` +
            `**Role được cấp:** ${roleNames}\n` +
            `**Số lượng:** ${rolesToAdd.length} role`
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
// autorole.js - Tự động cấp nhiều role cho member mới + thông báo ra kênh log
const { EmbedBuilder } = require('discord.js');

// 👇 Danh sách role sẽ cấp (thêm ID vào đây)
const AUTO_ROLE_IDS = [
  '1532698979991683092',
  '1532698962040193156',
  '1532696621865893959',
  '1532698973503098960',
  '1529149265241313411',
  '1533010878402789466'
];

const LOG_CHANNEL_ID = '1526991038680400044'; // ID kênh log

module.exports = function(client) {
  client.on('guildMemberAdd', async (member) => {
    if (!AUTO_ROLE_IDS.length || !LOG_CHANNEL_ID) {
      console.error('⚠️ Chưa set AUTO_ROLE_IDS hoặc LOG_CHANNEL_ID trong autorole.js');
      return;
    }

    try {
      const rolesToAdd = [];
      const failedRoles = [];

      for (const roleId of AUTO_ROLE_IDS) {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) {
          failedRoles.push(roleId);
          continue;
        }
        rolesToAdd.push(role);
      }

      if (failedRoles.length > 0) {
        console.error(`❌ Không tìm thấy các role: ${failedRoles.join(', ')}`);
      }

      if (rolesToAdd.length === 0) {
        console.error(`❌ Không có role hợp lệ nào để cấp cho ${member.user.tag}`);
        return;
      }

      // Cấp tất cả role
      await member.roles.add(rolesToAdd);
      const roleNames = rolesToAdd.map(r => r.name).join(', ');
      console.log(`✅ Đã cấp role (${roleNames}) cho ${member.user.tag}`);

      // Gửi thông báo vào kênh log
      const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🎫 ĐÃ CẤP ROLE')
          .setDescription(
            `**Người dùng:** ${member.user} (${member.user.tag})\n` +
            `**Role được cấp:** ${roleNames}\n` +
            `**Số lượng:** ${rolesToAdd.length} role`
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
  })
  }
}