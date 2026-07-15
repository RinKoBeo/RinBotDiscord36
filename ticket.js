// ticket.js - Hệ thống ticket tự động bằng nút bấm (không dùng lệnh)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../ticket_data.json');

// ===== CẤU HÌNH =====
const TICKET_CHANNEL_ID = '1526979564872532069'; // 👈 Kênh chứa nút "Tạo ticket"
const TICKET_CATEGORY_ID = null; // 👈 Category chứa kênh ticket (null nếu không dùng)
const PING_ROLES = ['1525869008862318693', '1525869199379923074', '1525871335354405174', '1525888140211130550']; // 👈 Các role sẽ được ping khi tạo ticket
const ADMIN_IDS = ['1517437552213098529'];

// ===== ĐỌC/GHI DATA =====
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { tickets: {}, nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { tickets: {}, nextId: 1 }; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

function getTicketCount(userId, data) {
  let count = 0;
  for (const [id, ticket] of Object.entries(data.tickets)) {
    if (ticket.userId === userId && (ticket.status === 'open' || ticket.status === 'pending')) {
      count++;
    }
  }
  return count;
}

// ============================================================
// MODULE EXPORT
// ============================================================
module.exports = {
  name: 'ticket',
  async execute(message, args, db, saveDb) {
    // Không xử lý lệnh – chỉ dùng nút bấm
    return;
  },

  // ===== GỬI BẢNG TICKET VÀO KÊNH CHỈ ĐỊNH =====
  async sendTicketPanel(client) {
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('❌ Bot chưa vào server nào!');
      return;
    }
    const channel = guild.channels.cache.get(TICKET_CHANNEL_ID);
    if (!channel) {
      console.error('❌ Không tìm thấy kênh ticket! Kiểm tra TICKET_CHANNEL_ID.');
      return;
    }

    // Xóa tin nhắn cũ của bot có component
    const messages = await channel.messages.fetch({ limit: 20 });
    for (const msg of messages.values()) {
      if (msg.author.id === client.user.id && msg.components.length > 0) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 TẠO TICKET')
      .setDescription(
        '📌 **Hướng dẫn:**\n' +
        '• Bấm nút **"🎫 Tạo ticket"** bên dưới để tạo một ticket mới.\n' +
        '• Mỗi người chỉ được tạo tối đa **2 ticket** đang mở.\n' +
        '• Admin sẽ xem xét và hỗ trợ bạn trong kênh ticket được tạo.'
      )
      .setColor(0x00ffcc)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('🎫 Tạo ticket')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('✅ Đã gửi bảng ticket vào kênh:', channel.name);
  },

  // ===== XỬ LÝ INTERACTION =====
  handleInteraction: async function(interaction, db, saveDb) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'ticket_create') return;

    const userId = interaction.user.id;
    const guild = interaction.guild;

    // Kiểm tra giới hạn 2 ticket
    const data = readData();
    const count = getTicketCount(userId, data);
    if (count >= 2) {
      return interaction.reply({
        content: '❌ Mày đã có 2 ticket đang mở! Hãy đóng ticket cũ trước khi tạo mới.',
        ephemeral: true
      });
    }

    // Tạo ticket mới
    const ticketId = data.nextId++;
    data.tickets[ticketId] = {
      userId: userId,
      userTag: interaction.user.tag,
      status: 'open',
      createdAt: Date.now(),
      channelId: null
    };
    saveData(data);

    // Tạo kênh ticket riêng
    const channelName = `ticket-${interaction.user.username.toLowerCase()}-${ticketId}`;
    const channelOptions = {
      name: channelName,
      topic: `Ticket #${ticketId} | Người tạo: ${interaction.user.tag}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel']
        },
        {
          id: userId,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
        },
        ...ADMIN_IDS.map(id => ({
          id: id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
        }))
      ]
    };
    if (TICKET_CATEGORY_ID) {
      channelOptions.parent = TICKET_CATEGORY_ID;
    }

    const channel = await guild.channels.create(channelOptions);
    data.tickets[ticketId].channelId = channel.id;
    saveData(data);

    // ===== NỘI DUNG TRONG KÊNH TICKET =====
    let pingContent = `<@${userId}>`;
    for (const roleId of PING_ROLES) {
      pingContent += ` <@&${roleId}>`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticketId}`)
      .setDescription(
        `**👤 Người tạo:** <@${userId}>\n` +
        `**📌 Trạng thái:** 🟢 Đang mở\n` +
        `**🕒 Thời gian:** <t:${Math.floor(Date.now()/1000)}:F>\n\n` +
        `**📝 Hướng dẫn:**\n` +
        `• Hãy mô tả vấn đề của bạn tại đây.\n` +
        `• Admin sẽ phản hồi trong kênh này.\n` +
        `• Khi đã xong, admin bấm nút **"🔒 Đóng ticket"** bên dưới.`
      )
      .setColor(0x00ff00)
      .setTimestamp();

    const closeRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('🔒 Đóng ticket')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      content: pingContent,
      embeds: [embed],
      components: [closeRow]
    });

    // Phản hồi cho người dùng
    await interaction.reply({
      content: `✅ Đã tạo ticket #${ticketId}! Kiểm tra kênh <#${channel.id}>.`,
      ephemeral: true
    });
  }
};