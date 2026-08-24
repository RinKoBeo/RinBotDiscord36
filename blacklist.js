// ============================================================
// blacklist.js - QUẢN LÝ BLACKLIST
// Discord.js v14
// ============================================================

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

// ============================================================
// CONFIG
// ============================================================

const DATA_FILE = path.join(
  __dirname,
  'blacklist_data.json'
);

// Kênh log blacklist
const BLACKLIST_CHANNEL_ID = '1532713933800996864';

// ============================================================
// ĐỌC DATA
// ============================================================

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(DATA_FILE, 'utf8')
    );
  } catch (err) {
    console.error(
      ' Lỗi đọc blacklist_data.json:',
      err
    );

    return {};
  }
}

// ============================================================
// LƯU DATA
// ============================================================

function saveData(data) {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return true;
  } catch (err) {
    console.error(
      ' Lỗi lưu blacklist_data.json:',
      err
    );

    return false;
  }
}

// ============================================================
// TẠO KEY
// ============================================================

function layKhoa(nguoi, ten) {
  if (nguoi) {
    return `user:${nguoi.id}`;
  }

  if (ten && ten.trim()) {
    return `ten:${ten.trim().toLowerCase()}`;
  }

  return null;
}

// ============================================================
// MÃ HÓA KEY CHO BUTTON
// Tránh customId bị lỗi do tên có ký tự đặc biệt
// ============================================================

function encodeKey(key) {
  return Buffer
    .from(key, 'utf8')
    .toString('base64url');
}

function decodeKey(value) {
  try {
    return Buffer
      .from(value, 'base64url')
      .toString('utf8');
  } catch {
    return null;
  }
}

// ============================================================
// TẠO CUSTOM ID PROOF
// ============================================================

function taoProofCustomId(key) {
  return `blacklist_proof_${encodeKey(key)}`;
}

// ============================================================
// TÌM ENTRY TỪ CUSTOM ID
// ============================================================

function layEntryTuButton(customId) {
  const prefix = 'blacklist_proof_';

  if (!customId.startsWith(prefix)) {
    return null;
  }

  const encoded = customId.slice(
    prefix.length
  );

  const key = decodeKey(encoded);

  if (!key) {
    return null;
  }

  const data = readData();

  if (!data[key]) {
    return null;
  }

  return {
    key,
    entry: data[key]
  };
}

// ============================================================
// TẠO NÚT PROOF
// ============================================================

function taoProofButton(key) {
  return new ButtonBuilder()
    .setCustomId(
      taoProofCustomId(key)
    )
    .setLabel('Proof')
    
    .setStyle(ButtonStyle.Primary);
}

// ============================================================
// TẠO EMBED ADD
// ============================================================

function taoEmbedAdd(entry) {
  const embed = new EmbedBuilder()
    .setTitle('ADDED TO BLACKLIST')
    .setColor(0xFF0000)
    .addFields(
      {
        name: ' Target',
        value: entry.userId
          ? `<@${entry.userId}>`
          : String(entry.ten || 'Không có'),
        inline: false
      },
      {
        name: ' Reason',
        value: String(
          entry.lydo || 'Không có'
        ).slice(0, 1024),
        inline: false
      },
      {
        name: ' Time',
        value: String(
          entry.thoihan || 'Vĩnh viễn'
        ).slice(0, 1024),
        inline: false
      },
      {
        name: 'Added by',
        value: entry.nguoiThem
          ? `<@${entry.nguoiThem}>`
          : 'Không xác định',
        inline: false
      }
    )
    .setTimestamp(
      entry.thoiGian
        ? new Date(entry.thoiGian)
        : new Date()
    );

  if (entry.proof) {
    embed.setImage(entry.proof);
  }

  return embed;
}

// ============================================================
// TẠO EMBED CHECK
// ============================================================

function taoEmbedCheck(entry) {
  const embed = new EmbedBuilder()
    .setTitle(' KẾT QUẢ BLACKLIST')
    .setColor(0xFFFFFF)
    .addFields(
      {
        name: ' Target',
        value: entry.userId
          ? `<@${entry.userId}>`
          : String(entry.ten || 'Không có'),
        inline: false
      },
      {
        name: ' Reason',
        value: String(
          entry.lydo || 'Không có'
        ).slice(0, 1024),
        inline: false
      },
      {
        name: '⏱ Time',
        value: String(
          entry.thoihan || 'Vĩnh viễn'
        ).slice(0, 1024),
        inline: false
      },
      {
        name: ' Added by',
        value: entry.nguoiThem
          ? `<@${entry.nguoiThem}>`
          : 'Không xác định',
        inline: false
      }
    )
    .setTimestamp(
      entry.thoiGian
        ? new Date(entry.thoiGian)
        : new Date()
    );

  return embed;
}

