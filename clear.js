// clear.js - Xóa tin nhắn hàng loạt (FIX LỖI MODAL KHÔNG HIỆN)

const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = (client) => {
    client.on("messageCreate", async (message) => {
        try {
            if (message.author.bot || !message.guild) return;
            if (!message.content.startsWith("!clear")) return;

            console.log(`📝 [CLEAR] ${message.author.tag} đã gõ lệnh !clear`);

            // Kiểm tra quyền
            if (!message.member.permissions.has("ManageMessages")) {
                return message.reply({ 
                    content: "❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!",
                });
            }

            if (!message.guild.members.me.permissions.has("ManageMessages")) {
                return message.reply({ 
                    content: "❌ Bot cần quyền **Quản lý tin nhắn** để xóa!",
                });
            }

            // === TẠO MODAL ===
            const modal = new ModalBuilder()
                .setCustomId(`clearModal_${message.id}`) // 👈 THÊM UNIQUE ID
                .setTitle('🗑️ XÓA TIN NHẮN');

            const amountInput = new TextInputBuilder()
                .setCustomId('amountInput')
                .setLabel('Nhập số lượng tin nhắn cần xóa (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 50')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3);

            const dayInput = new TextInputBuilder()
                .setCustomId('dayInput')
                .setLabel('Số ngày cũ nhất (để trống = 61 ngày)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 61')
                .setRequired(false)
                .setMaxLength(4);

            const row1 = new ActionRowBuilder().addComponents(amountInput);
            const row2 = new ActionRowBuilder().addComponents(dayInput);
            modal.addComponents(row1, row2);

            // === HIỂN THỊ MODAL (CÓ TRY-CATCH CHI TIẾT) ===
            try {
                await message.showModal(modal);
                console.log(`✅ [CLEAR] Đã hiện Modal cho ${message.author.tag}`);
            } catch (modalError) {
                console.error("❌ Lỗi hiện Modal:", modalError);
                
                // 👇 XỬ LÝ LỖI CHI TIẾT HƠN
                let errorMsg = "❌ Không thể hiện bảng nhập! ";
                if (modalError.code === 50035) {
                    errorMsg += "Lỗi cấu trúc Modal (kiểm tra lại các trường nhập).";
                } else if (modalError.code === 40060) {
                    errorMsg += "Interaction đã được trả lời rồi!";
                } else {
                    errorMsg += `Lỗi: ${modalError.message}`;
                }
                
                return message.reply({ 
                    content: errorMsg,
                });
            }

            // === XỬ LÝ KHI NGƯỜI DÙNG GỬI MODAL ===
            const filter = (interaction) => 
                interaction.customId === `clearModal_${message.id}` && 
                interaction.user.id === message.author.id;

            try {
                const interaction = await message.awaitModalSubmit({ 
                    filter, 
                    time: 120000
                });

                console.log(`📥 [CLEAR] Nhận dữ liệu từ Modal của ${message.author.tag}`);

                const amount = parseInt(interaction.fields.getTextInputValue('amountInput'));
                let days = parseInt(interaction.fields.getTextInputValue('dayInput')) || 61;

                if (isNaN(amount) || amount < 1 || amount > 100) {
                    return interaction.reply({ 
                        content: "❌ Số lượng không hợp lệ! Nhập từ **1 đến 100**.", 
                        ephemeral: true 
                    });
                }

                if (isNaN(days) || days < 1) days = 61;
                if (days > 365) days = 365;

                await interaction.deferReply({ ephemeral: true });

                const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
                let totalDeleted = 0;
                let lastId = null;
                let hasMore = true;
                const maxIterations = 10;

                for (let iter = 0; iter < maxIterations && hasMore && totalDeleted < amount; iter++) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    const messages = await message.channel.messages.fetch(options);
                    if (messages.size === 0) break;

                    const oldMessages = messages.filter(msg => 
                        !msg.pinned && 
                        msg.createdTimestamp < cutoffTime &&
                        msg.id !== message.id
                    );

                    if (oldMessages.size === 0) {
                        hasMore = false;
                        continue;
                    }

                    for (const [id, msg] of oldMessages) {
                        if (totalDeleted >= amount) break;
                        try {
                            await msg.delete();
                            totalDeleted++;
                            await new Promise(r => setTimeout(r, 200));
                        } catch (e) {
                            console.log(`⚠️ Không xóa được ${id}: ${e.message}`);
                        }
                    }

                    if (messages.size > 0) {
                        lastId = messages.last().id;
                    } else {
                        hasMore = false;
                    }
                }

                // Kết quả
                const embed = new EmbedBuilder()
                    .setColor(totalDeleted > 0 ? 0x00FF00 : 0xFF0000)
                    .setTitle(totalDeleted > 0 ? "🗑️ ĐÃ XÓA TIN NHẮN" : "⚠️ KHÔNG TÌM THẤY TIN NHẮN")
                    .setDescription(
                        totalDeleted > 0 
                            ? `✅ Đã xóa **${totalDeleted}** tin nhắn cũ hơn **${days} ngày** trong <#${message.channel.id}>`
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

                // Tự xóa sau 10 giây
                setTimeout(async () => {
                    try { await interaction.deleteReply(); } catch (e) {}
                }, 10000);

            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    await message.reply({ 
                        content: "⏰ Hết thời gian chờ! Thử lại `!clear` nhé.",
                    });
                } else {
                    console.error("❌ Lỗi Modal:", error);
                    await message.reply({ 
                        content: `❌ Lỗi xử lý: ${error.message}`,
                    });
                }
            }

        } catch (err) {
            console.error("❌ Lỗi clear:", err);
        }
    });
};