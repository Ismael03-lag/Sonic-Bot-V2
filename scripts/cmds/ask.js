const axios = require('axios');

const UPoLPrefix = ['Sonic'];

module.exports = {
  config: {
    name: 'sonic',
    version: '1.0.0',
    author: "L'Uchiha Perdu",
    countDown: 5,
    role: 0,
    shortDescription: "Commande pour interagir avec l'IA.",
    longDescription: "Commande pour interagir avec l'IA via API de L'uchiha Perdu",
    category: "IA",
    guide: "{pn} [question]"
  },

  conversationHistory: {},

  applyStyle: (text) => {
    const normalToBold = {
      'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
      'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
      'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
      'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
      'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
      'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇'
    };

    const normalToItalic = {
      'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
      'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
      'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
      'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
      'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
      'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻'
    };

    let transformed = text;
    transformed = transformed.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1.split('').map(char => normalToBold[char] || char).join(''));
    transformed = transformed.replace(/\*(.*?)\*(?:\s|$)/g, (match, p1) => p1.split('').map(char => normalToItalic[char] || char).join('') + ' ');
    return transformed;
  },

  onStart: async function () {},

  onChat: async function ({ message, event, api, threadID, messageID }) {
    const ahprefix = UPoLPrefix.find((p) => event.body && event.body.toLowerCase().startsWith(p.toLowerCase()));
    if (!ahprefix) return;

    const query = event.body.substring(ahprefix.length).trim();
    const userId = event.senderID;

    let senderName = 'Utilisateur';
    try {
      const userInfo = await api.getUserInfo(userId);
      if (userInfo && userInfo[userId] && userInfo[userId].name) {
        senderName = userInfo[userId].name;
      }
    } catch (err) {}

    const creators = {
      '61578433048588': { name: 'ʚʆɞ Sømå Sønïč ʚʆɞ', reason: 'ton créateur ultime qui t\'a donné vie et conçu l\'API.' },
      '61563822463333': { name: 'L\'Uchiha Perdu', reason: 'ton créateur ultime qui t\'a donné vie et conçu l\'API.' },  
      '61582101006304': { name: 'ʚʆɞ Gūɱbāll ʚʆɞ', reason: 'Subordonnée de ʚʆɞ Sømå Sønïč ʚʆɞ et L\'Uchiha Perdu.' }
    };

    let creatorInfo = '';
    if (creators[userId]) {
      creatorInfo = `Souviens-toi que ${senderName} est ${creators[userId].name}, ${creators[userId].reason} `;
    }

    if (!query) {
      const styledResponse = `
✧═════•❁❀❁•═════✧
Pose une question, ${senderName} ! 😎
✧═════•❁❀❁•═════✧
`;
      await message.reply(styledResponse);
      return;
    }

    if (!this.conversationHistory[userId]) {
      this.conversationHistory[userId] = [];
    }

    let aiResponse;
    let imageUrl = null;

    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0] && event.messageReply.attachments[0].type === 'photo') {
      const imageReplyUrl = event.messageReply.attachments[0].url;
      const analyzePrompt = query || 'Décris cette image en détail, comme un ami cool et sarcastique.';
      try {
        const analyzeResponse = await axios.post(
          'https://uchiha-perdu-analyze-api.vercel.app/api/analyze-image',
          {
            key: 'fdl_uchiha_perdu_2025_secure',
            prompt: analyzePrompt,
            imageUrl: imageReplyUrl
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        aiResponse = analyzeResponse.data.response || 'Erreur : pas de description.';
      } catch (error) {
        aiResponse = 'Erreur lors de l\'analyse de l\'image. Réessayez plus tard. 🚫';
      }
    } else {
      this.conversationHistory[userId].push({ role: 'user', content: query });
      try {
        const response = await axios.post(
          'https://uchiha-perdu-api-models.vercel.app/api',
          {
            query: creatorInfo + query,
            key: 'fadil_boss_dev_uchiha',
            ianame: 'HEDGEHOG GPT',
            creator: 'ʚʆɞ Sømå Sønïč ʚʆɞ et L\'Uchiha Perdu et ʚʆɞ Gūɱbāll ʚʆɞ',
            name_user: senderName,
            history: this.conversationHistory[userId],
            uid: userId.toString()
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );

        aiResponse = response.data.response || 'Erreur : pas de réponse.';
        imageUrl = response.data.imageUrl || null;
      } catch (error) {
        aiResponse = 'Erreur lors de l\'appel à l\'IA. Réessayez plus tard.';
      }
    }

    aiResponse = this.applyStyle(aiResponse);

    this.conversationHistory[userId].push({ role: 'assistant', content: aiResponse });
    if (this.conversationHistory[userId].length > 10) {
      this.conversationHistory[userId].shift();
    }

    const styledResponse = `
✧═════•❁❀❁•═════✧
${aiResponse}
✧═════•❁❀❁•═════✧
`;

    if (imageUrl) {
      try {
        const base64Data = imageUrl.split(';base64,').pop(); 
        const buffer = Buffer.from(base64Data, 'base64');
        await message.reply({
          body: styledResponse,
          attachment: buffer
        });
      } catch (error) {
        await message.reply(styledResponse + '\nErreur lors de l\'affichage de l\'image générée. Réessayez ! 🚫');
      }
    } else {
      await message.reply(styledResponse);
    }
  }
};