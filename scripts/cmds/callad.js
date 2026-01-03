const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];
const axios = require("axios");
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "callad",
    version: "2.7",
    author: "𝐋'𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮",
    countDown: 5,
    role: 0,
    description: { fr: "envoyer un rapport (texte direct ou réponse aux médias)" },
    category: "contacts admin",
    guide: { fr: "{pn} <message> (texte seul) OU répondez à un média avec {pn} [message]" }
  },

  langs: {
    fr: {
      missingMessage: "Veuillez entrer un message ou répondre à un média avec la commande.",
      noTargetGroup: "⚠️ ID du groupe cible non configuré",
      replyUserSuccess: "✅ Réponse envoyée à l'utilisateur.",
      replyFailed: "❌ Échec lors de l'envoi de la réponse."
    }
  },

  onStart: async function({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
    const { config } = global.GoatBot;
    const TARGET_GROUP_ID = global.GoatBot.config && (global.GoatBot.config.targetGroupID || global.GoatBot.config.TARGET_GROUP_ID) ? (global.GoatBot.config.targetGroupID || global.GoatBot.config.TARGET_GROUP_ID) : "2852439588294507";
    
    const { senderID, threadID, isGroup, type, messageReply } = event;
    const hasText = args.length > 0;
    const isReply = type === "message_reply";
    const hasMediaInReply = isReply && messageReply.attachments && messageReply.attachments.length > 0;

    if (!hasText && !hasMediaInReply) {
      return message.reply(getLang("missingMessage"));
    }

    const senderName = await usersData.getName(senderID);
    const threadName = isGroup ? (await threadsData.get(threadID)).threadName : "Message privé";
    
    let mediaAttachments = [];
    if (hasMediaInReply) {
      mediaAttachments = messageReply.attachments.filter(att => mediaTypes.includes(att.type));
    }

    const framedText = [
      "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
      "",
      "〘 𝑵𝑶𝑼𝑽𝑬𝑨𝑼 𝑫𝑶𝑺𝑺𝑰𝑬𝑹 〙",
      "",
      "➤ Utilisateur",
      `→ Nom : ${senderName}`,
      `→ UID  : ${senderID}`,
      "",
      "➤ Contexte",
      `→ Provenance : ${isGroup ? `Groupe « ${threadName} »` : "Message privé"}`,
      `→ Thread ID : ${threadID}`,
      "",
      "➤ Contenu",
      args.join(" ") || (hasMediaInReply ? "(Rapport via média uniquement)" : ""),
      "",
      "➤ Action",
      "→ Répondre pour communiquer",
      "",
      "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
    ].join("\n");

    try {
      const imageBuffer = await createNotificationImage(senderName, senderID, threadName);
      const imagePath = path.join(__dirname, `tmp_notif_${senderID}_${Date.now()}.png`);
      fs.writeFileSync(imagePath, imageBuffer);

      let streams = [];
      if (mediaAttachments.length > 0) {
        streams = await getStreamsFromAttachment(mediaAttachments);
      }

      const info = await api.sendMessage({
        body: framedText,
        attachment: [fs.createReadStream(imagePath), ...streams]
      }, TARGET_GROUP_ID);
      
      global.GoatBot.onReply.set(info.messageID, {
        commandName,
        originalThreadID: threadID,
        originalSenderID: senderID,
        originalSenderName: senderName,
        type: "userCallAdmin",
        targetGroupID: TARGET_GROUP_ID
      });

      const successImg = await createSuccessImage(senderName);
      const successPath = path.join(__dirname, `tmp_success_${senderID}_${Date.now()}.png`);
      fs.writeFileSync(successPath, successImg);
      
      await message.reply({
        body: "✅ Dossier transmis au staff avec succès.",
        attachment: fs.createReadStream(successPath)
      });
      
      try { fs.unlinkSync(imagePath); fs.unlinkSync(successPath); } catch(e) {}

    } catch (err) {
      log.error("CALLAD_SEND", err);
      await message.reply("❌ Une erreur est survenue lors de l'envoi.");
    }
  },

  onReply: async function({ args, event, api, message, Reply, usersData, commandName, getLang }) {
    if (!Reply || !Reply.type) return;
    
    const { type, originalThreadID, originalSenderID, originalSenderName, targetGroupID } = Reply;
    const replierName = await usersData.getName(event.senderID);
    const attachments = event.attachments || [];
    const mediaAttachments = attachments.filter(att => mediaTypes.includes(att.type));

    if (type === "userCallAdmin") {
      const framedForUser = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑹𝑬́𝑷𝑶𝑵𝑺𝑬 𝑫𝑬 𝑳’𝑬́𝑸𝑼𝑰𝑷𝑬 〙",
        "",
        "➤ Message",
        args.join(" ") || (mediaAttachments.length > 0 ? "(Média envoyé)" : ""),
        "",
        "✍ 𝒍 Réponds pour continuer l'échange",
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      
      try {
        const responseImg = await createResponseImage(replierName, "admin");
        const responsePath = path.join(__dirname, `tmp_adm_res_${Date.now()}.png`);
        fs.writeFileSync(responsePath, responseImg);
        
        let streams = [];
        if (mediaAttachments.length > 0) {
          streams = await getStreamsFromAttachment(mediaAttachments);
        }

        const info = await api.sendMessage({
            body: framedForUser,
            attachment: [fs.createReadStream(responsePath), ...streams]
        }, originalThreadID);

        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          originalThreadID: originalThreadID,
          originalSenderID: originalSenderID,
          originalSenderName: originalSenderName,
          type: "adminReply",
          targetGroupID: event.threadID
        });

        await message.reply(getLang("replyUserSuccess"));
        fs.unlinkSync(responsePath);
      } catch (err) {
        log.error("CALLAD_REPLY_USER", err);
      }
    } else if (type === "adminReply") {
      const framedForAdmins = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑺𝑼𝑰𝑽𝑰 𝑼𝑻𝑰𝑳𝑰𝑺𝑨𝑻𝑬𝑼𝑹 〙",
        "",
        "➤ Utilisateur",
        `→ ${originalSenderName}`,
        "",
        "➤ Message",
        args.join(" ") || (mediaAttachments.length > 0 ? "(Média envoyé)" : ""),
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      
      try {
        const responseImg = await createResponseImage(originalSenderName, "user");
        const responsePath = path.join(__dirname, `tmp_usr_res_${Date.now()}.png`);
        fs.writeFileSync(responsePath, responseImg);

        let streams = [];
        if (mediaAttachments.length > 0) {
          streams = await getStreamsFromAttachment(mediaAttachments);
        }

        const info = await api.sendMessage({
            body: framedForAdmins,
            attachment: [fs.createReadStream(responsePath), ...streams]
        }, targetGroupID);

        global.GoatBot.onReply.set(info.messageID, {
            commandName,
            originalThreadID: event.threadID,
            originalSenderID: event.senderID,
            originalSenderName: originalSenderName,
            type: "userCallAdmin",
            targetGroupID: targetGroupID
        });

        await message.reply("✅ Réponse transmise au staff."); 
        fs.unlinkSync(responsePath);
      } catch (err) {
        log.error("CALLAD_REPLY_ADMIN", err);
      }
    }
  }
};

