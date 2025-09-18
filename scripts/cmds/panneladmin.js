// 🌐 Cache temporaire pour stocker les groupes par utilisateur
const groupesCache = {};

module.exports = {
  config: {
    name: "pannel",
    version: "2.4",
    author: "Evariste",
    role: 2, // rôle admin bot obligatoire
    shortDescription: "Panel admin secret",
    longDescription: "Accès admin réservé à Evariste et admins bot",
    category: "admin",
    guide: {
      fr: "¥pannel [action]"
    }
  },

  onStart: async function ({ message, event, usersData, threadsData, args, api, role }) {
    // UID ou rôle autorisé (UID)
    const adminIDs = ["61578281565957", "6"];
    const senderID = event.senderID;

    if (role < 2 && !adminIDs.includes(senderID)) {
      return message.reply("⛔ Désolé, accès refusé. Seuls Brayan Ð-Grimɱ et les admins bot peuvent utiliser cette commande.");
    }

    const action = args[0];

    if (!action) {
      return message.reply(
        "╔════════════════════════════╗\n" +
        "║      👑 PANEL ADMIN 👑      ║\n" +
        "║          par Brayan Ð-Grimɱ       ║\n" +
        "╚════════════════════════════╝\n\n" +
        "📌 Choisis une action :\n\n" +
        "1️⃣  💰 Voir le solde d'un utilisateur\n" +
        "2️⃣  ➕ Ajouter de l'argent à un utilisateur\n" +
        "3️⃣  ➖ Retirer de l'argent à un utilisateur\n" +
        "4️⃣  🔁 Réinitialiser les streaks 'motrapide'\n" +
        "5️⃣  🏆 Voir le top 5 des plus riches\n" +
        "6️⃣  📣 Envoyer une annonce à tous les groupes\n" +
        "7️⃣  📋 pannel list - lister les commandes\n" +
        "8️⃣  👥 pannel groupes - voir les groupes\n" +
        "9️⃣  🚪 pannel quitte [numéro] - faire quitter le bot d’un groupe\n" +
        "🔟  🚫 pannel block/unblock/blocklist\n" +
        "1️⃣1️⃣ 📨 diffuse [numéro] [message/media] - envoyer à un groupe précis\n" +
        "1️⃣2️⃣ 📨 diffuseall [message/media] - envoyer à tous les groupes\n"
      );
    }

    // Liste commandes
    if (action === "list") {
      return message.reply(
        "📋 **Commandes Admin Disponibles :**\n\n" +
        "• pannel solde [uid]\n" +
        "• pannel add [uid] [montant]\n" +
        "• pannel remove [uid] [montant]\n" +
        "• pannel annonce [message]\n" +
        "• pannel groupe(s)\n" +
        "• pannel groupes refresh\n" +
        "• pannel groupes add [numéro]\n" +
        "• pannel quitte [numéro]\n" +
        "• pannel block [uid]\n" +
        "• pannel unblock [uid]\n" +
        "• pannel blocklist\n" +
        "• pannel top\n" +
        "• pannel reset\n" +
        "• diffuse [numéro] [message/media]\n" +
        "• diffuseall [message/media]"
      );
    }

    // Groupes et gestion
    if (action === "groupe" || action === "groupes") {
      if (args[1] === "add") {
        const index = parseInt(args[2]) - 1;
        const groupes = groupesCache[senderID];

        if (!groupes || groupes.length === 0) {
          return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
        }

        if (isNaN(index) || index < 0 || index >= groupes.length) {
          return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
        }

        const threadID = groupes[index].threadID;

        try {
          await api.addUserToGroup(senderID, threadID);
          return message.reply(`✅ Tu as été ajouté au groupe : ${groupes[index].threadName}`);
        } catch {
          return message.reply("❌ Impossible d'ajouter l'utilisateur au groupe. Le bot est-il admin ?");
        }
      }

      if (args[1] === "refresh") {
        message.reply("🔄 Mise à jour de la liste des groupes actifs, un instant...");
      }

      const allThreads = await threadsData.getAll();
      const groupesValides = [];

      for (const t of allThreads) {
        if (!t.threadID || !t.threadName) continue;
        try {
          const info = await api.getThreadInfo(t.threadID);
          if (info && info.participantIDs.includes(api.getCurrentUserID())) {
            groupesValides.push({
              threadID: t.threadID,
              threadName: t.threadName
            });
          }
        } catch {}
      }

      groupesCache[senderID] = groupesValides;

      if (groupesValides.length === 0) {
        return message.reply("❌ Aucun groupe actif trouvé où le bot est encore membre.");
      }

      const liste = groupesValides.map((g, i) => `${i + 1}. ${g.threadName}`).join("\n");
      return message.reply(
        "👥 **Liste des groupes actifs :**\n\n" +
        liste + "\n\n" +
        "➕ `pannel groupes add [numéro]`\n" +
        "🚪 `pannel quitte [numéro]`\n" +
        "🔁 `pannel groupes refresh`"
      );
    }

    // Quitter un groupe
    if (action === "quitte") {
      const index = parseInt(args[1]) - 1;
      const groupes = groupesCache[senderID];

      if (!groupes || groupes.length === 0) {
        return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
      }

      if (isNaN(index) || index < 0 || index >= groupes.length) {
        return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
      }

      const threadID = groupes[index].threadID;
      const threadName = groupes[index].threadName;

      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        return message.reply(`🚪 Le bot a quitté le groupe : ${threadName}`);
      } catch {
        return message.reply("❌ Erreur : impossible de quitter ce groupe. Le bot est-il admin ?");
      }
    }

    // Bloquer un utilisateur
    if (action === "block") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel block [uid]");
      await usersData.set(uid, true, "blocked");
      return message.reply(`🚫 L'utilisateur ${uid} est maintenant bloqué.`);
    }

    // Débloquer un utilisateur
    if (action === "unblock") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel unblock [uid]");
      await usersData.set(uid, false, "blocked");
      return message.reply(`✅ L'utilisateur ${uid} est débloqué.`);
    }

    // Liste des utilisateurs bloqués
    if (action === "blocklist") {
      const users = await usersData.getAll(["blocked", "name"]);
      const blocked = users.filter(u => u.blocked === true);

      if (blocked.length === 0) {
        return message.reply("✅ Aucun utilisateur n'est actuellement bloqué.");
      }

      const list = blocked.map((u, i) => `${i + 1}. ${u.name || "Inconnu"} (${u.userID})`).join("\n");
      return message.reply(`🚫 Utilisateurs bloqués :\n\n${list}`);
    }

    // Envoyer une annonce à tous les groupes
    if (action === "annonce") {
      const text = args.slice(1).join(" ");
      if (!text) return message.reply("❌ Tu dois écrire un message après `pannel annonce`.");

      const allThreads = await threadsData.getAll();
      const groups = allThreads.filter(t => t.threadID && t.threadName);

      for (const group of groups) {
        try {
          await api.sendMessage(`📢 Annonce admin :\n${text}`, group.threadID);
        } catch {}
      }

      return message.reply(`✅ Annonce envoyée dans **${groups.length}** groupes.`);
    }

    // Voir le solde d'un utilisateur
    if (action === "solde") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Fournis l'UID de l'utilisateur.");
      const money = await usersData.get(uid, "money") || 0;
      return message.reply(`💰 Solde de ${uid} : ${money} $`);
    }

    // Ajouter de l'argent à un utilisateur
    if (action === "add") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel add [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, current + montant, "money");
      return message.reply(`✅ ${montant} $ ajoutés à l'utilisateur ${uid}.`);
    }

    // Retirer de l'argent à un utilisateur
    if (action === "remove") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel remove [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, Math.max(0, current - montant), "money");
      return message.reply(`✅ ${montant} $ retirés de l'utilisateur ${uid}.`);
    }

    // Top 5 des plus riches
    if (action === "top") {
      const users = await usersData.getAll(["money", "name"]);
      const top = users
        .filter(u => u.money).sort((a, b) => b.money - a.money)
        .slice(0, 5);

      const topMsg = top.map((u, i) => `#${i + 1}. ${u.name} – ${u.money} $`).join("\n");
      return message.reply(`🏆 **Top 5 utilisateurs les plus riches :**\n${topMsg}`);
    }

    // Réinitialiser les streaks motrapide
    if (action === "reset") {
      const all = await usersData.getAll(["motrapide"]);
      for (const user of all) {
        if (user.motrapide) {
          await usersData.set(user.userID, 0, "motrapide");
        }
      }
      return message.reply("🔁 Tous les streaks 'motrapide' ont été réinitialisés.");
    }

    // Diffuser dans un groupe précis
    if (action === "diffuse") {
      const index = parseInt(args[1]) - 1;
      const groupes = groupesCache[senderID];
      const text = args.slice(2).join(" ");
      const attachments = (event.messageReply?.attachments || event.attachments) || [];

      if (!groupes || groupes.length === 0) {
        return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
      }

      if (isNaN(index) || index < 0 || index >= groupes.length) {
        return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
      }

      if (!text && attachments.length === 0) {
        return message.reply("❌ Tu dois fournir un message ou un média à diffuser.");
      }

      const threadID = groupes[index].threadID;
      try {
        if (attachments.length > 0) {
          for (const attach of attachments) {
            const file = await api.getAttachment(attach.id);
            await api.sendMessage({ body: text, attachment: file }, threadID);
          }
        } else {
          await api.sendMessage(text, threadID);
        }
        return message.reply(`✅ Message diffusé au groupe : ${groupes[index].threadName}`);
      } catch {
        return message.reply("❌ Erreur lors de l'envoi du message. Le bot est-il toujours dans ce groupe ?");
      }
    }

    // Diffuser dans tous les groupes
    if (action === "diffuseall") {
      const text = args.slice(1).join(" ");
      const attachments = (event.messageReply?.attachments || event.attachments) || [];

      if (!text && attachments.length === 0) {
        return message.reply("❌ Tu dois fournir un message ou un média à diffuser.");
      }

      const allThreads = await threadsData.getAll();
      const groupesValides = [];

      for (const t of allThreads) {
        if (!t.threadID || !t.threadName) continue;
        try {
          const info = await api.getThreadInfo(t.threadID);
          if (info && info.participantIDs.includes(api.getCurrentUserID())) {
            groupesValides.push({
              threadID: t.threadID,
              threadName: t.threadName
            });
          }
        } catch {}
      }

      if (groupesValides.length === 0) {
        return message.reply("❌ Aucun groupe actif trouvé pour diffuser le message.");
      }

      let count = 0;
      for (const groupe of groupesValides) {
        try {
          if (attachments.length > 0) {
            for (const attach of attachments) {
              const file = await api.getAttachment(attach.id);
              await api.sendMessage({ body: text, attachment: file }, groupe.threadID);
            }
          } else {
            await api.sendMessage(text, groupe.threadID);
          }
          count++;
        } catch {}
      }

      return message.reply(`✅ Message diffusé dans **${count}** groupes.`);
    }

    return message.reply("❌ Commande inconnue. Essaie `pannel list`.");
  }
};