const fs = require('fs-extra');
const path = require('path');
const Canvas = require("canvas");

module.exports = {
  config: {
    name: "welcomefont",
    version: "1.0",
    author: "L'Uchiha Perdu",
    category: "Group",
    description: "Définir ou réinitialiser le fond d'écran des messages de bienvenue"
  },

  onStart: async function({ event, message, args, threadsData }) {
    const threadID = event.threadID;
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      return message.reply(`Usage: 
• welcomefont set - Répondre à une image pour la définir comme fond
• welcomefont reset - Réinitialiser le fond par défaut
• welcomefont view - Voir le fond actuel`);
    }

    if (action === "set") {
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply("❌ Répondez à une image avec cette commande pour la définir comme fond !");
      }

      const attachment = event.messageReply.attachments[0];
      if (!attachment.type || (attachment.type !== "photo" && attachment.type !== "animated_image")) {
        return message.reply("❌ Seules les images sont acceptées !");
      }

      try {
        const imageURL = attachment.url;
        const image = await Canvas.loadImage(imageURL);
        
        const canvas = Canvas.createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');
        
        const imgRatio = image.width / image.height;
        const canvasRatio = 1200 / 800;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgRatio > canvasRatio) {
          drawHeight = 800;
          drawWidth = drawHeight * imgRatio;
          offsetX = (1200 - drawWidth) / 2;
        } else {
          drawWidth = 1200;
          drawHeight = drawWidth / imgRatio;
          offsetY = (800 - drawHeight) / 2;
        }
        
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, 1200, 800);
        
        const buffer = canvas.toBuffer();
        
        const fontDir = path.join(__dirname, "..", "..", "data", "welcome_fonts");
        await fs.ensureDir(fontDir);
        
        const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
        await fs.writeFile(fontPath, buffer);
        
        const threadData = await threadsData.get(threadID);
        threadData.data.welcomeFont = fontPath;
        await threadsData.set(threadID, threadData);
        
        message.reply("✅ Fond de bienvenue défini avec succès !");
        
      } catch (error) {
        console.error("Erreur:", error);
        message.reply(`❌ Erreur: ${error.message}`);
      }
    }
    else if (action === "reset") {
      try {
        const threadData = await threadsData.get(threadID);
        const fontDir = path.join(__dirname, "..", "..", "data", "welcome_fonts");
        const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
        
        if (fs.existsSync(fontPath)) {
          await fs.unlink(fontPath);
        }
        
        delete threadData.data.welcomeFont;
        await threadsData.set(threadID, threadData);
        
        message.reply("✅ Fond de bienvenue réinitialisé au style par défaut !");
      } catch (error) {
        console.error("Erreur reset:", error);
        message.reply("❌ Erreur lors de la réinitialisation.");
      }
    }
    else if (action === "view") {
      try {
        const threadData = await threadsData.get(threadID);
        const fontDir = path.join(__dirname, "..", "..", "data", "welcome_fonts");
        const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
        
        if (fs.existsSync(fontPath)) {
          message.reply({
            attachment: fs.createReadStream(fontPath),
            body: "🎨 Fond de bienvenue actuel :"
          });
        } else {
          message.reply("ℹ️ Aucun fond personnalisé défini. Le style par défaut est utilisé.");
        }
      } catch (error) {
        console.error("Erreur view:", error);
        message.reply("❌ Erreur lors de l'affichage du fond.");
      }
    }
  }
};