// clear.js - HỖ TRỢ CẢ !clear VÀ /clear, KHÔNG LỖI
const {
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = async (client) => {
    // ==============================
    // 1. XỬ LÝ SLASH COMMAND: /clear
    // ==============================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'clear') return;

        try {
            // Kiểm tra quyền
            if (!interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!',
                    ephemeral: true
                });
            }

            // Tạo Modal
            const modal = new ModalBuilder()
                .setCustomId(`clearModal_${interaction.id}_${interaction.user.id}`)
                .setTitle('🗑️ XÓA TIN NHẮN');

            const amountInput = new TextInputBuilder()
                .setCustomId('amountInput')
                .setLabel('📝 Số lượng tin nhắn cần xóa (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 50')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reasonInput')
                .setLabel('📌 Lý do xóa (không bắt buộc)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: Spam')
                .setRequired(false)
                .setMaxLength(100);

            const row1 = new ActionRowBuilder().addComponents(amountInput);
            const row2 = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
            console.log(`✅ [CLEAR] ${interaction.user.tag} đã mở Modal`);

            // Lắng nghe Modal submit
            const filter = (i) =>
                i.customId === `clearModal_${interaction.id}_${interaction.user.id}` &&
                i.user.id === interaction.user.id;

            const modalInteraction = await interaction.awaitModalSubmit({
                filter,
                time: 120000
            });

            const amount = parseInt(modalInteraction.fields.getTextInputValue('amountInput'));
            const reason = modalInteraction.fields.getTextInputValue('reasonInput') || 'Không có lý do';

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return modalInteraction.reply({
                    content: '❌ Số lượng không hợp lệ! Nhập từ **1 đến 100**.',
                    ephemeral: true
                });
            }

            await modalInteraction.deferReply({ ephemeral: true });

            // Xóa tin nhắn
            const fetched = await interaction.channel.messages.fetch({ limit: amount });
            const messagesToDelete = fetched.filter(msg =>
                !msg.pinned &&
                msg.id !== interaction.id &&
                Date.now() - msg.createdTimestamp < 1209600000
            );

            if (messagesToDelete.size === 0) {
                return modalInteraction.editReply({
                    content: '⚠️ Không tìm thấy tin nhắn nào để xóa!'
                });
            }

            let deletedCount = 0;
            for (const [id, msg] of messagesToDelete) {
                try {
                    await msg.delete();
                    deletedCount++;
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.log(`⚠️ Không xóa được ${id}: ${e.message}`);
                }
            }

            // Embed kết quả
            const embed = new EmbedBuilder()
                .setColor(deletedCount > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle(deletedCount > 0 ? '🗑️ ĐÃ XÓA TIN NHẮN' : '⚠️ KHÔNG XÓA ĐƯỢC TIN NÀO')
                .setDescription(
                    deletedCount > 0
                        ? `✅ Đã xóa thành công **${deletedCount}** tin nhắn!`
                        : '❌ Không thể xóa tin nhắn nào!'
                )
                .addFields(
                    { name: '👤 Người thực hiện', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📊 Yêu cầu', value: `${amount} tin nhắn`, inline: true },
                    { name: '📊 Đã xóa', value: `${deletedCount} tin nhắn`, inline: true },
                    { name: '📌 Lý do', value: reason, inline: false }
                )
                .setFooter({ text: `Kênh: #${interaction.channel.name}` })
                .setTimestamp();

            await modalInteraction.editReply({ embeds: [embed] });

            setTimeout(async () => {
                try { await modalInteraction.deleteReply(); } catch (e) {}
            }, 15000);

            console.log(`📝 [CLEAR] ${interaction.user.tag} đã xóa ${deletedCount}/${amount} tin nhắn`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return interaction.reply({
                    content: '⏰ Hết thời gian chờ! Dùng `/clear` lại nhé.',
                    ephemeral: true
                });
            }
            console.error('❌ Lỗi xử lý Modal:', error);
            return interaction.reply({
                content: '❌ Có lỗi xảy ra! Vui lòng thử lại.',
                ephemeral: true
            });
        }
    });

    // ==============================
    // 2. XỬ LÝ PREFIX COMMAND: !clear
    // ==============================
    client.on('messageCreate', async (message) => {
        // Bỏ qua bot và tin nhắn không đúng format
        if (message.author.bot || !message.guild) return;
        if (!message.content.startsWith('!clear')) return;

        // Kiểm tra quyền
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!');
        }

        // Hỏi số lượng qua tin nhắn
        const question = await message.reply('📝 **Nhập số lượng tin nhắn cần xóa (1-100):**');

        // Tạo collector để lắng nghe câu trả lời
        const filter = (m) => m.author.id === message.author.id && !isNaN(m.content) && m.content > 0 && m.content <= 100;
        const collector = message.channel.createMessageCollector({
            filter,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (m) => {
            const amount = parseInt(m.content);
            await m.delete().catch(() => {}); // Xóa tin nhắn trả lời

            try {
                // Xóa tin nhắn
                const fetched = await message.channel.messages.fetch({ limit: amount });
                const messagesToDelete = fetched.filter(msg =>
                    !msg.pinned &&
                    msg.id !== message.id &&
                    Date.now() - msg.createdTimestamp < 1209600000
                );

                if (messagesToDelete.size === 0) {
                    return message.reply('⚠️ Không tìm thấy tin nhắn nào để xóa!');
                }

                let deletedCount = 0;
                for (const [id, msg] of messagesToDelete) {
                    try {
                        await msg.delete();
                        deletedCount++;
                        await new Promise(r => setTimeout(r, 200));
                    } catch (e) {
                        console.log(`⚠️ Không xóa được ${id}: ${e.message}`);
                    }
                }

                // Embed kết quả
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🗑️ ĐÃ XÓA TIN NHẮN')
                    .setDescription(`✅ Đã xóa thành công **${deletedCount}** tin nhắn!`)
                    .addFields(
                        { name: '👤 Người thực hiện', value: `<@${message.author.id}>`, inline: true },
                        { name: '📊 Yêu cầu', value: `${amount} tin nhắn`, inline: true },
                        { name: '📊 Đã xóa', value: `${deletedCount} tin nhắn`, inline: true }
                    )
                    .setFooter({ text: `Kênh: #${message.channel.name}` })
                    .setTimestamp();

                const reply = await message.channel.send({ embeds: [embed] });
                setTimeout(() => reply.delete().catch(() => {}), 10000);

                await question.delete().catch(() => {});
                console.log(`📝 [CLEAR] ${message.author.tag} đã xóa ${deletedCount}/${amount} tin nhắn qua !clear`);

            } catch (error) {
                console.error('❌ Lỗi xóa tin nhắn:', error);
                message.reply('❌ Có lỗi xảy ra! Vui lòng thử lại.');
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await question.delete().catch(() => {});
                message.reply('⏰ Hết thời gian chờ! Gõ `!clear` lại nhé.').then(msg => {
                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                });
            }
        });
    });
};