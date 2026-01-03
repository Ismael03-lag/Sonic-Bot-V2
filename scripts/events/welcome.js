const { getTime } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

const ADMIN1_ID = "100083846212138";
const ADMIN2_ID = "61578433048588";
const ADMIN1_NAME = "Walter O'Brien";
const ADMIN2_NAME = "ʚʆɞ Sømå Sønïč ʚʆɞ";

module.exports = {
  config: {
    name: "welcome",
    version: "2.1",
    author: "Ntkhang (taken over by 𝐋'𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮)",
    category: "events"
  },

  langs: {
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      welcomeMessage: "𝐓𝐡𝐚𝐧𝐤 𝐲𝐨𝐮 𝐟𝐨𝐫 𝐢𝐧𝐯𝐢𝐭𝐢𝐧𝐠 𝐦𝐞 𝐭𝐨 𝐭𝐡𝐞 𝐠𝐫𝐨𝐮𝐩!\n─────⊱◈☘️◈⊰─────\n𝐁𝐨𝐭 𝐏𝐫𝐞𝐟𝐢𝐱: 〖%1〗\n─────⊱◈☘️◈⊰─────\n𝐄𝐧𝐭𝐞𝐫 %1help 𝐭𝐨 𝐬𝐞𝐞 𝐚𝐥𝐥 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬",
      multiple1: "you",
      multiple2: "you guys",
      defaultWelcomeMessage:
        "𝙃𝙀𝙇𝙇𝙊 {userName}\n─────⊱◈☘️◈⊰─────\n𝙂𝙍𝙊𝙐𝙋 𝙉𝘼𝙈𝙀: {boxName}\n─────⊱◈☘️◈⊰─────"
    }
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const hours = getTime("HH");
    const threadID = event.threadID;
    const prefix = global.utils.getPrefix(threadID);
    const nickNameBot = global.GoatBot.config.nickNameBot;
    const dataAddedParticipants = event.logMessageData.addedParticipants;

    if (dataAddedParticipants.some(u => u.userFbId == api.getCurrentUserID())) {
      if (nickNameBot)
        api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());

      const text = getLang("welcomeMessage", prefix);
      const img = await createBotWelcomeCanvas(api);
      const imgPath = path.join(__dirname, `bot_${Date.now()}.png`);

      fs.writeFileSync(imgPath, img);
      await message.send(text);
      await message.send({ attachment: fs.createReadStream(imgPath) });

      setTimeout(() => fs.existsSync(imgPath) && fs.unlinkSync(imgPath), 1000);
      return;
    }

    if (!global.temp.welcomeEvent[threadID])
      global.temp.welcomeEvent[threadID] = {
        joinTimeout: null,
        dataAddedParticipants: []
      };

    global.temp.welcomeEvent[threadID].dataAddedParticipants.push(
      ...dataAddedParticipants
    );
    clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

    global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async () => {
      const threadData = await threadsData.get(threadID);
      if (threadData.settings.sendWelcomeMessage === false) return;

      const added = global.temp.welcomeEvent[threadID].dataAddedParticipants;
      const banned = threadData.data.banned_ban || [];
      const threadName = threadData.threadName;

      const names = [];
      const mentions = [];
      for (const u of added) {
        if (banned.some(b => b.id == u.userFbId)) continue;
        names.push(u.fullName);
        mentions.push({ tag: u.fullName, id: u.userFbId });
      }
      if (!names.length) return;

      let welcomeMessage =
        threadData.data.welcomeMessage ||
        getLang("defaultWelcomeMessage");

      welcomeMessage = welcomeMessage
        .replace(/\{userName\}|\{userNameTag\}/g, names.join(", "))
        .replace(/\{boxName\}|\{threadName\}/g, threadName)
        .replace(
          /\{session\}/g,
          hours <= 10
            ? getLang("session1")
            : hours <= 12
            ? getLang("session2")
            : hours <= 18
            ? getLang("session3")
            : getLang("session4")
        );

      const form = {
        body: welcomeMessage,
        mentions:
          welcomeMessage.includes("{userNameTag}") ? mentions : null
      };

      const threadInfo = await api.getThreadInfo(threadID);
      const userID = added[0].userFbId;
      const userAvatar = await getUserAvatar(api, userID);
      const groupAvatar = await getGroupAvatar(api, threadID);
      const position = threadInfo.participantIDs.length;

      const img = await createUserWelcomeCanvas(
        names[0],
        userAvatar,
        threadName,
        groupAvatar,
        position,
        threadID
      );

      const imgPath = path.join(
        __dirname,
        `welcome_${userID}_${Date.now()}.png`
      );
      fs.writeFileSync(imgPath, img);

      await message.send(form);
      await message.send({ attachment: fs.createReadStream(imgPath) });

      setTimeout(() => fs.existsSync(imgPath) && fs.unlinkSync(imgPath), 1000);
      delete global.temp.welcomeEvent[threadID];
    }, 1500);
  }
};

