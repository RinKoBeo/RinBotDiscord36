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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// ================= READY =================

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});


// ================= PREFIX COMMAND =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const member = message.mentions.members.first();

  // KICK
  if (cmd === "kick") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần kick.");

    if (!member.kickable)
      return message.reply("❌ Không thể kick người này.");

    try {

      await member.kick();

      message.reply(`✅ Cút ${member.user.tag}`);

    } catch {

      message.reply("❌ Kick thất bại.");

    }

  }


  // BAN
  if (cmd === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần ban.");

    if (!member.bannable)
      return message.reply("❌ Không thể ban người này.");

    try {

      await member.ban();

      message.reply(`🔨 Đã ban ${member.user.tag}`);

    } catch {

      message.reply("❌ Ban thất bại.");

    }

  }


  // TIMEOUT
  if (cmd === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ Đéo Đủ Trình.");

    if (!member)
      return message.reply("❌ Tag thg cần timeout.");

    if (!member.moderatable)
      return message.reply("❌ Không thể timeout người này.");

    try {

      await member.timeout(10 * 60 * 1000);

      message.reply(`🔇 ${member.user.tag} bị timeout 10 phút`);

    } catch {

      message.reply("❌ Timeout thất bại.");

    }

  }

});


// ================= VERIFY SLASH =================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {

    const usernameInput = interaction.options.getString("username");

    try {

      // lấy id roblox
      const userId = await noblox.getIdFromUsername(usernameInput);

      // lấy username chuẩn
      const robloxUsername = await noblox.getUsernameFromId(userId);

      // lấy avatar roblox
      const avatar = await noblox.getPlayerThumbnail(
        userId,
        "420x420",
        "png",
        false,
        "headshot"
      );

      const avatarUrl = avatar[0].imageUrl;

      // đổi nickname discord
      await interaction.member.setNickname(robloxUsername);

      // reply riêng
      await interaction.reply({
        content: `✅ Verify thành công: ${robloxUsername}`,
        ephemeral: true
      });

      // gửi bảng giống bloxlink
      const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

      if (channel) {

        const embed = new EmbedBuilder()
          .setAuthor({
            name: robloxUsername,
            iconURL: avatarUrl
          })
          .setTitle("Member Updated")
          .addFields({
            name: "Nickname",
            value: robloxUsername
          })
          .setThumbnail(avatarUrl)
          .setColor("Green")
          .setTimestamp();

        channel.send({ embeds: [embed] });

      }

    } catch (err) {

      interaction.reply({
        content: "❌ Username Roblox không tồn tại",
        ephemeral: true
      });

    }

  }

});


// ================= REGISTER SLASH =================

client.once("ready", async () => {

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


client.login(process.env.TOKEN);