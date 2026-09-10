// rules.js - Đăng / cập nhật bảng LUẬT (Rules) vào 1 kênh cố định
// Tự động đăng khi bot online. Lệnh /rules (chỉ Admin) dùng để làm mới thủ công.
//
// CẤU TRÚC: mỗi rule là 1 EMBED RIÊNG (không còn gộp field trong 1 embed
// to nữa). Lý do: Discord chỉ cho 1 ảnh/embed và ảnh luôn nằm CUỐI embed
// đó - muốn ảnh xen thật sự giữa các rule thì rule nào có ảnh phải tách
// thành embed riêng của chính nó. Nhiều embed xếp liên tiếp trong 1-2 tin
// nhắn (Discord cho tối đa 10 embed/tin) sẽ hiện y hệt bố cục mong muốn:
// banner → tiêu đề → rule 1 → (ảnh nếu có) → rule 2 → (ảnh nếu có) → ...
//
// Khi làm mới (bot restart hoặc chạy /rules): bot XOÁ SẠCH các tin nhắn
// CỦA CHÍNH NÓ trong kênh rồi gửi lại từ đầu - đơn giản và luôn đúng thứ
// tự, không cần dò/so khớp tin cũ phức tạp khi số lượng tin thay đổi theo
// số ảnh.

const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// ============================================================
// CẤU HÌNH — SỬA 2 DÒNG NÀY CHO ĐÚNG SERVER CỦA MÀY
// ============================================================
// ID kênh sẽ đăng bảng luật (kênh #Rules)
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID || '1526993782967631883';
// Link ảnh banner (đầu tiên, trên cùng) - dán link GitHub raw ảnh của mày vào đây
const RULES_BANNER_URL = process.env.RULES_BANNER_URL || 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/banner%20clan%202.jpg';
// Tiêu đề embed
const RULES_TITLE = 'VanGurd of Liberty - Luật Discord (Rules)';
// ============================================================

