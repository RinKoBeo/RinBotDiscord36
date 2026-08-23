// blacklist.js - Quan ly danh sach den (chi Admin dung duoc) - FIX ALL
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'blacklist_data.json');
const BLACKLIST_CHANNEL_ID = '1532713933800996864'; // Kênh log

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
  console.warn('⚠️ CHUA SET BLACKLIST_CHANNEL_ID trong blacklist.js!');
}

module.exports = function(client, adminIds) {
  // ===== ĐĂNG KÝ SLASH COMMAND =====
  client.once('ready', async () => {
    try {
      const { SlashCommandBuilder, REST, Routes } = require('discord.js');
      const command = new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Quản lý danh sách đen (Admin)')
        .addSubcommand(sub => sub
          .setName('add')
          .setDescription('Thêm vào blacklist')
          .addUserOption(opt => opt.setName('nguoi').setDescription('Người bị blacklist'))
          .addStringOption(opt => opt.setName('ten').setDescription('Tên (nếu không có user)'))
          .addStringOption(opt => opt.setName('lydo').setDescription('Lý do').setRequired(true))
          .addStringOption(opt => opt.setName('thoihan').setDescription('Thời hạn (mặc định: Vĩnh viễn)').setRequired(false))
          .addAttachmentOption(opt => opt.setName('proof').setDescription('Proof (ảnh)'))
        )
        .addSubcommand(sub => sub
          .setName('remove')
          .setDescription('Gỡ khỏi blacklist')
          .addUserOption(opt => opt.setName('nguoi').setDescription('Người cần gỡ'))
          .addStringOption(opt => opt.setName('ten').setDescription('Tên (nếu không có user)'))
        )
        .addSubcommand(sub => sub
          .setName('check')
          .setDescription('Kiểm tra blacklist')
          .addUserOption(opt => opt.setName('nguoi').setDescription('Người cần check'))
          .addStringOption(opt => opt.setName('ten').setDescription('Tên (nếu không có user)'))
        )
        .addSubcommand(sub => sub
          .setName('list')
          .setDescription('Xem danh sách blacklist')
        );

      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: [command.toJSON()] }
      );
      console.log(' Đã đăng ký slash command /blacklist');
    } catch (err) {
      console.error(' Lỗi đăng ký blacklist:', err);
    }
  });

  // ===== XỬ LÝ TẤT CẢ INTERACTION (GOM 2 LISTENER) =====
  client.on('interactionCreate', async (interaction) => {
    // ---- XỬ LÝ BUTTON VIEW PROOF ----
    if (interaction.isButton() && interaction.customId.startsWith('blacklist_view_proof_')) {
      const key = interaction.customId.replace('blacklist_view_proof_', '');
      const data = readData();

      // Tìm entry theo key (có thể là userId hoặc ten)
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
        return interaction.reply({ content: 'Không tìm thấy proof cho mục này.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(' PROOF')
        .setImage(entry.proof)
        .setColor(0xffffff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ---- XỬ LÝ SLASH COMMAND ----
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'blacklist') return;

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({ content: 'Bạn không có quyền dùng lệnh này!', ephemeral: true });
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
      const thoihan = interaction.options.getString('thoihan') || 'Vĩnh viễn';
      const proof = interaction.options.getAttachment('proof');

      if (proof && !proof.contentType?.startsWith('image/')) {
        return interaction.editReply({ content: 'Proof phải là file ảnh (png, jpg, gif, webp).' });
      }

      const khoa = layKhoa(nguoi, ten);
      if (!khoa) {
        return interaction.editReply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.' });
      }

      const data = readData();
      if (data[khoa]) {
        return interaction.editReply({ content: 'Đối tượng này đã có trong blacklist!' });
      }

      data[khoa] = {
        userId: nguoi ? nguoi.id : null,
        ten: ten || (nguoi ? nguoi.tag : ''),
        resson: lydo,
        thoihan: thoigian,
        proof: proof ? proof.url : null,
        nguoiThem: interaction.user.id,
        thoiGian: Date.now()
      };
      await saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('ADDED TO BLACKLIST')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Target', value: nguoi ? `<@${nguoi.id}>` : ten, inline: true },
          { name: 'Reason', value: lydo, inline: true },
          { name: 'Time', value: thoihan, inline: true },
          { name: 'Added by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      if (proof) embed.setImage(proof.url);

      // Nút view proof (dùng userId hoặc ten làm customId)
      const customId = nguoi ? nguoi.id : (ten || 'unknown');
      const row = proof ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`blacklist_view_proof_${customId}`)
          .setLabel(' Xem Proof')
          .setStyle(ButtonStyle.Primary)
      ) : null;

      await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });

      // Log vào kênh blacklist
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
        return interaction.editReply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.' });
      }

      const data = readData();
      if (!data[khoa]) {
        return interaction.editReply({ content: 'Không tìm thấy trong blacklist.' });
      }
      delete data[khoa];
      await saveData(data);

      const embed = new EmbedBuilder()
        .setTitle('ĐÃ GỠ KHỎI BLACKLIST')
        .setColor(0x00FF00)
        .setDescription(`Đã gỡ ${nguoi ? `<@${nguoi.id}>` : ten} khỏi blacklist.`)
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
        return interaction.editReply({ content: 'Bạn cần điền ít nhất Người (mention) hoặc Tên.' });
      }

      const data = readData();
      const entry = data[khoa];
      if (!entry) {
        return interaction.editReply({ content: 'Không có trong blacklist.' });
      }

      const embed = new EmbedBuilder()
        .setTitle('KẾT QUẢ BLACKLIST')
        .setColor(0xffffff)
        .addFields(
          { name: 'Target', value: entry.userId ? `<@${entry.userId}>` : entry.ten, inline: true },
          { name: 'Reason', value: entry.lydo, inline: true },
          { name: 'Time', value: entry.thoihan || 'Vĩnh viễn', inline: true },
          { name: 'Added by', value: `<@${entry.nguoiThem}>`, inline: true }
        )
        .setTimestamp();

      if (entry.proof) {
        embed.setImage(entry.proof);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`blacklist_view_proof_${entry.userId || entry.ten}`)
            .setLabel('Xem Proof')
            .setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ============================================================
    // LIST (có pagination)
    // ============================================================
    if (subCmd === 'list') {
      const data = readData();
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return interaction.editReply({ content: 'Blacklist đang trống.' });
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
          const time = e.thoihan || 'Vĩnh viễn';
          moTa += `**${doiTuong}** — ${e.lydo} (Thời hạn: ${time})\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle(` DANH SÁCH BLACKLIST (Trang ${page+1}/${totalPages})`)
          .setDescription(moTa || 'Không có mục nào trên trang này.')
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
              .setLabel(' Trang trước')
              .setStyle(ButtonStyle.Primary)
          );
        }
        if (page < total - 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`blacklist_page_next_${page}`)
              .setLabel(' Trang sau')
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