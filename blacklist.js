// blacklist.js - QUẢN LÝ BLACKLIST
// Discord.js v14
// - /blacklist add: thêm blacklist, Proof bắt buộc
// - /blacklist remove: gỡ blacklist
// - /blacklist check: kiểm tra blacklist
// - /blacklist list: danh sách công khai cho toàn server
// - Proof chỉ người bấm nút mới xem được
// - Bảng thông tin hiển thị theo hàng dọc
// - Có pagination
// - Dữ liệu lưu vào blacklist_data.json

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'blacklist_data.json');

// Kênh log blacklist
const BLACKLIST_CHANNEL_ID = '1532713933800996864';

let isWriting = false;

// ============================================================
// ĐỌC DATA
// ============================================================

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error(' Không thể đọc blacklist_data.json:', err);
    return {};
  }
}

// ============================================================
// LƯU DATA
// ============================================================

function saveData(data) {
  return new Promise((resolve, reject) => {
    const waitForLock = () => {
      if (isWriting) {
        setTimeout(waitForLock, 50);
        return;
      }

      isWriting = true;

      try {
        fs.writeFileSync(
          DATA_FILE,
          JSON.stringify(data, null, 2),
          'utf8'
        );

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

// ============================================================
// TẠO KEY
// ============================================================

function layKhoa(nguoi, ten) {
  if (nguoi) {
    return `user:${nguoi.id}`;
  }

  if (ten) {
    return `ten:${ten.trim().toLowerCase()}`;
  }

  return null;
}

// ============================================================
// ESCAPE CUSTOM ID
// ============================================================

function taoProofCustomId(entry) {
  if (entry.userId) {
    return `blacklist_view_proof_user_${entry.userId}`;
  }

  // Với tên, dùng key để tránh customId chứa ký tự lạ
  return `blacklist_view_proof_key_${Buffer
    .from(entry.key || '')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`;
}

// ============================================================
// TÌM ENTRY THEO KEY
// ============================================================

function timEntryTheoKey(data, key) {
  if (data[key]) {
    return {
      key,
      entry: data[key]
    };
  }

  return null;
}

// ============================================================
// TÌM ENTRY THEO USER ID
// ============================================================

function timEntryTheoUserId(data, userId) {
  for (const [key, entry] of Object.entries(data)) {
    if (entry.userId === userId) {
      return {
        key,
        entry
      };
    }
  }

  return null;
}

// ============================================================
// TÌM ENTRY THEO CUSTOM ID PROOF
// ============================================================

function timEntryProof(data, customId) {
  if (customId.startsWith('blacklist_view_proof_user_')) {
    const userId = customId.replace(
      'blacklist_view_proof_user_',
      ''
    );

    return timEntryTheoUserId(data, userId);
  }

  if (customId.startsWith('blacklist_view_proof_key_')) {
    const encoded = customId.replace(
      'blacklist_view_proof_key_',
      ''
    );

    try {
      const key = Buffer
        .from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        .toString('utf8');

      return timEntryTheoKey(data, key);
    } catch {
      return null;
    }
  }

  return null;
}

// ============================================================
// TẠO BUTTON PROOF
// ============================================================

function taoProofButton(entry, key) {
  const customId = taoProofCustomId({
    ...entry,
    key
  });

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('🔎 Xem Proof')
      .setStyle(ButtonStyle.Primary)
  );
}

// ============================================================
// TẠO EMBED BLACKLIST
// ============================================================

function taoBlacklistEmbed(entry, title = ' BLACKLIST') {
  const target = entry.userId
    ? `<@${entry.userId}>`
    : (entry.ten || 'Không xác định');

  const reason = entry.lydo || entry.resson || 'Không có lý do';

  const thoihan = entry.thoihan || 'Vĩnh viễn';

  const addedBy = entry.nguoiThem
    ? `<@${entry.nguoiThem}>`
    : 'Không xác định';

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(0xFF0000)
    .addFields(
      {
        name: ' Target',
        value: String(target),
        inline: false
      },
      {
        name: ' Reason',
        value: String(reason),
        inline: false
      },
      {
        name: ' Thời hạn',
        value: String(thoihan),
        inline: false
      },
      {
        name: ' Added by',
        value: String(addedBy),
        inline: false
      }
    )
    .setFooter({
      text: 'Proof được bảo mật — chỉ người bấm nút mới xem được.'
    })
    .setTimestamp(
      entry.thoiGian
        ? new Date(entry.thoiGian)
        : new Date()
    );
}

// ============================================================
// MODULE
// ============================================================

module.exports = function(client, adminIds) {

  // ============================================================
  // ĐĂNG KÝ SLASH COMMAND
  // ============================================================

  client.once('ready', async () => {
    try {
      const command = new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Quản lý danh sách đen');

      // --------------------------------------------------------
      // ADD
      // --------------------------------------------------------

      command.addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Thêm một người vào blacklist')

          .addUserOption(opt =>
            opt
              .setName('nguoi')
              .setDescription('Người bị blacklist')
              .setRequired(false)
          )

          .addStringOption(opt =>
            opt
              .setName('ten')
              .setDescription('Tên nếu không chọn user')
              .setRequired(false)
          )

          .addStringOption(opt =>
            opt
              .setName('lydo')
              .setDescription('Lý do blacklist')
              .setRequired(true)
          )

          .addStringOption(opt =>
            opt
              .setName('thoihan')
              .setDescription('Thời hạn, ví dụ: 7 ngày / 30 ngày / Vĩnh viễn')
              .setRequired(false)
          )

          .addAttachmentOption(opt =>
            opt
              .setName('proof')
              .setDescription('Proof bắt buộc - chỉ nhận ảnh')
              .setRequired(true)
          )
      );

      // --------------------------------------------------------
      // REMOVE
      // --------------------------------------------------------

      command.addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Gỡ một người khỏi blacklist')

          .addUserOption(opt =>
            opt
              .setName('nguoi')
              .setDescription('Người cần gỡ')
              .setRequired(false)
          )

          .addStringOption(opt =>
            opt
              .setName('ten')
              .setDescription('Tên nếu không chọn user')
              .setRequired(false)
          )
      );

      // --------------------------------------------------------
      // CHECK
      // --------------------------------------------------------

      command.addSubcommand(sub =>
        sub
          .setName('check')
          .setDescription('Kiểm tra blacklist')

          .addUserOption(opt =>
            opt
              .setName('nguoi')
              .setDescription('Người cần kiểm tra')
              .setRequired(false)
          )

          .addStringOption(opt =>
            opt
              .setName('ten')
              .setDescription('Tên nếu không chọn user')
              .setRequired(false)
          )
      );

      // --------------------------------------------------------
      // LIST
      // --------------------------------------------------------

      command.addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('Xem danh sách blacklist')
      );

      const rest = new REST({
        version: '10'
      }).setToken(process.env.TOKEN);

      await rest.put(
        Routes.applicationCommands(client.user.id),
        {
          body: [command.toJSON()]
        }
      );

      console.log(' Đã đăng ký slash command /blacklist');

    } catch (err) {
      console.error(' Lỗi đăng ký blacklist:', err);
    }
  });

  // ============================================================
  // INTERACTION
  // ============================================================

  client.on('interactionCreate', async interaction => {

    // ==========================================================
    // BUTTON PROOF
    // ==========================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith('blacklist_view_proof_')
    ) {
      try {
        const data = readData();

        const result = timEntryProof(
          data,
          interaction.customId
        );

        if (!result || !result.entry) {
          return interaction.reply({
            content: ' Không tìm thấy blacklist hoặc proof.',
            ephemeral: true
          });
        }

        const entry = result.entry;

        if (!entry.proof) {
          return interaction.reply({
            content: ' Mục blacklist này không có proof.',
            ephemeral: true
          });
        }

        // QUAN TRỌNG:
        // ephemeral = true
        // Chỉ người bấm nút mới thấy
        const embed = new EmbedBuilder()
          .setTitle(' PROOF BLACKLIST')
          .setColor(0xFFFFFF)
          .setImage(entry.proof)
          .setFooter({
            text: 'Proof này chỉ hiển thị cho bạn.'
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

      } catch (err) {
        console.error(' Lỗi xem proof:', err);

        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: ' Có lỗi xảy ra khi xem proof.',
            ephemeral: true
          });
        }
      }
    }

    // ==========================================================
    // BUTTON PAGINATION
    // ==========================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith('blacklist_page_')
    ) {
      try {
        const parts = interaction.customId.split('_');

        const action = parts[2];
        const page = parseInt(parts[3]);

        if (
          Number.isNaN(page) ||
          !['prev', 'next'].includes(action)
        ) {
          return interaction.reply({
            content: ' Nút không hợp lệ.',
            ephemeral: true
          });
        }

        const data = readData();
        const keys = Object.keys(data);

        const ITEMS_PER_PAGE = 5;
        const totalPages = Math.max(
          1,
          Math.ceil(keys.length / ITEMS_PER_PAGE)
        );

        let newPage = page;

        if (action === 'prev') {
          newPage = page - 1;
        }

        if (action === 'next') {
          newPage = page + 1;
        }

        newPage = Math.max(
          0,
          Math.min(newPage, totalPages - 1)
        );

        const embed = taoListEmbed(
          data,
          keys,
          newPage,
          ITEMS_PER_PAGE,
          totalPages
        );

        const row = taoPaginationButtons(
          newPage,
          totalPages
        );

        return interaction.update({
          embeds: [embed],
          components: row ? [row] : []
        });

      } catch (err) {
        console.error(' Lỗi pagination blacklist:', err);

        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: ' Không thể chuyển trang.',
            ephemeral: true
          });
        }
      }
    }

    // ==========================================================
    // CHỈ NHẬN SLASH COMMAND
    // ==========================================================

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName !== 'blacklist') {
      return;
    }

    // ==========================================================
    // CHECK ADMIN
    // ==========================================================

    if (!adminIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: ' Bạn không có quyền sử dụng lệnh này!',
        ephemeral: true
      });
    }

    const subCmd = interaction.options.getSubcommand();

    // ==========================================================
    // ADD
    // ==========================================================

    if (subCmd === 'add') {

      await interaction.deferReply({
        ephemeral: true
      });

      const nguoi = interaction.options.getUser('nguoi');
      const ten = interaction.options.getString('ten');
      const lydo = interaction.options.getString('lydo');
      const thoihan =
        interaction.options.getString('thoihan') ||
        'Vĩnh viễn';

      const proof =
        interaction.options.getAttachment('proof');

      // --------------------------------------------------------
      // BẮT BUỘC TARGET
      // --------------------------------------------------------

      const khoa = layKhoa(
        nguoi,
        ten
      );

      if (!khoa) {
        return interaction.editReply({
          content:
            ' Bạn phải chọn **Người** hoặc nhập **Tên**.'
        });
      }

      // --------------------------------------------------------
      // BẮT BUỘC PROOF
      // --------------------------------------------------------

      if (!proof) {
        return interaction.editReply({
          content:
            ' Bạn phải cung cấp **Proof** (file ảnh).'
        });
      }

      // --------------------------------------------------------
      // PROOF PHẢI LÀ ẢNH
      // --------------------------------------------------------

      if (
        !proof.contentType ||
        !proof.contentType.startsWith('image/')
      ) {
        return interaction.editReply({
          content:
            ' Proof phải là file ảnh: PNG, JPG, JPEG, GIF hoặc WEBP.'
        });
      }

      const data = readData();

      // --------------------------------------------------------
      // KIỂM TRA TRÙNG
      // --------------------------------------------------------

      if (data[khoa]) {
        return interaction.editReply({
          content:
            ' Đối tượng này đã có trong blacklist!'
        });
      }

      // --------------------------------------------------------
      // LƯU DATA
      // --------------------------------------------------------

      data[khoa] = {
        userId: nguoi
          ? nguoi.id
          : null,

        ten: ten ||
          (nguoi
            ? nguoi.tag
            : ''),

        lydo: lydo,

        thoihan: thoihan,

        proof: proof.url,

        nguoiThem:
          interaction.user.id,

        thoiGian:
          Date.now()
      };

      await saveData(data);

      // --------------------------------------------------------
      // EMBED
      // --------------------------------------------------------

      const embed =
        taoBlacklistEmbed(
          data[khoa],
          ' ĐÃ THÊM VÀO BLACKLIST'
        );

      // --------------------------------------------------------
      // BUTTON PROOF
      // --------------------------------------------------------

      const row =
        taoProofButton(
          data[khoa],
          khoa
        );

      // --------------------------------------------------------
      // TRẢ VỀ CHO ADMIN
      // --------------------------------------------------------

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

      // --------------------------------------------------------
      // LOG KÊNH BLACKLIST
      // --------------------------------------------------------

      if (BLACKLIST_CHANNEL_ID) {

        const channel =
          interaction.guild.channels.cache.get(
            BLACKLIST_CHANNEL_ID
          );

        if (channel) {

          await channel.send({
            embeds: [embed],
            components: [row]
          }).catch(err => {
            console.error(
              ' Không gửi được blacklist log:',
              err
            );
          });

        }
      }

      return;
    }

    // ==========================================================
    // REMOVE
    // ==========================================================

    if (subCmd === 'remove') {

      await interaction.deferReply({
        ephemeral: true
      });

      const nguoi =
        interaction.options.getUser('nguoi');

      const ten =
        interaction.options.getString('ten');

      const khoa =
        layKhoa(
          nguoi,
          ten
        );

      if (!khoa) {
        return interaction.editReply({
          content:
            ' Bạn phải chọn **Người** hoặc nhập **Tên**.'
        });
      }

      const data =
        readData();

      if (!data[khoa]) {
        return interaction.editReply({
          content:
            ' Không tìm thấy đối tượng trong blacklist.'
        });
      }

      const oldEntry =
        data[khoa];

      delete data[khoa];

      await saveData(data);

      const target =
        oldEntry.userId
          ? `<@${oldEntry.userId}>`
          : oldEntry.ten;

      const embed =
        new EmbedBuilder()
          .setTitle(' ĐÃ GỠ KHỎI BLACKLIST')
          .setColor(0x00FF00)
          .addFields(
            {
              name: 'Target',
              value: String(target),
              inline: false
            },
            {
              name: 'Removed by',
              value: `<@${interaction.user.id}>`,
              inline: false
            }
          )
          .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

      // Log
      if (BLACKLIST_CHANNEL_ID) {

        const channel =
          interaction.guild.channels.cache.get(
            BLACKLIST_CHANNEL_ID
          );

        if (channel) {
          await channel.send({
            embeds: [embed]
          }).catch(() => {});
        }
      }

      return;
    }

    // ==========================================================
    // CHECK
    // ==========================================================

    if (subCmd === 'check') {

      await interaction.deferReply({
        ephemeral: true
      });

      const nguoi =
        interaction.options.getUser('nguoi');

      const ten =
        interaction.options.getString('ten');

      const khoa =
        layKhoa(
          nguoi,
          ten
        );

      if (!khoa) {
        return interaction.editReply({
          content:
            ' Bạn phải chọn **Người** hoặc nhập **Tên**.'
        });
      }

      const data =
        readData();

      let result =
        timEntryTheoKey(
          data,
          khoa
        );

      // Nếu tìm bằng tên nhưng data key khác
      if (!result && nguoi) {
        result =
          timEntryTheoUserId(
            data,
            nguoi.id
          );
      }

      if (!result) {
        return interaction.editReply({
          content:
            ' Đối tượng này **không có trong blacklist**.'
        });
      }

      const embed =
        taoBlacklistEmbed(
          result.entry,
          '🔎 KẾT QUẢ BLACKLIST'
        );

      const row =
        taoProofButton(
          result.entry,
          result.key
        );

      return interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    }

    // ==========================================================
    // LIST
    // ==========================================================

    if (subCmd === 'list') {

      // QUAN TRỌNG:
      // KHÔNG ephemeral
      // => Tất cả người trong server đều xem được
      await interaction.deferReply({
        ephemeral: false
      });

      const data =
        readData();

      const keys =
        Object.keys(data);

      if (keys.length === 0) {
        return interaction.editReply({
          content:
            '📭 Blacklist hiện đang trống.'
        });
      }

      const ITEMS_PER_PAGE = 5;

      const totalPages =
        Math.ceil(
          keys.length /
          ITEMS_PER_PAGE
        );

      const currentPage = 0;

      const embed =
        taoListEmbed(
          data,
          keys,
          currentPage,
          ITEMS_PER_PAGE,
          totalPages
        );

      const row =
        taoPaginationButtons(
          currentPage,
          totalPages
        );

      await interaction.editReply({
        embeds: [embed],
        components: row ? [row] : []
      });

      return;
    }
  });
};

