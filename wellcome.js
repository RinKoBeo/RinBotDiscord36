// welcome.js - Module Welcome & Goodbye (ĐÃ CẬP NHẬT LINK ẢNH CỦA MÀY)

module.exports = (client) => {
    const { EmbedBuilder } = require('discord.js');

    const WELCOME_CHANNEL_ID = [
        '1525858054929649744'
    ];
    const GOODBYE_CHANNEL_ID = [
        '1525858147669901596'
    ];

    // ===== WELCOME =====
    client.on("guildMemberAdd", async (member) => {
        try {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (!channel) return;

            const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: true });
            const serverName = member.guild.name;
            const memberCount = member.guild.memberCount;

            // ẢNH WELCOME CỦA MÀY (LINK TỪ CATBOX)
            const welcomeImage = "https://files.catbox.moe/sxvxev.jpg";

            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF) // Viền trắng
                .setTitle(`✨ WELCOME TO **${serverName}** ✨`)
                .setDescription(`
                    <@${member.user.id}>

                    **${memberCount} @ ${serverName}**

                    Join At: <t:${Math.floor(Date.now() / 1000)}:R>
                `)
                .setThumbnail(avatarURL)   // Avatar member bên cạnh
                .setImage(welcomeImage)     // ẢNH WELCOME CỦA MÀY Ở DƯỚI
                .setFooter({ text: `ID: ${member.id} | Wellcome To ★𝐕𝐚𝐧𝐆𝐮𝐚𝐫𝐝 𝐨𝐟 𝐋𝐢𝐛𝐞𝐫𝐭𝐲★` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Lỗi Welcome:", err);
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

            // ẢNH GOODBYE CỦA MÀY (LINK TỪ CATBOX)
            const goodbyeImage = "https://files.catbox.moe/urh4ep.jpg";

            const embed = new EmbedBuilder()
                .setColor(0xFFFFFF) // Viền trắng
                .setTitle(`👋 GOODBYE ${member.user.tag}`)
                .setDescription(`
                    <@${member.user.id}>

                    **${memberCount} @ ${serverName}**

                    Goodbye: <t:${Math.floor(Date.now() / 1000)}:R>
                `)
                .setThumbnail(avatarURL)
                .setImage(goodbyeImage)     // ẢNH GOODBYE CỦA MÀY Ở DƯỚI
                .setFooter({ text: `ID: ${member.id} | Hẹn gặp lại!` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (err) {
            console.error("❌ Lỗi Goodbye:", err);
        }
    });

    console.log("✅ Welcome & Goodbye loaded!");
};