// ============================================================
// TẠO EMBED LIST
// ============================================================

function taoEmbedList(
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
    keys.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle(
      ` DANH SÁCH BLACKLIST`
    )
    .setDescription(
      `Trang **${page + 1}/${totalPages}**\n\n` +
      ` Proof được bảo mật. Bấm nút **Proof** bên dưới để xem.`
    )
    .setColor(0xFFFFFF)
    .setTimestamp();

  for (let index = 0; index < pageKeys.length; index++) {
    const key = pageKeys[index];
    const entry = data[key];

    const target = entry.userId
      ? `<@${entry.userId}>`
      : String(entry.ten || 'Không có');

    const reason = String(
      entry.lydo || 'Không có'
    ).slice(0, 900);

    const time = String(
      entry.thoihan || 'Vĩnh viễn'
    ).slice(0, 900);

    embed.addFields({
      name:
        ` #${start + index + 1} — ${target}`,
      value:
        `** Lý do:** ${reason}\n` +
        `**⏱ Thời hạn:** ${time}`,
      inline: false
    });
  }

  return embed;
}

// ============================================================
// TẠO BUTTON LIST
// ============================================================

function taoListComponents(
  data,
  keys,
  page,
  itemsPerPage,
  totalPages
) {
  const components = [];

  const start =
    page * itemsPerPage;

  const end =
    Math.min(
      start + itemsPerPage,
      keys.length
    );

  const pageKeys =
    keys.slice(start, end);

  // ----------------------------------------------------------
  // ROW PROOF
  // Discord tối đa 5 button / row
  // ----------------------------------------------------------

  let proofRow =
    new ActionRowBuilder();

  for (const key of pageKeys) {

    if (
      proofRow.components.length >= 5
    ) {
      components.push(proofRow);

      proofRow =
        new ActionRowBuilder();
    }

    proofRow.addComponents(
      taoProofButton(key)
    );
  }

  if (proofRow.components.length > 0) {
    components.push(proofRow);
  }

  // ----------------------------------------------------------
  // ROW PAGINATION
  // ----------------------------------------------------------

  if (totalPages > 1) {

    const navRow =
      new ActionRowBuilder();

    if (page > 0) {
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `blacklist_page_prev_${page}`
          )
          .setLabel('Trang trước')
          .setEmoji('⬅️')
          .setStyle(
            ButtonStyle.Secondary
          )
      );
    }

    if (page < totalPages - 1) {
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `blacklist_page_next_${page}`
          )
          .setLabel('Trang sau')
          .setEmoji('➡️')
          .setStyle(
            ButtonStyle.Secondary
          )
      );
    }

    components.push(navRow);
  }

  return components;
}

// ============================================================
// MODULE
// ============================================================

