// ticket.js - Hệ thống ticket tự động bằng nút bấm (export function)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../ticket_data.json');

// ===== CẤU HÌNH =====
const TICKET_CHANNEL_ID = '1526979564872532069'; // 👈 Kênh chứa nút "Tạo ticket"
const TICKET_CATEGORY_ID = ''; // 👈 Category chứa kênh ticket (để trống nếu không muốn)
const PING_ROLES = ['1525869008862318693', '1525869199379923074', '1525871335354405174', '1525888140211130550']; // 👈 Các role được ping
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

// ===== HÀM GỬI PANEL =====
async function sendTicketPanel(client) {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  const channel = guild.channels.cache.get(TICKET_CHANNEL_ID);
  if (!channel) {
    console.error('❌ Không tìm thấy kênh ticket! Kiểm tra TICKET_CHANNEL_ID.');
    return;
  }

  // Xóa tin nhắn cũ của bot có components
  const messages = await channel.messages.fetch({ limit: 10 });
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
}

// ===== HÀM XỬ LÝ INTERACTION =====
async function handleInteraction(interaction, db, saveDb) {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'ticket_create') return;

  const userId = interaction.user.id;
  const guild = interaction.guild;

  const data = readData();
  const count = getTicketCount(userId, data);
  if (count >= 2) {
    return interaction.reply({
      content: '❌ Mày đã có 2 ticket đang mở! Hãy đóng ticket cũ trước khi tạo mới.',
      ephemeral: true
    });
  }

  const ticketId = data.nextId++;
  data.tickets[ticketId] = {
    userId: userId,
    userTag: interaction.user.tag,
    status: 'open',
    createdAt: Date.now(),
    channelId: null
  };
  saveData(data);

  const channelName = `ticket-${interaction.user.username.toLowerCase()}-${ticketId}`;
  const channelOptions = {
    name: channelName,
    topic: `Ticket #${ticketId} | Người tạo: ${interaction.user.tag}`,
    permissionOverwrites: [
      { id: guild.id, deny: ['ViewChannel'] },
      { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
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

  // Nội dung trong kênh ticket
  let pingContent = `<@${userId}>`;
  for (const roleId of PING_ROLES) {
    pingContent += ` <@&${roleId}>`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${ticketId}`)
    .setDescription(
      `👤 **Người tạo:** <@${userId}>\n` +
      `📌 **Trạng thái:** 🟢 Đang mở\n` +
      `⏰ **Thời gian:** <t:${Math.floor(Date.now()/1000)}:F>\n\n` +
      `📝 **Hướng dẫn:**\n` +
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

  await interaction.reply({
    content: `✅ Đã tạo ticket #${ticketId}! Kiểm tra kênh <#${channel.id}>.`,
    ephemeral: true
  });
}

// ===== EXPORT FUNCTION (ĐÚNG ĐỊNH DẠNG) =====
module.exports = async function(client) {
  // 1. Gửi panel ticket vào kênh chỉ định khi bot khởi động
  await sendTicketPanel(client);

  // 2. Đăng ký listener cho button ticket
  client.on('interactionCreate', async (interaction) => {
    // Chỉ xử lý button và đúng customId
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'ticket_create' && !interaction.customId.startsWith('ticket_close_')) return;

    // Lấy db (nếu có) từ file economy hoặc để trống
    let db = {};
    let saveDb = () => {};
    try {
      // Nếu có file economy.json, đọc vào
      const econFile = path.join(__dirname, '../economy.json');
      if (fs.existsSync(econFile)) {
        db = JSON.parse(fs.readFileSync(econFile, 'utf8'));
        saveDb = (data) => fs.writeFileSync(econFile, JSON.stringify(data, null, 2));
      }
    } catch (e) {}

    // Xử lý create ticket
    if (interaction.customId === 'ticket_create') {
      await handleInteraction(interaction, db, saveDb);
      return;
    }

    // Xử lý close ticket
    if (interaction.customId.startsWith('ticket_close_')) {
      const ticketId = parseInt(interaction.customId.split('_')[2]);
      if (isNaN(ticketId)) {
        return interaction.reply({ content: '❌ Lỗi ID ticket!', ephemeral: true });
      }
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: '❌ Chỉ Admin mới đóng ticket!', ephemeral: true });
      }
      const data = readData();
      const ticket = data.tickets[ticketId];
      if (!ticket) {
        return interaction.reply({ content: '❌ Không tìm thấy ticket!', ephemeral: true });
      }
      if (ticket.status === 'closed') {
        return interaction.reply({ content: '❌ Ticket đã đóng rồi!', ephemeral: true });
      }
      ticket.status = 'closed';
      saveData(data);

      const channel = interaction.guild.channels.cache.get(ticket.channelId);
      if (channel) {
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
        const embed = new EmbedBuilder()
          .setTitle(`🎫 Ticket #${ticketId} - ĐÃ ĐÓNG`)
          .setDescription(`🔒 Ticket đã được đóng bởi <@${interaction.user.id}>.`)
          .setColor(0x888888)
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }

      await interaction.reply({
        content: `✅ Đã đóng ticket #${ticketId}.`,
        ephemeral: true
      });
      return;
    }
  });
};