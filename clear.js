// clear.js - Xóa tin nhắn hàng loạt (hỗ trợ tin nhắn cũ 61 ngày)

const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        try {
            if (message.author.bot || !message.guild) return;
            if (!message.content.startsWith("!clear")) return;

            // Kiểm tra quyền
            if (!message.member.permissions.has("ManageMessages")) {
                return message.reply("❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!");
            }

            if (!message.guild.members.me.permissions.has("ManageMessages")) {
                return message.reply("❌ Bot cần quyền **Quản lý tin nhắn** để xóa!");
            }

            // Tạo Modal
            const modal = new ModalBuilder()
                .setCustomId('clearModal')
                .setTitle('🗑️ XÓA TIN NHẮN');

            // Ô nhập số lượng
            const amountInput = new TextInputBuilder()
                .setCustomId('amountInput')
                .setLabel('Nhập số lượng tin nhắn cần xóa (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 50')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3);

            // Ô nhập ngày (tùy chọn)
            const dayInput = new TextInputBuilder()
                .setCustomId('dayInput')
                .setLabel('Nhập số ngày cũ nhất (mặc định 61 ngày)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 61 (để trống = 61)')
                .setRequired(false)
                .setMaxLength(4);

            const row1 = new ActionRowBuilder().addComponents(amountInput);
            const row2 = new ActionRowBuilder().addComponents(dayInput);

            modal.addComponents(row1, row2);

            await message.showModal(modal);

            const filter = (interaction) => 
                interaction.customId === 'clearModal' && 
                interaction.user.id === message.author.id;

            try {
                const interaction = await message.awaitModalSubmit({ filter, time: 60000 });

                const amount = parseInt(interaction.fields.getTextInputValue('amountInput'));
                let days = parseInt(interaction.fields.getTextInputValue('dayInput')) || 61; // Mặc định 61 ngày

                if (isNaN(amount) || amount < 1 || amount > 100) {
                    return interaction.reply({ 
                        content: "❌ Số lượng không hợp lệ! Nhập số từ **1 đến 100**.", 
                        ephemeral: true 
                    });
                }

                if (isNaN(days) || days < 1) days = 61;
                if (days > 365) days = 365; // Giới hạn tối đa 1 năm

                await interaction.deferReply({ ephemeral: true });

                // THỜI GIAN GIỚI HẠN (ngày cũ nhất)
                const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

                let totalDeleted = 0;
                let lastId = null;
                let hasMore = true;
                const maxIterations = 10; // Giới hạn số lần fetch để tránh loop vô tận

                for (let iter = 0; iter < maxIterations && hasMore; iter++) {
                    // Fetch tin nhắn
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    const messages = await message.channel.messages.fetch(options);
                    if (messages.size === 0) break;

                    // Lọc tin nhắn cũ hơn cutoffTime và không phải tin nhắn ghim
                    const oldMessages = messages.filter(msg => 
                        !msg.pinned && 
                        msg.createdTimestamp < cutoffTime &&
                        msg.id !== message.id
                    );

                    if (oldMessages.size === 0) {
                        // Không còn tin nhắn cũ, thoát
                        hasMore = false;
                        continue;
                    }

                    // Xóa từng tin nhắn một (vì bulkDelete chỉ xóa tin <14 ngày)
                    for (const [id, msg] of oldMessages) {
                        try {
                            await msg.delete();
                            totalDeleted++;
                            // Chờ 200ms để tránh rate limit
                            await new Promise(r => setTimeout(r, 200));
                        } catch (e) {
                            // Nếu lỗi (ví dụ: tin nhắn quá cũ), bỏ qua
                            console.log(`⚠️ Không xóa được tin nhắn ${id}: ${e.message}`);
                        }

                        // Giới hạn số lượng xóa theo yêu cầu của user
                        if (totalDeleted >= amount) {
                            hasMore = false;
                            break;
                        }
                    }

                    // Cập nhật lastId để fetch tin nhắn tiếp theo
                    if (messages.size > 0) {
                        lastId = messages.last().id;
                    } else {
                        hasMore = false;
                    }

                    // Nếu đã đạt số lượng cần xóa
                    if (totalDeleted >= amount) break;
                }

                // Kết quả
                const embed = new EmbedBuilder()
                    .setColor(totalDeleted > 0 ? 0x00FF00 : 0xFF0000)
                    .setTitle(totalDeleted > 0 ? "🗑️ ĐÃ XÓA TIN NHẮN" : "⚠️ KHÔNG TÌM THẤY TIN NHẮN")
                    .setDescription(
                        totalDeleted > 0 
                            ? `✅ Đã xóa **${totalDeleted}** tin nhắn cũ hơn **${days} ngày** trong kênh <#${message.channel.id}>`
                            : `❌ Không tìm thấy tin nhắn nào cũ hơn **${days} ngày** để xóa.`
                    )
                    .addFields(
                        { name: "👤 Người thực hiện", value: `<@${message.author.id}>`, inline: true },
                        { name: "📅 Ngày giới hạn", value: `<t:${Math.floor(cutoffTime / 1000)}:R>`, inline: true },
                        { name: "📊 Tổng đã xóa", value: `${totalDeleted} tin nhắn`, inline: true }
                    )
                    .setFooter({ text: `Kênh: ${message.channel.name}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

                // Tự động xóa thông báo sau 10 giây
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (e) {}
                }, 10000);

            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    await message.reply({ 
                        content: "⏰ Hết thời gian chờ! Thử lại lệnh `!clear` nhé.", 
                        ephemeral: true 
                    });
                } else {
                    console.error("Lỗi Modal:", error);
                }
            }

        } catch (err) {
            console.error("Lỗi clear:", err);
        }
    });
};