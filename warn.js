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
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ========================================================
    // LỆNH 1: 🔨 !WARN @User [Lý do] (TÍCH GẬY LIÊN TỤC)
    // ========================================================
    if (cmd === "warn") {
      // Check quyền: Chỉ Staff có quyền Quản lý tin nhắn hoặc Admin mới được phạt
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("🛑 Tuổi lờ đòi thực thi công lý! Lệnh này chỉ dành cho Ban Quản Trị Clan thôi.");
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) return message.reply("❌ Tag cái thằng muốn warn vào khứa ơi! Ví dụ: `!warn @ThằngPháSới phá game` ");

      if (targetUser.id === message.author.id) return message.reply("Ngáo à? Tự warn chính mình làm mẹ gì!");
      if (targetUser.bot) return message.reply("Bot ngoan vcl warn nó làm gì?");

      const lyDo = args.slice(1).join(" ") || "Không có lý do cụ thể (Thích thì warn)";

      let violators = readViolators();
      
      // Cộng dồn gậy, không giới hạn, không tự reset
      if (!violators[targetUser.id]) violators[targetUser.id] = 0;
      violators[targetUser.id] += 1;

      saveViolators(violators);

      const embedWarn = new EmbedBuilder()
        .setTitle("⚠️ PHÁT GẬY CẢNH CÁO THÀNH VIÊN ⚠️")
        .setDescription(`👤 **Thành viên bị phạt:** <@${targetUser.id}>\n` +
          `🛡️ **Người gõ đầu:** <@${message.author.id}>\n` +
          `📝 **Lý do:** ${lyDo}\n` +
          `📊 **Tổng số gậy hiện tại:** 🔥 **${violators[targetUser.id]}** gậy!`)
        .setFooter({ text: "Gậy đã được tích vào sổ Rin, Admin sẽ xử lý theo luật Clan!" })
        .setColor(0xffaa00) // Màu cam cảnh báo
        .setTimestamp();

      return message.channel.send({ embeds: [embedWarn] });
    }

    // ========================================================
    // LỆNH 2: 🔍 !CHECKWARN @User (XEM SỐ GẬY ĐANG CÓ)
    // ========================================================
    if (cmd === "checkwarn") {
      // Ai cũng có quyền check lệnh này để xem mình hoặc người khác có bao nhiêu gậy
      const targetUser = message.mentions.users.first() || message.author;
      
      let violators = readViolators();
      const soWarn = violators[targetUser.id] || 0;

      const embedCheck = new EmbedBuilder()
        .setTitle("📋 KIỂM TRA SỔ TỘI PHẠM CLAN 📋")
        .setDescription(`👤 **Thành viên:** <@${targetUser.id}>\n📊 **Số gậy đang gánh:** 🔥 **${soWarn}** gậy!`)
        .setColor(0x00ffff) // Màu xanh ngọc xịn mịn
        .setTimestamp();

      if (soWarn === 0) {
        embedCheck.setDescription(`👤 **Thành viên:** <@${targetUser.id}>\n😇 **Tình trạng:** Trong sạch vcl, chưa ăn gậy nào!`);
        embedCheck.setColor(0x00ff00); // Đổi sang màu xanh lá cây vì nó ngoan
      }

      return message.channel.send({ embeds: [embedCheck] });
    }

    // ========================================================
    // LỆNH 3: 🕊️ !UNWARN @User (ĐẠI XÁ - RESET SỐ GẬY VỀ 0)
    // ========================================================
    if (cmd === "unwarn") {
      // Chỉ Admin hoặc Staff tối cao mới được xóa tội
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("🛑 Tuổi lờ đòi xóa tội! Quyền đại xá chỉ dành cho Admin thôi khứa.");
      }

      const targetUser = message.mentions.users.first();
      if (!targetUser) return message.reply("❌ Tag cái thằng mày muốn xóa tội vào! Ví dụ: `!unwarn @NgườiHốiCải` ");

      let violators = readViolators();

      // Nếu thằng này đéo có tội tình gì từ trước
      if (!violators[targetUser.id] || violators[targetUser.id] === 0) {
        return message.reply(`😇 Khứa <@${targetUser.id}> này vốn dĩ trong sạch, có gậy nào đâu mà xóa!`);
      }

      // Tiến hành xóa sổ, đưa số gậy về 0
      violators[targetUser.id] = 0;
      saveViolators(violators);

      const embedUnwarn = new EmbedBuilder()
        .setTitle("🕊️ LỆNH ĐẠI XÁ CLAN - CẢI TÀ QUY CHÍNH 🕊️")
        .setDescription(`✅ Đã xóa sạch toàn bộ gậy cảnh cáo của <@${targetUser.id}>!\n🛡️ **Người thực thi:** <@${message.author.id}>\n😇 **Số gậy hiện tại:** 0 (Làm lại cuộc đời nhé khứa!)`)
        .setColor(0x00ff00) // Màu xanh lá cây an lành
        .setTimestamp();

      return message.channel.send({ embeds: [embedUnwarn] });
    }
  });
};