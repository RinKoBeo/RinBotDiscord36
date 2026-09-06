// rules.js - Đăng / cập nhật bảng LUẬT (Rules) vào 1 kênh cố định
// Chỉ Admin mới được chạy lệnh /rules

const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// ============================================================
// CẤU HÌNH — SỬA 2 DÒNG NÀY CHO ĐÚNG SERVER CỦA MÀY
// ============================================================
// ID kênh sẽ đăng bảng luật (kênh #Rules)
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID || '1526993782967631883';
// Link ảnh banner - dán link GitHub raw ảnh của mày vào đây
const RULES_BANNER_URL = process.env.RULES_BANNER_URL || 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/banner%20clan%202.jpg';
// Tiêu đề embed
const RULES_TITLE = 'VanGurd of Liberty - Luật Discord (Rules)';
// ============================================================

// Nội dung 10 rule — sửa/thêm/bớt thoải mái, mỗi phần tử là 1 RULE
const RULES = [
  {
    title: 'Nội dung 18+ (Gore | NSFW | Disturbing)',
    desc: 'Không được phép gửi tin nhắn, hình ảnh và các đường link mang nội dung **NSFW** hay **Gore**. Đặc biệt biệt danh hay ảnh đại diện, kể cả banner có chứa hình ảnh đồi truỵ hay kinh dị, gây ám ảnh đều không được chấp nhận.',
  },
  {
    title: 'Phân biệt Vùng Miền | Chủng Tộc | Giới Tính',
    desc: 'Cấm mọi hành vi kỳ thị, miệt thị vùng miền (PBVM), chủng tộc (PBCT), giới tính, xu hướng tính dục hay tôn giáo của người khác dưới bất kỳ hình thức nào (chữ viết, hình ảnh, emoji, giọng nói trong voice). Vi phạm sẽ bị xử lý nghiêm, không có ngoại lệ.',
  },
  {
    title: 'Spam | Flood tin nhắn',
    desc: 'Không spam tin nhắn, emoji, sticker, ping liên tục hoặc gửi tin nhắn sai mục đích của kênh. Mỗi kênh có chức năng riêng, vui lòng đọc mô tả kênh trước khi đăng bài.',
  },
  {
    title: 'Quảng cáo | Mời server khác',
    desc: 'Không tự ý đăng link mời server khác, quảng cáo dịch vụ, sản phẩm, kênh cá nhân khi chưa được phép của BQT. Vi phạm nhiều lần sẽ bị cấm gửi tin nhắn hoặc kick khỏi server.',
  },
  {
    title: 'Giả mạo | Mạo danh',
    desc: 'Nghiêm cấm giả mạo Ban Quản Trị, Moderator hoặc bất kỳ thành viên nào khác (tên, avatar, cách xưng hô) nhằm mục đích lừa đảo hoặc gây hiểu lầm.',
  },
  {
    title: 'Drama | Công kích cá nhân | Bóc phốt',
    desc: 'Không tạo drama, công kích, xúc phạm, bóc phốt cá nhân/tổ chức khác trong server. Mọi mâu thuẫn cần giải quyết riêng tư hoặc thông qua BQT, không lôi kéo cộng đồng.',
  },
  {
    title: 'Chính trị | Tôn giáo nhạy cảm',
    desc: 'Tránh bàn luận các chủ đề chính trị, tôn giáo gây tranh cãi, chia rẽ cộng đồng. Đây không phải nơi tranh luận các vấn đề này.',
  },
  {
    title: 'Thông tin cá nhân (Doxxing)',
    desc: 'Cấm tuyệt đối việc chia sẻ thông tin cá nhân của người khác (số điện thoại, địa chỉ, tài khoản mạng xã hội, hình ảnh riêng tư...) khi chưa được sự đồng ý.',
  },
  {
    title: 'Lừa đảo | Gian lận (Scam)',
    desc: 'Nghiêm cấm mọi hành vi lừa đảo, gian lận trong giao dịch, mua bán, trao đổi vật phẩm/tài khoản game trong server. Phát hiện sẽ bị blacklist và ban vĩnh viễn.',
  },
  {
    title: 'Né tránh hình phạt',
    desc: 'Không sử dụng tài khoản phụ để né tránh mute/ban/kick. Mọi quyết định xử lý của BQT cần được tôn trọng; nếu không đồng ý, vui lòng khiếu nại qua kênh Ticket, không tự ý chống đối.',
  },
];

const DIVIDER = '⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇⌇';

// ---- helpers ----

function buildRulesEmbed() {
  const embed = new EmbedBuilder()
    .setTitle(RULES_TITLE)
    .setColor(0xff0000)
    .setDescription('**Luật Discord** giúp tạo ra môi trường cộng đồng an toàn, tôn trọng và có trật tự. Cần thực hiện theo.')
    .setTimestamp();

  if (RULES_BANNER_URL && RULES_BANNER_URL !== 'DAN_LINK_GITHUB_RAW_ANH_BANNER_O_DAY') {
    embed.setImage(RULES_BANNER_URL);
  }

  RULES.forEach((rule, i) => {
    embed.addFields({
      name: `${DIVIDER}\nRULE ${i + 1}\n${DIVIDER}`,
      value: `**${rule.title}**\n\n${rule.desc}`,
      inline: false,
    });
  });

  embed.addFields({
    name: '\u200B',
    value: '_Vi phạm luật có thể dẫn đến cảnh cáo (warn), timeout, kick hoặc ban tuỳ mức độ, theo quyết định của Ban Quản Trị._',
    inline: false,
  });

  return embed;
}

// Tìm tin nhắn luật CŨ CỦA CHÍNH BOT trong kênh (quét 20 tin gần nhất) để
// SỬA lại thay vì gửi tin mới mỗi lần chạy lệnh - tránh spam kênh Rules.
async function findOldRulesMessage(channel, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    return messages.find(
      m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === RULES_TITLE
    ) || null;
  } catch {
    return null;
  }
}

// ---- module export ----

module.exports = function (client, adminIds) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'rules') return;

    const coQuyenAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const namTrongDanhSach = adminIds.includes(interaction.user.id);
    if (!coQuyenAdmin && !namTrongDanhSach) {
      return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này!', ephemeral: true }).catch(() => {});
    }

    if (!RULES_CHANNEL_ID || RULES_CHANNEL_ID === '1526993782967631883') {
      return interaction.reply({ content: 'Chưa cấu hình RULES_CHANNEL_ID trong rules.js!', ephemeral: true }).catch(() => {});
    }

    const channel = interaction.guild.channels.cache.get(RULES_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({ content: 'Không tìm thấy kênh Rules. Kiểm tra lại RULES_CHANNEL_ID!', ephemeral: true }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const embed = buildRulesEmbed();

    try {
      const oldMsg = await findOldRulesMessage(channel, client);
      if (oldMsg) {
        await oldMsg.edit({ embeds: [embed] });
        return interaction.editReply({ content: `Đã cập nhật bảng luật trong <#${RULES_CHANNEL_ID}>.` }).catch(() => {});
      }
      await channel.send({ embeds: [embed] });
      return interaction.editReply({ content: `Đã đăng bảng luật vào <#${RULES_CHANNEL_ID}>.` }).catch(() => {});
    } catch (err) {
      console.error('Lỗi đăng bảng luật:', err.message);
      return interaction.editReply({ content: `Lỗi khi đăng bảng luật: ${err.message}` }).catch(() => {});
    }
  });
};