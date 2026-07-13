// clear.js - PREFIX VERSION (dùng !clear)
const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Xóa tin nhắn hàng loạt',
    
    // Dùng cho prefix command
    async execute(message, args) {
        // Kiểm tra quyền
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ Mày cần quyền **Quản lý tin nhắn**!');
        }

        try {
            // Lấy số lượng từ args
            const amount = parseInt(args[0]) || 10;
            if (amount < 1 || amount > 100) {
                return message.reply('❌ Nhập số từ 1-100!');
            }

            // Xóa tin nhắn
            const deleted = await message.channel.bulkDelete(amount, true);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🗑️ ĐÃ XÓA TIN NHẮN')
                .setDescription(`✅ Đã xóa **${deleted.size}** tin nhắn!`)
                .setTimestamp();

            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete(), 5000);

        } catch (error) {
            console.error('❌ Lỗi clear:', error);
            return message.reply('❌ Lỗi khi xóa tin nhắn!');
        }
    }
};