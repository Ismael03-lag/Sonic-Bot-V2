const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPoLPrefix = ['Sonic'];

module.exports = {
  config: {
    name: 'sonic',
    version: '1.2.0',
    author: "L'Uchiha Perdu & ʚʆɞ Sømå Sønïč ʚʆɞ",
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

  onChat: async function ({ message, event, api }) {
    const prefix = UPoLPrefix.find(p => event.body?.toLowerCase().startsWith(p.toLowerCase()));
    if (!prefix) return;

    const query = event.body.slice(prefix.length).trim();
    const userId = event.senderID.toString();

    let name = 'Utilisateur';
    try {
      const info = await api.getUserInfo(userId);
      name = info[userId]?.name || name;
    } catch {}

    if (!query && (!event.messageReply || event.messageReply.attachments?.[0]?.type !== 'photo')) {
      return message.reply(`✧═════•❁❀❁•═════✧\nPose une question ${name} ! 😎\n✧═════•❁❀❁•═════✧`);
    }

    if (!this.conversationHistory[userId]) this.conversationHistory[userId] = [];

    const payload = {
      query,
      key: 'fadil_boss_dev_uchiha',
      name_user: name,
      history: this.conversationHistory[userId].slice(-12),
      uid: userId,
      imageUrl: event.messageReply?.attachments?.[0]?.type === 'photo' ? event.messageReply.attachments[0].url : null
    };

    let response = '', image = null;
    try {
      const res = await axios.post('https://uchiha-perdu-api-models.vercel.app/api', payload, { timeout: 120000 });
      response = res.data.response || 'Pas de réponse...';
      image = res.data.imageUrl;
    } catch (e) {
      response = 'IA en maintenance 5 sec frère !';
    }

    response = this.applyStyle(response);

    this.conversationHistory[userId].push({ role: 'user', content: query || '[image]' });
    this.conversationHistory[userId].push({ role: 'assistant', content: response });
    if (this.conversationHistory[userId].length > 20) this.conversationHistory[userId].splice(0, 2);

    const msg = `✧═════•❁❀❁•═════✧\n${response}\n✧═════•❁❀❁•═════✧`;

    if (image) {
      try {
        let attachment;
        const tempFile = path.join(__dirname, `temp_${Date.now()}.png`);

        if (image.startsWith('data:')) {
          const base64Data = image.split(',')[1];
          fs.writeFileSync(tempFile, Buffer.from(base64Data, 'base64'));
        } else {
          const dl = await axios.get(image, { responseType: 'arraybuffer', timeout: 120000 });
          fs.writeFileSync(tempFile, Buffer.from(dl.data));
        }

        attachment = fs.createReadStream(tempFile);
        attachment.on('end', () => {
          try { fs.unlinkSync(tempFile); } catch {}
        });

        await message.reply({ body: msg, attachment });
      } catch (e) {
        await message.reply(msg + `\n\n[Image non affichée → ${image}]`);
      }
    } else {
      await message.reply(msg);
    }
  }
};