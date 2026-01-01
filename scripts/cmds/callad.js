const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];
const axios = require("axios");
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "callad",
    version: "2.0",
    author: "𝐋'𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮",
    countDown: 5,
    role: 0,
    description: { fr: "envoyer un rapport/feedback à l'équipe admin" },
    category: "contacts admin",
    guide: { fr: "{pn} <message>" }
  },

  langs: {
    fr: {
      missingMessage: "Veuillez entrer le message à envoyer à l'équipe",
      successUser: "✅ Ton message a bien été transmis à l'équipe.",
      failedUser: "❌ Échec de l'envoi. Réessaie plus tard.",
      noAdmin: "⚠️ Aucun admin configuré",
      noTargetGroup: "⚠️ ID du groupe cible non configuré",
      replyUserSuccess: "✅ Réponse envoyée à l'utilisateur.",
      replyFailed: "❌ Échec lors de l'envoi de la réponse."
    }
  },

  onStart: async function({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
    const { config } = global.GoatBot;
    const TARGET_GROUP_ID = global.GoatBot.config && (global.GoatBot.config.targetGroupID || global.GoatBot.config.TARGET_GROUP_ID) ? (global.GoatBot.config.targetGroupID || global.GoatBot.config.TARGET_GROUP_ID) : "2852439588294507";
    if (!TARGET_GROUP_ID || TARGET_GROUP_ID === "ID_DU_GROUPE_ICI") return message.reply(getLang("noTargetGroup"));
    if (!args[0]) return message.reply(getLang("missingMessage"));
    const { senderID, threadID, isGroup } = event;
    if (!config.adminBot || config.adminBot.length === 0) return message.reply(getLang("noAdmin"));
    const senderName = await usersData.getName(senderID);
    const threadName = isGroup ? (await threadsData.get(threadID)).threadName : "Message privé";
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
      args.join(" "),
      "",
      "➤ Action",
      "→ Répondre directement à ce message pour répondre à l'utilisateur",
      "",
      "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
    ].join("\n");
    const imageBuffer = await this.createNotificationImage(senderName, senderID, threadName);
    const imagePath = path.join(__dirname, `tmp_notif_${senderID}_${Date.now()}.png`);
    try {
      fs.writeFileSync(imagePath, imageBuffer);
      await api.sendMessage(framedText, TARGET_GROUP_ID, (err, info) => {});
      await api.sendMessage({ attachment: fs.createReadStream(imagePath) }, TARGET_GROUP_ID);
      global.GoatBot.onReply.set(`${TARGET_GROUP_ID}_${Date.now()}`, {
        commandName,
        originalThreadID: threadID,
        originalSenderID: senderID,
        originalSenderName: senderName,
        type: "userCallAdmin",
        targetGroupID: TARGET_GROUP_ID
      });
      const userText = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑪𝑶𝑵𝑭𝑰𝑹𝑴𝑨𝑻𝑰𝑶𝑵 〙",
        "",
        "➤ Statut",
        "→ Message transmis avec succès",
        "",
        "➤ Suivi",
        "→ La demande a été reçue",
        "→ Une réponse te sera envoyée ici",
        "",
        "✍ 𝒍 Merci pour le signalement",
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      const successImg = await this.createSuccessImage(senderName);
      const successPath = path.join(__dirname, `tmp_success_${senderID}_${Date.now()}.png`);
      fs.writeFileSync(successPath, successImg);
      await message.reply(userText);
      await message.reply({ attachment: fs.createReadStream(successPath) });
      try { fs.unlinkSync(imagePath); } catch(e) {}
      try { fs.unlinkSync(successPath); } catch(e) {}
    } catch (err) {
      log.error("CALLAD_SEND", err);
      const failText = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑬́𝑪𝑯𝑬𝑪 𝑫𝑬 𝑻𝑹𝑨𝑵𝑺𝑴𝑰𝑺𝑺𝑰𝑶𝑵 〙",
        "",
        "➤ Statut",
        "→ Envoi impossible",
        "",
        "➤ Raison",
        "→ Le service n’a pas pu contacter l’équipe",
        "",
        "✍ 𝒍 Réessaie dans quelques instants",
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      const errImg = await this.createErrorImage();
      const errPath = path.join(__dirname, `tmp_error_${senderID}_${Date.now()}.png`);
      fs.writeFileSync(errPath, errImg);
      await message.reply(failText);
      await message.reply({ attachment: fs.createReadStream(errPath) });
      try { fs.unlinkSync(imagePath); } catch(e) {}
      try { fs.unlinkSync(errPath); } catch(e) {}
    }
  },

  onReply: async function({ args, event, api, message, Reply, usersData, commandName, getLang }) {
    if (!Reply || !Reply.type) return;
    if (!args[0]) return message.reply("Veuillez inclure un message dans votre réponse.");
    const { type, originalThreadID, originalSenderID, originalSenderName, targetGroupID } = Reply;
    const replierName = await usersData.getName(event.senderID);
    if (type === "userCallAdmin") {
      const framedForUser = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑹𝑬́𝑷𝑶𝑵𝑺𝑬 𝑫𝑬 𝑳’𝑬́𝑸𝑼𝑰𝑷𝑬 〙",
        "",
        "➤ Message",
        args.join(" "),
        "",
        "✍ 𝒍 Tu peux répondre ici pour poursuivre l’échange",
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      const responseImg = await this.createResponseImage(replierName, "admin");
      const responsePath = path.join(__dirname, `tmp_response_${event.messageID}_${Date.now()}.png`);
      fs.writeFileSync(responsePath, responseImg);
      const signature = `\n\n           〖 Réponse envoyée par : ${replierName} 〗`;
      try {
        await api.sendMessage(framedForUser, originalThreadID);
        await api.sendMessage({ attachment: fs.createReadStream(responsePath) }, originalThreadID);
        await api.sendMessage(signature, originalThreadID);
        await message.reply(getLang("replyUserSuccess"));
        global.GoatBot.onReply.set(`${originalThreadID}_${Date.now()}`, {
          commandName,
          originalThreadID,
          originalSenderID,
          originalSenderName,
          type: "adminReply",
          targetGroupID
        });
      } catch (err) {
        log.error("CALLAD_REPLY_USER", err);
        await message.reply(getLang("replyFailed"));
      } finally {
        try { fs.unlinkSync(responsePath); } catch(e) {}
      }
    } else if (type === "adminReply") {
      const framedForAdmins = [
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆",
        "",
        "〘 𝑺𝑼𝑰𝑽𝑰 𝑼𝑻𝑰𝑳𝑰𝑺𝑨𝑻𝑬𝑼𝑹 〙",
        "",
        "➤ Utilisateur",
        `→ ${originalSenderName}`,
        `→ UID : ${originalSenderID}`,
        "",
        "➤ Message",
        args.join(" "),
        "",
        "◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆"
      ].join("\n");
      try {
        await api.sendMessage(framedForAdmins, targetGroupID);
        await message.reply(getLang("replySuccess"));
      } catch (err) {
        log.error("CALLAD_REPLY_ADMIN", err);
        await message.reply("❌ Échec lors de l'envoi au groupe admin");
      }
    }
  },

  createNotificationImage: async function(senderName, senderID, source) {
    const W = 1200, H = 600;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#0f2027");
    grd.addColorStop(0.5, "#203a43");
    grd.addColorStop(1, "#2c5364");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.ellipse(W/2, 140, 120, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("📢", W/2, 170);
    ctx.font = "bold 48px Arial";
    ctx.fillText("NOUVEAU RAPPORT", W/2, 280);
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(`Utilisateur : ${senderName}`, W/2, 340);
    ctx.font = "22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(`UID : ${senderID}   •   Source : ${source}`, W/2, 380);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, H-80, W, 80);
    ctx.fillStyle = "#00ffd0";
    ctx.font = "20px Arial";
    ctx.fillText("Répondre dans le groupe staff pour relayer la réponse", W/2, H-40);
    return canvas.toBuffer();
  },

  createSuccessImage: async function(userName, type = "default") {
    const W = 1000, H = 500;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#11998e");
    grd.addColorStop(1, "#38ef7d");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(W/2, 160, 110, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(W/2 - 40, 160);
    ctx.lineTo(W/2 - 5, 200);
    ctx.lineTo(W/2 + 55, 130);
    ctx.stroke();
    ctx.font = "bold 42px Arial";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    const titles = { default: "MESSAGE ENVOYÉ !", reply: "RÉPONSE TRANSMISE!", feedback: "RETOUR REÇU !" };
    ctx.fillText(titles[type] || titles.default, W/2, 320);
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`À : ${userName}`, W/2, 360);
    return canvas.toBuffer();
  },

  createErrorImage: async function() {
    const W = 1000, H = 500;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#8B0000");
    grd.addColorStop(1, "#FF416C");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(W/2, 140, 100, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, 100 - 30);
    ctx.lineTo(W/2 + 60, 100 + 30);
    ctx.moveTo(W/2 + 60, 100 - 30);
    ctx.lineTo(W/2 - 60, 100 + 30);
    ctx.stroke();
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText("ENVOI ÉCHOUÉ", W/2, 320);
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("Veuillez réessayer plus tard", W/2, 360);
    return canvas.toBuffer();
  },

  createResponseImage: async function(fromName, role) {
    const W = 1200, H = 600;
    const canvas = Canvas.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, W, H);
    if (role === "admin") {
      grd.addColorStop(0, "#2C3E50");
      grd.addColorStop(1, "#4CA1AF");
    } else {
      grd.addColorStop(0, "#8E2DE2");
      grd.addColorStop(1, "#4A00E0");
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(role === "admin" ? "👨‍💼" : "👤", W/2, 160);
    ctx.font = "bold 46px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText(role === "admin" ? "RÉPONSE DE L'ÉQUIPE" : "FEEDBACK UTILISATEUR", W/2, 260);
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(`De : ${fromName}`, W/2, 320);
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(role === "admin" ? "Répondre dans la conversation pour continuer" : "Réponse reçue", W/2, 380);
    return canvas.toBuffer();
  }
};