// rules.js - Dang va cap nhat bang Luat (Rules) vao kenh co dinh
// Banner va tat ca noi dung luat gom chung trong duy nhat 1 embed (khong tach rieng le, khong dung emoji)

const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// ============================================================
// CAU HINH - Sua ID kenh va link anh tai day neu can
// ============================================================
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID || '1526993782967631883';
const RULES_BANNER_URL = process.env.RULES_BANNER_URL || 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/vfb.jfif';
const RULES_TITLE = 'VanGurd of Liberty - Luật Discord (Rules)';
// ============================================================

// Danh sach 13 dieu luat
const RULES = [
  {
    title: '- Nội dung 18+ (Gore | NSFW | Disturbing)',
    desc: '⊹⊱ Không được phép gửi tin nhắn, hình ảnh và các đường link mang nội dung **NSFW** hay **Gore**. Đặc biệt biệt danh hay ảnh đại diện, kể cả banner có chứa hình ảnh đồi truỵ hay kinh dị, gây ám ảnh đều không được chấp nhận.',
  },
  {
    title: '- Phân biệt Vùng Miền | Chủng Tộc | Giới Tính',
    desc: '⊹⊱ Cấm mọi hành vi kỳ thị, miệt thị vùng miền (PBVM), chủng tộc (PBCT), giới tính, xu hướng tính dục hay tôn giáo của người khác dưới bất kỳ hình thức nào (chữ viết, hình ảnh, giọng nói trong voice). Vi phạm sẽ bị xử lý nghiêm, không có ngoại lệ.',
  },
  {
    title: '- Spam | Flood tin nhắn',
    desc: '⊹⊱ Không spam tin nhắn, sticker, ping liên tục hoặc gửi tin nhắn sai mục đích của kênh. Mỗi kênh có chức năng riêng, vui lòng đọc mô tả kênh trước khi đăng bài.',
  },
  {
    title: '- Quảng cáo | Mời server khác',
    desc: '⊹⊱ Không tự ý đăng link mời server khác, quảng cáo dịch vụ, sản phẩm, kênh cá nhân khi chưa được phép của BQT. Vi phạm nhiều lần sẽ bị cấm gửi tin nhắn hoặc kick khỏi server.',
  },
  {
    title: '- Giả mạo | Mạo danh',
    desc: '⊹⊱ Nghiêm cấm giả mạo Ban Quản Trị, Moderator hoặc bất kỳ thành viên nào khác (tên, avatar, cách xưng hô) nhằm mục đích lừa đảo hoặc gây hiểu lầm.',
  },
  {
    title: '- Drama | Công kích cá nhân | Bóc phốt',
    desc: '⊹⊱ Không tạo drama, công kích, xúc phạm, bóc phốt cá nhân/tổ chức khác trong server. Mọi mâu thuẫn cần giải quyết riêng tư hoặc thông qua BQT, không lôi kéo cộng đồng.',
  },
  {
    title: '- Chính trị | Tôn giáo nhạy cảm',
    desc: '⊹⊱ Tránh bàn luận các chủ đề chính trị, tôn giáo gây tranh cãi, chia rẽ cộng đồng. Đây không phải nơi tranh luận các vấn đề này.',
  },
  {
    title: '- Thông tin cá nhân (Doxxing)',
    desc: '⊹⊱ Cấm tuyệt đối việc chia sẻ thông tin cá nhân của người khác (số điện thoại, địa chỉ, tài khoản mạng xã hội, hình ảnh riêng tư...) khi chưa được sự đồng ý.',
  },
  {
    title: '- Lừa đảo | Gian lận (Scam)',
    desc: '⊹⊱ Nghiêm cấm mọi hành vi lừa đảo, gian lận trong giao dịch, mua bán, trao đổi vật phẩm/tài khoản game trong server. Phát hiện sẽ bị blacklist và ban vĩnh viễn.',
  },
  {
    title: '- Né tránh hình phạt',
    desc: '⊹⊱ Không sử dụng tài khoản phụ để né tránh mute/ban/kick. Mọi quyết định xử lý của BQT cần được tôn trọng; nếu không đồng ý, vui lòng khiếu nại qua kênh Ticket, không tự ý chống đối.',
  },
  {
    title: '- Quấy rối tình dục | Quấy rối cá nhân',
    desc: '⊹⊱ Cấm mọi hành vi quấy rối tình dục, quấy rối cá nhân, đe dọa hoặc bắt nạt người khác. Bao gồm tin nhắn, hình ảnh, giọng nói trong voice hoặc bất kỳ hình thức nào khác.',
  },
  {
    title: '- Ngôn từ thô tục | Chửi bậy',
    desc: '⊹⊱ Hạn chế sử dụng ngôn từ thô tục, chửi bậy, xúc phạm người khác. Nếu muốn chửi bậy hãy luôn nhớ những câu từ bạn thốt ra nó không rút lại được và hình phạt cũng vậy.',
  },
  {
    title: '- Không được làm phiền Moderator',
    desc: '⊹⊱ Không được làm phiền Moderator, Admin hay Ban Quản Trị khi họ đang bận. Nếu có vấn đề cần giải quyết hãy tạo Ticket hoặc gửi tin nhắn riêng cho họ, không spam ping hay tag.',
  },
];

