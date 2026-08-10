const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = (client) => {
  // ⚙️ ID KÊNH MỚI CỦA MÀY
  const LOG_CHANNEL_ID = "1525912490343399475";

  // ========================================================
  // 👁️ MẮT 1: BẮT QUẢ TANG XÓA TIN NHẮN (SỰ KIỆN CHAT)
  // ========================================================
  client.on('messageDelete', async (message) => {
    if (message.partial) {
      try { await message.fetch(); } catch (err) { return; }
    }
    if (message.author?.bot) return;

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      const content = message.content || "*(Tin nhắn không có chữ, có thể là ảnh/embed/video)*";
      
      const embedDelete = new EmbedBuilder()
        .setTitle("🗑️ CẢNH BÁO: TIN NHẮN BỊ XÓA 🗑️")
        .setColor(0xff0000)
        .addFields(
          { name: "👤 Thằng thủ tiêu:", value: `<@${message.author?.id}>`, inline: true },
          { name: "📍 Tại kênh:", value: `<#${message.channel?.id}>`, inline: true },
          { name: "💬 Nội dung gốc:", value: `\`\`\`${content}\`\`\`` }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embedDelete] }); 
    } catch (err) {}
  });

  // ========================================================
  // 👁️ MẮT 2: BẮT QUẢ TANG SỬA TIN NHẮN
  // ========================================================
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.partial) {
      try { await oldMessage.fetch(); } catch (err) { return; }
    }
    if (oldMessage.author?.bot || oldMessage.content === newMessage.content) return;

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      const embedUpdate = new EmbedBuilder()
        .setTitle("✏️ CẢNH BÁO: TIN NHẮN BỊ SỬA ĐỔI ✏️")
        .setColor(0xffaa00)
        .addFields(
          { name: "👤 Khứa lật lọng:", value: `<@${oldMessage.author?.id}>`, inline: true },
          { name: "📍 Tại kênh:", value: `<#${oldMessage.channel?.id}>`, inline: true },
          { name: "⬅️ Nội dung CŨ:", value: `\`\`\`${oldMessage.content || "Trống"}\`\`\`` },
          { name: "➡️ Nội dung MỚI:", value: `\`\`\`${newMessage.content || "Trống"}\`\`\`` }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embedUpdate] }); 
    } catch (err) {}
  });

  // ========================================================
  // 👁️ MẮT 3: BIẾN ĐỘNG PHÒNG VOICE (VÀO / RA / ĐỔI PHÒNG / MUTE)
  // ========================================================
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member?.user.bot) return;

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      let hanhDong = "";
      let mauSac = 0x00ffff;

      // 📥 HÀNH ĐỘNG: VÀO PHÒNG VOICE
      if (!oldState.channelId && newState.channelId) {
        hanhDong = `📥 <@${newState.id}> vừa **Tham Gia** phòng voice <#${newState.channelId}>`;
        mauSac = 0x2ecc71;
      } 
      // 📤 HÀNH ĐỘNG: RỜI PHÒNG VOICE HOẶC BỊ KICK VOICE
      else if (oldState.channelId && !newState.channelId) {
        // Mặc định ban đầu hiển thị rời phòng thường
        hanhDong = `📤 <@${oldState.id}> vừa **Rời Khỏi** phòng voice <#${oldState.channelId}>`;
        mauSac = 0xe74c3c;

        // 🔥 ĐÃ SỬA NGOẶC: Bọc logic quét Audit Log nằm trọn vẹn trong nhánh rời phòng
        try {
          const fetchedLogs = await oldState.guild.fetchAuditLogs({
            limit: 5,
          });
          
          const voiceLog = fetchedLogs.entries.find(entry => 
            (entry.action === AuditLogEvent.MemberDisconnect || entry.action === AuditLogEvent.MemberMove) && 
            entry.targetId === oldState.id && 
            (Date.now() - entry.createdAt.getTime()) < 8000
          );

          if (voiceLog) {
            hanhDong = `👞 <@${oldState.id}> vừa bị Admin <@${voiceLog.executorId}> **SÚT BAY MÀU / DI CHUYỂN ÉP BUỘC** khỏi phòng voice <#${oldState.channelId}>!`;
            mauSac = 0xff0000;
          }
        } catch (e) {
          console.log("👉 Bot đang thiếu Intent đọc Nhật ký (GuildModeration/AuditLog), vui lòng kiểm tra index.js!");
        }
      } 
      // 🔀 HÀNH ĐỘNG: CHUYỂN PHÒNG VOICE
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        hanhDong = `🔀 <@${newState.id}> di chuyển từ phòng <#${oldState.channelId}> sang <#${newState.channelId}>`;
        mauSac = 0xe67e22;
      }

      // 🔇 CÁC TRẠNG THÁI MUTE (GIỮ NGUYÊN)
      if (!oldState.serverMute && newState.serverMute) {
        hanhDong = `🔇 <@${newState.id}> vừa bị Admin **Khóa Mõm (Server Mute)**!`;
        mauSac = 0xff0000;
      } else if (oldState.serverMute && !newState.serverMute) {
        hanhDong = `🔊 <@${newState.id}> đã được Admin **Mở Khóa Mõm (Server Unmute)**!`;
        mauSac = 0x00ff00;
      }

      if (!oldState.selfMute && newState.selfMute) {
        hanhDong = `💤 <@${newState.id}> vừa **Tự Tắt Mic (Self Mute)**.`;
        mauSac = 0x555555;
      } else if (oldState.selfMute && !newState.selfMute) {
        hanhDong = `🎙️ <@${newState.id}> vừa **Bật Lại Mic (Self Unmute)** để gáy!`;
        mauSac = 0x00ffaa;
      }

      if (hanhDong) {
        const embedVoice = new EmbedBuilder()
          .setTitle("🔊 BIẾN ĐỘNG PHÒNG VOICE 🔊")
          .setDescription(hanhDong)
          .setColor(mauSac)
          .setTimestamp();
        
        await logChannel.send({ embeds: [embedVoice] }); 
      }
    } catch (err) {}
  });

  // ========================================================
  // 👁️ MẮT 4: BẮT NHẬT KÝ ADMIN (MỞ RỘNG TOÀN DIỆN CÁC HÀNH ĐỘNG)
  // ========================================================
  client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      const { action, executorId, targetId, reason } = entry;
      const lyDoPhat = reason || "Không ghi lý do";
      let embedAudit = new EmbedBuilder().setTimestamp();

      // 🔨 HOẠT ĐỘNG BAN (22)
      if (action === AuditLogEvent.MemberBanAdd) {
        embedAudit
          .setTitle("🔨 NHẬT KÝ: THÀNH VIÊN BỊ BAN BANH XÁC 🔨")
          .setColor(0xff0000)
          .setDescription(`👤 **Nạn nhân:** <@${targetId}>\n🪓 **Đao phủ:** <@${executorId}>\n📝 **Lý do:** \`${lyDoPhat}\``);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // 👞 HOẠT ĐỘNG KICK (20)
      if (action === AuditLogEvent.MemberKick) {
        embedAudit
          .setTitle("👞 NHẬT KÝ: THÀNH VIÊN BỊ SÚT (KICK) 👞")
          .setColor(0xffaa00)
          .setDescription(`👤 **Kẻ bị sút:** <@${targetId}>\n🥾 **Người thực thi:** <@${executorId}>\n📝 **Lý do:** \`${lyDoPhat}\``);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // 🛡️ HOẠT ĐỘNG 25: THÀNH VIÊN BỊ ĐỔI ROLE
      if (action === AuditLogEvent.MemberRoleUpdate) {
        embedAudit
          .setTitle("🛡️ NHẬT KÝ: THÀNH VIÊN BỊ THAY ĐỔI VAI TRÒ 🛡️")
          .setColor(0x3498db)
          .setDescription(`👤 **Người bị chỉnh:** <@${targetId}>\n⚙️ **Admin thực hiện:** <@${executorId}>`);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // 📁 HOẠT ĐỘNG 14 & 27: SỬA KÊNH HOẶC CẤU HÌNH ROLE
      if (action === AuditLogEvent.ChannelUpdate || action === AuditLogEvent.RoleUpdate) {
        embedAudit
          .setTitle("📁 NHẬT KÝ: THAY ĐỔI CẤU HÌNH SERVER/KÊNH 📁")
          .setColor(0x9b59b6)
          .setDescription(`⚙️ **Người thực hiện chỉnh sửa cấu hình:** <@${executorId}>\n📌 Mã hành động hệ thống: \`${action}\``);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // 🤐 HOẠT ĐỘNG TIMEOUT / UNTIMEOUT (HÀNH ĐỘNG 24)
      if (action === AuditLogEvent.MemberUpdate) {
        const timeoutChange = entry.changes.find(c => c.key === 'communication_disabled_until');
        if (timeoutChange) {
          if (!timeoutChange.old && timeoutChange.new) {
            const thoiGianHetHan = new Date(timeoutChange.new);
            embedAudit
              .setTitle("🤐 NHẬT KÝ TÒA ÁN: THÀNH VIÊN BỊ KHÓA MÕM (TIMEOUT) 🤐")
              .setColor(0xff0055)
              .setDescription(`👤 **Nạn nhân câm nín:** <@${targetId}>\n🤫 **Admin dùng lệnh:** <@${executorId}>\n⏰ **Thời gian mở khóa:** <t:${Math.floor(thoiGianHetHan.getTime() / 1000)}:R>\n📝 **Lý do:** \`${lyDoPhat}\``);
            await logChannel.send({ embeds: [embedAudit] });
          } else if (timeoutChange.old && !timeoutChange.new) {
            embedAudit
              .setTitle("😇 NHẬT KÝ TÒA ÁN: THÀNH VIÊN ĐƯỢC THA BỔNG (UNMUTE) 😇")
              .setColor(0x00ff00)
              .setDescription(`👤 **Người được tha:** <@${targetId}>\n🕊️ **Admin đại xá gỡ mõm:** <@${executorId}>`);
            await logChannel.send({ embeds: [embedAudit] });
          }
        }
      }
    } catch (err) {
      console.log(`Lỗi hệ thống Audit Log: ${err.message}`);
    }
  });
};