// Nội dung rule — sửa/thêm/bớt thoải mái, mỗi phần tử là 1 RULE.
// "image": dán link GitHub raw vào nếu muốn ảnh đó hiện NGAY SAU rule này.
// Để null nếu rule đó không có ảnh riêng. 6 ảnh của mày cứ dán vào đúng
// rule mà mày muốn nó xuất hiện ngay sau, thứ tự thoải mái.
const RULES = [
  {
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/r1.png',
    title: 'Nội dung 18+ (Gore | NSFW | Disturbing)',
    desc: 'Không được phép gửi tin nhắn, hình ảnh và các đường link mang nội dung **NSFW** hay **Gore**. Đặc biệt biệt danh hay ảnh đại diện, kể cả banner có chứa hình ảnh đồi truỵ hay kinh dị, gây ám ảnh đều không được chấp nhận.',
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/r2.png',
  },
  {
    title: 'Phân biệt Vùng Miền | Chủng Tộc | Giới Tính',
    desc: 'Cấm mọi hành vi kỳ thị, miệt thị vùng miền (PBVM), chủng tộc (PBCT), giới tính, xu hướng tính dục hay tôn giáo của người khác dưới bất kỳ hình thức nào (chữ viết, hình ảnh, emoji, giọng nói trong voice). Vi phạm sẽ bị xử lý nghiêm, không có ngoại lệ.',
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/RULE3.png',
  },
  {
    title: 'Spam | Flood tin nhắn',
    desc: 'Không spam tin nhắn, emoji, sticker, ping liên tục hoặc gửi tin nhắn sai mục đích của kênh. Mỗi kênh có chức năng riêng, vui lòng đọc mô tả kênh trước khi đăng bài.',
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/rule4.png',
  },
  {
    title: 'Quảng cáo | Mời server khác',
    desc: 'Không tự ý đăng link mời server khác, quảng cáo dịch vụ, sản phẩm, kênh cá nhân khi chưa được phép của BQT. Vi phạm nhiều lần sẽ bị cấm gửi tin nhắn hoặc kick khỏi server.',
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/rule5.png',
  },
  {
    title: 'Giả mạo | Mạo danh',
    desc: 'Nghiêm cấm giả mạo Ban Quản Trị, Moderator hoặc bất kỳ thành viên nào khác (tên, avatar, cách xưng hô) nhằm mục đích lừa đảo hoặc gây hiểu lầm.',
    image: 'https://raw.githubusercontent.com/RinKoBeo/RinBotDiscord36/main/rule6.png',
  },
  {
    title: 'Drama | Công kích cá nhân | Bóc phốt',
    desc: 'Không tạo drama, công kích, xúc phạm, bóc phốt cá nhân/tổ chức khác trong server. Mọi mâu thuẫn cần giải quyết riêng tư hoặc thông qua BQT, không lôi kéo cộng đồng.',
    image: null,
  },
  {
    title: 'Chính trị | Tôn giáo nhạy cảm',
    desc: 'Tránh bàn luận các chủ đề chính trị, tôn giáo gây tranh cãi, chia rẽ cộng đồng. Đây không phải nơi tranh luận các vấn đề này.',
    image: null,
  },
  {
    title: 'Thông tin cá nhân (Doxxing)',
    desc: 'Cấm tuyệt đối việc chia sẻ thông tin cá nhân của người khác (số điện thoại, địa chỉ, tài khoản mạng xã hội, hình ảnh riêng tư...) khi chưa được sự đồng ý.',
    image: null,
  },
  {
    title: 'Lừa đảo | Gian lận (Scam)',
    desc: 'Nghiêm cấm mọi hành vi lừa đảo, gian lận trong giao dịch, mua bán, trao đổi vật phẩm/tài khoản game trong server. Phát hiện sẽ bị blacklist và ban vĩnh viễn.',
    image: null,
  },
  {
    title: 'Né tránh hình phạt',
    desc: 'Không sử dụng tài khoản phụ để né tránh mute/ban/kick. Mọi quyết định xử lý của BQT cần được tôn trọng; nếu không đồng ý, vui lòng khiếu nại qua kênh Ticket, không tự ý chống đối.',
    image: null,
  },
  {
    title: 'Quấy rối tình dục | Quấy rối cá nhân',
    desc: 'Cấm mọi hành vi quấy rối tình dục, quấy rối cá nhân, đe dọa hoặc bắt nạt người khác. Bao gồm tin nhắn, hình ảnh, giọng nói trong voice hoặc bất kỳ hình thức nào khác.',
    image: null,
  },
  {
    title: 'Ngôn từ thô tục | Chửi bậy',
    desc: 'Hạn chế sử dụng ngôn từ thô tục, chửi bậy, xúc phạm người khác. Nếu muốn chửi bậy hãy luôn nhớ nhưng câu từ bạn thốt ra nó không rút lại được và hình phạt cũng vậy.',
    image: null,
  },
  {
    title: 'Không được làm phiền Moderator',
    desc: 'Không được làm phiền Moderator, Admin hay Ban Quản Trị khi họ đang bận. Nếu có vấn đề cần giải quyết hãy tạo Ticket hoặc gửi tin nhắn riêng cho họ, không spam ping hay tag.',
    image: null,
  },
];



// ---- helpers ----

// Embed CHI chua anh banner - hien tran vien tren cung, khong title.
function buildBannerEmbed() {
  return new EmbedBuilder().setColor(0xff0000).setImage(RULES_BANNER_URL);
}

// Embed tieu de + mo ta chung, hien ngay sau banner, truoc cac rule.
function buildHeaderEmbed() {
  return new EmbedBuilder()
    .setTitle(RULES_TITLE)
    .setColor(0xff0000)
    .setDescription('**Luật Discord** giúp tạo ra môi trường cộng đồng an toàn, tôn trọng và có trật tự. Cần thực hiện theo.')
    .setTimestamp();
}

// Moi rule la 1 embed rieng - neu rule co "image" thi anh do tu dong
// hien o CUOI embed nay, tuc la NGAY SAU noi dung rule, truoc rule tiep theo.
function buildRuleEmbed(rule, index) {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(
      `${DIVIDER}\n**RULE ${index + 1}**\n${DIVIDER}\n\n` +
      `• **${rule.title}**\n\n${rule.desc}`
    );
  if (rule.image && /^https?:\/\//i.test(rule.image)) {
    embed.setImage(rule.image);
  }
  return embed;
}

