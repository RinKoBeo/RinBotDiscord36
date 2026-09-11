// rules.js - Đăng / cập nhật bảng LUẬT (Rules) vào 1 kênh cố định
// Tự động đăng khi bot online. Lệnh /rules (chỉ Admin) dùng để làm mới thủ công.
//
// CẤU TRÚC: mỗi rule = 1 tin nhắn gồm:
//   - content: dòng tiêu đề "# RULE N" (markdown heading CHỈ hoạt động ở
//     phần content của tin nhắn, KHÔNG hoạt động trong embed description/
//     field - đây là lý do phải tách content riêng thay vì nhét vào embed).
//   - embeds: 1 embed nhỏ chứa tên rule (in đậm, có bullet) + nội dung.
//
// Khi làm mới (bot restart hoặc chạy /rules): bot XOÁ SẠCH các tin nhắn
// CỦA CHÍNH NÓ trong kênh rồi gửi lại từ đầu - đơn giản và luôn đúng thứ
// tự.

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
  {
    title: 'Quấy rối tình dục | Quấy rối cá nhân',
    desc: 'Cấm mọi hành vi quấy rối tình dục, quấy rối cá nhân, đe dọa hoặc bắt nạt người khác. Bao gồm tin nhắn, hình ảnh, giọng nói trong voice hoặc bất kỳ hình thức nào khác.',
  },
  {
    title: 'Ngôn từ thô tục | Chửi bậy',
    desc: 'Hạn chế sử dụng ngôn từ thô tục, chửi bậy, xúc phạm người khác. Nếu muốn chửi bậy hãy luôn nhớ nhưng câu từ bạn thốt ra nó không rút lại được và hình phạt cũng vậy.',
  },
  {
    title: 'Không được làm phiền Moderator',
    desc: 'Không được làm phiền Moderator, Admin hay Ban Quản Trị khi họ đang bận. Nếu có vấn đề cần giải quyết hãy tạo Ticket hoặc gửi tin nhắn riêng cho họ, không spam ping hay tag.',
  },
];

const DIVIDER = '----------';

// ---- helpers ----

// Embed CHI chua anh banner - hien tran vien tren cung, khong title.
function buildBannerEmbed() {
  return new EmbedBuilder().setColor('#8B0000').setImage(RULES_BANNER_URL);
}

// Embed tieu de + mo ta chung, hien ngay sau banner, truoc cac rule.
function buildHeaderEmbed() {
  return new EmbedBuilder()
    .setTitle(RULES_TITLE)
    .setColor(0xff0000)
    .setDescription('**Luật Discord** giúp tạo ra môi trường cộng đồng an toàn, tôn trọng và có trật tự. Cần thực hiện theo.')
    .setTimestamp();
}

// Dong tieu de "RULE N" TO CHU HAN HOI - dung markdown heading "# " cua
// Discord, thu CHI hoat dong trong CONTENT cua tin nhan (khong hoat dong
// ben trong embed description/field). Vi vay phai gui rieng phan content
// nay, kem 1 embed noi dung ngay ben duoi trong CUNG 1 tin nhan.
function buildRuleHeaderContent(index) {
  return `${DIVIDER}\n# RULE ${index + 1}\n${DIVIDER}`;
}

// Embed noi dung 1 rule (ten rule in dam + bullet, roi toi mo ta).
function buildRuleContentEmbed(rule) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(`• **${rule.title}**\n\n${rule.desc}`);
}

// Embed ghi chu ket thuc, hien sau cung.
function buildFooterEmbed() {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription('_Vi phạm luật có thể dẫn đến cảnh cáo (warn), timeout, kick hoặc ban tuỳ mức độ, theo quyết định của Ban Quản Trị._');
}

// Xoa sach cac tin nhan CUA CHINH BOT trong kenh (quet 100 tin gan nhat -
// tang tu 50 len 100 vi gio moi rule la 1 tin rieng, tong so tin nhieu
// hon truoc) - don gian va luon dung, khong can do/so khop tin cu.
async function clearOldRulesMessages(channel, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const ownMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of ownMessages.values()) {
      await msg.delete().catch(() => {});
    }
  } catch (err) {
    console.error('[rules.js] Loi xoa tin nhan luat cu:', err.message);
  }
}

// Gui toan bo bang luat vao kenh:
//   1) Banner (1 tin, chi anh)
//   2) Header (1 tin, tieu de + mo ta chung)
//   3) Tung rule (moi rule 1 tin: dong "# RULE N" to + embed noi dung)
//   4) Footer (1 tin, ghi chu)
// Dung chung cho ca luc bot vua online (tu dong) lan khi admin go /rules.
async function postOrUpdateRules(client) {
  if (!RULES_CHANNEL_ID || !/^\d{5,25}$/.test(RULES_CHANNEL_ID)) {
    return { ok: false, reason: 'invalid_id' };
  }

  const channel = client.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) {
    return { ok: false, reason: 'channel_not_found' };
  }

  await clearOldRulesMessages(channel, client);

  const hasBanner = RULES_BANNER_URL && /^https?:\/\//i.test(RULES_BANNER_URL);

  try {
    if (hasBanner) {
      await channel.send({ embeds: [buildBannerEmbed()] });
    }
  } catch (err) {
    return { ok: false, reason: 'send_error', step: 'banner', error: err };
  }

  try {
    await channel.send({ embeds: [buildHeaderEmbed()] });
  } catch (err) {
    return { ok: false, reason: 'send_error', step: 'header', error: err };
  }

  for (let i = 0; i < RULES.length; i++) {
    try {
      await channel.send({
        content: buildRuleHeaderContent(i),
        embeds: [buildRuleContentEmbed(RULES[i])],
      });
    } catch (err) {
      return { ok: false, reason: 'send_error', step: `rule_${i + 1}`, error: err };
    }
  }

  try {
    await channel.send({ embeds: [buildFooterEmbed()] });
  } catch (err) {
    return { ok: false, reason: 'send_error', step: 'footer', error: err };
  }

  return { ok: true, action: 'sent' };
}

// ---- module export ----

module.exports = function (client, adminIds) {
  // Tu dong dang bang luat NGAY KHI BOT ONLINE - khong can cho admin go
  // lenh /rules nua. Lenh /rules van giu lai de lam moi thu cong bat cu
  // luc nao (vd sau khi sua noi dung RULES ma khong muon restart lai bot).
  client.once('ready', async () => {
    const result = await postOrUpdateRules(client);
    if (result.ok) {
      console.log('[rules.js] Da tu dong dang bang luat khi bot online.');
    } else {
      // In ra LOI THAT (khong chi mac reason chung chung) de biet dung
      // nguyen nhan: thieu quyen gui tin/embed trong kenh Rules, link anh
      // sai, hay ly do khac. Kem ca buoc nao dang gui thi bi loi (step).
      console.error(
        `[rules.js] Khong the tu dong dang bang luat (buoc: ${result.step || result.reason}):`,
        result.error || result.reason
      );
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
        send_error: `Lỗi khi đăng bảng luật ở bước "${result.step}": ${result.error ? result.error.message : 'không rõ nguyên nhân'}`,
      };
      return interaction.editReply({ content: messages[result.reason] || 'Có lỗi xảy ra.' }).catch(() => {});
    }

    return interaction.editReply({ content: `Đã đăng lại bảng luật vào <#${RULES_CHANNEL_ID}>.` }).catch(() => {});
  });
};