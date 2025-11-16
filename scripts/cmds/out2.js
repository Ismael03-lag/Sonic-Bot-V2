const { getTime } = global.utils;
const Canvas = require("canvas");

module.exports = {
  config: {
    name: "out2",
    version: "1.5",
    author: "L'Uchiha Perdu & Assistant",
    countDown: 5,
    role: 1,
    category: "admin",
    shortDescription: "Gestionnaire de groupes version Uchiha",
    longDescription: "Affiche et permet de quitter les groupes avec style Uchiha et Canvas",
    guide: {
      en: "{pn} ou {pn} [ID]",
      vi: "{pn} hoặc {pn} [ID]"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const allowedUIDs = [
      '61563822463333',
      '61578433048588',
      '100083846212138'
    ];

    if (!allowedUIDs.includes(event.senderID)) {
      const errorStyle = `◆━━━━━▣✦▣━━━━━━◆
│ 🚫 𝗔𝗖𝗖𝗘𝗦 𝗥𝗘𝗙𝗨𝗦𝗘  🚫
│
│ T'as cru pouvoir utiliser
│ cette commande sans être
│ mon maître ?!
│
│ Tiens : 🖕😂
◆━━━━━▣✦▣━━━━━━◆`;
      return message.reply(errorStyle);
    }

    if (args.length === 0) {
      try {
        const allThreads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = allThreads.filter(thread => thread.isGroup);
        
        if (groups.length === 0) {
          return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ 📭 Aucun groupe trouvé\n◆━━━━━▣✦▣━━━━━━◆");
        }

        let page = parseInt(args[0]) || 1;
        const itemsPerPage = 8;
        const totalPages = Math.ceil(groups.length / itemsPerPage);
        
        if (page < 1 || page > totalPages) {
          page = 1;
        }

        const startIdx = (page - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const currentGroups = groups.slice(startIdx, endIdx);

        let listMessage = `◆━━━━━▣✦▣━━━━━━◆\n│ 📋 𝗟𝗜𝗦𝗧𝗘 𝗗𝗘𝗦 𝗚𝗥𝗢𝗨𝗣𝗘𝗦\n│ Page: ${page}/${totalPages}\n│ Total: ${groups.length} groupes\n◆━━━━━▣✦▣━━━━━━◆\n`;

        currentGroups.forEach((thread, index) => {
          const groupNumber = startIdx + index + 1;
          const truncatedName = thread.name.length > 25 ? thread.name.substring(0, 25) + "..." : thread.name;
          listMessage += `│ ${groupNumber}. ${truncatedName}\n`;
          listMessage += `│    🔸 ID: ${thread.threadID}\n`;
          if (index < currentGroups.length - 1) {
            listMessage += `│    ――――――――――――――――――\n`;
          }
        });

        listMessage += `◆━━━━━▣✦▣━━━━━━◆\n`;
        listMessage += `│ 💡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗘𝗦\n`;
        listMessage += `│ /out2 [ID] → Quitter\n`;
        
        if (totalPages > 1) {
          listMessage += `│ /out2 [page] → Page suivante\n`;
        }
        
        listMessage += `◆━━━━━▣✦▣━━━━━━◆`;

        return message.reply(listMessage);

      } catch (error) {
        console.error(error);
        return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ ❌ Erreur groupe\n◆━━━━━▣✦▣━━━━━━◆");
      }
    }

    const groupID = args[0];

    if (isNaN(groupID) || groupID.length < 6) {
      return message.reply("◆━━━━━▣✦▣━━━━━━◆\n│ ❌ ID invalide\n◆━━━━━▣✦▣━━━━━━◆");
    }

    try {
      const groupInfo = await api.getThreadInfo(groupID);
      const groupName = groupInfo.name || "Groupe inconnu";

      const leaveMessage = `◆━━━━━▣✦▣━━━━━━◆
│ 🚪 𝗗𝗘́𝗣𝗔𝗥𝗧 𝗗𝗨 𝗕𝗢𝗧
│ 
│ Mon maître m'a ordonné
│ de quitter ce groupe.
│
│ À plus tard bande de noobs!
│
│ 👋 😂 🖕
◆━━━━━▣✦▣━━━━━━◆`;

      await api.sendMessage(leaveMessage, groupID);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await api.removeUserFromGroup(api.getCurrentUserID(), groupID);

      const canvas = Canvas.createCanvas(800, 400);
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 800, 400);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#4ecdc4');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 400);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✅ DÉPART RÉUSSI', 400, 100);

      ctx.font = '30px Arial';
      ctx.fillText(`Groupe: ${groupName}`, 400, 180);
      ctx.fillText(`ID: ${groupID}`, 400, 230);

      ctx.font = '25px Arial';
      ctx.fillText('Bot retiré avec succès', 400, 300);

      const buffer = canvas.toBuffer();
      
      const successMessage = {
        body: `◆━━━━━▣✦▣━━━━━━◆\n│ ✅ 𝗗𝗘́𝗣𝗔𝗥𝗧 𝗥𝗘́𝗨𝗦𝗦𝗜\n│ \n│ Groupe: ${groupName}\n│ ID: ${groupID}\n│ \n│ 👻 Bot retiré\n◆━━━━━▣✦▣━━━━━━◆`,
        attachment: buffer
      };

      return message.reply(successMessage);

    } catch (error) {
      console.error(error);
      const errorStyle = `◆━━━━━▣✦▣━━━━━━◆
│ ❌ 𝗘𝗥𝗥𝗘𝗨𝗥
│ 
│ Impossible de quitter
│ le groupe.
│ 
│ Raisons possibles:
│ • ID incorrect
│ • Bot déjà retiré
│ • Permission manquante
◆━━━━━▣✦▣━━━━━━◆`;
      
      return message.reply(errorStyle);
    }
  }
};