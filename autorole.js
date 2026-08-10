// autorole.js - Tự động cấp nhiều role cho member mới + thông báo ra kênh log
const { EmbedBuilder } = require('discord.js');

// Danh sach role se cap (them ID vao day)
const AUTO_ROLE_IDS = [
  '1526110631529414676',
  '1532698979991683092',
  '1532698962040193156',
  '1532696621865893959',
  '1532698973503098960',
  '1529149265241313411'
];

const LOG_CHANNEL_ID =  '1526991038680400044';
  // ID kenh log

module.exports = function(client) {
  client.on('guildMemberAdd', async (member) => {
    if (!AUTO_ROLE_IDS.length || !LOG_CHANNEL_ID) {
      console.error('Chua set AUTO_ROLE_IDS hoac LOG_CHANNEL_ID trong autorole.js');
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
        console.error(`Khong tim thay cac role: ${failedRoles.join(', ')}`);
      }

      if (rolesToAdd.length === 0) {
        console.error(`Khong co role hop le nao de cap cho ${member.user.tag}`);
        return;
      }

      // Cap tat ca role
      await member.roles.add(rolesToAdd);
      const roleNames = rolesToAdd.map(r => r.name).join(', ');
      console.log(`Da cap role (${roleNames}) cho ${member.user.tag}`);

      // Gui thong bao vao kenh log
      const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('DA CAP ROLE')
          .setDescription(
            `Nguoi dung: ${member.user} (${member.user.tag})\n` +
            `Role duoc cap: ${roleNames}\n` +
            `So luong: ${rolesToAdd.length} role`
          )
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({ text: `ID: ${member.id}` });

        await logChannel.send({ embeds: [embed] });
      } else {
        console.error(`Khong tim thay kenh log ID ${LOG_CHANNEL_ID}`);
      }

    } catch (error) {
      console.error(`Loi cap role cho ${member.user.tag}:`, error.message);
    }
  });
};