async function createNotificationImage(senderName, senderID, source) {
    const W = 1200, H = 500;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#0f2027");
    grd.addColorStop(1, "#2c5364");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("📢 NOUVEAU DOSSIER", W/2, 150);
    ctx.font = "35px Arial";
    ctx.fillText(`Utilisateur : ${senderName}`, W/2, 280);
    ctx.font = "25px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`Provenance : ${source}`, W/2, 350);
    return canvas.toBuffer();
}

async function createSuccessImage(userName) {
    const W = 1000, H = 400;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#11998e");
    grd.addColorStop(1, "#38ef7d");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 50px Arial";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText("MESSAGE ENVOYÉ !", W/2, 180);
    ctx.font = "25px Arial";
    ctx.fillText(`Support contacté avec succès`, W/2, 250);
    return canvas.toBuffer();
}

async function createResponseImage(fromName, role) {
    const W = 1200, H = 500;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, role === "admin" ? "#2C3E50" : "#8E2DE2");
    grd.addColorStop(1, role === "admin" ? "#4CA1AF" : "#4A00E0");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.fillText(role === "admin" ? "RÉPONSE DU STAFF" : "RETOUR UTILISATEUR", W/2, 180);
    ctx.font = "30px Arial";
    ctx.fillText(`Expéditeur : ${fromName}`, W/2, 300);
    return canvas.toBuffer();
}