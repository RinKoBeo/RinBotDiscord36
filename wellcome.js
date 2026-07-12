// welcome.js - Module Welcome & Goodbye

module.exports = (client) => {
    const { EmbedBuilder } = require('discord.js');

    const WELCOME_CHANNEL_ID = "1525858054929649744";
    const GOODBYE_CHANNEL_ID = "1525858147669901596";

    // WELCOME
    client.on("guildMemberAdd", async (member) => {
        try {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (!channel) return;

            const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
            const welcomeGif = "https://media.giphy.com/media/3o7abldj0nK8e2c2g8/giphy.gif"; // Thay link mày muốn

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🎉 CHÀO MỪNG ${member.user.tag}!`)
                .setDescription(`
                    <@${member.user.id}>
                    👤 ${member.user.tag}
                    📅 Tạo tài khoản: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>
                    👥 Thành viên thứ: ${member.guild.memberCount}
                    Đọc luật ở kênh <#1525861136342188082> để khong bị Ban nhé!
                `)
                .setThumbnail(avatarURL)
                .setImage(welcomeGif)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Lỗi Welcome:", err);
        }
    });

    // GOODBYE
    client.on("guildMemberRemove", async (member) => {
        try {
            const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
            if (!channel) return;

            const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
            const goodbyeGif = "https://media.giphy.com/media/26u4c3PYwQAq3INFC/giphy.gif"; // Thay link mày muốn

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`👋 TẠM BIỆT ${member.user.tag}!`)
                .setDescription(`
                    <@${member.user.id}>
                    👤 ${member.user.tag}
                    📅 Rời lúc: <t:${Math.floor(Date.now() / 1000)}:R>
                    👥 Thành viên còn lại: ${member.guild.memberCount}
                `)
                .setThumbnail(avatarURL)
                .setImage(goodbyeGif)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("Lỗi Goodbye:", err);
        }
    });

    console.log("✅ Welcome & Goodbye loaded!");
};