// keepalive.js - Tự động đánh thức, xóa tin nhắn cũ của bot
const keepAliveChannelId = '1527352516151607480'; // Sửa ID kênh vào đây

module.exports = function(client) {
  setInterval(async () => {
    try {
      const channel = client.channels.cache.get(keepAliveChannelId);
      if (!channel) {
        console.error(`Không tìm thấy kênh ${keepAliveChannelId} để keepalive`);
        return;
      }

      // Lấy 100 tin nhắn gần nhất (giới hạn tối đa)
      const messages = await channel.messages.fetch({ limit: 10000 });
      
      // Lọc chỉ tin nhắn của bot
      const botMessages = messages.filter(msg => msg.author.id === client.user.id);
      
      // Xóa từng tin
      for (const msg of botMessages.values()) {
        await msg.delete().catch(() => {});
      }

      // Gửi tin nhắn mới
      const msg = await channel.send(`🔄 Bot đang hoạt động - ${new Date().toLocaleString('vi-VN')}`);
      
      // Log ra console (không ảnh hưởng kênh)
      console.log(`✅ Keepalive: ${msg.content}`);
    } catch (error) {
      console.error('Lỗi keepalive:', error.message);
    }
  }, 60000); // 60 giây = 1 phút

  console.log('✅ Keepalive đã bật! Bot sẽ tự động giữ tỉnh và xóa log cũ.');
};