// ticket.js - Hệ thống ticket tự động bằng nút bấm (FIX LỖI UNDEFINED VÀ SPAM)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../ticket_data.json');

// ===== CẤU HÌNH =====
const TICKET_CHANNEL_ID = '1526979564872532069';
const TICKET_CATEGORY_ID = '';
const PING_ROLES = ['1525869008862318693', '1525869199379923074', '1525871335354405174', '1525888140211130550'];
const ADMIN_IDS = ['1517437552213098529', '1146359469945667644'];

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
  try {
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('❌ Bot chưa tham gia server nào. Không thể gửi panel.');
      return;
    }
    const channel = guild.channels.cache.get(TICKET_CHANNEL_ID);
    if (!channel) {
      console.error(`❌ Không tìm thấy kênh ID ${TICKET_CHANNEL_ID} trong server ${guild.name}`);
      return;
    }

    // Xóa tin nhắn cũ của bot có components
    const messages = await channel.messages.fetch({ limit: 10 });
    for (const msg of messages.values()) {
      if (msg.author.id === client.user.id && msg.components.length > 0) {
        await msg.delete().catch(() => {});
      }
    }

    // ĐÚNG: Embed chỉ dành cho panel, KHÔNG dùng ticketId
    const embed = new EmbedBuilder()
      .setTitle('🎫 TẠO TICKET')
      .setDescription(
        '📌 **Hướng dẫn:**\n' +
        '• Bấm nút **"Tạo ticket"** bên dưới để tạo một ticket mới.\n' +
        '• Mỗi người chỉ được tạo tối đa **2 ticket** đang mở.\n' +
        '• Admin sẽ xem xét và hỗ trợ bạn trong kênh ticket được tạo.'
      )
      .setColor(0xffffff)
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
  } catch (error) {
    console.error('❌ Lỗi gửi ticket panel:', error);
  }
}

// ===== HÀM XỬ LÝ TẠO TICKET =====
async function handleCreateTicket(interaction) {
  // Defer ngay để tránh timeout
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const guild = interaction.guild;

  const data = readData();
  const count = getTicketCount(userId, data);
  if (count >= 2) {
    return interaction.editReply({
      content: '❌ Bạn đã có 2 ticket đang mở. Hãy đóng ticket cũ trước khi tạo mới.'
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

  // Tạo kênh ticket
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
      `• Hãy kiên nhẫn chờ Admin phản hồi.\n` +
      `• Bạn là ally hay member?\n` +
      `• Bạn vào đây với mục đích gì?`
    )
    .setColor(0xffffff)
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

  await interaction.editReply({
    content: `✅ Đã tạo ticket #${ticketId}! Kiểm tra kênh <#${channel.id}>.`
  });
}

// ===== XÓA TICKET =====
async function handleDeleteTicket(interaction, ticketId) {
  const data = readData();
  const ticket = data.tickets[ticketId];
  if (!ticket) {
    return interaction.reply({ content: '❌ Không tìm thấy ticket!', ephemeral: true });
  }

  delete data.tickets[ticketId];
  saveData(data);

  await interaction.reply({
    content: `🗑️ Đã xóa ticket #${ticketId} và dữ liệu.`,
    ephemeral: true
  });

  const channel = interaction.guild.channels.cache.get(ticket.channelId);
  if (channel) {
    await channel.delete(`Ticket #${ticketId} đã bị xóa bởi ${interaction.user.tag}`).catch(() => {});
  } else {
    console.log(`⚠️ Kênh ticket #${ticketId} không tồn tại, chỉ xóa dữ liệu.`);
  }
}

// ===== ĐÓNG TICKET =====
async function handleCloseTicket(interaction, ticketId) {
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
    await channel.setName(`closed-${channel.name}`).catch(() => {});

    const overwrites = [
      { id: interaction.guild.id, deny: ['ViewChannel', 'SendMessages'] },
      ...ADMIN_IDS.map(id => ({
        id: id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
      })),
      { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
    ];
    await channel.permissionOverwrites.set(overwrites).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle(`🔒 Ticket #${ticketId} - ĐÃ ĐÓNG`)
      .setDescription(
        `🔒 Ticket đã được đóng bởi <@${interaction.user.id}>.\n` +
        `📌 Kênh này đã bị khóa, không ai có thể chat thêm.\n` +
        `🔄 Admin có thể bấm nút **"Xóa ticket"** bên dưới để xóa kênh.`
      )
      .setColor(0xffffff)
      .setTimestamp();

    const deleteRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticketId}`)
          .setLabel('🗑️ Xóa ticket')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({ embeds: [embed], components: [deleteRow] });
  }

  await interaction.reply({
    content: `✅ Đã đóng ticket #${ticketId}.`,
    ephemeral: true
  });
}

// ===== EXPORT =====
module.exports = async function(client) {
  client.once('ready', async () => {
    setTimeout(async () => {
      await sendTicketPanel(client);
    }, 2000);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('ticket_')) return;

    const parts = interaction.customId.split('_');
    const action = parts[1];
    const ticketId = parseInt(parts[2]);

    if (action === 'close' || action === 'delete') {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: '❌ Chỉ Admin mới làm việc này!', ephemeral: true });
      }
      if (isNaN(ticketId)) {
        return interaction.reply({ content: '❌ Lỗi ID ticket!', ephemeral: true });
      }
    }

    if (action === 'create') {
      await handleCreateTicket(interaction);
    } else if (action === 'close') {
      await handleCloseTicket(interaction, ticketId);
    } else if (action === 'delete') {
      await handleDeleteTicket(interaction, ticketId);
    }
  });
};