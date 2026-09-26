// deploy-commands.js - Chạy 1 lần để register slash command
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'clear',
        description: 'Xóa tin nhắn hàng loạt (hiện bảng nhập)',
        default_member_permissions: '8192' // ManageMessages
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Đang đăng ký slash command...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Đã đăng ký thành công!');
    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
})();