// ============================================================
// TẠO EMBED LIST
// ============================================================

function taoListEmbed(
  data,
  keys,
  page,
  itemsPerPage,
  totalPages
) {

  const start =
    page * itemsPerPage;

  const end =
    Math.min(
      start + itemsPerPage,
      keys.length
    );

  const pageKeys =
    keys.slice(
      start,
      end
    );

  const embed =
    new EmbedBuilder()
      .setTitle(
        ` DANH SÁCH BLACKLIST`
      )
      .setColor(0xFF0000)
      .setDescription(
        `**Trang ${page + 1}/${totalPages}**\n` +
        `Tổng số: **${keys.length}** blacklist`
      )
      .setTimestamp();

  for (const key of pageKeys) {

    const entry =
      data[key];

    const target =
      entry.userId
        ? `<@${entry.userId}>`
        : (entry.ten || 'Không xác định');

    const reason =
      entry.lydo ||
      entry.resson ||
      'Không có lý do';

    const time =
      entry.thoihan ||
      'Vĩnh viễn';

    const addedBy =
      entry.nguoiThem
        ? `<@${entry.nguoiThem}>`
        : 'Không xác định';

    // MỖI BLACKLIST XỔ DỌC
    embed.addFields(
      {
        name: '━━━━━━━━━━━━━━━━━━━━',
        value: '\u200B',
        inline: false
      },
      {
        name: ' Target',
        value: String(target),
        inline: false
      },
      {
        name: ' Reason',
        value: String(reason),
        inline: false
      },
      {
        name: ' Thời hạn',
        value: String(time),
        inline: false
      },
      {
        name: ' Added by',
        value: String(addedBy),
        inline: false
      }
    );
  }

  return embed;
}

// ============================================================
// TẠO BUTTON PAGINATION
// ============================================================

function taoPaginationButtons(
  page,
  totalPages
) {

  if (totalPages <= 1) {
    return null;
  }

  const row =
    new ActionRowBuilder();

  // Trang trước
  if (page > 0) {

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `blacklist_page_prev_${page}`
        )
        .setLabel('◀ Trang trước')
        .setStyle(
          ButtonStyle.Primary
        )
    );
  }

  // Hiện trang
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(
        `blacklist_page_current_${page}`
      )
      .setLabel(
        `Trang ${page + 1}/${totalPages}`
      )
      .setStyle(
        ButtonStyle.Secondary
      )
      .setDisabled(true)
  );

  // Trang sau
  if (page < totalPages - 1) {

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `blacklist_page_next_${page}`
        )
        .setLabel('Trang sau ▶')
        .setStyle(
          ButtonStyle.Primary
        )
    );
  }

  return row;
}