// Embed ghi chu ket thuc, hien sau cung.
function buildFooterEmbed() {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription('_Vi phạm luật có thể dẫn đến cảnh cáo (warn), timeout, kick hoặc ban tuỳ mức độ, theo quyết định của Ban Quản Trị._');
}

// Chia mang embed thanh tung nhom toi da 10 (gioi han cua Discord: 1 tin
// nhan chi chua duoc toi da 10 embed).
function chunkEmbeds(embeds, size = 10) {
  const out = [];
  for (let i = 0; i < embeds.length; i += size) out.push(embeds.slice(i, i + size));
  return out;
}

// Xoa sach cac tin nhan CUA CHINH BOT trong kenh (quet 50 tin gan nhat) -
// don gian va luon dung, khong can do/so khop tin cu phuc tap khi so
// luong tin thay doi theo so anh. Kenh Rules thuong khoa chat nguoi
// thuong nen chi co tin cua bot trong do.
async function clearOldRulesMessages(channel, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const ownMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of ownMessages.values()) {
      await msg.delete().catch(() => {});
    }
  } catch (err) {
    console.error('[rules.js] Loi xoa tin nhan luat cu:', err.message);
  }
}

// Gui toan bo bang luat (banner + header + tung rule + footer) vao kenh.
// Dung chung cho ca luc bot vua online (tu dong) lan khi admin go /rules
// (lam moi thu cong).
async function postOrUpdateRules(client) {
  if (!RULES_CHANNEL_ID || !/^\d{5,25}$/.test(RULES_CHANNEL_ID)) {
    return { ok: false, reason: 'invalid_id' };
  }

  const channel = client.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) {
    return { ok: false, reason: 'channel_not_found' };
  }

  try {
    await clearOldRulesMessages(channel, client);

    const hasBanner = RULES_BANNER_URL && /^https?:\/\//i.test(RULES_BANNER_URL);
    if (hasBanner) {
      await channel.send({ embeds: [buildBannerEmbed()] });
    }

    const contentEmbeds = [
      buildHeaderEmbed(),
      ...RULES.map((rule, i) => buildRuleEmbed(rule, i)),
      buildFooterEmbed(),
    ];

    const batches = chunkEmbeds(contentEmbeds, 10);
    for (const batch of batches) {
      await channel.send({ embeds: batch });
    }

    return { ok: true, action: 'sent' };
  } catch (err) {
    return { ok: false, reason: 'send_error', error: err };
  }
}

// ---- module export ----

module.exports = function (client, adminIds) {
  // Tu dong dang bang luat NGAY KHI BOT ONLINE - khong can cho admin go
  // lenh /rules nua. Lenh /rules van giu lai de lam moi thu cong bat cu
  // luc nao (vd sau khi sua noi dung RULES hoac them anh ma khong muon
  // restart lai bot).
  client.once('ready', async () => {
    const result = await postOrUpdateRules(client);
    if (result.ok) {
      console.log('[rules.js] Da tu dong dang bang luat khi bot online.');
    } else {
      console.error(`[rules.js] Khong the tu dong dang bang luat (ly do: ${result.reason}).`);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'rules') return;

    const coQuyenAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const namTrongDanhSach = adminIds.includes(interaction.user.id);
    if (!coQuyenAdmin && !namTrongDanhSach) {
      return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này!', ephemeral: true }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const result = await postOrUpdateRules(client);

    if (!result.ok) {
      const messages = {
        invalid_id: 'RULES_CHANNEL_ID trong rules.js không hợp lệ (phải là ID kênh dạng số)!',
        channel_not_found: 'Không tìm thấy kênh Rules trong server này. Kiểm tra lại RULES_CHANNEL_ID!',
        send_error: `Lỗi khi đăng bảng luật: ${result.error ? result.error.message : 'không rõ nguyên nhân'}`,
      };
      return interaction.editReply({ content: messages[result.reason] || 'Có lỗi xảy ra.' }).catch(() => {});
    }

    return interaction.editReply({ content: `Đã đăng lại bảng luật vào <#${RULES_CHANNEL_ID}>.` }).catch(() => {});
  });
};