// wellcome.js - Module Welcome & Goodbye (dung file anh dinh kem, khong phu thuoc link ngoai)

module.exports = (client) => {
    const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
    const path = require('path');

    const WELCOME_CHANNEL_ID = '1525858054929649744';
    const GOODBYE_CHANNEL_ID = '1525858147669901596';

    // Duong dan toi file anh that, nam ngay o thu muc goc cua project
    const WELCOME_IMAGE_PATH = path.join(__dirname, 'welcome.jpg');
    const GOODBYE_IMAGE_PATH = path.join(__dirname, 'goodbye.jpg');

    // ===== WELCOME =====
    client.on("guildMemberAdd", async (member) => {
        try {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (!channel) return;

            const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
            const serverName = member.guild.name;
            const memberCount = member.guild.memberCount;

            const attachment = new AttachmentBuilder(WELCOME_IMAGE_PATH, { name: 'welcome.jpg' });

            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle(`✨ WELCOME TO **${serverName}** ✨`)
                .setDescription(`
                    <@${member.user.id}>

                    **${memberCount} @ ${serverName}**

                    Join At: <t:${Math.floor(Date.now() / 1000)}:R>
                `)
                .setThumbnail(avatarURL)
                .setImage('attachment://welcome.jpg')
                .setFooter({ text: `ID: ${member.id} | Wellcome To ★𝐕𝐚𝐧𝐆𝐮𝐚𝐫𝐝 𝐨𝐟 𝐋𝐢𝐛𝐞𝐫𝐭𝐲★` })
                .setTimestamp();

            await channel.send({ embeds: [embed], files: [attachment] });

        } catch (err) {
            console.error(" Lỗi Welcome:", err);
        }
    });

    // ===== GOODBYE =====
    client.on("guildMemberRemove", async (member) => {
        try {
            const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
            if (!channel) return;

            const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
            const serverName = member.guild.name;
            const memberCount = member.guild.memberCount;

            const attachment = new AttachmentBuilder(GOODBYE_IMAGE_PATH, { name: 'goodbye.jpg' });

            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle(` GOODBYE ${member.user.tag}`)
                .setDescription(`
                    <@${member.user.id}>

                    **${memberCount} @ ${serverName}**

                    Goodbye: <t:${Math.floor(Date.now() / 1000)}:R>
                `)
                .setThumbnail(avatarURL)
                .setImage('attachment://goodbye.jpg')
                .setFooter({ text: `ID: ${member.id} | Hẹn gặp lại!` })
                .setTimestamp();

            await channel.send({ embeds: [embed], files: [attachment] });

        } catch (err) {
            console.error("❌ Lỗi Goodbye:", err);
        }
    });

    console.log("✅ Welcome & Goodbye loaded!");
};