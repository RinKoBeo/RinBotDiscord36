// grade.js - Prefix command !grade với modal nhập thông tin
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../grade_data.json');

// ===== WHITELIST COPY TỪ INDEX.JS =====
const WHITELIST = ["1226360140387844167", "895208486743457793", "928258903941210186", "1487337137601773720"];

// ===== ĐỌC/GHI DATA =====
function readData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = function(client) {
  // ===== XỬ LÝ TIN NHẮN =====
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!grade')) return;

    const args = message.content.slice(6).trim().split(/ +/);
    const subCmd = args[0]?.toLowerCase();

    // ===== VIEW =====
    if (subCmd === 'view') {
      const targetUser = message.mentions.users.first() || message.author;
      const userId = targetUser.id;
      const data = readData();
      const info = data[userId] || { grade: 'Chưa có', style: 'Chưa có', role: 'Không có' };

      const embed = new EmbedBuilder()
        .setTitle(`📋 Thông tin của ${targetUser.username}`)
        .setDescription(
          `**Grade:** ${info.grade}\n` +
          `**Play Style:** ${info.style}\n` +
          `**Role:** ${info.role || 'Không có'}`
        )
        .setColor(0xffffff)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ===== SET =====
    if (subCmd === 'set') {
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return message.reply('❌ Tag thằng cần set grade: `!grade set @Tên`');
      }

      // Kiểm tra whitelist nếu set cho người khác
      if (targetUser.id !== message.author.id && !WHITELIST.includes(message.author.id)) {
        return message.reply('❌ Mày đéo có quyền set grade cho người khác!');
      }

      // Mở modal nhập thông tin
      const modal = new ModalBuilder()
        .setCustomId(`grade_modal_${targetUser.id}_${message.author.id}`)
        .setTitle(`Set grade cho ${targetUser.username}`);

      const gradeInput = new TextInputBuilder()
        .setCustomId('grade')
        .setLabel('Grade')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: Đồng, Bạc, Vàng, Bạch Kim...')
        .setRequired(true);

      const styleInput = new TextInputBuilder()
        .setCustomId('style')
        .setLabel('Play Style')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: Tank, Support, Carry, Roam...')
        .setRequired(true);

      const roleInput = new TextInputBuilder()
        .setCustomId('role')
        .setLabel('Role (không bắt buộc)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: ID role hoặc tên role')
        .setRequired(false);

      const row1 = new ActionRowBuilder().addComponents(gradeInput);
      const row2 = new ActionRowBuilder().addComponents(styleInput);
      const row3 = new ActionRowBuilder().addComponents(roleInput);
      modal.addComponents(row1, row2, row3);

      await message.showModal(modal);
      return;
    }

    // ===== HELP =====
    if (!subCmd || subCmd === 'help') {
      return message.reply(
        `📖 **HƯỚNG DẪN GRADE**\n` +
        `• \`!grade view @user\` - Xem grade của người đó (mặc định là bạn)\n` +
        `• \`!grade set @user\` - Set grade (hiện bảng nhập)\n` +
        `• Chỉ WHITELIST mới set được cho người khác`
      );
    }

    return message.reply('❌ Lệnh sai! Dùng `!grade help` để xem hướng dẫn.');
  });

  // ===== XỬ LÝ MODAL SUBMIT =====
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('grade_modal_')) return;

    const parts = interaction.customId.split('_');
    const targetId = parts[2];
    const authorId = parts[3];

    // Kiểm tra người gửi modal
    if (interaction.user.id !== authorId) {
      return interaction.reply({ content: '❌ Mày đéo phải người mở modal này!', ephemeral: true });
    }

    const grade = interaction.fields.getTextInputValue('grade');
    const style = interaction.fields.getTextInputValue('style');
    const roleInput = interaction.fields.getTextInputValue('role') || null;

    const data = readData();
    data[targetId] = { grade, style, role: roleInput };
    saveData(data);

    // Gán role nếu có
    let roleAssigned = '';
    if (roleInput && targetId !== interaction.user.id) {
      try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetId);
        let role = guild.roles.cache.get(roleInput);
        if (!role) {
          role = guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        }
        if (role) {
          await member.roles.add(role);
          roleAssigned = `\n✅ Đã gán role **${role.name}** cho <@${targetId}>.`;
        } else {
          roleAssigned = `\n⚠️ Không tìm thấy role **${roleInput}**, chỉ lưu thông tin.`;
        }
      } catch (err) {
        roleAssigned = `\n⚠️ Lỗi gán role: ${err.message}`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Đã cập nhật thông tin')
      .setDescription(
        `**Người chơi:** <@${targetId}>\n` +
        `**Grade:** ${grade}\n` +
        `**Play Style:** ${style}\n` +
        `**Role:** ${roleInput || 'Không có'}` +
        roleAssigned
      )
      .setColor(0xffffff)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
};