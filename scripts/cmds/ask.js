const axios = require("axios");
const { OpenAI } = require("openai");

const GITHUB_REPO = "Sonic-Shisui/Hedgehog-Bot-V2";
const GITHUB_TOKEN = "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";
const OPENAI_API_KEY = "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";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// 📝 Mémoire des conversations
const conversations = {}; // { userID: [ {role:"user", content:"..."}, {role:"assistant", content:"..."} ] }

// 🔮 IA - ChatGPT avec mémoire
async function askAI(userID, question) {
    if (!OPENAI_API_KEY) {
        return null;
    }

    if (!conversations[userID]) {
        conversations[userID] = [
            { role: "system", content: "Tu es un assistant utile, concis et expert en Node.js, GitHub et JavaScript." }
        ];
    }

    // Ajout de la question de l’utilisateur
    conversations[userID].push({ role: "user", content: question });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversations[userID],
            max_tokens: 500,
            temperature: 0.7
        });

        const answer = completion.choices?.[0]?.message?.content || null;

        if (answer) {
            // Ajout de la réponse de l’IA dans l’historique
            conversations[userID].push({ role: "assistant", content: answer });

            // Limiter la mémoire (20 messages max)
            if (conversations[userID].length > 20) {
                conversations[userID] = [conversations[userID][0], ...conversations[userID].slice(-19)];
            }
        }

        return answer;
    } catch (error) {
        console.error("Erreur OpenAI:", error.response?.status, error.response?.data);
        return null;
    }
}

module.exports = {
    config: {
        name: "ask",
        aliases: ["sonic"],
        version: "2.1",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙀 3.0★彡",
        role: 0,
        shortDescription: "Dialogue avec l'IA (conversation continue).",
        longDescription: "L’IA se souvient de ce que tu lui dis et répond comme dans une discussion en continu. Elle réagit ✅ ou 🤔 selon le cas.",
        category: "ai",
        guide: "ask <ta question>\nEnsuite continue à parler, l’IA se souviendra du contexte."
    },
    onStart: async function ({ api, event, args }) {
        const question = args.join(" ");
        if (!question) {
            return api.sendMessage("❓| Pose ta question à l’IA", event.threadID, event.messageID);
        }

        try {
            const aiAnswer = await askAI(event.senderID, question);

            if (aiAnswer) {
                // ✅ Réaction positive
                api.setMessageReaction("✅", event.messageID, () => {}, true);

                const msg = `➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ\n◆━━━━━━━▣✦▣━━━━━━━━◆\n${aiAnswer}\n◆━━━━━━━▣✦▣━━━━━━━━◆`;

                api.sendMessage(msg, event.threadID, event.messageID);
            } else {
                // 🤔 Réaction si pas de réponse
                api.setMessageReaction("🤔", event.messageID, () => {}, true);
                api.sendMessage("❌ Je n’ai pas pu répondre à ta question.", event.threadID, event.messageID);
            }
        } catch (err) {
            console.error(err);
            api.setMessageReaction("🤔", event.messageID, () => {}, true);
            api.sendMessage("❌ Une erreur est survenue avec l’IA.", event.threadID, event.messageID);
        }
    }
};