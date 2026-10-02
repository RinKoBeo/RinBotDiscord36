const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');
const play = require('play-dl');

module.exports = (client) => {
    // Quan ly hang cho cua tung server (guild.id -> queue)
    const queues = new Map();

    // Bang dieu khien (khong dung emoji theo yeu cau)
    function createControlPanel() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setLabel('Play / Pause')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('Queue')
                .setStyle(ButtonStyle.Success)
        );
    }

    // Ham choi nhac
    async function playNext(guildId, queue) {
        if (queue.songs.length === 0) {
            queue.textChannel.send({ content: 'Da phat het nhac trong hang cho. Bot dang ngat ket noi.' }).catch(() => {});
            if (queue.connection) queue.connection.destroy();
            queues.delete(guildId);
            return;
        }

        const song = queue.songs[0];
        try {
            // Tao stream tu play-dl
            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            queue.player.play(resource);

            // Xoa tin nhan bang dieu khien cu neu co
            if (queue.controlMessage) {
                queue.controlMessage.delete().catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setTitle('Dang phat')
                .setColor(0x0099ff)
                .setDescription(`[${song.title}](${song.url})`)
                .addFields(
                    { name: 'Thoi luong', value: song.duration || 'Khong ro', inline: true },
                    { name: 'Nguoi yeu cau', value: `<@${song.requestedBy}>`, inline: true }
                );

            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }

            const panel = createControlPanel();
            queue.controlMessage = await queue.textChannel.send({
                embeds: [embed],
                components: [panel]
            }).catch(() => null);

        } catch (error) {
            console.error('Loi phat nhac:', error);
            queue.textChannel.send({ content: 'Da xay ra loi khi phat bai nay, dang bo qua...' }).catch(() => {});
            queue.songs.shift();
            playNext(guildId, queue);
        }
    }

    client.on('interactionCreate', async (interaction) => {
        // Xu ly nut bam (Buttons) tren bang dieu khien
        if (interaction.isButton() && interaction.customId.startsWith('music_')) {
            const queue = queues.get(interaction.guildId);
            if (!queue) {
                return interaction.reply({ content: 'Hien tai khong co nhac dang phat!', ephemeral: true });
            }

            // Kiem tra user co trong cung voice channel khong
            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== queue.voiceChannel.id) {
                return interaction.reply({ content: 'Ban phai o cung kenh thoai voi bot de dieu khien!', ephemeral: true });
            }

            const action = interaction.customId;

            if (action === 'music_pause') {
                if (queue.player.state.status === AudioPlayerStatus.Playing) {
                    queue.player.pause();
                    return interaction.reply({ content: 'Da tam dung nhac.', ephemeral: false });
                } else if (queue.player.state.status === AudioPlayerStatus.Paused || queue.player.state.status === AudioPlayerStatus.AutoPaused) {
                    queue.player.unpause();
                    return interaction.reply({ content: 'Da tiep tuc phat nhac.', ephemeral: false });
                } else {
                    return interaction.reply({ content: 'Khong the thuc hien luc nay.', ephemeral: true });
                }
            }

            if (action === 'music_skip') {
                queue.player.stop(); // Stop player se kich hoat su kien Idle de chuyen bai
                return interaction.reply({ content: 'Da bo qua bai hien tai.', ephemeral: false });
            }

            if (action === 'music_stop') {
                queue.songs = [];
                queue.player.stop();
                return interaction.reply({ content: 'Da dung nhac va xoa hang cho.', ephemeral: false });
            }

            if (action === 'music_queue') {
                if (queue.songs.length === 0) {
                    return interaction.reply({ content: 'Hang cho dang trong.', ephemeral: true });
                }
                let queueString = queue.songs.slice(0, 10).map((s, i) => `${i + 1}. ${s.title} (${s.duration})`).join('\n');
                if (queue.songs.length > 10) {
                    queueString += `\n...va ${queue.songs.length - 10} bai khac`;
                }
                const qEmbed = new EmbedBuilder()
                    .setTitle('Hang cho hien tai')
                    .setColor(0x0099ff)
                    .setDescription(queueString);
                return interaction.reply({ embeds: [qEmbed], ephemeral: true });
            }
        }

        // Xu ly Slash Commands
        if (interaction.isChatInputCommand()) {
            if (['play', 'pause', 'resume', 'skip', 'stop', 'queue'].includes(interaction.commandName)) {
                
                // /play
                if (interaction.commandName === 'play') {
                    await interaction.deferReply();
                    const query = interaction.options.getString('baihat');
                    const voiceChannel = interaction.member.voice.channel;

                    if (!voiceChannel) {
                        return interaction.editReply({ content: 'Ban phai tham gia mot kenh thoai truoc!' });
                    }

                    // Kiem tra quyen vao voice
                    const permissions = voiceChannel.permissionsFor(interaction.client.user);
                    if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
                        return interaction.editReply({ content: 'Bot khong co quyen tham gia hoac phat nhac trong kenh thoai cua ban.' });
                    }

                    let queue = queues.get(interaction.guildId);

                    if (!queue) {
                        const player = createAudioPlayer();
                        queue = {
                            textChannel: interaction.channel,
                            voiceChannel: voiceChannel,
                            connection: null,
                            player: player,
                            songs: [],
                            controlMessage: null
                        };
                        queues.set(interaction.guildId, queue);

                        // Xu ly khi bai hat ket thuc
                        player.on(AudioPlayerStatus.Idle, () => {
                            queue.songs.shift();
                            playNext(interaction.guildId, queue);
                        });

                        player.on('error', (error) => {
                            console.error('Loi Audio Player:', error);
                            queue.songs.shift();
                            playNext(interaction.guildId, queue);
                        });
                    }

                    try {
                        // Tim kiem va lay thong tin bai hat
                        const searchResult = await play.search(query, { limit: 1 });
                        if (!searchResult || searchResult.length === 0) {
                            return interaction.editReply({ content: 'Khong tim thay bai hat nao phu hop.' });
                        }

                        const songData = searchResult[0];
                        const song = {
                            title: songData.title,
                            url: songData.url,
                            thumbnail: songData.thumbnails ? songData.thumbnails[0].url : null,
                            duration: songData.durationRaw,
                            requestedBy: interaction.user.id
                        };

                        queue.songs.push(song);

                        if (!queue.connection) {
                            queue.connection = joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: interaction.guildId,
                                adapterCreator: interaction.guild.voiceAdapterCreator
                            });

                            queue.connection.subscribe(queue.player);

                            queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                                try {
                                    await Promise.race([
                                        entersState(queue.connection, VoiceConnectionStatus.Signalling, 5000),
                                        entersState(queue.connection, VoiceConnectionStatus.Connecting, 5000),
                                    ]);
                                } catch (error) {
                                    queue.connection.destroy();
                                    queues.delete(interaction.guildId);
                                }
                            });
                        }

                        if (queue.songs.length === 1 && queue.player.state.status !== AudioPlayerStatus.Playing) {
                            interaction.editReply({ content: `Dang chuan bi phat: **${song.title}**` });
                            playNext(interaction.guildId, queue);
                        } else {
                            interaction.editReply({ content: `Da them vao hang cho: **${song.title}**` });
                        }

                    } catch (error) {
                        console.error('Loi khi tim nhac:', error);
                        return interaction.editReply({ content: 'Co loi xay ra khi tim hoac them bai hat.' });
                    }
                }

                // /pause
                if (interaction.commandName === 'pause') {
                    const queue = queues.get(interaction.guildId);
                    if (!queue || queue.player.state.status !== AudioPlayerStatus.Playing) {
                        return interaction.reply({ content: 'Khong co nhac dang phat de tam dung.', ephemeral: true });
                    }
                    queue.player.pause();
                    return interaction.reply({ content: 'Da tam dung nhac.' });
                }

                // /resume
                if (interaction.commandName === 'resume') {
                    const queue = queues.get(interaction.guildId);
                    if (!queue || (queue.player.state.status !== AudioPlayerStatus.Paused && queue.player.state.status !== AudioPlayerStatus.AutoPaused)) {
                        return interaction.reply({ content: 'Nhac khong bi tam dung.', ephemeral: true });
                    }
                    queue.player.unpause();
                    return interaction.reply({ content: 'Da tiep tuc phat nhac.' });
                }

                // /skip
                if (interaction.commandName === 'skip') {
                    const queue = queues.get(interaction.guildId);
                    if (!queue || queue.songs.length === 0) {
                        return interaction.reply({ content: 'Khong co bai nao de bo qua.', ephemeral: true });
                    }
                    queue.player.stop();
                    return interaction.reply({ content: 'Da bo qua bai hien tai.' });
                }

                // /stop
                if (interaction.commandName === 'stop') {
                    const queue = queues.get(interaction.guildId);
                    if (!queue) {
                        return interaction.reply({ content: 'Hien tai khong co nhac.', ephemeral: true });
                    }
                    queue.songs = [];
                    queue.player.stop();
                    return interaction.reply({ content: 'Da dung nhac va xoa hang cho.' });
                }

                // /queue
                if (interaction.commandName === 'queue') {
                    const queue = queues.get(interaction.guildId);
                    if (!queue || queue.songs.length === 0) {
                        return interaction.reply({ content: 'Hang cho dang trong.', ephemeral: true });
                    }
                    let queueString = queue.songs.slice(0, 10).map((s, i) => `${i + 1}. ${s.title} (${s.duration})`).join('\n');
                    if (queue.songs.length > 10) {
                        queueString += `\n...va ${queue.songs.length - 10} bai khac`;
                    }
                    const qEmbed = new EmbedBuilder()
                        .setTitle('Hang cho hien tai')
                        .setColor(0x0099ff)
                        .setDescription(queueString);
                    return interaction.reply({ embeds: [qEmbed] });
                }
            }
        }
    });
};
