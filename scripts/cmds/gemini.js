const g = require("fca-aryan-nix");
const a = require("axios");
const u = "http://65.109.80.126:20409/aryan/gemini";

module.exports = {
  config: {
    name: "gemini",
    aliases: ["ai","chat"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 3,
    role: 0,
    shortDescription: "Ask Gemini AI",
    longDescription: "Talk with Gemini AI using Aryan's updated API",
    category: "AI",
    guide: "/gemini [your question]"
  },

  onStart: async function({ api, event, args }) {
    const p = args.join(" ");
    if (!p) return api.sendMessage("❌ Please provide a question or prompt.", event.threadID, event.messageID);

    api.setMessageReaction("🟡", event.messageID, () => {}, true);

    try {
      const r = await a.get(`${u}?prompt=${encodeURIComponent(p)}`);
      const reply = r.data?.response; 
      if (!reply) throw new Error("No response from Gemini API.");

      api.setMessageReaction("🟢", event.messageID, () => {}, true);

      api.sendMessage(reply, event.threadID, (err, i) => {
        if (!i) return;
        global.GoatBot.onReply.set(i.messageID, { commandName: this.config.name, author: event.senderID });
      }, event.messageID);

    } catch (e) {
      api.setMessageReaction("🔴", event.messageID, () => {}, true);
      api.sendMessage("⚠ Gemini API theke response pawa jachchhe na.", event.threadID, event.messageID);
    }
  },

  onReply: async function({ api, event, Reply }) {
    if ([api.getCurrentUserID()].includes(event.senderID)) return;
    const p = event.body;
    if (!p) return;

    api.setMessageReaction("🔵", event.messageID, () => {}, true);

    try {
      const r = await a.get(`${u}?prompt=${encodeURIComponent(p)}`);
      const reply = r.data?.response; 
      if (!reply) throw new Error("No response from Gemini API.");

      api.setMessageReaction("🟢", event.messageID, () => {}, true);

      api.sendMessage(reply, event.threadID, (err, i) => {
        if (!i) return;
        global.GoatBot.onReply.set(i.messageID, { commandName: this.config.name, author: event.senderID });
      }, event.messageID);

    } catch (e) {
      api.setMessageReaction("🔴", event.messageID, () => {}, true);
      api.sendMessage("⚠ Gemini API er response dite somossa hocchhe.", event.threadID, event.messageID);
    }
  }
};

const w = new g.GoatWrapper(module.exports);
w.applyNoPrefix({ allowPrefix: true });
