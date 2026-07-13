// clear.js - Slash Command Version (FIX 100%)

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Xóa tin nhắn hàng loạt (hiện Modal nhập số lượng)')
        .setDefaultMemberPermissions('ManageMessages'),

    async execute(interaction) {
        // Kiểm tra quyền
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({
                content: '❌ Mày cần quyền **Quản lý tin nhắn** để dùng lệnh này!',
                ephemeral: true
            });
        }

        // Tạo Modal
        const modal = new ModalBuilder()
            .setCustomId(`clearModal_${interaction.id}`)
            .setTitle('🗑️ XÓA TIN NHẮN');

        const amountInput = new TextInputBuilder()
            .setCustomId('amountInput')
            .setLabel('Số lượng tin nhắn cần xóa (1-100)')
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

        // Hiện Modal (LÀM VIỆC VỚI INTERACTION)
        await interaction.showModal(modal);

        // Lắng nghe Modal submit
        const filter = (i) => 
            i.customId === `clearModal_${interaction.id}` && 
            i.user.id === interaction.user.id;

        try {
            const modalInteraction = await interaction.awaitModalSubmit({
                filter,
                time: 120000
            });

            const amount = parseInt(modalInteraction.fields.getTextInputValue('amountInput'));
            let days = parseInt(modalInteraction.fields.getTextInputValue('dayInput')) || 61;

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return modalInteraction.reply({
                    content: '❌ Số lượng không hợp lệ! Nhập từ **1 đến 100**.',
                    ephemeral: true
                });
            }

            if (isNaN(days) || days < 1) days = 61;
            if (days > 365) days = 365;

            await modalInteraction.deferReply({ ephemeral: true });

            // Xử lý xóa tin nhắn
            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            let totalDeleted = 0;
            let lastId = null;
            let hasMore = true;
            const maxIterations = 10;

            for (let iter = 0; iter < maxIterations && hasMore && totalDeleted < amount; iter++) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await interaction.channel.messages.fetch(options);
                if (messages.size === 0) break;

                const oldMessages = messages.filter(msg =>
                    !msg.pinned &&
                    msg.createdTimestamp < cutoffTime &&
                    msg.id !== interaction.id
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

            // Embed kết quả
            const embed = new EmbedBuilder()
                .setColor(totalDeleted > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle(totalDeleted > 0 ? '🗑️ ĐÃ XÓA TIN NHẮN' : '⚠️ KHÔNG TÌM THẤY TIN NHẮN')
                .setDescription(
                    totalDeleted > 0
                        ? `✅ Đã xóa **${totalDeleted}** tin nhắn cũ hơn **${days} ngày** trong <#${interaction.channel.id}>`
                        : `❌ Không tìm thấy tin nhắn nào cũ hơn **${days} ngày** để xóa.`
                )
                .addFields(
                    { name: '👤 Người thực hiện', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📅 Ngày giới hạn', value: `<t:${Math.floor(cutoffTime / 1000)}:R>`, inline: true },
                    { name: '📊 Tổng đã xóa', value: `${totalDeleted} tin nhắn`, inline: true }
                )
                .setFooter({ text: `Kênh: ${interaction.channel.name}` })
                .setTimestamp();

            await modalInteraction.editReply({ embeds: [embed] });

            setTimeout(async () => {
                try { await modalInteraction.deleteReply(); } catch (e) {}
            }, 10000);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                await interaction.followUp({
                    content: '⏰ Hết thời gian chờ! Dùng `/clear` lại nhé.',
                    ephemeral: true
                });
            } else {
                console.error('❌ Lỗi Modal:', error);
            }
        }
    }
};