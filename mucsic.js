const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require("play-dl");

let queues = new Map();

// ===== SPOTIFY TOKEN =====
play.setToken({
  spotify: {
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET
  }
});

// ===== PLAY FUNCTION =====
async function playMusic(guild, song) {
  const queue = queues.get(guild.id);

  if (!song) {
    queue.connection.destroy();
    queues.delete(guild.id);
    return;
  }

  try {
    const stream = await play.stream(song.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type
    });

    queue.player.play(resource);

    queue.player.once(AudioPlayerStatus.Idle, () => {
      queue.songs.shift();

      if (queue.loop) queue.songs.push(song);

      playMusic(guild, queue.songs[0]);
    });

  } catch (err) {
    console.log(err);
    queue.songs.shift();
    playMusic(guild, queue.songs[0]);
  }
}

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== PLAY =====
  if (cmd === "play") {
    console.log("PLAY CHẠY"); // debug

    const query = args.join(" ");
    if (!query) return message.reply("❌ Nhập tên hoặc link");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("❌ Vào voice trước");

    let song;

    try {
      if (play.is_expired()) await play.refreshToken();

      // ===== SPOTIFY (FIX MỚI) =====
      if (query.includes("spotify.com")) {
        const sp = await play.spotify(query);
        const data = await sp.fetch();

        song = {
          title: data.name,
          url: `${data.name} ${data.artists[0].name}`
        };

      } else {
        // ===== YOUTUBE =====
        const yt = await play.search(query, { limit: 1 });
        if (!yt.length) return message.reply("❌ Không tìm thấy");

        song = {
          title: yt[0].title,
          url: yt[0].url
        };
      }

    } catch (err) {
      console.log(err);
      return message.reply("❌ Lỗi tìm nhạc");
    }

    let queue = queues.get(message.guild.id);

    if (!queue) {
      const player = createAudioPlayer();

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      queue = {
        connection,
        player,
        songs: [],
        loop: false
      };

      queues.set(message.guild.id, queue);
      connection.subscribe(player);
    }

    queue.songs.push(song);

    message.reply(`🎶 Đã thêm: ${song.title}`);

    if (queue.songs.length === 1) {
      playMusic(message.guild, queue.songs[0]);
    }
  }

  // ===== SKIP =====
  if (cmd === "skip") {
    const queue = queues.get(message.guild.id);
    if (!queue) return message.reply("❌ Không có nhạc");

    queue.player.stop();
    message.reply("⏭️ Skip");
  }

  // ===== STOP =====
  if (cmd === "stop") {
    const queue = queues.get(message.guild.id);
    if (!queue) return message.reply("❌ Không có nhạc");

    queue.connection.destroy();
    queues.delete(message.guild.id);

    message.reply("⏹️ Đã dừng");
  }

  // ===== QUEUE =====
  if (cmd === "queue") {
    const queue = queues.get(message.guild.id);
    if (!queue || !queue.songs.length) return message.reply("❌ Không có nhạc");

    let desc = queue.songs.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
    message.reply(`📜 Danh sách:\n${desc}`);
  }

  // ===== LOOP =====
  if (cmd === "loop") {
    const queue = queues.get(message.guild.id);
    if (!queue) return message.reply("❌ Không có nhạc");

    queue.loop = !queue.loop;
    message.reply(`🔁 Loop: ${queue.loop ? "ON" : "OFF"}`);
  }
});