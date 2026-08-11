const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới file violators.json của mày
const violatorsPath = path.join(__dirname, 'violators.json');

// Hàm đọc file json an toàn
function readViolators() {
  try {
    if (!fs.existsSync(violatorsPath)) return {};
    const data = fs.readFileSync(violatorsPath, 'utf8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("Lỗi đọc file violators.json:", err);
    return {};
  }
}

// Hàm ghi file json an toàn
function saveViolators(data) {
  try {
    fs.writeFileSync(violatorsPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Lỗi ghi file violators.json:", err);
  }
}

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ========================================================
    // LỆNH 1: /WARN (TÍCH GẬY LIÊN TỤC)
    // ========================================================
    if (interaction.commandName === "warn") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "🛑 Tuổi lờ đòi thực thi công lý! Lệnh này chỉ dành cho Ban Quản Trị Clan thôi.", ephemeral: true }).catch(() => {});
      }

      const targetUser = interaction.options.getUser('nguoi');
      const lyDo = interaction.options.getString('lydo') || "Không có lý do cụ thể (Thích thì warn)";

      if (targetUser.id === interaction.user.id) return interaction.reply({ content: "Ngáo à? Tự warn chính mình làm mẹ gì!", ephemeral: true }).catch(() => {});
      if (targetUser.bot) return interaction.reply({ content: "Bot ngoan vcl warn nó làm gì?", ephemeral: true }).catch(() => {});

      let violators = readViolators();

      if (!violators[targetUser.id]) violators[targetUser.id] = 0;
      violators[targetUser.id] += 1;

      saveViolators(violators);

      const embedWarn = new EmbedBuilder()
        .setTitle("⚠️ PHÁT GẬY CẢNH CÁO THÀNH VIÊN ⚠️")
        .setDescription(`👤 **Thành viên bị phạt:** <@${targetUser.id}>\n` +
          `🛡️ **Người gõ đầu:** <@${interaction.user.id}>\n` +
          `📝 **Lý do:** ${lyDo}\n` +
          `📊 **Tổng số gậy hiện tại:** 🔥 **${violators[targetUser.id]}** gậy!`)
        .setFooter({ text: "Gậy đã được tích vào sổ Rin, Admin sẽ xử lý theo luật Clan!" })
        .setColor(0xffaa00)
        .setTimestamp();

      return interaction.reply({ embeds: [embedWarn] }).catch(() => {});
    }

    // ========================================================
    // LỆNH 2: /CHECKWARN (XEM SỐ GẬY ĐANG CÓ)
    // ========================================================
    if (interaction.commandName === "checkwarn") {
      const targetUser = interaction.options.getUser('nguoi') || interaction.user;

      let violators = readViolators();
      const soWarn = violators[targetUser.id] || 0;

      const embedCheck = new EmbedBuilder()
        .setTitle("📋 KIỂM TRA SỔ TỘI PHẠM CLAN 📋")
        .setColor(0x00ffff)
        .setTimestamp();

      if (soWarn === 0) {
        embedCheck.setDescription(`👤 **Thành viên:** <@${targetUser.id}>\n😇 **Tình trạng:** Trong sạch vcl, chưa ăn gậy nào!`);
        embedCheck.setColor(0x00ff00);
      } else {
        embedCheck.setDescription(`👤 **Thành viên:** <@${targetUser.id}>\n📊 **Số gậy đang gánh:** 🔥 **${soWarn}** gậy!`);
      }

      return interaction.reply({ embeds: [embedCheck] }).catch(() => {});
    }

    // ========================================================
    // LỆNH 3: /UNWARN (ĐẠI XÁ - RESET SỐ GẬY VỀ 0)
    // ========================================================
    if (interaction.commandName === "unwarn") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "🛑 Tuổi lờ đòi xóa tội! Quyền đại xá chỉ dành cho Admin thôi khứa.", ephemeral: true }).catch(() => {});
      }

      const targetUser = interaction.options.getUser('nguoi');

      let violators = readViolators();

      if (!violators[targetUser.id] || violators[targetUser.id] === 0) {
        return interaction.reply({ content: `😇 Khứa <@${targetUser.id}> này vốn dĩ trong sạch, có gậy nào đâu mà xóa!`, ephemeral: true }).catch(() => {});
      }

      violators[targetUser.id] = 0;
      saveViolators(violators);

      const embedUnwarn = new EmbedBuilder()
        .setTitle("🕊️ LỆNH ĐẠI XÁ CLAN - CẢI TÀ QUY CHÍNH 🕊️")
        .setDescription(`✅ Đã xóa sạch toàn bộ gậy cảnh cáo của <@${targetUser.id}>!\n🛡️ **Người thực thi:** <@${interaction.user.id}>\n😇 **Số gậy hiện tại:** 0 (Làm lại cuộc đời nhé khứa!)`)
        .setColor(0x00ff00)
        .setTimestamp();

      return interaction.reply({ embeds: [embedUnwarn] }).catch(() => {});
    }
  });
};