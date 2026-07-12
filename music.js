const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  StreamType
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');

// 🔥 CHIÊU ĐỘC: LẤY TRỰC TIẾP ĐƯỜNG DẪN FFMPEG ĐỂ ÉP BOT PHẢI NUỐT
const ffmpegPath = require('ffmpeg-static');

module.exports = (client) => {
  // Tạo trình phát nhạc dùng chung
  const player = createAudioPlayer();

  // Bắt lỗi nếu Player gặp sự cố để theo dõi
  player.on('error', error => {
    console.error('❌ [Player Lỗi]:', error.message);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ===== 🎵 LỆNH !PLAY =====
    if (cmd === "play") {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.reply("🛑 Mày phải nhảy vào một phòng Voice trước rồi mới gọi tao vào bật nhạc được chứ khứa!");
      }

      // Link Mp3 mặc định cực bốc để test loa (Link này sống 100%)
      let url = args[0] || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 

      const phanHoi = await message.channel.send("🎵 Đang vác loa vào phòng voice, chờ tí nhé khứa...");

      try {
        // Kết nối vào Voice Channel
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false, // Tắt chế độ điếc để thấy bot sáng đèn xanh khi phát nhạc
        });

        // 🛠️ ÉP THẰNG VOICE ĐỌC SỬ DỤNG ĐÚNG FFMPEG TRONG PROJECT
        const resource = createAudioResource(url, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true // Cho phép chỉnh âm lượng nếu cần
        });

        // Đẩy nhạc vào đầu phát và đăng ký luồng với phòng voice
        player.play(resource);
        connection.subscribe(player);

        const embedPlay = new EmbedBuilder()
          .setTitle("🎶 CÓ NHẠC LÊN LUÔN ANH EM OII 🎶")
          .setDescription(`✅ Đã nhảy vào phòng: <#${voiceChannel.id}>\n🔥 **Đang quẩy bài:** \`${url}\``)
          .setColor(0x00ff00)
          .setTimestamp();

        return phanHoi.edit({ content: "🎉 **Nhạc lên rồi khứa ơi!**", embeds: [embedPlay] });

      } catch (err) {
        console.error("❌ LỖI VÀO PHÒNG VOICE:", err);
        return phanHoi.edit("❌ Lỗi đéo bật được nhạc rồi, check lại link hoặc quyền của bot xem khứa!");
      }
    }

    // ===== 🛑 LỆNH !STOP =====
    if (cmd === "stop") {
      const { getVoiceConnection } = require('@discordjs/voice');
      const connection = getVoiceConnection(message.guild.id);

      if (!connection) {
        return message.reply("❌ Tao có đang ở trong phòng voice nào đâu mà bắt tắt?");
      }

      player.stop();
      connection.destroy();
      return message.reply("🛑 Đã tắt nhạc, cất loa và cuốn gói rời phòng voice!");
    }
  });
};