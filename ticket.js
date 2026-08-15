// ticket.js - He thong ticket bang nut bam (khong dung slash command)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'ticket_data.json');

// ===== CAU HINH - DIEN CAC ID VAO DAY =====
const TICKET_PANEL_CHANNEL_ID = "1538148316536373299"; // ID kenh se hien nut "Tao Ticket"
const TICKET_CATEGORY_ID = "1538069673294168084";      // ID danh muc (category) de chua cac kenh ticket
const TICKET_PING_ROLE_IDS = [
  "1525869199379923074",
  "1533442002849628160",
  "1525871335354405174",
  "1525888140211130550"
];

let panelMessageId = null;

function readData() {
  if (!fs.existsSync(DATA_FILE)) return { tickets: {}, nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { tickets: {}, nextId: 1 }; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function coTicketDangMo(userId, data) {
  return Object.values(data.tickets).some(t => t.userId === userId && (t.status === 'open' || t.status === 'pending'));
}

module.exports = function(client, adminIds) {

  // ===== GUI BANG TAO TICKET (CHI 1 LAN) =====
  async function guiBangTicket() {
    try {
      if (!TICKET_PANEL_CHANNEL_ID) return;
      const channel = client.channels.cache.get(TICKET_PANEL_CHANNEL_ID);
      if (!channel) return;

      if (panelMessageId) {
        try {
          const tinCu = await channel.messages.fetch(panelMessageId);
          if (tinCu) return;
        } catch {}
      }

      const messages = await channel.messages.fetch({ limit: 20 });
      const tinCuCuaBot = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (tinCuCuaBot) {
        panelMessageId = tinCuCuaBot.id;
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Tạo Ticket')
        .setDescription(
          'Hướng dẫn:\n' +
          'Bấm nút "Tạo Ticket" bên dưới để mở một cuộc trò chuyện riêng với đội ngũ hỗ trợ.\n' +
          'Mỗi người chỉ được mở tối đa 1 ticket cùng lúc.'
        )
        .setColor(0xffffff);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('Tạo Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      const sent = await channel.send({ embeds: [embed], components: [row] });
      panelMessageId = sent.id;
    } catch (err) {
      console.error('Lỗi gửi bảng ticket:', err.message);
    }
  }

  // ===== TAO TICKET =====
  async function taoTicket(interaction) {
    const userId = interaction.user.id;
    const guild = interaction.guild;

    const data = readData();
    if (coTicketDangMo(userId, data)) {
      return interaction.reply({
        content: 'Bạn đang có 1 ticket đang mở. Hãy đóng ticket cũ trước khi tạo ticket mới.',
        ephemeral: true
      }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    try {
      const ticketId = data.nextId++;
      data.tickets[ticketId] = {
        userId: userId,
        userTag: interaction.user.tag,
        status: 'open',
        createdAt: Date.now(),
        channelId: null
      };
      saveData(data);

      const channelOptions = {
        name: `ticket-${interaction.user.username.toLowerCase()}`,
        topic: `Ticket #${ticketId} | Người tạo: ${interaction.user.tag}`,
        permissionOverwrites: [
          { id: guild.id, deny: ['ViewChannel'] },
          { id: userId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
          ...adminIds.map(id => ({
            id: id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
          }))
        ]
      };
      if (TICKET_CATEGORY_ID) channelOptions.parent = TICKET_CATEGORY_ID;

      const channel = await guild.channels.create(channelOptions);
      data.tickets[ticketId].channelId = channel.id;
      saveData(data);

      let noiDungPing = `<@${userId}>`;
      for (const roleId of TICKET_PING_ROLE_IDS) noiDungPing += ` <@&${roleId}>`;

      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(
          `Người tạo: <@${userId}>\n` +
          `Trạng thái: Đang mở\n` +
          `Thời gian: <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
          `Hãy mô tả vấn đề của bạn tại đây. Đội ngũ hỗ trợ sẽ phản hồi trong ít phút.`
        )
        .setColor(0xffffff);

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('Đóng Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: noiDungPing, embeds: [embed], components: [closeRow] });

      await interaction.editReply({ content: `Đã tạo ticket! Kiểm tra kênh <#${channel.id}>.` }).catch(() => {});
    } catch (err) {
      console.error('Lỗi tạo ticket:', err.message);
      await interaction.editReply({ content: 'Có lỗi xảy ra khi tạo ticket, vui lòng thử lại.' }).catch(() => {});
    }
  }

  // ===== DONG TICKET =====
  async function dongTicket(interaction, ticketId) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    try {
      const data = readData();
      const ticket = data.tickets[ticketId];
      if (!ticket) return interaction.editReply({ content: 'Không tìm thấy ticket này!' }).catch(() => {});
      if (ticket.status === 'closed') return interaction.editReply({ content: 'Ticket đã đóng rồi!' }).catch(() => {});

      ticket.status = 'closed';
      saveData(data);

      const channel = interaction.guild.channels.cache.get(ticket.channelId);
      if (channel) {
        await channel.setName(`closed-${channel.name}`).catch(() => {});

        const overwrites = [
          { id: interaction.guild.id, deny: ['ViewChannel', 'SendMessages'] },
          ...adminIds.map(id => ({
            id: id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
          })),
          { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ];
        await channel.permissionOverwrites.set(overwrites).catch(() => {});

        const embed = new EmbedBuilder()
          .setTitle(`Ticket #${ticketId} - Đã Đóng`)
          .setDescription(
            `Ticket đã được đóng bởi <@${interaction.user.id}>.\n` +
            `Kênh này đã bị khóa, không ai có thể chat thêm.\n` +
            `Admin có thể bấm nút "Xóa Ticket" bên dưới để xóa kênh.`
          )
          .setColor(0xffffff);

        const deleteRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_delete_${ticketId}`)
            .setLabel('Xóa Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [deleteRow] });
      }

      await interaction.editReply({ content: `Đã đóng ticket #${ticketId}.` }).catch(() => {});
    } catch (err) {
      console.error('Lỗi đóng ticket:', err.message);
      await interaction.editReply({ content: 'Có lỗi xảy ra khi đóng ticket.' }).catch(() => {});
    }
  }

  // ===== XOA TICKET =====
  async function xoaTicket(interaction, ticketId) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    try {
      const data = readData();
      const ticket = data.tickets[ticketId];
      if (!ticket) return interaction.editReply({ content: 'Không tìm thấy ticket này!' }).catch(() => {});

      delete data.tickets[ticketId];
      saveData(data);

      await interaction.editReply({ content: `Đã xóa ticket #${ticketId} và dữ liệu.` }).catch(() => {});

      const channel = interaction.guild.channels.cache.get(ticket.channelId);
      if (channel) {
        await channel.delete(`Ticket #${ticketId} đã bị xóa bởi ${interaction.user.tag}`).catch(() => {});
      }
    } catch (err) {
      console.error('Lỗi xóa ticket:', err.message);
      await interaction.editReply({ content: 'Có lỗi xảy ra khi xóa ticket.' }).catch(() => {});
    }
  }

  client.once('ready', () => {
    setTimeout(guiBangTicket, 3000);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('ticket_')) return;

    const parts = interaction.customId.split('_');
    const hanhDong = parts[1];
    const ticketId = parseInt(parts[2]);

    if (hanhDong === 'create') {
      await taoTicket(interaction);
      return;
    }

    if (hanhDong === 'close' || hanhDong === 'delete') {
      if (!adminIds.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Chỉ Admin mới làm được việc này!', ephemeral: true }).catch(() => {});
      }
      if (isNaN(ticketId)) {
        return interaction.reply({ content: 'Lỗi ID ticket!', ephemeral: true }).catch(() => {});
      }
      if (hanhDong === 'close') await dongTicket(interaction, ticketId);
      else await xoaTicket(interaction, ticketId);
    }
  });
};