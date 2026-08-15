const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = (client) => {
  const LOG_CHANNEL_ID = "1525912490343399475";

  // ========================================================
  // XÓA TIN NHẮN (mau trang, khong emoji)
  // Dung Audit Log de tim dung nguoi da xoa - vi Discord KHONG
  // ghi Audit Log khi chinh tac gia tu xoa tin cua minh, chi ghi
  // khi CO NGUOI KHAC (vd: admin) xoa tin cua nguoi khac. Neu
  // khong tim thay log phu hop, mac dinh coi nhu tac gia tu xoa.
  // ========================================================
  client.on('messageDelete', async (message) => {
    if (message.partial) {
      try { await message.fetch(); } catch (err) { return; }
    }
    if (message.author?.bot) return;

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      let nguoiXoa = message.author.id;
      try {
        const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MessageDelete });
        const deleteLog = fetchedLogs.entries.find(entry =>
          entry.target?.id === message.author.id &&
          entry.extra?.channel?.id === message.channel.id &&
          (Date.now() - entry.createdAt.getTime()) < 5000
        );
        if (deleteLog) nguoiXoa = deleteLog.executorId;
      } catch (e) {}

      const content = message.content || "(Tin nhắn không có chữ, có thể là ảnh/embed/video)";

      const embedDelete = new EmbedBuilder()
        .setTitle("Tin Nhắn Bị Xóa")
        .setColor(0xffffff)
        .addFields(
          { name: "Người xóa", value: `<@${nguoiXoa}>`, inline: true },
          { name: "Người viết gốc", value: `<@${message.author.id}>`, inline: true },
          { name: "Tại kênh", value: `<#${message.channel?.id}>`, inline: true },
          { name: "Nội dung gốc", value: `\`\`\`${content}\`\`\`` }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embedDelete] });
    } catch (err) {}
  });

  // ========================================================
  // SỬA TIN NHẮN (mau trang, khong emoji)
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
        .setTitle("Tin Nhắn Bị Sửa Đổi")
        .setColor(0xffffff)
        .addFields(
          { name: "Người sửa", value: `<@${oldMessage.author?.id}>`, inline: true },
          { name: "Tại kênh", value: `<#${oldMessage.channel?.id}>`, inline: true },
          { name: "Nội dung cũ", value: `\`\`\`${oldMessage.content || "Trống"}\`\`\`` },
          { name: "Nội dung mới", value: `\`\`\`${newMessage.content || "Trống"}\`\`\`` }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embedUpdate] });
    } catch (err) {}
  });

  // ========================================================
  // NHẬT KÝ ADMIN: BAN / KICK / ĐỔI ROLE / SỬA CẤU HÌNH / TIMEOUT
  // ========================================================
  client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      const { action, executorId, targetId, reason } = entry;
      const lyDoPhat = reason || "Không ghi lý do";
      let embedAudit = new EmbedBuilder().setTimestamp();

      // BAN (mau do)
      if (action === AuditLogEvent.MemberBanAdd) {
        embedAudit
          .setTitle("Thành Viên Bị Ban")
          .setColor(0xff0000)
          .setDescription(`Nạn nhân: <@${targetId}>\nNgười thực hiện: <@${executorId}>\nLý do: \`${lyDoPhat}\``);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // KICK (mau do)
      if (action === AuditLogEvent.MemberKick) {
        embedAudit
          .setTitle("Thành Viên Bị Kick")
          .setColor(0xff0000)
          .setDescription(`Người bị kick: <@${targetId}>\nNgười thực hiện: <@${executorId}>\nLý do: \`${lyDoPhat}\``);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // ĐỔI ROLE (mau trang)
      if (action === AuditLogEvent.MemberRoleUpdate) {
        embedAudit
          .setTitle("Thành Viên Bị Thay Đổi Vai Trò")
          .setColor(0xffffff)
          .setDescription(`Người bị chỉnh: <@${targetId}>\nAdmin thực hiện: <@${executorId}>`);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // SỬA KÊNH HOẶC CẤU HÌNH ROLE (mau trang)
      if (action === AuditLogEvent.ChannelUpdate || action === AuditLogEvent.RoleUpdate) {
        embedAudit
          .setTitle("Thay Đổi Cấu Hình Server/Kênh")
          .setColor(0xffffff)
          .setDescription(`Người thực hiện: <@${executorId}>`);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // TIMEOUT / UNTIMEOUT (tinh chung nhom Mute/Unmute, mau vang)
      if (action === AuditLogEvent.MemberUpdate) {
        const timeoutChange = entry.changes.find(c => c.key === 'communication_disabled_until');
        if (timeoutChange) {
          if (!timeoutChange.old && timeoutChange.new) {
            const thoiGianHetHan = new Date(timeoutChange.new);
            embedAudit
              .setTitle("Thành Viên Bị Mute (Timeout)")
              .setColor(0xffff00)
              .setDescription(`Người bị mute: <@${targetId}>\nAdmin thực hiện: <@${executorId}>\nThời gian mở khóa: <t:${Math.floor(thoiGianHetHan.getTime() / 1000)}:R>\nLý do: \`${lyDoPhat}\``);
            await logChannel.send({ embeds: [embedAudit] });
          } else if (timeoutChange.old && !timeoutChange.new) {
            embedAudit
              .setTitle("Thành Viên Được Unmute")
              .setColor(0xffff00)
              .setDescription(`Người được unmute: <@${targetId}>\nAdmin thực hiện: <@${executorId}>`);
            await logChannel.send({ embeds: [embedAudit] });
          }
        }
      }
    } catch (err) {
      console.log(`Lỗi hệ thống Audit Log: ${err.message}`);
    }
  });
};