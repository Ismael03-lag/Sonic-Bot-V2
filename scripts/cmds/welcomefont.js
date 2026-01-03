const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "welcomefont",
    version: "1.0",
    author: "TonNom",
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
      if (!attachment.type || attachment.type !== "photo") {
        return message.reply("❌ Seules les images sont acceptées !");
      }

      try {
        const response = await global.utils.getStreamFromURL(attachment.url);
        const buffer = await getBufferFromStream(response);
        
        const fontDir = path.join(global.client.dirMain, "data", "welcome_fonts");
        await fs.ensureDir(fontDir);
        
        const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
        await fs.writeFile(fontPath, buffer);
        
        const threadData = await threadsData.get(threadID);
        threadData.data.welcomeFont = fontPath;
        await threadsData.set(threadID, threadData);
        
        message.reply("✅ Fond de bienvenue défini avec succès !");
      } catch (error) {
        console.error(error);
        message.reply("❌ Erreur lors du téléchargement de l'image.");
      }
    }
    else if (action === "reset") {
      const threadData = await threadsData.get(threadID);
      const fontDir = path.join(global.client.dirMain, "data", "welcome_fonts");
      const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
      
      if (fs.existsSync(fontPath)) {
        await fs.unlink(fontPath);
      }
      
      delete threadData.data.welcomeFont;
      await threadsData.set(threadID, threadData);
      
      message.reply("✅ Fond de bienvenue réinitialisé au style par défaut !");
    }
    else if (action === "view") {
      const threadData = await threadsData.get(threadID);
      const fontDir = path.join(global.client.dirMain, "data", "welcome_fonts");
      const fontPath = path.join(fontDir, `welcome_font_${threadID}.png`);
      
      if (threadData.data.welcomeFont && fs.existsSync(fontPath)) {
        message.reply({
          attachment: fs.createReadStream(fontPath),
          body: "🎨 Fond de bienvenue actuel :"
        });
      } else {
        message.reply("ℹ️ Aucun fond personnalisé défini. Le style par défaut est utilisé.");
      }
    }
  }
};

function getBufferFromStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}