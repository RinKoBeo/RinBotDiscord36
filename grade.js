// grade.js - Slash command quản lý grade, play style và role (chỉ WHITELIST set được)
const { SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
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

module.exports = async function(client) {
  // ===== ĐĂNG KÝ SLASH COMMAND =====
  client.once('ready', async () => {
    try {
      const command = new SlashCommandBuilder()
        .setName('grade')
        .setDescription('Quản lý grade, play style và role của người chơi')
        .addSubcommand(sub => sub
          .setName('set')
          .setDescription('Đặt grade, play style và role (role không bắt buộc)')
          .addUserOption(opt => opt
            .setName('user')
            .setDescription('Người chơi cần set (mặc định là bạn)')
          )
          .addStringOption(opt => opt
            .setName('grade')
            .setDescription('Grade của người chơi')
            .setRequired(true)
          )
          .addStringOption(opt => opt
            .setName('style')
            .setDescription('Play style')
            .setRequired(true)
          )
          .addStringOption(opt => opt
            .setName('role')
            .setDescription('ID role hoặc tên role (không bắt buộc)')
            .setRequired(false)
          )
        )
        .addSubcommand(sub => sub
          .setName('view')
          .setDescription('Xem grade, play style và role của người chơi')
          .addUserOption(opt => opt
            .setName('user')
            .setDescription('Người chơi cần xem (mặc định là bạn)')
          )
        );

      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: [command.toJSON()] }
      );
      console.log('✅ Đã đăng ký slash command /grade');
    } catch (err) {
      console.error('❌ Lỗi đăng ký /grade:', err);
    }
  });

  // ===== XỬ LÝ INTERACTION =====
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'grade') return;

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;

    const data = readData();
    if (!data[userId]) data[userId] = { grade: 'Chưa có', style: 'Chưa có', role: null };

    // ===== SET =====
    if (sub === 'set') {
      const grade = interaction.options.getString('grade');
      const style = interaction.options.getString('style');
      const roleInput = interaction.options.getString('role'); // có thể null

      // Kiểm tra quyền: set cho người khác cần WHITELIST
      if (targetUser.id !== interaction.user.id && !WHITELIST.includes(interaction.user.id)) {
        return interaction.editReply({ content: '❌ Mày đéo có quyền set grade cho người khác!' });
      }

      // Lưu dữ liệu
      data[userId] = { grade, style, role: roleInput || null };
      saveData(data);

      // Nếu có roleInput và là set cho người khác, cố gắng gán role
      let roleAssigned = '';
      if (roleInput && targetUser.id !== interaction.user.id) {
        try {
          const guild = interaction.guild;
          const member = await guild.members.fetch(targetUser.id);
          // Tìm role theo ID hoặc tên
          let role = guild.roles.cache.get(roleInput);
          if (!role) {
            role = guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
          }
          if (role) {
            await member.roles.add(role);
            roleAssigned = `\n✅ Đã gán role **${role.name}** cho <@${targetUser.id}>.`;
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
          `**Người chơi:** ${targetUser}\n` +
          `**Grade:** ${grade}\n` +
          `**Play Style:** ${style}\n` +
          `**Role:** ${roleInput || 'Không có'}` +
          roleAssigned
        )
        .setColor(0xffffff)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ===== VIEW =====
    if (sub === 'view') {
      const info = data[userId];
      const embed = new EmbedBuilder()
        .setTitle(`📋 Thông tin của ${targetUser.username}`)
        .setDescription(
          `**Grade:** ${info.grade}\n` +
          `**Play Style:** ${info.style}\n` +
          `**Role:** ${info.role || 'Không có'}`
        )
        .setColor(0xffffff)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  });
};