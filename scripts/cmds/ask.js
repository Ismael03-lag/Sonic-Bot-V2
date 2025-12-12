const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPoLPrefix = ['Sonic'];

module.exports = {
  config: {
    name: 'sonic',
    version: '1.6.0',
    author: "L'Uchiha Perdu & ʚʆɞ Sømå Sønïč ʚʆɞ",
    countDown: 5,
    role: 0,
    shortDescription: "IA Ultime",
    longDescription: "IA avec outils terrifiants.",
    category: "IA",
    guide: "{pn} [question] ou {pn} montre moi [x]"
  },

  conversationHistory: {},

  applyStyle: (text) => {
      const normalToBold = {
          'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
          'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
          'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
          'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
          'k': '𝘬', 'l': '𝘭', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘵',
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

      let mediaUrl = null;
      if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0]) {
          const att = event.messageReply.attachments[0];
          if (['photo', 'audio', 'video'].includes(att.type)) {
              mediaUrl = att.url;
          }
      }

      if (!query && !mediaUrl) {
          return message.reply(`Pose une question ${name} !`);
      }

      if (!this.conversationHistory[userId]) this.conversationHistory[userId] = [];

      const payload = {
          query,
          key: 'fadil_boss_dev_uchiha',
          name_user: name,
          history: this.conversationHistory[userId].slice(-12),
          uid: userId,
          mediaUrl: mediaUrl
      };

      try {
          const res = await axios.post(
              'https://uchiha-perdu-api-models.vercel.app/api/sonic',
              payload,
              { timeout: 60000 }
          );

          const data = res.data;
          let responseText = data.response || "";
          responseText = this.applyStyle(responseText);

          if (data.audio && data.audio.tool === "voice" && responseText === "") {
          } else if (responseText) {
              const msg = `✧═════•❁❀❁•═════✧\n${responseText}\n✧═════•❁❀❁•═════✧`;
              await message.reply(msg);
          }

          if (data.images && data.images.length > 0) {
              for (const imageUrl of data.images) {
                  try {
                      const imageResponse = await axios({
                          url: imageUrl,
                          method: 'GET',
                          responseType: 'stream',
                          timeout: 10000
                      });

                      await message.reply({
                          attachment: imageResponse.data
                      });

                      await new Promise(resolve => setTimeout(resolve, 1500));
                  } catch (imgError) {
                      continue;
                  }
              }
          }

          if (data.audio && data.audio_base64) {
              try {
                  const audioBuffer = Buffer.from(data.audio_base64, 'base64');
                  const tempFilePath = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);

                  fs.writeFileSync(tempFilePath, audioBuffer);

                  await message.reply({
                      attachment: fs.createReadStream(tempFilePath)
                  });

                  fs.unlinkSync(tempFilePath);

              } catch (audioError) {
                  console.error("Erreur audio:", audioError);
                  await message.reply("L'audio n'a pas pu être envoyé.");
              }
          }

          if (data.media_url) {
              try {
                  const mediaResponse = await axios({
                      url: data.media_url,
                      method: 'GET',
                      responseType: 'stream',
                      timeout: 60000
                  });

                  const ext = data.media_type || 'mp4';
                  const tempFilePath = path.join(__dirname, `temp_media_${Date.now()}.${ext}`);

                  const writeStream = fs.createWriteStream(tempFilePath);
                  mediaResponse.data.pipe(writeStream);

                  await new Promise((resolve, reject) => {
                      writeStream.on('finish', resolve);
                      writeStream.on('error', reject);
                  });

                  await message.reply({
                      attachment: fs.createReadStream(tempFilePath)
                  });

                  fs.unlinkSync(tempFilePath);

              } catch (mediaError) {
                  console.error("Erreur media:", mediaError);
                  await message.reply("Le média n'a pas pu être envoyé.");
              }
          }

          if (data.audio && data.audio.tool === "voice") {
              this.conversationHistory[userId].push(
                  { role: 'user', content: query || '[demande audio]' },
                  { role: 'assistant', content: data.audio.text || '[audio]' }
              );
          } else {
              this.conversationHistory[userId].push(
                  { role: 'user', content: query || '[média]' },
                  { role: 'assistant', content: responseText || data.audio?.text || data.media_url || '[réponse]' }
              );
          }

          if (this.conversationHistory[userId].length > 20) {
              this.conversationHistory[userId].splice(0, 2);
          }

      } catch (e) {
          console.error("Erreur Sonic:", e);
          await message.reply("Sonic en galère, réessaie 5s frère.");
      }
  }
};
