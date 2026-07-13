const {
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Xóa tin nhắn hàng loạt',

    async execute(message, args, client) {
        // ========== KIỂM TRA QUYỀN ==========
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply({
                content: '❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!'
            });
        }

        if (!message.guild.members.me.permissions.has('ManageMessages')) {
            return message.reply({
                content: '❌ Bot cần quyền **Quản lý tin nhắn** để xóa!'
            });
        }

        // ========== TẠO MODAL ==========
        const modal = new ModalBuilder()
            .setCustomId(`clearModal_${message.id}_${message.author.id}`)
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
            .setPlaceholder('Ví dụ: Spam, quá nhiều tin rác...')
            .setRequired(false)
            .setMaxLength(100);

        const row1 = new ActionRowBuilder().addComponents(amountInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row1, row2);

        // ========== HIỆN MODAL ==========
        try {
            await message.showModal(modal);
            console.log(`✅ [CLEAR] ${message.author.tag} đã mở Modal`);
        } catch (error) {
            console.error('❌ Lỗi hiện Modal:', error);
            return message.reply({
                content: '❌ Không thể hiện bảng nhập! Vui lòng thử lại.'
            });
        }

        // ========== LẮNG NGHE MODAL SUBMIT ==========
        const filter = (interaction) =>
            interaction.customId === `clearModal_${message.id}_${message.author.id}` &&
            interaction.user.id === message.author.id;

        try {
            const modalInteraction = await message.awaitModalSubmit({
                filter,
                time: 120000
            });

            const amount = parseInt(modalInteraction.fields.getTextInputValue('amountInput'));
            const reason = modalInteraction.fields.getTextInputValue('reasonInput') || 'Không có lý do';

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return modalInteraction.reply({
                    content: '❌ Số lượng không hợp lệ! Vui lòng nhập từ **1 đến 100**.',
                    ephemeral: true
                });
            }

            await modalInteraction.deferReply({ ephemeral: true });

            // ========== TIẾN HÀNH XÓA ==========
            const fetched = await message.channel.messages.fetch({ limit: amount });
            const messagesToDelete = fetched.filter(msg =>
                !msg.pinned &&
                msg.id !== message.id &&
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

            // ========== EMBED KẾT QUẢ ==========
            const embed = new EmbedBuilder()
                .setColor(deletedCount > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle(deletedCount > 0 ? '🗑️ ĐÃ XÓA TIN NHẮN' : '⚠️ KHÔNG XÓA ĐƯỢC TIN NÀO')
                .setDescription(
                    deletedCount > 0
                        ? `✅ Đã xóa thành công **${deletedCount}** tin nhắn!`
                        : '❌ Không thể xóa tin nhắn nào!'
                )
                .addFields(
                    { name: '👤 Người thực hiện', value: `<@${message.author.id}>`, inline: true },
                    { name: '📊 Yêu cầu', value: `${amount} tin nhắn`, inline: true },
                    { name: '📊 Đã xóa', value: `${deletedCount} tin nhắn`, inline: true },
                    { name: '📌 Lý do', value: reason, inline: false }
                )
                .setFooter({ text: `Kênh: #${message.channel.name}` })
                .setTimestamp();

            await modalInteraction.editReply({ embeds: [embed] });

            setTimeout(async () => {
                try { await modalInteraction.deleteReply(); } catch (e) {}
            }, 15000);

            console.log(`📝 [CLEAR] ${message.author.tag} đã xóa ${deletedCount}/${amount} tin nhắn`);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return message.reply({
                    content: '⏰ Hết thời gian chờ! Gõ `!clear` lại nhé.'
                });
            }
            console.error('❌ Lỗi xử lý Modal:', error);
            return message.reply({
                content: '❌ Có lỗi xảy ra! Vui lòng thử lại.'
            });
        }
    }
};