const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice"); // Thêm thư viện voice để đưa Bot Rin vào phòng

module.exports = (client) => {
  // ⚙️ CẤU HÌNH ID: Giữ nguyên ID phòng voice chờ của mày
  const CHANNELS_TAO_PHONG_ID = "1505845910947500164"; 

  // Bộ nhớ tạm để lưu thông tin phòng
  const activeVoiceRooms = new Map(); 

  client.on("voiceStateUpdate", async (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // 🔊 TRƯỜNG HỢP 1: USER NHẢY VÀO PHÒNG CHỜ
    if (newState.channelId === CHANNELS_TAO_PHONG_ID) {
      try {
        console.log(`🔊 Khứa ${member.displayName} vừa vào phòng chờ, đang tiến hành đẻ phòng...`);

        // 🛠️ BƯỚC 1: Tạo phòng voice mới nằm đúng trong Category của phòng chờ
        const newVoiceChannel = await newState.guild.channels.create({
          name: `🔊 Voice của ${member.displayName}`,
          type: ChannelType.GuildVoice,
          parent: newState.channel.parentId ? newState.channel.parentId : null, 
        });

        // 🛠️ BƯỚC 2: 🌟 LỆNH THẦN THÁNH - Ép phòng mới phải ĐỒNG DẠNG (Sync) hoàn toàn với Category cha
        await newVoiceChannel.lockPermissions();

        // 🛠️ BƯỚC 3: Cấp thêm quyền quản lý riêng cho chủ phòng sau khi đã đồng dạng
        await newVoiceChannel.permissionOverwrites.edit(member.id, {
          ManageChannels: true,
          MoveMembers: true,
          Connect: true
        });

        // Di chuyển khứa đó vào phòng
        await newState.setChannel(newVoiceChannel);
        activeVoiceRooms.set(newVoiceChannel.id, { ownerId: member.id });

        // 🔥 NÂNG CẤP: ĐƯA BOT RIN VÀO PHÒNG VOICE NGỒI CÙNG LUÔN
        try {
          joinVoiceChannel({
            channelId: newVoiceChannel.id,
            guildId: newState.guild.id,
            adapterCreator: newState.guild.voiceAdapterCreator,
            selfMute: false, // Bot có tắt mic không (false = không)
            selfDeaf: true   // Điếc để đỡ tốn băng thông
          });
          console.log(`🤖 Bot Rin đã tự động bay vào phòng voice riêng của ${member.displayName}`);
        } catch (voiceErr) {
          console.error("❌ Không đưa được Bot Rin vào voice:", voiceErr.message);
        }

        // 📋 TẠO BẢNG ĐIỀU KHIỂN GỬI VÀO CHAT VOICE
        const embedPanel = new EmbedBuilder()
          .setTitle("🛠️ BẢNG ĐIỀU KHIỂN PHÒNG VOICE")
          .setDescription(`Chào mừng <@${member.id}> đến với phòng voice riêng!\nSử dụng các nút bấm bên dưới để thiết lập nhanh phòng của mày.`)
          .addFields(
            { name: "👑 Chủ phòng", value: `<@${member.id}>`, inline: true },
            { name: "🔒 Trạng thái", value: "Công khai (Vô hạn người)", inline: true }
          )
          .setColor(0x00ffcc)
          .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("voicemaster_editname").setLabel("📝 Đổi Tên Phòng").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("voicemaster_limit").setLabel("👥 Giới Hạn Người").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("voicemaster_lock").setLabel("🔒 Khóa/Mở Phòng").setStyle(ButtonStyle.Danger)
        );

        // Gửi bảng điều khiển
        await newVoiceChannel.send({ content: `<@${member.id}>`, embeds: [embedPanel], components: [row1] });
        console.log(`✅ Đã tạo phòng đồng dạng Category và gửi Panel thành công cho ${member.displayName}`);

      } catch (err) {
        console.error("❌ LỖI TẠO PHÒNG VOICE RỒI KHỨA ƠI:", err);
      }
    }

    // 🔇 TRƯỜNG HỢP 2: USER RỜI PHÒNG (NẾU PHÒNG TRỐNG THÌ XÓA LUÔN)
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.channel;
      // Chỉ xóa phòng nếu số lượng người trong phòng bằng 0 HOẶC chỉ còn đúng mỗi con Bot Rin ngồi cô đơn
      if (oldChannel && activeVoiceRooms.has(oldChannel.id) && (oldChannel.members.size === 0 || (oldChannel.members.size === 1 && oldChannel.members.first()?.user.id === client.user.id))) {
        try {
          activeVoiceRooms.delete(oldChannel.id);
          await oldChannel.delete();
          console.log(`🗑️ Đã dọn dẹp xong phòng voice trống: ${oldChannel.name}`);
        } catch (err) {
          console.error("❌ Không xóa được phòng voice trống:", err);
        }
      }
    }
  });

  // 🧊 BẮT SỰ KIỆN KHI USER BẤM NÚT TRÊN BẢNG ĐIỀU KHIỂN
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("voicemaster_")) return;

    const channel = interaction.channel; 
    if (!channel) return;
    
    const roomInfo = activeVoiceRooms.get(channel.id);

    if (!roomInfo) {
      return interaction.reply({ content: "❌ Phòng này không nằm trong hệ thống quản lý dữ liệu hiện tại!", ephemeral: true });
    }

    if (interaction.user.id !== roomInfo.ownerId) {
      return interaction.reply({ content: "🛑 Cút ra! Chỉ có chủ phòng mới được bấm thôi khứa!", ephemeral: true });
    }

    try {
      // 📝 XỬ LÝ 1: ĐỔI TÊN PHÒNG
      if (interaction.customId === "voicemaster_editname") {
        await interaction.reply({ content: "💬 Mày gõ tên phòng mới muốn đổi vào ô chat này đi (Chờ trong 30 giây)...", ephemeral: true });

        const filter = (m) => m.author.id === interaction.user.id;
        const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on("collect", async (m) => {
          // FIX LỖI: Kiểm tra xem phòng có còn tồn tại không trước khi đổi tên để tránh crash bot
          if (!interaction.guild.channels.cache.has(channel.id)) return;
          
          const newName = m.content.trim();
          if (newName.length > 30) return m.reply("❌ Tên phòng dài quá (tối đa 30 ký tự)!");
          try {
            await channel.setName(newName);
            await m.reply(`✅ Đã đổi tên phòng thành: **${newName}**!`);
          } catch (err) {
            await m.reply("❌ Discord giới hạn đổi tên phòng liên tục, thử lại sau ít phút!");
          }
        });
      }

      // 👥 XỬ LÝ 2: CHỈNH GIỚI HẠN NGƯỜI VÀO
      if (interaction.customId === "voicemaster_limit") {
        await interaction.reply({ content: "💬 Nhập số lượng người tối đa (Từ 0 đến 99, gõ 0 là không giới hạn):", ephemeral: true });

        const filter = (m) => m.author.id === interaction.user.id;
        const collector = channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on("collect", async (m) => {
          // FIX LỖI: Kiểm tra xem phòng có còn tồn tại không trước khi set giới hạn để tránh crash bot
          if (!interaction.guild.channels.cache.has(channel.id)) return;

          const limit = parseInt(m.content);
          if (isNaN(limit) || limit < 0 || limit > 99) return m.reply("❌ Số không hợp lệ! Vui lòng nhập từ 0 đến 99.");
          try {
            await channel.setUserLimit(limit);
            await m.reply(`✅ Đã chỉnh giới hạn phòng thành: **${limit === 0 ? "Vô hạn" : limit + " người"}**!`);
          } catch (err) {
            await m.reply("❌ Lỗi cấu hình giới hạn người!");
          }
        });
      }

      // 🔒 XỬ LÝ 3: KHÓA / MỞ PHÒNG (ĐÃ BỌC ASYNC CHUẨN BÀI)
      if (interaction.customId === "voicemaster_lock") {
        const currentLock = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.Connect);
        
        if (!currentLock) {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
          await interaction.reply({ content: "🔒 Phòng đã bị KHÓA! Người lạ không thể tự ý nhảy vào nữa.", ephemeral: false });
        } else {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
          await interaction.reply({ content: "🔓 Phòng đã được MỞ KHÓA cho tất cả mọi người!", ephemeral: false });
        }
      }
    } catch (interError) {
      console.error("❌ Lỗi xử lý nút bấm Voice:", interError);
    }
  });
};