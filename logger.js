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
    if (newMessage.partial) {
      try { await newMessage.fetch(); } catch (err) { return; }
    }

    // Bo qua neu khong biet chinh xac tac gia (thuong xay ra khi Discord tu
    // dong sua tin nhan de them khung xem truoc link - khong phai nguoi dung sua)
    if (!oldMessage.author?.id || oldMessage.author.bot) return;

    // So sanh sau khi chuan hoa undefined/null thanh chuoi rong, tranh truong
    // hop "noi dung cu la undefined" va "noi dung moi la chuoi rong" bi tinh
    // la khac nhau trong khi thuc chat chu khong doi gi ca
    const noiDungCu = oldMessage.content || "";
    const noiDungMoi = newMessage.content || "";
    if (noiDungCu === noiDungMoi) return;

    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      if (!logChannel) return;

      const embedUpdate = new EmbedBuilder()
        .setTitle("Tin Nhắn Bị Sửa Đổi")
        .setColor(0xffffff)
        .addFields(
          { name: "Người sửa", value: `<@${oldMessage.author.id}>`, inline: true },
          { name: "Tại kênh", value: `<#${oldMessage.channel?.id}>`, inline: true },
          { name: "Nội dung cũ", value: `\`\`\`${noiDungCu || "Trống"}\`\`\`` },
          { name: "Nội dung mới", value: `\`\`\`${noiDungMoi || "Trống"}\`\`\`` }
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

      // GAN/GO ROLE CHO 1 THANH VIEN - ghi ro role nao duoc them/go (mau trang)
      if (action === AuditLogEvent.MemberRoleUpdate) {
        const themRole = entry.changes.find(c => c.key === '$add');
        const goRole = entry.changes.find(c => c.key === '$remove');
        let chiTiet = [];
        if (themRole && themRole.new && themRole.new.length) {
          chiTiet.push(`Đã thêm role: ${themRole.new.map(r => r.name).join(', ')}`);
        }
        if (goRole && goRole.new && goRole.new.length) {
          chiTiet.push(`Đã gỡ role: ${goRole.new.map(r => r.name).join(', ')}`);
        }
        const moTaChiTiet = chiTiet.length ? chiTiet.join('\n') : 'Không xác định được role cụ thể';

        embedAudit
          .setTitle("Thành Viên Bị Thay Đổi Vai Trò")
          .setColor(0xffffff)
          .setDescription(`Người bị chỉnh: <@${targetId}>\nAdmin thực hiện: <@${executorId}>\n${moTaChiTiet}`);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // SUA CHINH 1 ROLE (doi ten, mau, quyen han...) - ghi ro tung muc da doi (mau trang)
      if (action === AuditLogEvent.RoleUpdate) {
        const tenRole = entry.target?.name || `ID ${targetId}`;
        let dsThayDoi = [];
        for (const change of entry.changes || []) {
          if (change.key === 'name') dsThayDoi.push(`Tên: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'color') dsThayDoi.push(`Màu: \`#${Number(change.old || 0).toString(16).padStart(6, '0')}\` → \`#${Number(change.new || 0).toString(16).padStart(6, '0')}\``);
          else if (change.key === 'hoist') dsThayDoi.push(`Hiện riêng danh sách: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'mentionable') dsThayDoi.push(`Cho phép tag: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'permissions') dsThayDoi.push(`Đã thay đổi quyền hạn của role`);
          else if (change.key === 'icon' || change.key === 'unicode_emoji') dsThayDoi.push(`Đã đổi biểu tượng của role`);
          else dsThayDoi.push(`${change.key}: đã thay đổi`);
        }
        const moTa = dsThayDoi.length ? dsThayDoi.join('\n') : 'Không xác định được thay đổi cụ thể';

        embedAudit
          .setTitle("Role Bị Chỉnh Sửa")
          .setColor(0xffffff)
          .setDescription(`Role: **${tenRole}**\nNgười thực hiện: <@${executorId}>\n${moTa}`);
        await logChannel.send({ embeds: [embedAudit] });
      }

      // SUA CAU HINH KENH (ten, chu de, quyen xem...) - ghi ro tung muc da doi (mau trang)
      if (action === AuditLogEvent.ChannelUpdate) {
        const tenKenh = entry.target?.name ? `#${entry.target.name}` : `ID ${targetId}`;
        let dsThayDoi = [];
        for (const change of entry.changes || []) {
          if (change.key === 'name') dsThayDoi.push(`Tên: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'topic') dsThayDoi.push(`Chủ đề: \`${change.old || "Trống"}\` → \`${change.new || "Trống"}\``);
          else if (change.key === 'nsfw') dsThayDoi.push(`NSFW: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'permission_overwrites') dsThayDoi.push(`Đã thay đổi quyền xem/chat của kênh`);
          else if (change.key === 'rate_limit_per_user') dsThayDoi.push(`Slowmode: \`${change.old || 0}s\` → \`${change.new || 0}s\``);
          else if (change.key === 'bitrate') dsThayDoi.push(`Bitrate: \`${change.old}\` → \`${change.new}\``);
          else if (change.key === 'user_limit') dsThayDoi.push(`Giới hạn người trong voice: \`${change.old || 0}\` → \`${change.new || 0}\``);
          else dsThayDoi.push(`${change.key}: đã thay đổi`);
        }
        const moTa = dsThayDoi.length ? dsThayDoi.join('\n') : 'Không xác định được thay đổi cụ thể';

        embedAudit
          .setTitle("Kênh Bị Chỉnh Sửa")
          .setColor(0xffffff)
          .setDescription(`Kênh: **${tenKenh}**\nNgười thực hiện: <@${executorId}>\n${moTa}`);
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