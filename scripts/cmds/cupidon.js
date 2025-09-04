const { getPrefix } = global.utils;

module.exports = {
  config: {
    name: "cupidon",
    version: "1.3",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙴 3.0★彡",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "💘 Calcule le taux d'amour entre toi et un(e) autre",
    },
    longDescription: {
      en: "💘 Amuse-toi à mesurer la compatibilité amoureuse entre toi (qui exécute la commande) et un(e) ami(e) mentionné(e).",
    },
    category: "fun",
    guide: {
      en: "{p}cupidon @tag\n{p}love @tag",
    },
  },

  onStart: async function ({ message, event }) {
    const mentions = Object.keys(event.mentions);

    if (mentions.length === 0) {
      return message.reply("𝗠𝗲𝗻𝘁𝗶𝗼𝗻𝗻𝗲 𝗹𝗮 𝗽𝗲𝗿𝘀𝗼𝗻𝗻𝗲 𝗮𝘃𝗲𝗰 𝗾𝘂𝗶 𝘁𝘂 𝘃𝗲𝘂𝘅 𝗳𝗮𝗶𝗿𝗲 𝗹𝗲 𝘁𝗲𝘀𝘁 💝");
    }

    // 🧑 l’utilisateur qui exécute la commande
    const user1 = event.senderID;
    // 👩 la personne mentionnée
    const user2 = mentions[0];

    // 🔮 Calcul du taux d’amour
    const lovePercent = Math.floor(Math.random() * 101);
    const totalBlocks = 20;
    const filledBlocks = Math.round((lovePercent / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

    // 💞 Messages selon le pourcentage
    let loveEmoji = "𝗠𝗶𝗲𝘂𝘅 𝘃𝗼𝘂𝘀 𝘃𝗼𝘂𝘀 𝗼𝘂𝗯𝗹𝗶𝗲𝘇 𝗰𝗮 𝗿𝗶𝘀𝗾𝘂𝗲 𝗱𝗲 𝗽𝗿𝗼𝘃𝗼𝗾𝘂𝗲𝗿 𝗴𝗼𝘂𝗺𝗶𝗻 😐💔";
    if (lovePercent > 30) loveEmoji = "𝗢𝘂𝗽𝘀 𝗰'𝗲𝘀𝘁 𝗽𝗮𝘀 𝗴𝗮𝗴𝗻é 𝗼𝗻 𝗱𝗶𝗿𝗮𝗶𝘁 😅💞";
    if (lovePercent > 60) loveEmoji = "𝗩𝗼𝘂𝘀 𝗲𝘁𝗲𝘀 𝘀𝘂𝗿𝗲𝗺𝗲𝗻𝘁 𝗳𝗮𝗶𝘀 𝗹'𝘂𝗻 𝗽𝗼𝘂𝗿 𝗹'𝗮𝘂𝘁𝗿𝗲❤️🔥";
    if (lovePercent > 85) loveEmoji = "𝗖'𝗲𝘀𝘁 𝗹𝗲 𝗱𝗲𝘀𝘁𝗶𝗻 𝗾𝘂𝗶 𝘃𝗼𝘂𝘀 𝗿𝗲𝘂𝗻𝗶𝘁 💍👩‍❤️‍👨";

    // ✨ Noms à afficher
    const name1 = "𝗧𝗼𝗶";
    const name2 = Object.values(event.mentions)[0];
    const replyMsg = `❤️🏹 𝗖𝗨𝗣𝗜𝗗𝗢𝗡 🧘‍♂️ 𝗧𝗘𝗦𝗧\n◆━━━━━━━▣✦▣━━━━━━━━◆\n ${name1} 𝗲𝘁 ${name2}\n[${progressBar}] ${lovePercent}%\n${loveEmoji}
    `;

    return message.reply(replyMsg);
  }
};