async function getUserAvatar(api, userID) {
  try {
    const info = await api.getUserInfo(userID);
    if (info[userID]?.thumbSrc) {
      const s = await global.utils.getStreamFromURL(info[userID].thumbSrc);
      return await bufferFromStream(s);
    }
  } catch {}
  return null;
}

async function getGroupAvatar(api, threadID) {
  try {
    const info = await api.getThreadInfo(threadID);
    if (!info?.imageSrc) return null;
    const s = await global.utils.getStreamFromURL(info.imageSrc);
    return await bufferFromStream(s);
  } catch {
    return null;
  }
}

function bufferFromStream(stream) {
  return new Promise(resolve => {
    const chunks = [];
    stream.on("data", c => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", () => resolve(null));
  });
}

async function loadWelcomeFont(threadID) {
  try {
    const p = path.join(
      global.client.dirMain,
      "data",
      "welcome_fonts",
      `welcome_font_${threadID}.png`
    );
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  return null;
}

async function createUserWelcomeCanvas(
  userName,
  userAvatar,
  groupName,
  groupAvatar,
  position,
  threadID
) {
  const W = 1200,
    H = 800;
  const canvas = Canvas.createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bg = await loadWelcomeFont(threadID);
  if (bg) {
    try {
      const img = await Canvas.loadImage(bg);
      ctx.drawImage(img, 0, 0, W, H);
    } catch {}
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#7b1fa2");
    g.addColorStop(1, "#f50057");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (groupAvatar) {
    try {
      const img = await Canvas.loadImage(groupAvatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, 100, 40, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 60, 60, 80, 80);
      ctx.restore();
    } catch {}
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px Arial";
  ctx.fillText(groupName, 160, 120);

  ctx.font = "bold 70px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BIENVENUE SUR", W / 2, 220);
  ctx.font = "bold 50px Arial";
  ctx.fillText(groupName.toUpperCase(), W / 2, 290);

  if (userAvatar) {
    try {
      const img = await Canvas.loadImage(userAvatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 450, 120, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, W / 2 - 120, 330, 240, 240);
      ctx.restore();
    } catch {}
  }

  ctx.font = "bold 40px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(userName, W / 2, 620);

  ctx.font = "30px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`Tu es le ${position}ème membre`, W / 2, 680);

  const d = new Date();
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(
    `${d.toLocaleDateString("fr-FR")} • ${d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    })}`,
    W / 2,
    730
  );

  return canvas.toBuffer();
}

async function createBotWelcomeCanvas(api) {
  const W = 1200,
    H = 700;
  const canvas = Canvas.createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0d0d0d");
  g.addColorStop(1, "#2979ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "right";
  ctx.fillText(`Prefix: ${global.utils.getPrefix("global")}`, W - 50, 50);

  const botAvatar = await getUserAvatar(api, api.getCurrentUserID());
  if (botAvatar) {
    try {
      const img = await Canvas.loadImage(botAvatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 200, 100, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, W / 2 - 100, 100, 200, 200);
      ctx.restore();
    } catch {}
  }

  const a1 = await getUserAvatar(api, ADMIN1_ID);
  const a2 = await getUserAvatar(api, ADMIN2_ID);

  ctx.font = "bold 60px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText("HEDGEHOG GPT", W / 2, 350);

  ctx.font = "bold 35px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText("SUPERVISION", W / 2, 420);

  if (a1) {
    try {
      const i = await Canvas.loadImage(a1);
      ctx.drawImage(i, W / 2 - 300, 470, 150, 150);
    } catch {}
  }

  if (a2) {
    try {
      const i = await Canvas.loadImage(a2);
      ctx.drawImage(i, W / 2 + 150, 470, 150, 150);
    } catch {}
  }

  ctx.font = "25px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText(ADMIN1_NAME, W / 2 - 225, 650);
  ctx.fillText(ADMIN2_NAME, W / 2 + 225, 650);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(0, H - 60, W, 60);
  ctx.font = "20px Arial";
  ctx.fillStyle = "#888";
  ctx.fillText("Ne pas abuser du bot", W / 2, H - 25);

  return canvas.toBuffer();
}