// Tao duy nhat 1 Embed chua toan bo bang luat va banner
function buildRulesEmbed() {
  let description = 'Luật Discord giúp tạo ra môi trường cộng đồng an toàn, tôn trọng và có trật tự. Vui lòng đọc kỹ và tuân thủ các quy định dưới đây:\n\n';

  for (let i = 0; i < RULES.length; i++) {
    description += `## ---------- RULE ${i + 1} ----------\n`;
    description += `### ${RULES[i].title}\n`;
    description += `${RULES[i].desc}\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle(RULES_TITLE)
    .setColor(0x8b0000)
    .setDescription(description.trim())
    .setFooter({
      text: 'Vi phạm luật có thể dẫn đến cảnh cáo (warn), timeout, kick hoặc ban tuỳ mức độ, theo quyết định của Ban Quản Trị.',
    })
    .setTimestamp();

  if (RULES_BANNER_URL && /^https?:\/\//i.test(RULES_BANNER_URL)) {
    embed.setImage(RULES_BANNER_URL);
  }

  return embed;
}

// Dang hoac cap nhat bang luat (chi dung 1 tin nhan chua duy nhat 1 embed)
async function postOrUpdateRules(client) {
  if (!RULES_CHANNEL_ID || !/^\d{5,25}$/.test(RULES_CHANNEL_ID)) {
    return { ok: false, reason: 'invalid_id' };
  }

  const channel = client.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) {
    return { ok: false, reason: 'channel_not_found' };
  }

  const rulesEmbed = buildRulesEmbed();

  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (messages) {
      const ownMessages = [...messages.filter((m) => m.author.id === client.user.id).values()];

      // Neu da co dung 1 tin nhan cu cua bot, chi can edit lai embed
      if (ownMessages.length === 1) {
        await ownMessages[0].edit({ content: null, embeds: [rulesEmbed] });
        return { ok: true, action: 'edited' };
      }

      // Neu co nhieu tin nhan cu (do truoc day tach rieng le), xoa sach de gui 1 tin duy nhat
      for (const msg of ownMessages) {
        await msg.delete().catch(() => {});
      }
    }

    await channel.send({ embeds: [rulesEmbed] });
    return { ok: true, action: 'sent' };
  } catch (err) {
    return { ok: false, reason: 'send_error', error: err };
  }
}

module.exports = function (client, adminIds) {
  // Tu dong dang hoac cap nhat khi bot online
  client.once('ready', async () => {
    const result = await postOrUpdateRules(client);
    if (result.ok) {
      console.log('[rules.js] Da cap nhat bang luat vao kenh Rules.');
    } else {
      console.error(
        `[rules.js] Khong the dang bang luat (${result.reason}):`,
        result.error ? result.error.message : result.reason
      );
    }
  });

  // Lenh slash /rules danh cho Admin de cap nhat thu cong
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'rules') return;

    const coQuyenAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const namTrongDanhSach = Array.isArray(adminIds) && adminIds.includes(interaction.user.id);
    if (!coQuyenAdmin && !namTrongDanhSach) {
      return interaction.reply({ content: 'Ban khong co quyen su dung lenh nay!', ephemeral: true }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const result = await postOrUpdateRules(client);

    if (!result.ok) {
      const messages = {
        invalid_id: 'RULES_CHANNEL_ID trong rules.js khong hop le (phai la ID kenh dang so)!',
        channel_not_found: 'Khong tim thay kenh Rules trong server nay. Kiem tra lai RULES_CHANNEL_ID!',
        send_error: `Loi khi dang bang luat: ${result.error ? result.error.message : 'khong ro nguyen nhan'}`,
      };
      return interaction.editReply({ content: messages[result.reason] || 'Co loi xay ra.' }).catch(() => {});
    }

    return interaction.editReply({ content: `Da cap nhat bang luat vao <#${RULES_CHANNEL_ID}>.` }).catch(() => {});
  });
};