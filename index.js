require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const noblox = require("noblox.js");

const TOKEN = process.env.TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const PREFIX = "!";


// ===== CREATE CLIENT =====

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// ===== READY =====

client.once("ready", async () => {

  console.log(`✅ Bot online: ${client.user.tag}`);

  // register slash command

  const commands = [
    new SlashCommandBuilder()
      .setName("verify")
      .setDescription("Verify Roblox")
      .addStringOption(option =>
        option
          .setName("username")
          .setDescription("username roblox")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("✅ Slash command loaded");

});


// ===== TIME PARSER =====

function parseTime(time) {

  const match = time.match(/^(\d+)(s|m|h|d|p)$/i);

  if (!match) return null;

  const value = Number(match[1]);
  let unit = match[2].toLowerCase();

  if (unit === "p") unit = "m"; // p = phút

  const times = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  return value * times[unit];
}

// ===== PREFIX COMMAND =====

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const member = message.mentions.members.first();


  // ===== KICK =====

  if (cmd === "kick") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("❌ Đéo có Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần kick.");

    if (!member.kickable)
      return message.reply("❌ Đéo thể kick người này.");

    try {

      await member.kick();
      message.reply(`✅ Đã kick ${member.user.tag}`);

    } catch {

      message.reply("❌ Kick Đéo đc.");

    }

  }


  // ===== BAN =====

  if (cmd === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ Đéo có Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần ban.");

    if (!member.bannable)
      return message.reply("❌ Đéo thể ban người này.");

    try {

      await member.ban();
      message.reply(`🔨 Đã ban ${member.user.tag}`);

    } catch {

      message.reply("❌ Ban Đéo đc.");

    }

  }


  // ===== TIMEOUT =====

  if (cmd === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    const timeArg = args[1];

    if (!member)
      return message.reply("❌ Tag thg cần timeout.");

    if (!timeArg)
      return message.reply("❌ Nhập vd: 10s, 5m, 2h");

    const duration = parseTime(timeArg);

    if (!duration)
      return message.reply("❌ Sai định dạng.");

    if (!member.moderatable)
      return message.reply("❌ Đéo timeout đc.");

    try {

      await member.timeout(duration);

      message.reply(`🔇 ${member.user.tag} Câm Mồm!! ${timeArg}`);

    } catch {

      message.reply("❌ Timeout thất bại.");

    }

  }


  // ===== UNTIMEOUT =====

  if (cmd === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần gỡ timeout.");

    try {

      await member.timeout(null);

      message.reply(`✅ ${member.user.tag} đã hết timeout`);

    } catch {

      message.reply("❌ Không gỡ timeout được.");

    }

  }

});


// ===== VERIFY SLASH COMMAND =====

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {

    const username = interaction.options.getString("username");

    try {

      const userId = await noblox.getIdFromUsername(username);

      const avatar = await noblox.getPlayerThumbnail(
        userId,
        "420x420",
        "png",
        false,
        "headshot"
      );

      await interaction.member.setNickname(username);

      await interaction.reply({
        content: `✅ Verify thành Gay!: ${username}`,
        ephemeral: true
      });

      const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: username,
          iconURL: avatar[1].imageUrl
        })
        .setTitle("Member Updated")
        .addFields({
          name: "Nickname",
          value: `${username} (@${interaction.user.username})`
        })
        .setThumbnail(avatar[1].imageUrl)
        .setColor("Green")
        .setTimestamp();

      channel.send({ embeds: [embed] });

    } catch {

      interaction.reply({
        content: "❌ Username Roblox không tồn tại",
        ephemeral: true
      });

    }

  }

});


// ===== LOGIN =====

client.login(process.env.TOKEN);