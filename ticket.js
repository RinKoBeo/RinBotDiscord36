// ticket.js - He thong ticket (khong emoji, khong loi, 1 ticket/lan)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../ticket_data.json');
const LOCK_FILE = path.join(__dirname, '../ticket_creating.lock');
const TICKET_CHANNEL_ID = '1526979564872532069';
const TICKET_CATEGORY_ID = '';
const PING_ROLES = ['1525869008862318693', '1525869199379923074', '1525871335354405174', '1525888140211130550'];
const ADMIN_IDS = ['1517437552213098529'];

// ID rieng cho lan chay nay cua process -> dung de phat hien neu co 2 process
// cung chay (se thay 2 INSTANCE_ID khac nhau trong log cung mot luc bam nut)
const INSTANCE_ID = crypto.randomBytes(3).toString('hex');
console.log(`[ticket.js] Instance khoi tao: ${INSTANCE_ID} | PID: ${process.pid} | Thoi gian: ${new Date().toISOString()}`);

let panelMessageId = null;

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

// ===== KHOA FILE CHONG TAO TRUNG (atomic, chiu duoc ca truong hop
// listener bi gan trung trong CUNG 1 process lan LAN CAN nhieu process
// neu chung dung chung 1 o dia) =====
function acquireLock(userId) {
  try {
    // 'wx' = tao file moi, that bai neu file da ton tai -> atomic o muc OS
    const fd = fs.openSync(LOCK_FILE + '.' + userId, 'wx');
    fs.closeSync(fd);
    return true;
  } catch (e) {
    return false; // file da ton tai -> dang co 1 request khac giu khoa
  }
}
function releaseLock(userId) {
  try { fs.unlinkSync(LOCK_FILE + '.' + userId); } catch {}
}
// Don rac: neu bot crash giua chung ma khong giai phong khoa, khoa se tu
// het han sau 20s de khong bi ket vinh vien
function cleanupStaleLock(userId) {
  try {
    const p = LOCK_FILE + '.' + userId;
    const stat = fs.statSync(p);
    if (Date.now() - stat.mtimeMs > 20000) fs.unlinkSync(p);
  } catch {}
}

// ===== GUI PANEL (CHI 1 LAN) =====
async function sendTicketPanel(client) {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const channel = guild.channels.cache.get(TICKET_CHANNEL_ID);
    if (!channel) return;

    if (panelMessageId) {
      try {
        const oldMsg = await channel.messages.fetch(panelMessageId);
        if (oldMsg) return;
      } catch {}
    }

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
    console.log(`[${INSTANCE_ID}] Da gui bang ticket vao kenh:`, channel.name);
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Loi gui ticket panel:`, error);
  }
}

// ===== TAO TICKET =====
async function handleCreateTicket(interaction) {
  const userId = interaction.user.id;
  const guild = interaction.guild;

  console.log(`[${INSTANCE_ID}] Nhan click Tao ticket | user=${userId} | interactionId=${interaction.id} | luc=${new Date().toISOString()}`);

  cleanupStaleLock(userId);
  if (!acquireLock(userId)) {
    console.warn(`[${INSTANCE_ID}] BI CHAN: user ${userId} dang co 1 yeu cau tao ticket khac chay roi (interactionId=${interaction.id})`);
    return interaction.reply({
      content: 'Yeu cau tao ticket cua ban dang duoc xu ly, vui long doi vai giay...',
      ephemeral: true
    }).catch(() => {});
  }

  await interaction.deferReply({ ephemeral: true }).catch((e) => {
    console.error(`[${INSTANCE_ID}] Loi deferReply:`, e.message);
  });

  try {
    const data = readData();
    const count = getTicketCount(userId, data);
    if (count >= 2) {
      return await interaction.editReply({
        content: 'Ban da co 2 ticket dang mo. Hay dong ticket cu truoc khi tao moi.'
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

    console.log(`[${INSTANCE_ID}] Dang tao channel cho ticket #${ticketId} | user=${userId} | interactionId=${interaction.id}`);

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

    console.log(`[${INSTANCE_ID}] DA TAO XONG ticket #${ticketId} | channel=${channel.id} | interactionId=${interaction.id}`);

    await interaction.editReply({
      content: `Da tao ticket #${ticketId}! Kiem tra kenh <#${channel.id}>.`
    });
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Loi tao ticket:`, error);
    await interaction.editReply({ content: 'Co loi xay ra khi tao ticket, vui long thu lai.' }).catch(() => {});
  } finally {
    releaseLock(userId);
  }
}

// ===== XOA TICKET =====
async function handleDeleteTicket(interaction, ticketId) {
  await interaction.deferReply({ ephemeral: true }).catch((e) => {
    console.error(`[${INSTANCE_ID}] Loi deferReply (delete):`, e.message);
  });
  try {
    const data = readData();
    const ticket = data.tickets[ticketId];
    if (!ticket) {
      return await interaction.editReply({ content: 'Khong tim thay ticket!' });
    }

    delete data.tickets[ticketId];
    saveData(data);

    await interaction.editReply({ content: `Da xoa ticket #${ticketId} va du lieu.` });

    const channel = interaction.guild.channels.cache.get(ticket.channelId);
    if (channel) {
      await channel.delete(`Ticket #${ticketId} da bi xoa boi ${interaction.user.tag}`).catch(() => {});
    }
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Loi xoa ticket:`, error);
    await interaction.editReply({ content: 'Co loi xay ra khi xoa ticket.' }).catch(() => {});
  }
}

// ===== DONG TICKET =====
async function handleCloseTicket(interaction, ticketId) {
  await interaction.deferReply({ ephemeral: true }).catch((e) => {
    console.error(`[${INSTANCE_ID}] Loi deferReply (close):`, e.message);
  });
  try {
    const data = readData();
    const ticket = data.tickets[ticketId];
    if (!ticket) {
      return await interaction.editReply({ content: 'Khong tim thay ticket!' });
    }
    if (ticket.status === 'closed') {
      return await interaction.editReply({ content: 'Ticket da dong roi!' });
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

    await interaction.editReply({ content: `Da dong ticket #${ticketId}.` });
  } catch (error) {
    console.error(`[${INSTANCE_ID}] Loi dong ticket:`, error);
    await interaction.editReply({ content: 'Co loi xay ra khi dong ticket.' }).catch(() => {});
  }
}

// ===== EXPORT =====
module.exports = async function(client) {
  if (client._ticketModuleLoaded) {
    console.warn(`[${INSTANCE_ID}] [ticket.js] Module da duoc load truoc do trong CUNG 1 process nay, bo qua de tranh gan trung listener.`);
    return;
  }
  client._ticketModuleLoaded = true;

  let panelSent = false;

  client.once('ready', async () => {
    if (!panelSent) {
      setTimeout(async () => {
        await sendTicketPanel(client);
        panelSent = true;
      }, 3000);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('ticket_')) return;

    const parts = interaction.customId.split('_');
    const action = parts[1];
    const ticketId = parseInt(parts[2]);

    if (action === 'create') {
      await handleCreateTicket(interaction);
      return;
    }

    if (action === 'close' || action === 'delete') {
      if (!isAdmin(interaction.user.id)) {
        return interaction.reply({ content: 'Chi Admin moi lam viec nay!', ephemeral: true }).catch(() => {});
      }
      if (isNaN(ticketId)) {
        return interaction.reply({ content: 'Loi ID ticket!', ephemeral: true }).catch(() => {});
      }
      if (action === 'close') {
        await handleCloseTicket(interaction, ticketId);
      } else if (action === 'delete') {
        await handleDeleteTicket(interaction, ticketId);
      }
    }
  });
};