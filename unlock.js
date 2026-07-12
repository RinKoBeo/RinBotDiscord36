const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "unlockall") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("🛑 Tuổi lờ đòi gõ lệnh này! Quyền cấu hình lại server chỉ dành cho Admin thôi.");
      }

      // ========================================================
      // 🕵️ VÙNG CẤM KHÁM PHÁ: 3 KÊNH VIP ẨN (CHỈ ROLE PRT MỚI THẤY)
      const KENH_AN_VIP = [
        "1483978289684156478", 
        "1483982343046828186", 
        "1505512619233116201"
      ];

      // 🔒 DANH SÁCH CÁC KÊNH THÔNG BÁO (HIỆN CHO XEM - CẤM CHAT)
      const KENH_LUON_LOCK = [
        "1485310016474054797", "1483978289684156484", "1483978289684156485",
        "1483978289684156486", "1483978289684156487", "1483978289940004950",
        "1483978289940004951", "1483978290451448015", "1483978290581475461",
        "1494187677161885786", "1490904056280121445", "1494175597965086853",
        "1494181100942131230", "1494181184891129897", "1494181237668053042",
        "1494181341435138118", "1494181404194504975", "1494181404194504975",
        "1494181516882743326", "1494181571505291334", "1494181708885397725",
        "1494191632302608405", "1483978289684156478", "1483982343046828186", 
        "1483978289684156481", "1483978289684156482"
      ];
      // ========================================================

      const phanHoiBanDau = await message.channel.send("🔄 **ĐANG TIẾN HÀNH FIX QUYỀN TOÀN SERVER (ẬN KÊNH PRT, KHÓA KÊNH CHÍNH...)**");

      try {
        const cacKenh = await message.guild.channels.fetch();
        let soKenhDaGoc = 0;
        let soKenhDaKhoaMom = 0;
        let soKenhDaAnVip = 0;

        for (const [id, kenh] of cacKenh) {
          if (kenh.type === ChannelType.GuildText || kenh.type === ChannelType.GuildAnnouncement) {
            
            // 🔥 1. NẾU LÀ 3 KÊNH VIP -> ẨN SẠCH KHÔNG CHO @everyone NHÌN THẤY!
            if (KENH_AN_VIP.includes(id)) {
              try {
                await kenh.permissionOverwrites.edit(message.guild.roles.everyone, {
                  ViewChannel: false,    // Mắt không thấy
                  SendMessages: false    // Tay không được gõ
                });
                soKenhDaAnVip++;
              } catch (err) { console.log(`Lỗi ẩn kênh VIP ${kenh.name}:`, err); }
              continue; // Chạy tiếp kênh sau, bỏ qua logic bên dưới
            }

            // 🛑 2. NẾU NẰM TRONG DANH SÁCH THÔNG BÁO -> ÉP CHỈ XEM ĐƯỢC, CẤM CHAT!
            if (KENH_LUON_LOCK.includes(id)) {
              try {
                await kenh.permissionOverwrites.edit(message.guild.roles.everyone, {
                  ViewChannel: true,     // Cho xem thoải mái
                  SendMessages: false    // KHÓA MÕM CHẶT CHẼ
                });
                soKenhDaKhoaMom++;
              } catch (err) { console.log(`Lỗi ép khóa kênh ${kenh.name}:`, err); }
              continue; 
            }

            // 🔓 3. NẾU LÀ KÊNH CHAT THƯỜNG -> TRẢ VỀ QUYỀN GỐC BAN ĐẦU
            try {
              const everyoneOverwrite = kenh.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
              if (everyoneOverwrite) {
                await everyoneOverwrite.delete();
                soKenhDaGoc++;
              }
            } catch (error) { console.log(error); }
          }
        }

        const embedUnlock = new EmbedBuilder()
          .setTitle("🛡️ HỆ THỐNG PHÂN QUYỀN BẢO MẬT HOÀN TẤT 🛡️")
          .setDescription(`👁️ Đã ẩn hoàn toàn **${soKenhDaAnVip}** kênh VIP ẩn đối với dân thường (Role PRT vẫn vào bình thường).\n` +
                          `🔒 Đã ép **${soKenhDaKhoaMom}** kênh ID thông báo về trạng thái: **CHỈ XEM - CẤM CHAT**.\n` +
                          `🔄 Đã giải phóng **${soKenhDaGoc}** kênh chat thường về đúng phân quyền ban đầu!`)
          .setColor(0xff00ff)
          .setTimestamp();

        return phanHoiBanDau.edit({ content: "🎉 **ĐÃ CỨU NGUY 3 PHÒNG VIP VÀ FIX XONG SERVER CHO THẰNG RIN NHÉ NÍ!**", embeds: [embedUnlock] });

      } catch (err) {
        console.error(err);
        return phanHoiBanDau.edit("❌ Đã có lỗi xảy ra trong quá trình quét hệ thống!");
      }
    }
  });
};