module.exports = function(
  client,
  adminIds
) {

  // ==========================================================
  // ĐĂNG KÝ SLASH COMMAND
  // ==========================================================

  client.once(
    'clientReady',
    async () => {

      try {

        const command =
          new SlashCommandBuilder()
            .setName('blacklist')
            .setDescription(
              'Quản lý danh sách đen'
            );

        // ====================================================
        // ADD
        // ====================================================

        command.addSubcommand(
          sub =>
            sub
              .setName('add')
              .setDescription(
                'Thêm người vào blacklist'
              )

              // REQUIRED PHẢI ĐỨNG TRƯỚC
              .addStringOption(
                opt =>
                  opt
                    .setName('lydo')
                    .setDescription(
                      'Lý do blacklist'
                    )
                    .setRequired(true)
                    .setMaxLength(1000)
              )

              // PROOF BẮT BUỘC
              .addAttachmentOption(
                opt =>
                  opt
                    .setName('proof')
                    .setDescription(
                      'Ảnh proof - bắt buộc'
                    )
                    .setRequired(true)
              )

              // OPTIONAL ĐỨNG SAU
              .addUserOption(
                opt =>
                  opt
                    .setName('nguoi')
                    .setDescription(
                      'Người bị blacklist'
                    )
                    .setRequired(false)
              )

              .addStringOption(
                opt =>
                  opt
                    .setName('ten')
                    .setDescription(
                      'Tên nếu không có User'
                    )
                    .setRequired(false)
              )

              .addStringOption(
                opt =>
                  opt
                    .setName('thoihan')
                    .setDescription(
                      'Thời hạn - mặc định Vĩnh viễn'
                    )
                    .setRequired(false)
              )
        );

        // ====================================================
        // REMOVE
        // ====================================================

        command.addSubcommand(
          sub =>
            sub
              .setName('remove')
              .setDescription(
                'Gỡ khỏi blacklist'
              )

              .addUserOption(
                opt =>
                  opt
                    .setName('nguoi')
                    .setDescription(
                      'Người cần gỡ'
                    )
                    .setRequired(false)
              )

              .addStringOption(
                opt =>
                  opt
                    .setName('ten')
                    .setDescription(
                      'Tên cần gỡ'
                    )
                    .setRequired(false)
              )
        );

        // ====================================================
        // CHECK
        // ====================================================

        command.addSubcommand(
          sub =>
            sub
              .setName('check')
              .setDescription(
                'Kiểm tra blacklist'
              )

              .addUserOption(
                opt =>
                  opt
                    .setName('nguoi')
                    .setDescription(
                      'Người cần kiểm tra'
                    )
                    .setRequired(false)
              )

              .addStringOption(
                opt =>
                  opt
                    .setName('ten')
                    .setDescription(
                      'Tên cần kiểm tra'
                    )
                    .setRequired(false)
              )
        );

        // ====================================================
        // LIST
        // ====================================================

        command.addSubcommand(
          sub =>
            sub
              .setName('list')
              .setDescription(
                'Xem danh sách blacklist'
              )
        );

        // ====================================================
        // REGISTER
        // ====================================================

        const rest =
          new REST({
            version: '10'
          }).setToken(
            process.env.TOKEN
          );

        await rest.put(
          Routes.applicationCommands(
            client.user.id
          ),
          {
            body: [
              command.toJSON()
            ]
          }
        );

        console.log(
          ' Đã đăng ký slash command /blacklist'
        );

      } catch (err) {

        console.error(
          ' Lỗi đăng ký blacklist:',
          err
        );

      }

    }
  );

  // ==========================================================
  // INTERACTION
  // ==========================================================

  client.on(
    'interactionCreate',
    async interaction => {

      // ======================================================
      // BUTTON PROOF
      // ======================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          'blacklist_proof_'
        )
      ) {

        const result =
          layEntryTuButton(
            interaction.customId
          );

        if (
          !result ||
          !result.entry
        ) {

          return interaction.reply({
            content:
              ' Không tìm thấy blacklist hoặc dữ liệu đã bị xóa.',
            ephemeral: true
          }).catch(() => {});

        }

        const entry =
          result.entry;

        if (!entry.proof) {

          return interaction.reply({
            content:
              ' Mục blacklist này không có proof.',
            ephemeral: true
          }).catch(() => {});

        }

        const proofEmbed =
          new EmbedBuilder()
            .setTitle('BLACKLIST PROOF')
            .setColor(0xFFFFFF)
            .setImage(
              entry.proof
            )
            .setTimestamp();

        return interaction.reply({
          embeds: [
            proofEmbed
          ],
          ephemeral: true
        }).catch(() => {});

      }

      // ======================================================
      // BUTTON PAGINATION
      // ======================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          'blacklist_page_'
        )
      ) {

        const parts =
          interaction.customId.split('_');

        const action =
          parts[2];

        const oldPage =
          parseInt(parts[3]);

        if (
          Number.isNaN(oldPage)
        ) {
          return interaction.reply({
            content:
              ' Trang không hợp lệ.',
            ephemeral: true
          }).catch(() => {});
        }

        const data =
          readData();

        const keys =
          Object.keys(data);

        const ITEMS_PER_PAGE = 5;

        const totalPages =
          Math.ceil(
            keys.length /
            ITEMS_PER_PAGE
          );

        let newPage =
          oldPage;

        if (action === 'prev') {
          newPage =
            oldPage - 1;
        }

        if (action === 'next') {
          newPage =
            oldPage + 1;
        }

        if (newPage < 0) {
          newPage = 0;
        }

        if (
          newPage >= totalPages
        ) {
          newPage =
            totalPages - 1;
        }

        const embed =
          taoEmbedList(
            data,
            keys,
            newPage,
            ITEMS_PER_PAGE,
            totalPages
          );

        const components =
          taoListComponents(
            data,
            keys,
            newPage,
            ITEMS_PER_PAGE,
            totalPages
          );

        return interaction.update({
          embeds: [
            embed
          ],
          components
        }).catch(() => {});

      }

      // ======================================================
      // CHỈ CHAT INPUT TỪ ĐÂY
      // ======================================================

      if (
        !interaction.isChatInputCommand()
      ) {
        return;
      }

      if (
        interaction.commandName !==
        'blacklist'
      ) {
        return;
      }

      // ======================================================
      // CHECK ADMIN
      // ======================================================

      if (
        !Array.isArray(adminIds) ||
        !adminIds.includes(
          interaction.user.id
        )
      ) {

        return interaction.reply({
          content:
            ' Bạn không có quyền sử dụng lệnh này!',
          ephemeral: true
        }).catch(() => {});

      }

      const subCmd =
        interaction.options.getSubcommand();

      // ======================================================
      // ADD
      // ======================================================

      if (subCmd === 'add') {

        const nguoi =
          interaction.options.getUser(
            'nguoi'
          );

        const ten =
          interaction.options.getString(
            'ten'
          );

        const lydo =
          interaction.options.getString(
            'lydo'
          );

        const thoihan =
          interaction.options.getString(
            'thoihan'
          ) ||
          'Vĩnh viễn';

        const proof =
          interaction.options.getAttachment(
            'proof'
          );

        // ----------------------------------------------------
        // PHẢI CÓ NGƯỜI HOẶC TÊN
        // ----------------------------------------------------

        if (!nguoi && !ten) {

          return interaction.reply({
            content:
              ' Bạn phải nhập **nguoi** hoặc **ten**!',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // PROOF BẮT BUỘC
        // ----------------------------------------------------

        if (!proof) {

          return interaction.reply({
            content:
              ' Proof là **bắt buộc**! Hãy upload ảnh trước khi gửi lệnh.',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // KIỂM TRA FILE ẢNH
        // ----------------------------------------------------

        if (
          !proof.contentType ||
          !proof.contentType.startsWith(
            'image/'
          )
        ) {

          return interaction.reply({
            content:
              ' Proof phải là **ảnh** PNG, JPG, JPEG, GIF hoặc WEBP!',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // KEY
        // ----------------------------------------------------

        const khoa =
          layKhoa(
            nguoi,
            ten
          );

        if (!khoa) {

          return interaction.reply({
            content:
              ' Không thể tạo khóa blacklist.',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // READ
        // ----------------------------------------------------

        const data =
          readData();

        if (data[khoa]) {

          return interaction.reply({
            content:
              ' Đối tượng này đã có trong blacklist!',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        data[khoa] = {
          userId:
            nguoi
              ? nguoi.id
              : null,

          ten:
            ten
              ? ten.trim()
              : (
                  nguoi
                    ? nguoi.username
                    : ''
                ),

          lydo:
            lydo.trim(),

          thoihan:
            thoihan.trim(),

          proof:
            proof.url,

          nguoiThem:
            interaction.user.id,

          thoiGian:
            Date.now()
        };

        if (!saveData(data)) {

          return interaction.reply({
            content:
              ' Không thể lưu dữ liệu blacklist.',
            ephemeral: true
          }).catch(() => {});

        }

        // ----------------------------------------------------
        // EMBED
        // ----------------------------------------------------

        const embed =
          taoEmbedAdd(
            data[khoa]
          );

        // ----------------------------------------------------
        // BUTTON PROOF
        // ----------------------------------------------------

        const row =
          new ActionRowBuilder()
            .addComponents(
              taoProofButton(khoa)
            );

        // ----------------------------------------------------
        // TRẢ CHO ADMIN
        // ----------------------------------------------------

        await interaction.reply({
          content:
            ' Đã thêm vào blacklist.',
          embeds: [
            embed
          ],
          components: [
            row
          ],
          ephemeral: true
        }).catch(() => {});

        // ----------------------------------------------------
        // GỬI LOG CHANNEL
        // ----------------------------------------------------

        if (
          BLACKLIST_CHANNEL_ID
        ) {

          const channel =
            interaction.guild.channels.cache.get(
              BLACKLIST_CHANNEL_ID
            );

          if (channel) {

            const publicEmbed =
              new EmbedBuilder()
                .setTitle(
                  'ADDED TO BLACKLIST'
                )
                .setColor(
                  0xFF0000
                )
                .addFields(
                  {
                    name:
                      ' Target',
                    value:
                      nguoi
                        ? `<@${nguoi.id}>`
                        : String(
                            ten
                          ),
                    inline:
                      false
                  },
                  {
                    name:
                      ' Reason',
                    value:
                      lydo.slice(
                        0,
                        1024
                      ),
                    inline:
                      false
                  },
                  {
                    name:
                      '⏱ Time',
                    value:
                      thoihan.slice(
                        0,
                        1024
                      ),
                    inline:
                      false
                  },
                  {
                    name:
                      ' Added by',
                    value:
                      `<@${interaction.user.id}>`,
                    inline:
                      false
                  }
                )
                .setTimestamp();

            const publicRow =
              new ActionRowBuilder()
                .addComponents(
                  taoProofButton(khoa)
                );

            await channel.send({
              embeds: [
                publicEmbed
              ],
              components: [
                publicRow
              ]
            }).catch(err => {

              console.error(
                ' Lỗi gửi blacklist log:',
                err
              );

            });

          } else {

            console.warn(
              ' Không tìm thấy BLACKLIST_CHANNEL_ID:',
              BLACKLIST_CHANNEL_ID
            );

          }

        }

        return;
      }

      // ======================================================
      // REMOVE
      // ======================================================

      if (subCmd === 'remove') {

        const nguoi =
          interaction.options.getUser(
            'nguoi'
          );

        const ten =
          interaction.options.getString(
            'ten'
          );

        if (!nguoi && !ten) {

          return interaction.reply({
            content:
              ' Bạn phải nhập **nguoi** hoặc **ten**!',
            ephemeral: true
          }).catch(() => {});

        }

        const khoa =
          layKhoa(
            nguoi,
            ten
          );

        const data =
          readData();

        if (!data[khoa]) {

          return interaction.reply({
            content:
              ' Không tìm thấy đối tượng trong blacklist.',
            ephemeral: true
          }).catch(() => {});

        }

        const oldEntry =
          data[khoa];

        delete data[khoa];

        if (!saveData(data)) {

          return interaction.reply({
            content:
              ' Không thể lưu dữ liệu sau khi gỡ.',
            ephemeral: true
          }).catch(() => {});

        }

        const target =
          oldEntry.userId
            ? `<@${oldEntry.userId}>`
            : oldEntry.ten;

        const embed =
          new EmbedBuilder()
            .setTitle(
              ' ĐÃ GỠ KHỎI BLACKLIST'
            )
            .setColor(
              0x00FF00
            )
            .addFields({
              name:
                ' Target',
              value:
                String(
                  target
                ),
              inline:
                false
            })
            .setTimestamp();

        // Reply công khai vì đây là thông báo gỡ
        await interaction.reply({
          embeds: [
            embed
          ]
        }).catch(() => {});

        // Log
        if (
          BLACKLIST_CHANNEL_ID
        ) {

          const channel =
            interaction.guild.channels.cache.get(
              BLACKLIST_CHANNEL_ID
            );

          if (channel) {

            await channel.send({
              embeds: [
                embed
              ]
            }).catch(() => {});

          }

        }

        return;
      }

      // ======================================================
      // CHECK
      // ======================================================

      if (subCmd === 'check') {

        const nguoi =
          interaction.options.getUser(
            'nguoi'
          );

        const ten =
          interaction.options.getString(
            'ten'
          );

        if (!nguoi && !ten) {

          return interaction.reply({
            content:
              ' Bạn phải nhập **nguoi** hoặc **ten**!',
            ephemeral: true
          }).catch(() => {});

        }

        const khoa =
          layKhoa(
            nguoi,
            ten
          );

        const data =
          readData();

        const entry =
          data[khoa];

        if (!entry) {

          return interaction.reply({
            content:
              ' Đối tượng này **không có** trong blacklist.',
            ephemeral: true
          }).catch(() => {});

        }

        const embed =
          taoEmbedCheck(
            entry
          );

        const row =
          new ActionRowBuilder()
            .addComponents(
              taoProofButton(khoa)
            );

        // Check để riêng tư
        return interaction.reply({
          embeds: [
            embed
          ],
          components: [
            row
          ],
          ephemeral: true
        }).catch(() => {});

      }

      // ======================================================
      // LIST
      // ======================================================

      if (subCmd === 'list') {

        const data =
          readData();

        const keys =
          Object.keys(data);

        if (
          keys.length === 0
        ) {

          // LIST KHÔNG EPHEMERAL
          return interaction.reply({
            content:
              ' Danh sách blacklist đang trống.'
          }).catch(() => {});

        }

        const ITEMS_PER_PAGE = 5;

        const totalPages =
          Math.ceil(
            keys.length /
            ITEMS_PER_PAGE
          );

        const page = 0;

        const embed =
          taoEmbedList(
            data,
            keys,
            page,
            ITEMS_PER_PAGE,
            totalPages
          );

        const components =
          taoListComponents(
            data,
            keys,
            page,
            ITEMS_PER_PAGE,
            totalPages
          );

        // ====================================================
        // QUAN TRỌNG:
        // KHÔNG EPHEMERAL
        // TẤT CẢ SERVER ĐỀU XEM ĐƯỢC
        // ====================================================

        const message =
          await interaction.reply({
            embeds: [
              embed
            ],
            components,
            fetchReply: true
          }).catch(() => null);

        if (!message) {
          return;
        }

        // ====================================================
        // COLLECTOR
        // ====================================================

        const filter =
          i =>
            (
              i.customId.startsWith(
                'blacklist_page_'
              ) ||
              i.customId.startsWith(
                'blacklist_proof_'
              )
            );

        const collector =
          message.createMessageComponentCollector({
            filter,
            time: 10 * 60 * 1000
          });

        collector.on(
          'collect',
          async i => {

            // ------------------------------------------------
            // PROOF
            // ------------------------------------------------

            if (
              i.customId.startsWith(
                'blacklist_proof_'
              )
            ) {

              const result =
                layEntryTuButton(
                  i.customId
                );

              if (
                !result ||
                !result.entry
              ) {

                return i.reply({
                  content:
                    ' Không tìm thấy dữ liệu blacklist.',
                  ephemeral: true
                }).catch(() => {});

              }

              if (
                !result.entry.proof
              ) {

                return i.reply({
                  content:
                    ' Mục này không có proof.',
                  ephemeral: true
                }).catch(() => {});

              }

              const proofEmbed =
                new EmbedBuilder()
                  .setTitle(
                    ' BLACKLIST PROOF'
                  )
                  .setColor(
                    0xFFFFFF
                  )
                  .setImage(
                    result.entry.proof
                  )
                  .setTimestamp();

              // =================================================
              // CHỈ NGƯỜI BẤM NÚT XEM ĐƯỢC
              // =================================================

              return i.reply({
                embeds: [
                  proofEmbed
                ],
                ephemeral: true
              }).catch(() => {});

            }

            // ------------------------------------------------
            // PAGINATION
            // ------------------------------------------------

            const parts =
              i.customId.split('_');

            const action =
              parts[2];

            const oldPage =
              parseInt(
                parts[3]
              );

            if (
              Number.isNaN(oldPage)
            ) {

              return i.reply({
                content:
                  ' Trang không hợp lệ.',
                ephemeral: true
              }).catch(() => {});

            }

            const latestData =
              readData();

            const latestKeys =
              Object.keys(
                latestData
              );

            const latestTotalPages =
              Math.ceil(
                latestKeys.length /
                ITEMS_PER_PAGE
              );

            let newPage =
              oldPage;

            if (
              action === 'prev'
            ) {
              newPage =
                oldPage - 1;
            }

            if (
              action === 'next'
            ) {
              newPage =
                oldPage + 1;
            }

            if (
              newPage < 0
            ) {
              newPage = 0;
            }

            if (
              newPage >=
              latestTotalPages
            ) {
              newPage =
                latestTotalPages - 1;
            }

            const newEmbed =
              taoEmbedList(
                latestData,
                latestKeys,
                newPage,
                ITEMS_PER_PAGE,
                latestTotalPages
              );

            const newComponents =
              taoListComponents(
                latestData,
                latestKeys,
                newPage,
                ITEMS_PER_PAGE,
                latestTotalPages
              );

            return i.update({
              embeds: [
                newEmbed
              ],
              components:
                newComponents
            }).catch(() => {});

          }
        );

        collector.on(
          'end',
          async () => {

            try {

              const disabledComponents =
                components.map(
                  row => {

                    const newRow =
                      new ActionRowBuilder();

                    for (
                      const component
                      of row.components
                    ) {

                      const button =
                        ButtonBuilder.from(
                          component
                        );

                      button.setDisabled(
                        true
                      );

                      newRow.addComponents(
                        button
                      );
                    }

                    return newRow;
                  }
                );

              await message.edit({
                components:
                  disabledComponents
              });

            } catch {
              // Message có thể đã bị xóa
            }

          }
        );

        return;
      }

    }
  );
};