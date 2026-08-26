// blacklist.js - Blacklist management (Admin only)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'blacklist_data.json');
const BLACKLIST_CHANNEL_ID = '1532713933800996864'; // Log channel

let isWriting = false;

function readData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}

function saveData(data) {
  return new Promise((resolve, reject) => {
    const waitForLock = () => {
      if (isWriting) {
        setTimeout(waitForLock, 50);
        return;
      }
      isWriting = true;
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        isWriting = false;
        resolve();
      } catch (err) {
        isWriting = false;
        reject(err);
      }
    };
    waitForLock();
  });
}

function layKhoa(nguoi, ten) {
  if (nguoi) return `user:${nguoi.id}`;
  if (ten) return `ten:${ten.trim().toLowerCase()}`;
  return null;
}

if (!BLACKLIST_CHANNEL_ID) {
  console.warn('WARNING: BLACKLIST_CHANNEL_ID is not set in blacklist.js!');
}

// LUU Y: Lenh /blacklist da duoc dang ky tap trung trong index.js (guild
// command cho moi server bot dang o). File nay KHONG tu dang ky lenh rieng
// nua - tranh bi trung lenh / bi ghi de len danh sach lenh cua index.js.
module.exports = function(client, adminIds) {
  client.on('interactionCreate', async (interaction) => {
    // ---- VIEW PROOF BUTTON ----
    if (interaction.isButton() && interaction.customId.startsWith('blacklist_view_proof_')) {
      const key = interaction.customId.replace('blacklist_view_proof_', '');
      const data = readData();

      let entry = data[key];
      if (!entry) {
        for (const k of Object.keys(data)) {
          const e = data[k];
          if (e.userId === key || e.ten === key) {
            entry = e;
            break;
          }
        }
      }

      if (!entry || !entry.proof) {
        return interaction.reply({ content: 'No proof found for this entry.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Proof')
        .setImage(entry.proof)
        .setColor(0xffffff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ---- SLASH COMMAND ----
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'blacklist') return;

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: "You don't have permission to use this command!", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const subCmd = interaction.options.getSubcommand();

    // ============================================================
    // ADD
    // ============================================================
    if (subCmd === 'add') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const lydo = interaction.options.getString('lydo');
      const thoihan = interaction.options.getString('thoihan') || 'Permanent';
      const thoigian = interaction.options.getString('thoigian') || null;
      const proof = interaction.options.getAttachment('proof');

      if (proof && !proof.contentType?.startsWith('image/')) {
        return interaction.editReply({ content: 'Proof must be an image file (png, jpg, gif, webp).' });
      }

      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.editReply({ content: 'You must provide at least a User (mention) or a Name.' });
      }

      const data = readData();
      if (data[khoa]) {
        return interaction.editReply({ content: 'This target is already in the blacklist!' });
      }

      data[khoa] = {
        userId: nguoi ? nguoi.id : null,
        ten: ten || (nguoi ? nguoi.tag : ''),
        lydo: lydo,
        thoihan: thoihan,
        thoigian: thoigian,
        proof: proof ? proof.url : null,
        nguoiThem: interaction.user.id,
        thoiGianThem: Date.now()
      };
      await saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('Added To Blacklist')
        .setColor(0xffffff)
        .addFields(
          { name: 'Target', value: nguoi ? `<@${nguoi.id}>` : ten, inline: true },
          { name: 'Reason', value: lydo, inline: true },
          { name: 'Duration', value: thoihan, inline: true },
          { name: 'Added by', value: `<@${interaction.user.id}>`, inline: true }
        );

      if (thoigian) embed.addFields({ name: 'Date', value: thoigian, inline: true });
      if (proof) embed.setImage(proof.url);
      embed.setTimestamp();

      const customId = nguoi ? nguoi.id : (ten || 'unknown');
      const row = proof ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`blacklist_view_proof_${customId}`)
          .setLabel('View Proof')
          .setStyle(ButtonStyle.Primary)
      ) : null;

      await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });

      if (BLACKLIST_CHANNEL_ID) {
        const channel = interaction.guild.channels.cache.get(BLACKLIST_CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embed], components: row ? [row] : [] }).catch(() => {});
        }
      }
      return;
    }

    // ============================================================
    // REMOVE
    // ============================================================
    if (subCmd === 'remove') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.editReply({ content: 'You must provide at least a User (mention) or a Name.' });
      }

      const data = readData();
      if (!data[khoa]) {
        return interaction.editReply({ content: 'Not found in the blacklist.' });
      }
      delete data[khoa];
      await saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('Removed From Blacklist')
        .setColor(0xffffff)
        .setDescription(`Removed ${nguoi ? `<@${nguoi.id}>` : ten} from the blacklist.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      if (BLACKLIST_CHANNEL_ID) {
        const channel = interaction.guild.channels.cache.get(BLACKLIST_CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
      return;
    }

    // ============================================================
    // CHECK
    // ============================================================
    if (subCmd === 'check') {
      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.editReply({ content: 'You must provide at least a User (mention) or a Name.' });
      }

      const data = readData();
      const entry = data[khoa];
      if (!entry) {
        return interaction.editReply({ content: 'Not in the blacklist.' });
      }

      const embed = new EmbedBuilder()
        .setTitle('Blacklist Lookup Result')
        .setColor(0xffffff)
        .addFields(
          { name: 'Target', value: entry.userId ? `<@${entry.userId}>` : entry.ten, inline: true },
          { name: 'Reason', value: entry.lydo, inline: true },
          { name: 'Duration', value: entry.thoihan || 'Permanent', inline: true },
          { name: 'Added by', value: `<@${entry.nguoiThem}>`, inline: true }
        );

      if (entry.thoigian) embed.addFields({ name: 'Date', value: entry.thoigian, inline: true });
      embed.setTimestamp();

      if (entry.proof) {
        embed.setImage(entry.proof);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`blacklist_view_proof_${entry.userId || entry.ten}`)
            .setLabel('View Proof')
            .setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ============================================================
    // LIST (paginated)
    // ============================================================
    if (subCmd === 'list') {
      const data = readData();
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return interaction.editReply({ content: 'The blacklist is empty.' });
      }

      const ITEMS_PER_PAGE = 5;
      const totalPages = Math.ceil(keys.length / ITEMS_PER_PAGE);
      let currentPage = 0;

      function taoEmbed(page) {
        const start = page * ITEMS_PER_PAGE;
        const end = Math.min(start + ITEMS_PER_PAGE, keys.length);
        const pageKeys = keys.slice(start, end);

        let moTa = '';
        for (const k of pageKeys) {
          const e = data[k];
          const doiTuong = e.userId ? `<@${e.userId}>` : e.ten;
          const thoihan = e.thoihan || 'Permanent';
          const ngay = e.thoigian ? ` | Date: ${e.thoigian}` : '';
          moTa += `**${doiTuong}** — ${e.lydo} (Duration: ${thoihan}${ngay})\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`Blacklist (Page ${page + 1}/${totalPages})`)
          .setDescription(moTa || 'No entries on this page.')
          .setColor(0xffffff)
          .setTimestamp();

        return embed;
      }

      function taoButton(page, total) {
        const row = new ActionRowBuilder();
        if (page > 0) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`blacklist_page_prev_${page}`)
              .setLabel('Previous Page')
              .setStyle(ButtonStyle.Primary)
          );
        }
        if (page < total - 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`blacklist_page_next_${page}`)
              .setLabel('Next Page')
              .setStyle(ButtonStyle.Primary)
          );
        }
        return row;
      }

      const embed = taoEmbed(0);
      const row = taoButton(0, totalPages);
      const msg = await interaction.editReply({
        embeds: [embed],
        components: row.components.length > 0 ? [row] : []
      });

      if (totalPages > 1) {
        const filter = (i) => i.customId.startsWith('blacklist_page_') && i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
          const parts = i.customId.split('_');
          const action = parts[2];
          const current = parseInt(parts[3]);

          if (action === 'prev') currentPage = current - 1;
          else if (action === 'next') currentPage = current + 1;

          const newEmbed = taoEmbed(currentPage);
          const newRow = taoButton(currentPage, totalPages);

          await i.update({
            embeds: [newEmbed],
            components: newRow.components.length > 0 ? [newRow] : []
          });
        });
      }
      return;
    }
  });
};