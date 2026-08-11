const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "unlockall") return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "🛑 Tuổi lờ đòi gõ lệnh này! Quyền cấu hình lại server chỉ dành cho Admin thôi.", ephemeral: true }).catch(() => {});
    }

    // ========================================================
    // 🕵️ VÙNG CẤM KHÁM PHÁ: 3 KÊNH VIP ẨN (CHỈ ROLE PRT MỚI THẤY)
    const KENH_AN_VIP = [
      "1483978289684156478",
      "1483982343046828186",
      "1505512619233116201"
    ];

    // 📋 KÊNH LOG VIP (chi role/nguoi da duoc gan quyen rieng tu truoc moi xem duoc)
    const KENH_LOG_VIP = [
      "1532748086672363560",
      "1525912490343399475"
    ];

    // 🔒 DANH SÁCH CÁC KÊNH THÔNG BÁO (HIỆN CHO XEM - CẤM CHAT)
    const KENH_LUON_LOCK = [
      "1525858054929649744",
      "1525859026691424418",
      "1525859677265461430",
      "1525859819850829865",
      "1525860977890037841",
      "1525861136342188082",
      "1525862570886434896",
      "1526113834107142185",
      "1527329843723632754",
      "1532703834005045338",
      "1532713933800996864",
      "1532714007184805960",
      "1532715288930287856",
      "1532715657068679381",
      "1532716870992527462",
      "1532717134537560175",
      "1532717158780502047",
      "1532720336984866919",
      "1533822724114350152",
      "1533827545206751324",
      "1534176989701996604",
      "1534577680366698636"
    ];
    // ========================================================

    await interaction.deferReply().catch(() => {});
    const phanHoiBanDau = await interaction.editReply("🔄 **ĐANG TIẾN HÀNH FIX QUYỀN TOÀN SERVER (ẨN KÊNH VIP, KHÓA KÊNH CHÍNH...)**").catch(() => null);

    try {
      const guild = interaction.guild;
      const cacKenh = await guild.channels.fetch();
      let soKenhDaGoc = 0;
      let soKenhDaKhoaMom = 0;
      let soKenhDaAnVip = 0;
      let soKenhDaAnLogVip = 0;

      for (const [id, kenh] of cacKenh) {
        if (kenh.type === ChannelType.GuildText || kenh.type === ChannelType.GuildAnnouncement) {

          // 🔥 1. NẾU LÀ KÊNH VIP GỐC -> ẨN SẠCH KHÔNG CHO @everyone NHÌN THẤY!
          if (KENH_AN_VIP.includes(id)) {
            try {
              await kenh.permissionOverwrites.edit(guild.roles.everyone, {
                ViewChannel: false,
                SendMessages: false
              });
              soKenhDaAnVip++;
            } catch (err) { console.log(`Loi an kenh VIP ${kenh.name}:`, err); }
            continue;
          }

          // 📋 2. NẾU LÀ KÊNH LOG VIP -> CŨNG ẨN SẠCH KHÔNG CHO @everyone NHÌN THẤY!
          if (KENH_LOG_VIP.includes(id)) {
            try {
              await kenh.permissionOverwrites.edit(guild.roles.everyone, {
                ViewChannel: false,
                SendMessages: false
              });
              soKenhDaAnLogVip++;
            } catch (err) { console.log(`Loi an kenh log VIP ${kenh.name}:`, err); }
            continue;
          }

          // 🛑 3. NẾU NẰM TRONG DANH SÁCH THÔNG BÁO -> ÉP CHỈ XEM ĐƯỢC, CẤM CHAT!
          if (KENH_LUON_LOCK.includes(id)) {
            try {
              await kenh.permissionOverwrites.edit(guild.roles.everyone, {
                ViewChannel: true,
                SendMessages: false
              });
              soKenhDaKhoaMom++;
            } catch (err) { console.log(`Loi ep khoa kenh ${kenh.name}:`, err); }
            continue;
          }

          // 🔓 4. NẾU LÀ KÊNH CHAT THƯỜNG -> TRẢ VỀ QUYỀN GỐC BAN ĐẦU
          try {
            const everyoneOverwrite = kenh.permissionOverwrites.cache.get(guild.roles.everyone.id);
            if (everyoneOverwrite) {
              await everyoneOverwrite.delete();
              soKenhDaGoc++;
            }
          } catch (error) { console.log(error); }
        }
      }

      const embedUnlock = new EmbedBuilder()
        .setTitle("🛡️ HỆ THỐNG PHÂN QUYỀN BẢO MẬT HOÀN TẤT 🛡️")
        .setDescription(
          `👁️ Đã ẩn hoàn toàn **${soKenhDaAnVip}** kênh VIP đối với dân thường.\n` +
          `📋 Đã ẩn hoàn toàn **${soKenhDaAnLogVip}** kênh log VIP đối với dân thường.\n` +
          `🔒 Đã ép **${soKenhDaKhoaMom}** kênh ID thông báo về trạng thái: **CHỈ XEM - CẤM CHAT**.\n` +
          `🔄 Đã giải phóng **${soKenhDaGoc}** kênh chat thường về đúng phân quyền ban đầu!`
        )
        .setColor(0xff00ff)
        .setTimestamp();

      return interaction.editReply({ content: "🎉 **ĐÃ FIX XONG QUYỀN TOÀN SERVER!**", embeds: [embedUnlock] }).catch(() => {});

    } catch (err) {
      console.error(err);
      return interaction.editReply("❌ Đã có lỗi xảy ra trong quá trình quét hệ thống!").catch(() => {});
    }
  });
};