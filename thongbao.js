const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = async (message, args, cmd) => {

  if (cmd !== "announce") return;

  // ❌ quyền
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ Không đủ quyền");
  }

  const role = message.mentions.roles.first();
  if (!role) return message.reply("❌ Tag role vào");

  const text = args.slice(1).join(" ");
  if (!text) return message.reply("❌ Nhập nội dung");

  // 🎲 GIF random
  const gifs = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTMyZG9uc280eXE4YWV3ZXRzZzB3czd1MTBwNG9ndDM2d3J4am82bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ltXRHWVSNDKNP63uNF/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmlnZGt0Zng3b3Jpa3pyankwZjA3Y3Q5aWk2cHAzajk0YnVhOXp3MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qEzeYUGm19ZjBe7IJt/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHIyZzI0djlpOHRuN2s5bjhtdDVncTdmaDY3MW8xejVxdHY3bzJ2eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oEPyO83kEnoyfwmewB/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHIyZzI0djlpOHRuN2s5bjhtdDVncTdmaDY3MW8xejVxdHY3bzJ2eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PzmwZmvqZA191oqu3L/giphy.gif"
  ];

  const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

  const embed = new EmbedBuilder()
    .setTitle("📢 THÔNG BÁO")
    .setDescription(`**${text}**`)
    .setColor(0x00AEFF)
    .setImage(randomGif)
    .setFooter({ text: `Gửi bởi ${message.author.username}` })
    .setTimestamp();

  try {
    await message.delete();

    await message.channel.send({
      content: `${role}`,
      embeds: [embed],
      allowedMentions: { roles: [role.id] }
    });

  } catch (err) {
    console.log(err);
    message.reply("❌ Lỗi gửi thông báo");
  }
};