const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');

const PREFIX = ['Sonic'];
const ALLOWED_HUMANMOD_UIDS = ['61578090638036', '100090405019929'];
const API_KEY = 'fdl_uchiha_perdu_2025_secure';

module.exports = {
  config: {
    name: 'ask',
    version: '1.6.1',
    role: 0,
    category: 'AI',
    author: 'L\'Uchiha Perdu',
    shortDescription: 'Interagir avec Shadow IA',
    description: 'Sonic IA répond à vos questions.',
    guide: '{pn} [question | que vois-tu ? | active/désactive le mode humain | set timezone <zone>]'
  },

  applyMarkdown: (text) => {
    const normalToBold = {
      'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
      'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
      'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭', 'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱',
      'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻',
      'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅',
      'y': '𝘆', 'z': '𝘇'
    };
    const normalToItalic = {
      'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
      'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
      'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻'
    };

    try {
      let transformed = text;
      transformed = transformed.replace(/\*\*(.*?)\*\*/g, (_, p1) => p1.split('').map(char => normalToBold[char] || char).join(''));
      transformed = transformed.replace(/\*(.*?)\*/g, (_, p1) => p1.split('').map(char => normalToItalic[char] || char).join(''));
      return transformed;
    } catch (err) {
      console.error('Erreur applyMarkdown:', err.message);
      return text;
    }
  },

  sendImageBuffer: async (buffer, api, threadID, messageID) => {
    try {
      if (!buffer || buffer.length === 0) throw new Error('Buffer d\'image vide');
      
      const tmpDir = path.join(__dirname, 'tmp');
      await fs.ensureDir(tmpDir);
      const filePath = path.join(tmpDir, `shadow_image_${Date.now()}.jpg`);
      await fs.outputFile(filePath, buffer);
      
      await api.sendMessage(
        { 
          body: '≪━─━──━─◈─━─━━─━≫\n✅ Image générée !\n≪━──━─━─◈─━──━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙', 
          attachment: fs.createReadStream(filePath) 
        },
        threadID,
        () => fs.unlink(filePath).catch(console.error),
        messageID
      );
      return true;
    } catch (err) {
      console.error('Erreur sendImageBuffer:', err.message);
      await api.sendMessage(
        `≪━─━━─━─◈─━──━─━≫\n❌ Erreur lors de l'envoi de l'image : ${err.message}\n≪━─━━─━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`,
        threadID,
        messageID
      );
      return false;
    }
  },

  getImageBase64: async (url) => {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
      const contentType = response.headers['content-type'];
      if (!['image/jpeg', 'image/png'].includes(contentType)) throw new Error('Format d\'image non supporté');
      return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
    } catch (err) {
      console.error('Erreur getImageBase64:', err.message);
      return null;
    }
  },

  getCountryTimezone: (countryCode) => {
    const countryZones = {
      'BJ': 'Africa/Porto-Novo',
      'CG': 'Africa/Brazzaville',
      'NG': 'Africa/Lagos',
      'GH': 'Africa/Accra',
      'CI': 'Africa/Abidjan',
      'SN': 'Africa/Dakar',
      'CM': 'Africa/Douala',
      'TG': 'Africa/Lome',
      'BF': 'Africa/Ouagadougou',
      'ML': 'Africa/Bamako'
    };
    return countryZones[countryCode] || 'Africa/Porto-Novo';
  },

  onStart: async function () {},

  onChat: async function ({ message, event, api, threadID, messageID }) {
    const prefix = PREFIX.find((p) => event.body && event.body.toLowerCase().startsWith(p.toLowerCase()));
    if (!prefix) return;

    const prompt = event.body.substring(prefix.length).trim();
    const userId = event.senderID;
    let imageUrl = null;
    let senderName = 'Utilisateur';
    let zone = 'Africa/Porto-Novo';
    let humanmod = 'off';
    const humanmodFile = path.join(__dirname, `humanmod_${threadID}_${userId}.json`);
    const timezoneFile = path.join(__dirname, `timezone_${threadID}_${userId}.json`);
    const historyFile = path.join(__dirname, `history_${threadID}.json`);
    let history = [];

    try {
      const userInfo = await api.getUserInfo(userId);
      if (userInfo && userInfo[userId] && userInfo[userId].name) {
        senderName = userInfo[userId].name;
      }

      if (fs.existsSync(timezoneFile)) {
        zone = JSON.parse(fs.readFileSync(timezoneFile)).zone || 'Africa/Porto-Novo';
      } else {
        const userProfile = await api.getUserInfo(userId);
        if (userProfile[userId]?.countryCode) {
          zone = this.getCountryTimezone(userProfile[userId].countryCode);
        }
      }

      if (fs.existsSync(humanmodFile)) {
        humanmod = JSON.parse(fs.readFileSync(humanmodFile)).status || 'off';
      }

      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile));
      }

      if (message.messageReply?.attachments?.length > 0) {
        const attachment = message.messageReply.attachments[0];
        if (attachment.type === 'photo') {
          imageUrl = attachment.url;
        }
      }

      if (imageUrl && /(que vois-tu|décris|analyse|c'est quoi|qu'est ce|quoi\??|ça\??|ceci\??)/i.test(prompt)) {
        const payload = {
          key: API_KEY,
          prompt: prompt || 'Décris cette image.',
          imageUrl: imageUrl
        };

        try {
          const response = await axios.post(
            'https://uchiha-perdu-analyze-api.vercel.app/api/analyze-image',
            payload,
            { 
              headers: { 'Content-Type': 'application/json' }, 
              timeout: 60000 
            }
          );

          let answer = response.data.response || 'Aucune réponse.';
          answer = this.applyMarkdown(answer);
          history.push({ role: 'user', content: prompt });
          history.push({ role: 'assistant', content: answer });
          fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

          await message.reply(`≪━─━━─━─◈─━──━─━≫\n${answer}\n≪━─━━─━─◈─━──━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
          return;
        } catch (err) {
          console.error('Erreur analyse image:', err);
          await message.reply(`≪━─━━─━─◈─━──━─━≫\nErreur lors de l'analyse de l'image : ${err.message}\n≪━─━━─━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
          return;
        }
      }

      if (prompt.toLowerCase().startsWith('set timezone ')) {
        const newZone = prompt.substring(13).trim();
        if (!moment.tz.zone(newZone)) {
          await message.reply(`≪━─━━─━─◈─━─━━─━≫\nTimezone invalide, ${senderName} ! Exemple : Africa/Porto-Novo.\n≪━──━─━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
          return;
        }
        fs.writeFileSync(timezoneFile, JSON.stringify({ zone: newZone }));
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content: `Timezone définie sur ${newZone} !` });
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        await message.reply(`≪━─━━─━─◈─━──━─━≫\nTimezone définie sur ${newZone}, ${senderName} ! 😎\n≪━─━──━─◈─━──━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
        return;
      }

      if (!prompt && !imageUrl) {
        await message.reply(`≪━─━━─━─◈─━─━──━≫\nSalut ${senderName} ! Pose une question pour que je puisse te répondre !\n≪━──━─━─◈─━━─━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
        return;
      }

      if (['active le mode humain', 'parle comme un humain'].includes(prompt.toLowerCase())) {
        if (!ALLOWED_HUMANMOD_UIDS.includes(userId)) {
          await message.reply(`≪━─━━─━─◈─━─━━─━≫\nDésolé ${senderName}, seul un élu peut activer le mode humain !\n≪━─━──━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
          return;
        }
        humanmod = 'on';
        fs.writeFileSync(humanmodFile, JSON.stringify({ status: 'on' }));
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content: 'Mode humain activé ! 😎 Prêt à kiffer !' });
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        await message.reply(`≪━─━━─━─◈─━━─━─━≫\nMode humain activé, ${senderName} ! 😎 Qu'est-ce qu'on se raconte ? 😜\n≪━─━━─━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
        return;
      }

      if (['désactive le mode humain', 'arrête le mode humain', 'stoppe le mode humain', 'quitte le mode humain'].includes(prompt.toLowerCase())) {
        if (!ALLOWED_HUMANMOD_UIDS.includes(userId)) {
          await message.reply(`≪━──━─━─◈─━─━━─━≫\nDésolé ${senderName}, seul un élu peut gérer le mode humain !\n≪━─━━─━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
          return;
        }
        humanmod = 'off';
        fs.writeFileSync(humanmodFile, JSON.stringify({ status: 'off' }));
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content: 'Mode humain désactivé ! Retour au style classique 😎' });
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        await message.reply(`≪━──━─━─◈─━──━─━≫\nMode humain désactivé, ${senderName} ! Retour au style classique 😎\n≪━─━──━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
        return;
      }

      const payload = {
        query: prompt,
        ianame: '𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃',
        creator: "L'Uchiha Perdu & ʚʆɞ Sønïč Ĩsågï ʚʆɞ",
        userGreeting: `L'utilisateur se nomme ${senderName}`,
        name_user: senderName,
        zone,
        humanmod,
        history
      };

      const response = await axios.post(
        'https://uchiha-perdu-api-models.vercel.app/api',
        payload,
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      let answer = response.data.response || 'Erreur : pas de réponse.';
      let imageGenerated = false;

      const imageGenMatch = answer.match(/Génération en cours\s*(?::)?\s*\[(.*?)\]/i);
      if (imageGenMatch) {
        const imagePrompt = imageGenMatch[1];
        await message.reply('≪━─━━─━─◈─━──━─━≫\nGénération en cours... \n≪━─━──━─◈─━─━━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙');

        try {
          const imgResponse = await axios.get(
            'https://uchiha-perdu-gen-api.vercel.app/image',
            {
              params: { key: API_KEY, prompt: imagePrompt },
              responseType: 'arraybuffer',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 90000
            }
          );

          if (imgResponse.data && imgResponse.data.length > 0) {
            const success = await this.sendImageBuffer(Buffer.from(imgResponse.data), api, threadID, messageID);
            if (success) {
              answer = 'Génération réussie';
              imageGenerated = true;
            } else {
              answer = 'Erreur lors de l\'envoi de l\'image.';
            }
          } else {
            answer = 'Erreur : image non générée par l\'API.';
          }
        } catch (err) {
          console.error('Erreur génération image:', err);
          answer = 'Erreur lors de la génération de l\'image.';
        }
      }

      if (!imageGenerated) {
        answer = this.applyMarkdown(answer);
      }

      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: answer });
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

      await message.reply(`≪━─━━─━─◈─━─━━─━≫\n${answer}\n≪━━─━─━─◈─━──━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
    } catch (err) {
      console.error('Erreur API:', err);
      await message.reply(`≪━─━━─━─◈─━─━━─━≫\nErreur serveur. Réessaie plus tard, ${senderName} ! 😅\n≪━─━━─━─◈─━──━─━≫\n〘𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃〙`);
    }
  }
};