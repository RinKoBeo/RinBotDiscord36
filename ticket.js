// ticket.js - Hệ thống ticket (không emoji, không lỗi, 1 ticket/lần)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../ticket_data.json');
const TICKET_CHANNEL_ID = '1526979564872532069';
const TICKET_CATEGORY_ID = '';
const PING_ROLES = ['1525869008862318693', '1525869199379923074', '1525871335354405174', '1525888140211130550'];
const ADMIN_IDS = ['1517437552213098529'];

let panelMessageId = null; // Lưu ID tin nhắn panel để không gửi trùng

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

// ===== GỬI PANEL (CHỈ 1 LẦN) =====
async function sendTicketPanel(client) {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const channel = guild.channels.cache.get(TICKET_CHANNEL_ID);
    if (!channel) return;

    // Nếu đã có panel thì không gửi lại
    if (panelMessageId) {
      try {
        const oldMsg = await channel.messages.fetch(panelMessageId);
        if (oldMsg) return;
      } catch {}
    }

    // Xóa tin nhắn cũ của bot (chỉ xóa những tin có components)
    const messages = await channel.messages.fetch({ limit: 20 });
    for (const msg of messages.values()) {
      if (msg.author.id === client.user.id && msg.components.length > 0) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('TAO TICKET')
      .setDescription(
        'Huong dan:\n' +
        'Bam nut "Tao ticket" ben duoi de tao mot ticket moi.\n' +
        'Moi nguoi chi duoc tao toi da 2 ticket dang mo.\n' +
        'Admin se xem xet va ho tro ban trong kenh ticket duoc tao.'
      )
      .setColor(0xffffff)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('Tao ticket')
          .setStyle(ButtonStyle.Primary)
      );

    const sent = await channel.send({ embeds: [embed], components: [row] });
    panelMessageId = sent.id;
    console.log('Da gui bang ticket vao kenh:', channel.name);
  } catch (error) {
    console.error('Loi gui ticket panel:', error);
  }
}

// ===== TẠO TICKET =====
async function handleCreateTicket(interaction) {
  const userId = interaction.user.id;
  const guild = interaction.guild;

  const data = readData();
  const count = getTicketCount(userId, data);
  if (count >= 2) {
    return interaction.reply({
      content: 'Ban da co 2 ticket dang mo. Hay dong ticket cu truoc khi tao moi.',
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
    topic: `Ticket #${ticketId} | Nguoi tao: ${interaction.user.tag}`,
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

  let pingContent = `<@${userId}>`;
  for (const roleId of PING_ROLES) {
    pingContent += ` <@&${roleId}>`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Ticket #${ticketId}`)
    .setDescription(
      `Nguoi tao: <@${userId}>\n` +
      `Trang thai: Dang mo\n` +
      `Thoi gian: <t:${Math.floor(Date.now()/1000)}:F>\n\n` +
      `Huong dan:\n` +
      `Hay mo ta van de cua ban tai day.\n` +
      `Admin se phan hoi trong kenh nay.\n` +
      `Hay kien nhan cho Admin phan hoi.\n` +
      `Ban la ally hay member?\n` +
      `Ban vao day voi muc dich gi?`
    )
    .setColor(0xffffff)
    .setTimestamp();

  const closeRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel('Dong ticket')
        .setStyle(ButtonStyle.Danger)
    );

  await channel.send({
    content: pingContent,
    embeds: [embed],
    components: [closeRow]
  });

  await interaction.reply({
    content: `Da tao ticket #${ticketId}! Kiem tra kenh <#${channel.id}>.`,
    ephemeral: true
  });
}

// ===== XÓA TICKET =====
async function handleDeleteTicket(interaction, ticketId) {
  const data = readData();
  const ticket = data.tickets[ticketId];
  if (!ticket) {
    return interaction.reply({ content: 'Khong tim thay ticket!', ephemeral: true });
  }

  delete data.tickets[ticketId];
  saveData(data);

  await interaction.reply({
    content: `Da xoa ticket #${ticketId} va du lieu.`,
    ephemeral: true
  });

  const channel = interaction.guild.channels.cache.get(ticket.channelId);
  if (channel) {
    await channel.delete(`Ticket #${ticketId} da bi xoa boi ${interaction.user.tag}`).catch(() => {});
  }
}

// ===== ĐÓNG TICKET =====
async function handleCloseTicket(interaction, ticketId) {
  const data = readData();
  const ticket = data.tickets[ticketId];
  if (!ticket) {
    return interaction.reply({ content: 'Khong tim thay ticket!', ephemeral: true });
  }
  if (ticket.status === 'closed') {
    return interaction.reply({ content: 'Ticket da dong roi!', ephemeral: true });
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
      .setTitle(`Ticket #${ticketId} - DA DONG`)
      .setDescription(
        `Ticket da duoc dong boi <@${interaction.user.id}>.\n` +
        `Kenh nay da bi khoa, khong ai co the chat them.\n` +
        `Admin co the bam nut "Xoa ticket" ben duoi de xoa kenh.`
      )
      .setColor(0xffffff)
      .setTimestamp();

    const deleteRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticketId}`)
          .setLabel('Xoa ticket')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({ embeds: [embed], components: [deleteRow] });
  }

  await interaction.reply({
    content: `Da dong ticket #${ticketId}.`,
    ephemeral: true
  });
}

// ===== EXPORT =====
module.exports = async function(client) {
  // Chỉ gửi panel 1 lần khi bot ready
  let panelSent = false;

  client.once('ready', async () => {
    if (!panelSent) {
      setTimeout(async () => {
        await sendTicketPanel(client);
        panelSent = true;
      }, 3000);
    }
  });

  // Xử lý interaction (chỉ 1 listener)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('ticket_')) return;

    const parts = interaction.customId.split('_');
    const action = parts[1];
    const ticketId = parseInt(parts[2]);

    // Nếu action là create thì không cần ticketId
    if (action === 'create') {
      await handleCreateTicket(interaction);
      return;
    }

    // close và delete cần admin và ticketId
    if (action === 'close' || action === 'delete') {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: 'Chi Admin moi lam viec nay!', ephemeral: true });
      }
      if (isNaN(ticketId)) {
        return interaction.reply({ content: 'Loi ID ticket!', ephemeral: true });
      }
      if (action === 'close') {
        await handleCloseTicket(interaction, ticketId);
      } else if (action === 'delete') {
        await handleDeleteTicket(interaction, ticketId);
      }
    }
  });
};