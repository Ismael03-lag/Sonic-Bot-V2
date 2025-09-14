/**
 * Commande: help (style BRAYAN BOT Unicode)
 * ⚠️ Assurez-vous que le fichier est enregistré en UTF-8
 */

module.exports = {
  config: {
    name: "help",
    aliases: ["h", "menu"],
    version: "2.3.0",
    author: "chatgpt",
    cooldown: 3,
    role: 0,
    shortDescription: {
      fr: "Affiche la liste des commandes avec style BRAYAN BOT"
    },
    longDescription: {
      fr: "Menu d'aide avec catégories et style encadré Unicode, identique à l'exemple fourni."
    },
    category: "système",
    guide: {
      fr: "{pn} [catégorie|commande]"
    }
  },

  onStart: async function (ctx) {
    return runHelp(ctx);
  },
  run: async function (ctx) {
    return runHelp(ctx);
  }
};

async function runHelp(context) {
  const { message, args = [], commandName = "help", prefix } = normalizeContext(context);
  const registry = getRegistry();
  if (!registry) return message.reply("❌ Impossible de lire le registre des commandes.");

  if (args.length) {
    const query = args.join(" ").trim();
    const foundCommand = findCommand(registry, query);
    if (foundCommand) return message.reply(formatCommandCard(foundCommand, { prefix }));

    const byCat = groupByCategory(registry);
    const catKey = Object.keys(byCat).find(k => k.toLowerCase() === query.toLowerCase());
    if (catKey) return message.reply(formatCategoryMenu(catKey, byCat[catKey], { prefix, commandName }));

    return message.reply(`🤔 Rien trouvé pour "${query}".`);
  }

  return message.reply(formatPagedMenu(registry, { prefix, commandName }));
}

function normalizeContext(ctx) {
  const message = ctx.message || ctx.api?.sendMessage && {
    reply: (m) => ctx.api.sendMessage(m, ctx.event?.threadID, ctx.event?.messageID)
  } || { reply: () => {} };
  return {
    message,
    args: ctx.args || ctx.event?.body?.split(/\s+/).slice(1) || [],
    commandName: ctx.commandName || "help",
    prefix: ctx.prefix || global.GoatBot?.config?.prefix || global.client?.config?.prefix || "+"
  };
}

function getRegistry() {
  const map = global.GoatBot?.commands || global.client?.commands;
  if (!map) return null;
  const list = [];
  for (const [name, command] of map.entries()) {
    const config = command.config || {};
    list.push({ name: config.name || name, config, command });
  }
  return list;
}

function formatPagedMenu(registry, { prefix = "+", commandName = "help" }) {
  const byCat = groupByCategory(registry);
  let text = "╭━━⫷HELP LIST⫸━━╮\n\n";

  for (const cat of Object.keys(byCat)) {
    text += `╭─────⟪ ${cat.toUpperCase()} ⟫─────╮\n`;
    for (const { name } of byCat[cat]) {
      text += `┃ ✦ ${name}\n`;
    }
    text += "╰─────────────────╯\n\n";
  }

  text += `⫸ ${registry.length} commandes disponibles\n`;
  text += `⫸ ${prefix}${commandName} [nom] pour plus d'info\n`;
  text += `⫸ Problème ? Contactez l’admin via ${prefix}callad\n`;
  text += "⫷ Brayan Ð-Grimɱ ⫸";
  return text;
}

function formatCategoryMenu(category, items, { prefix = "+", commandName = "help" }) {
  let text = `╭─────⟪ ${category.toUpperCase()} ⟫─────╮\n`;
  for (const { name } of items) {
    text += `┃ ✦ ${name}\n`;
  }
  text += "╰─────────────────╯\n";
  text += `\n⫸ ${items.length} commandes dans ${category}\n`;
  text += `⫸ Retour: ${prefix}${commandName}`;
  return text;
}

function formatCommandCard(entry, { prefix = "+" }) {
  const { name, config } = entry;
  const desc = pickDesc(config) || "Aucune description.";
  const usage = typeof config.guide === "string" ? config.guide : (config.guide?.fr || `{pn}`);
  const guide = usage.replaceAll("{pn}", `${prefix}${name}`);
  const aliases = Array.isArray(config.aliases) && config.aliases.length ? config.aliases.join(", ") : "—";
  const role = config.role ?? 0;
  const cooldown = config.cooldown ?? 0;
  const category = config.category || "autre";

  return `╭━━⫷ ${name.toUpperCase()} ⫸━━╮\n` +
         `📖 Description: ${desc}\n` +
         `📌 Utilisation: ${guide}\n` +
         `🧩 Alias: ${aliases}\n` +
         `⏳ Cooldown: ${cooldown}s\n` +
         `🔒 Rôle requis: ${role}\n` +
         `🗂️ Catégorie: ${category}\n` +
         `╰━━━━━━━━━━━━━━━━━━╯`;
}

function groupByCategory(registry) {
  return registry.reduce((acc, it) => {
    const cat = (it.config.category || "autre").trim();
    (acc[cat] ||= []).push(it);
    return acc;
  }, {});
}

function findCommand(registry, query) {
  const q = query.toLowerCase();
  return registry.find(({ name, config }) =>
    name.toLowerCase() === q || (Array.isArray(config.aliases) && config.aliases.map(a => a.toLowerCase()).includes(q))
  );
}

function pickDesc(config = {}) {
  if (typeof config.shortDescription === "string") return config.shortDescription;
  return config.shortDescription?.fr || config.shortDescription?.en || config.longDescription?.fr || config.longDescription?.en || "";
}