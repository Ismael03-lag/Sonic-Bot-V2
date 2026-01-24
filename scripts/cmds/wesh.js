const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Canvas = require('canvas');

const BOT_UID = global.botID;
const API_KEY = 'uchiha-perdu-storm';
const API_URL = 'https://combat-storm.vercel.app';
const IMAGE_URL = 'https://i.ibb.co/S4r4xpF0/file-0000000084f86243b7f327827bf6e062.png';

const formatMessage = (msg) => `≪━─━─━─◈─━─━─━≫\n${msg}\n≪━─━─━─◈─━─━─━≫`;

const defaultFontName = "BeVietnamPro-SemiBold";
const defaultPathFontName = path.join(__dirname, 'assets', 'font', 'BeVietnamPro-SemiBold.ttf');
const boldPathFontName = path.join(__dirname, 'assets', 'font', 'BeVietnamPro-Bold.ttf');

try {
    if (fs.existsSync(boldPathFontName)) Canvas.registerFont(boldPathFontName, { family: "BeVietnamPro-Bold" });
    if (fs.existsSync(defaultPathFontName)) Canvas.registerFont(defaultPathFontName, { family: defaultFontName });
} catch (e) {}

function getInitialState() {
  return {
    status: 'idle',
    players: {},
    lastTime: Date.now(),
    history: [],
    characters: {},
    charInfo: {},
    stats: {},
    processing: false,
    isAI: false,
    aiDifficulty: 'normal',
    currentTurn: null,
    tournament: {
        active: false,
        id: null,
        matches: [],
        readyStatus: {},
        currentMatchID: null,
        round: 1
    }
  };
}

function safeParseJSON(input) {
  if (typeof input === 'object' && input !== null) return input;
  if (!input) return null;
  let str = input.toString().trim();
  try {
      return JSON.parse(str);
  } catch (e) {
      const match = str.match(/\{[\s\S]*\}/);
      if (match) { try { return JSON.parse(match[0]); } catch (err) {} }
      return null;
  }
}

async function apiPost(url, data, headers = {}, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { headers, timeout: 90000 });
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function getAvatar(usersData, uid) {
    try {
        if (!uid || uid === 'IA' || uid === BOT_UID || uid.includes('IA')) {
            try { return await Canvas.loadImage(await usersData.getAvatarUrl(BOT_UID)); }
            catch { return null; }
        }
        const url = await usersData.getAvatarUrl(uid);
        const img = await Canvas.loadImage(url);
        const tempCanvas = Canvas.createCanvas(250, 250);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(img, 0, 0, 250, 250);
        return tempCanvas;
    } catch { return null; }
}

async function drawVS(p1, p2, usersData) {
    const width = 900;
    const height = 450;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#0c0c0c');
    grd.addColorStop(0.5, '#1a1a2e');
    grd.addColorStop(1, '#16213e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.font = 'bold 120px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.textAlign = 'center';
    ctx.fillText("VS", width / 2, height / 2 + 40);
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    const img1 = await getAvatar(usersData, p1.uid);
    if (img1) {
        ctx.save();
        const borderGradient1 = ctx.createRadialGradient(180, 225, 110, 180, 225, 120);
        borderGradient1.addColorStop(0, '#00ccff');
        borderGradient1.addColorStop(1, '#0066ff');
        ctx.beginPath();
        ctx.arc(180, 225, 120, 0, Math.PI * 2);
        ctx.strokeStyle = borderGradient1;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(180, 225, 110, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img1, 70, 115, 220, 220);
        ctx.restore();
    }
    const img2 = await getAvatar(usersData, p2.uid);
    if (img2) {
        ctx.save();
        const borderGradient2 = ctx.createRadialGradient(720, 225, 110, 720, 225, 120);
        borderGradient2.addColorStop(0, '#ff3300');
        borderGradient2.addColorStop(1, '#cc0000');
        ctx.beginPath();
        ctx.arc(720, 225, 120, 0, Math.PI * 2);
        ctx.strokeStyle = borderGradient2;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(720, 225, 110, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img2, 610, 115, 220, 220);
        ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(p1.name.substring(0, 14), 180, 380);
    ctx.fillText(p2.name.substring(0, 14), 720, 380);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2, height - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    const tmp = path.join(__dirname, 'cache', `vs_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawWinnerCard(winnerName, winnerUID, usersData) {
    const width = 1100;
    const height = 550;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const grd = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, 500);
    grd.addColorStop(0, '#1a1a1a');
    grd.addColorStop(0.5, '#0d0d0d');
    grd.addColorStop(1, '#000000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    const cornerSize = 50;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize);
    ctx.lineTo(20, 20);
    ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, 20);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 20, 20 + cornerSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, height - 20 - cornerSize);
    ctx.lineTo(20, height - 20);
    ctx.lineTo(20 + cornerSize, height - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 20, height - 20 - cornerSize);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(width - 20 - cornerSize, height - 20);
    ctx.stroke();
    ctx.font = 'bold 90px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText("🏆 VICTOIRE 🏆", width / 2, 100);
    ctx.shadowBlur = 0;
    if (winnerUID && winnerUID !== 'IA' && !winnerUID.includes('IA')) {
        try {
            const avatarUrl = await usersData.getAvatarUrl(winnerUID);
            const avatar = await Canvas.loadImage(avatarUrl);
            ctx.save();
            const avatarGradient = ctx.createRadialGradient(
                width/2, height/2, 120,
                width/2, height/2, 150
            );
            avatarGradient.addColorStop(0, '#FFD700');
            avatarGradient.addColorStop(1, '#FF8C00');
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 150, 0, Math.PI * 2);
            ctx.fillStyle = avatarGradient;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 140, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, width/2 - 140, height/2 - 140, 280, 280);
            ctx.restore();
        } catch (e) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 150px Arial';
            ctx.fillText("👑", width / 2, height / 2 + 50);
        }
    } else {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 150px Arial';
        ctx.fillText("🤖", width / 2, height / 2 + 50);
    }
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(winnerName.toUpperCase(), width / 2, 480);
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText("LE COMBAT EST TERMINÉ", width / 2, 520);
    const tmpPath = path.join(__dirname, 'cache', `winner_${Date.now()}.png`);
    await fs.writeFile(tmpPath, canvas.toBuffer());
    return fs.createReadStream(tmpPath);
}

async function drawParticipants(players, usersData) {
    const cols = 4;
    const rows = Math.ceil(players.length / cols);
    const width = 900;
    const height = 150 + (rows * 200);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, width, height);
    ctx.font = 'bold 45px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`PARTICIPANTS (${players.length}/16)`, width / 2, 80);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width/2 - 150, 100);
    ctx.lineTo(width/2 + 150, 100);
    ctx.stroke();
    let x = 125, y = 200;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const img = await getAvatar(usersData, p.uid);
        ctx.save();
        const circleGradient = ctx.createRadialGradient(x, y, 70, x, y, 75);
        circleGradient.addColorStop(0, '#333');
        circleGradient.addColorStop(1, '#222');
        ctx.beginPath();
        ctx.arc(x, y, 75, 0, Math.PI * 2);
        ctx.fillStyle = circleGradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 75, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
        if (img) {
            ctx.beginPath();
            ctx.arc(x, y, 70, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, x-70, y-70, 140, 140);
        } else {
            ctx.fillStyle = '#666';
            ctx.font = 'bold 40px Arial';
            ctx.fillText("?", x, y + 15);
        }
        ctx.restore();
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(p.name.substring(0, 12), x, y + 110);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`#${i+1}`, x, y + 140);
        x += 200;
        if ((i + 1) % cols === 0) {
            x = 125;
            y += 200;
        }
    }
    const tmp = path.join(__dirname, 'cache', `part_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawBracket(matches, round, usersData) {
    const matchWidth = 380;
    const matchHeight = 110;
    const gapY = 50;
    const groupGapY = 100;
    const totalPairs = Math.ceil(matches.length / 2);
    const contentHeight = (matches.length * matchHeight) + (matches.length * gapY) + (totalPairs * groupGapY);
    const height = Math.max(700, contentHeight + 200);
    const width = 1100;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#141E30');
    grd.addColorStop(0.5, '#0F3460');
    grd.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    ctx.font = "bold 65px Arial";
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = "center";
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(`TOURNOI - ROUND ${round}`, width / 2, 90);
    ctx.shadowBlur = 0;
    let currentY = 150;
    for (let i = 0; i < matches.length; i += 2) {
        const m1 = matches[i];
        const m2 = matches[i+1];
        const y1 = currentY;
        await drawMatchBox(ctx, m1, 60, y1, matchWidth, matchHeight, usersData);
        let y2 = y1 + matchHeight + gapY;
        if (m2) {
            await drawMatchBox(ctx, m2, 60, y2, matchWidth, matchHeight, usersData);
        }
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const connectorX = 60 + matchWidth;
        const connectorY1 = y1 + (matchHeight / 2);
        ctx.moveTo(connectorX, connectorY1);
        ctx.lineTo(connectorX + 60, connectorY1);
        if (m2) {
            const connectorY2 = y2 + (matchHeight / 2);
            ctx.moveTo(connectorX, connectorY2);
            ctx.lineTo(connectorX + 60, connectorY2);
            ctx.moveTo(connectorX + 60, connectorY1);
            ctx.lineTo(connectorX + 60, connectorY2);
            const midY = (connectorY1 + connectorY2) / 2;
            ctx.moveTo(connectorX + 60, midY);
            ctx.lineTo(connectorX + 120, midY);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.fillRect(connectorX + 120, midY - 30, 60, 60);
            ctx.strokeRect(connectorX + 120, midY - 30, 60, 60);
            ctx.font = 'bold 25px Arial';
            ctx.fillStyle='#FFD700';
            ctx.textAlign='center';
            ctx.fillText("VS", connectorX + 150, midY + 8);
        }
        ctx.stroke();
        currentY = y2 + matchHeight + groupGapY;
    }
    const tmp = path.join(__dirname, 'cache', `tree_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawMatchBox(ctx, match, x, y, w, h, usersData) {
    const boxGradient = ctx.createLinearGradient(x, y, x, y + h);
    boxGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    boxGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = boxGradient;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = match.winner ? '#FFD700' : '#666';
    ctx.lineWidth = match.winner ? 4 : 2;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h/2);
    ctx.lineTo(x + w, y + h/2);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    const isP1Winner = match.winner && match.winner === match.player1.uid;
    ctx.fillStyle = isP1Winner ? '#FFD700' : '#FFF';
    if (isP1Winner) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
    }
    ctx.fillText(match.player1.name.substring(0, 16), x + 70, y + 40);
    if (isP1Winner) ctx.shadowBlur = 0;
    const img1 = await getAvatar(usersData, match.player1.uid);
    if (img1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + 35, y + 35, 30, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img1, x + 5, y + 5, 60, 60);
        ctx.restore();
    }
    if (match.player2) {
        const isP2Winner = match.winner && match.winner === match.player2.uid;
        ctx.fillStyle = isP2Winner ? '#FFD700' : '#FFF';
        if (isP2Winner) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
        }
        ctx.fillText(match.player2.name.substring(0, 16), x + 70, y + 40 + h/2);
        if (isP2Winner) ctx.shadowBlur = 0;
        const img2 = await getAvatar(usersData, match.player2.uid);
        if (img2) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + 35, y + 35 + h/2, 30, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img2, x + 5, y + 5 + h/2, 60, 60);
            ctx.restore();
        }
    } else {
        ctx.fillStyle = '#888';
        ctx.fillText("BYE", x + 70, y + 40 + h/2);
    }
}

module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '20.0.0',
    author: 'L\'Uchiha Perdu',
    countDown: 5,
    role: 0,
    shortDescription: { en: 'Jeu de combat textuel multivers' },
    description: { en: 'Jeu de combat géré par IA arbitre.' },
    category: 'Game',
    guide: { en: '{pn} menu' }
  },

  onStart: async function ({ api, event, message, usersData, args }) {
    const { threadID, senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || '!';
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const stateDir = path.join(__dirname, 'cache');
    await fs.ensureDir(stateDir);
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    const menuImgPath = path.join(stateDir, 'menu_uchiha.png');
    let state = getInitialState();
    if (await fs.pathExists(stateFile)) {
      try { state = JSON.parse(await fs.readFile(stateFile)); }
      catch { state = getInitialState(); await fs.writeFile(stateFile, JSON.stringify(state, null, 2)); }
    } else { await fs.writeFile(stateFile, JSON.stringify(state, null, 2)); }
    const command = args[0]?.toLowerCase() || '';
    if (state.status !== 'idle' && Date.now() - (state.lastTime || 0) > 600000) {
      const initialState = getInitialState();
      for (const key in initialState) {
        state[key] = initialState[key];
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
    if (!command || command === 'menu') {
      let attachment;
      try {
          if (!await fs.pathExists(menuImgPath)) {
              const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
              await fs.writeFile(menuImgPath, response.data);
          }
          attachment = fs.createReadStream(menuImgPath);
      } catch (e) {}
      if (command === 'menu') {
          await message.reply(formatMessage(
            `📜 Menu Uchiha Storm v20.0 :\n\n` +
            `🔹 ${prefix}uchiha-storm start : Lancer un 1v1\n` +
            `🔹 ${prefix}uchiha-storm start ia [easy/normal/hard] : Combat vs IA\n` +
            `🔹 ${prefix}uchiha-storm tournament create : Créer tournoi\n` +
            `🔹 ${prefix}uchiha-storm stop : Arrêter\n` +
            `🔹 ${prefix}uchiha-storm stats : Voir statistiques\n`
          ));
      } else {
          await message.reply(formatMessage(`Bienvenue à Uchiha Storm v20.0, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu" pour les commandes.`));
          if (attachment) await message.reply({ attachment });
      }
      return;
    }
    if (command === 'stop') {
      if (state.status !== 'idle') {
        await message.reply(formatMessage(`Partie arrêtée par ${senderName} !`));
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await fs.unlink(stateFile).catch(() => {});
      } else {
        await message.reply(formatMessage("Aucune partie en cours."));
      }
      return;
    }
    if (command === 'start') {
      state = getInitialState();
      state.players.player1 = { uid: senderID, name: senderName };
      const mentions = event.mentions || {};
      if (Object.keys(mentions).includes(BOT_UID) || args[1] === 'ia') {
          const difficulty = args[2]?.toLowerCase() || 'normal';
          state.players.player2 = { uid: 'IA', name: 'IA Adversaire' };
          state.status = 'choosing_char1';
          state.isAI = true;
          state.aiDifficulty = difficulty;
          state.lastTime = Date.now();
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          const vsImg = await drawVS(state.players.player1, { uid: BOT_UID, name: 'IA' }, usersData);
          await message.reply(formatMessage(`🤖 MODE IA (${difficulty}) ACTIVÉ !\n\n${senderName}, choisissez votre personnage.`));
          if(vsImg) await message.reply({ attachment: vsImg });
      } else {
        state.status = 'waiting_opponent';
        state.isAI = false;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `⚔️ COMBAT LANCÉ par ${senderName} !\n\n` +
          `Pour rejoindre :\n- Envoyez "join"\n- Ou taggez un adversaire\n- Ou envoyez son ID`
        ));
      }
      return;
    }
    if (command === 'tournament') {
      if (args[1] === 'create') {
        const res = await apiPost(`${API_URL}/tournament/create`, { creatorUID: senderID, creatorName: senderName }, { 'x-api-key': API_KEY });
        await message.reply(formatMessage(`Tournoi créé !\n\nID: ${res.data.tournamentID}\nRejoindre: ${prefix}${this.config.name} tournament join ${res.data.tournamentID}`));
        return;
      }
      if (args[1] === 'join' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/join`, { tournamentID: args[2], uid: senderID, name: senderName }, { 'x-api-key': API_KEY });
          const players = res.data.players;
          if (players.length > 16) return message.reply(formatMessage("Tournoi complet (16 max)."));
          const partImg = await drawParticipants(players, usersData);
          await message.reply(formatMessage(`Vous avez rejoint !\n\nParticipants (${players.length})`));
          await message.reply({ attachment: partImg });
        } catch (err) {
          await message.reply(formatMessage(`Erreur inscription`));
        }
        return;
      }
      if (args[1] === 'start' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/start`, { tournamentID: args[2] }, { 'x-api-key': API_KEY });
          const brackets = res.data.brackets;
          const round = res.data.round || 1;
          state = getInitialState();
          state.tournament = { active: true, id: args[2], matches: brackets, round: round, readyStatus: {} };
          state.status = 'tournament_lobby';
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          const bracketImage = await drawBracket(brackets, round, usersData);
          let msg = `🏆 Tournoi démarré (Round ${round}) !\n\n`;
          brackets.forEach(m => msg += `${m.player1.name} vs ${m.player2 ? m.player2.name : 'BYE'}\n`);
          msg += `\nLes combattants, envoyez "prêt" !`;
          await message.reply(formatMessage(msg));
          await message.reply({ attachment: bracketImage });
        } catch (err) {
            if (err.response?.data?.error === 'Nombre impair') return message.reply(formatMessage(`Impossible : Nombre impair.`));
            await message.reply(formatMessage(`Erreur démarrage tournoi.`));
        }
        return;
      }
    }
    if (command === 'stats') {
      try {
        const res = await axios.get(`${API_URL}/stats/${senderID}`, { headers: { 'x-api-key': API_KEY } });
        const stats = res.data;
        await message.reply(formatMessage(
          `📊 Statistiques de ${senderName}:\n\n` +
          `🏆 Victoires: ${stats.victories || 0}\n` +
          `💀 Défaites: ${stats.defeats || 0}\n` +
          `📈 Ratio: ${stats.ratio || '0%'}\n` +
          `👤 Personnages utilisés: ${stats.characters?.join(', ') || 'Aucun'}`
        ));
      } catch {
        await message.reply(formatMessage("Impossible de récupérer les statistiques."));
      }
      return;
    }
    await message.reply(formatMessage(`Commande inconnue. Tapez "${prefix}${this.config.name} menu"`));
  },

  onChat: async function ({ event, api, message, usersData }) {
    if (!event.body) return;
    const { body, senderID, threadID, mentions } = event;
    const txt = body.toLowerCase().trim();
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    if (!await fs.pathExists(stateFile)) return;
    let state = JSON.parse(await fs.readFile(stateFile));
    if (state.status === 'idle') return;
    if ((state.status === 'combat' || state.status === 'riposte') && (state.stats?.player1?.pv <= 0 || state.stats?.player2?.pv <= 0)) {
        const initialState = getInitialState();
        for (const key in initialState) {
            state[key] = initialState[key];
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }
    const playerUIDs = [state.players.player1?.uid, state.players.player2?.uid].filter(Boolean);
    if (playerUIDs.includes(senderID) && Date.now() - (state.lastTime || 0) > 600000) {
      const winner = state.currentTurn === 'player1' ? (state.players.player2?.name || 'Joueur 2') : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne par forfait !`));
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await processTournamentMatchEnd(state, winner, winnerUID, threadID, message, usersData, stateFile);
          return;
      }
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      return;
    }
    if (['stop', 'forfait', 'fin'].includes(txt) && playerUIDs.includes(senderID)) {
      let userData = await usersData.get(senderID) || {};
      const winner = senderID === state.players.player1.uid ? (state.players.player2?.name || 'Joueur 2') : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`${userData.name || 'Joueur'} abandonne !\n\n${winner} gagne par forfait !`));
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await processTournamentMatchEnd(state, winner, winnerUID, threadID, message, usersData, stateFile);
          return;
      }
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      return;
    }
    if (state.tournament?.active && txt === 'prêt') {
        if (state.status !== 'tournament_lobby' && state.status !== 'idle') {
            return message.reply(formatMessage(`Un combat est déjà en cours !\nAttendez la fin du match actuel.`));
        }
        const matches = state.tournament.matches;
        const matchIndex = matches.findIndex(m => (m.player1.uid === senderID || m.player2.uid === senderID) && !m.winner);
        if (matchIndex === -1) return;
        state.tournament.readyStatus[senderID] = true;
        const match = matches[matchIndex];
        const p1Ready = state.tournament.readyStatus[match.player1.uid];
        const p2Ready = state.tournament.readyStatus[match.player2.uid];
        if (p1Ready && p2Ready) {
            await message.reply(formatMessage(`🔴 MATCH LANCÉ : ${match.player1.name} VS ${match.player2.name} !\n\n${match.player1.name}, choisissez votre personnage.`));
            const tBackup = { ...state.tournament };
            state = getInitialState();
            state.tournament = tBackup;
            state.tournament.currentMatchID = match.matchID;
            state.players.player1 = match.player1;
            state.players.player2 = match.player2;
            state.status = 'choosing_char1';
            state.currentTurn = 'player1';
            state.lastTime = Date.now();
        } else {
            await message.reply(formatMessage(`${userData.name || 'Joueur'} est prêt ! En attente de l'adversaire...`));
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }
    if (txt === 'join' && state.status === 'waiting_opponent') {
      if (state.players.player1.uid === senderID) return message.reply(formatMessage("Vous ne pouvez pas jouer contre vous-même."));
      let userData = await usersData.get(senderID) || {};
      state.players.player2 = { uid: senderID, name: userData.name || 'Utilisateur' };
      state.status = 'choosing_char1';
      state.lastTime = Date.now();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const vsImg = await drawVS(state.players.player1, state.players.player2, usersData);
      await message.reply(formatMessage(`${userData.name} a rejoint !\n\nJoueur 1 (${state.players.player1.name}), choisissez un personnage.`));
      await message.reply({ attachment: vsImg });
      return;
    }
    if (!playerUIDs.includes(senderID)) return;
    if (state.status === 'waiting_opponent' && senderID === state.players.player1.uid) {
      let opponentUID = Object.keys(mentions)[0] || txt.replace(/\D/g, '');
      if (!opponentUID || opponentUID === senderID) return message.reply(formatMessage(`UID invalide.`));
      try {
        const oppData = await usersData.get(opponentUID) || {};
        state.players.player2 = { uid: opponentUID, name: oppData.name || 'Utilisateur' };
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        const vsImg = await drawVS(state.players.player1, state.players.player2, usersData);
        await message.reply(formatMessage(`Combat : Joueur 1 (${state.players.player1.name}) vs Joueur 2 (${state.players.player2.name})\n\nJoueur 1, choisissez un personnage.`));
        await message.reply({ attachment: vsImg });
      } catch {
        await message.reply(formatMessage('Utilisateur non trouvé.'));
      }
      return;
    }
    if ((state.status === 'choosing_char1' && senderID === state.players.player1.uid) || (state.status === 'choosing_char2' && senderID === state.players.player2.uid)) {
      if (state.processing) return;
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const char = body.trim();
      const isP1 = senderID === state.players.player1.uid;
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = safeParseJSON(res.data);
        if (!charData || charData.valid === false) {
          state.processing = false;
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          const suggestion = charData?.suggested_char ? `Suggestion: ${charData.suggested_char}` : 'Aucune';
          return message.reply(formatMessage(`❌ Personnage invalide\n\n${suggestion}`));
        }
        if (isP1) {
            state.characters.player1 = char;
            state.charInfo.player1 = charData;
            state.status = 'choosing_char2';
        } else {
            state.characters.player2 = char;
            state.charInfo.player2 = charData;
        }
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        if (isP1 && state.isAI) {
          await generateIaCharacter(state, stateFile, message, state.players.player1.name, threadID);
        } else if (isP1) {
          await message.reply(formatMessage(`✅ Joueur 1 a choisi ${char} !\n\nJoueur 2 (${state.players.player2.name}), choisissez votre personnage.`));
        } else {
          await initCombat(state, stateFile, message, threadID, usersData);
        }
      } catch (err) {
        await message.reply(formatMessage(`⚠️ ERREUR TECHNIQUE ⚠️\nDétail: ${err.message}\nLa partie a été réinitialisée.`));
        const initialState = getInitialState();
        for (const key in initialState) {
            state[key] = initialState[key];
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      } finally {
        if (state.status !== 'idle') {
            state.processing = false;
            await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      }
      return;
    }
    const isPlayerTurn = state.status === 'combat' || state.status === 'riposte';
    const isCorrectPlayer = state.currentTurn && state.players[state.currentTurn]?.uid === senderID;
    if (isPlayerTurn && isCorrectPlayer) {
      if (state.processing) return;
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      try {
        await handleAction(event, api, state, stateFile, state.status === 'riposte', threadID, message, usersData);
      } catch(err) {
         await message.reply(formatMessage(`Erreur pendant le combat: ${err.message}`));
         state.processing = false;
         await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      } finally {
        if (state.status !== 'idle') {
            state.processing = false;
            await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      }
      return;
    }
  }
};

async function generateIaCharacter(state, stateFile, message, senderName, threadID) {
  try {
    const res = await apiPost(`${API_URL}/character`, {
      character: 'generate_for_ai',
      opponent_char: state.characters.player1,
      opponent_power_level: state.charInfo.player1?.power_level,
      aiDifficulty: state.aiDifficulty
    }, { 'x-api-key': API_KEY });
    let charData = safeParseJSON(res.data);
    const suggestedName = charData.suggested_char;
    const resStats = await apiPost(`${API_URL}/character`, { character: suggestedName }, { 'x-api-key': API_KEY });
    let aiCharStats = safeParseJSON(resStats.data);
    if (!aiCharStats || !aiCharStats.valid) {
        throw new Error("L'IA n'a pas pu valider son propre personnage.");
    }
    state.characters.player2 = suggestedName;
    state.charInfo.player2 = aiCharStats;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`🤖 L'IA a choisi ${suggestedName} !\n\nLe combat commence ! À vous, ${senderName}.`));
    await initCombat(state, stateFile, message, threadID, {});
  } catch (error) {
    state.status = 'idle';
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`❌ Erreur génération IA: ${error.message}`));
  }
}

async function initCombat(state, stateFile, message, threadID, usersData) {
  state.stats = {
      player1: initStats(state.charInfo.player1),
      player2: initStats(state.charInfo.player2)
  };
  try {
    const preRes = await apiPost(`${API_URL}/pre-combat-check`, {
      char1: state.characters.player1,
      char2: state.characters.player2,
      info1: state.charInfo.player1,
      info2: state.charInfo.player2,
      player1_name: state.players.player1.name,
      player2_name: state.players.player2.name
    }, { 'x-api-key': API_KEY });
    const preResult = safeParseJSON(preRes.data) || { decision: "normal_combat" };
    if (preResult.decision === "instant_one_shot") {
      const winnerName = state.players[preResult.winner].name;
      await message.reply(formatMessage(`${preResult.description}\n\n⚡ ONE-SHOT INSTANTANÉ !\n${winnerName} anéantit l'adversaire !\nRaison : ${preResult.one_shot_reason}`));
      const winnerCard = await drawWinnerCard(winnerName, state.players[preResult.winner].uid, usersData);
      await message.reply({ attachment: winnerCard });
      await saveCombat(state, winnerName, threadID);
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      return;
    }
  } catch (err) {}
  await message.reply(formatMessage(`⚔️ Le combat commence ! À vous, ${state.players.player1.name}.`));
  state.status = 'combat';
  state.currentTurn = 'player1';
  state.lastTime = Date.now();
  state.processing = false;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function iaTurn(api, state, stateFile, threadID, message, usersData) {
  state.processing = true;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  try {
    const res = await apiPost(`${API_URL}/combat`, {
      player1: state.players.player1,
      player2: state.players.player2,
      char1: state.characters.player1,
      char2: state.characters.player2,
      stats: state.stats,
      history: state.history,
      action: 'IA_TURN',
      isRiposte: state.status === 'riposte',
      privilegedUID: state.players.player1.uid,
      isAI: true,
      currentTurn: 'player2',
      aiDifficulty: state.aiDifficulty
    }, { 'x-api-key': API_KEY });
    const result = safeParseJSON(res.data);
    if (!result || result.decision === 'ignore_message') {
        state.processing = false;
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }
    await processTurnResult(state, result, message, stateFile, usersData, threadID, 'player2');
  } catch (error) {
    state.processing = false;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`❌ Erreur IA: ${error.message}`));
  }
}

function initStats(info = {}) {
  const safeInfo = info || {};
  return { pv: 100, endurance: 100, ...(safeInfo.resource_name && safeInfo.resource_name !== 'none' ? { [safeInfo.resource_name]: 100 } : {}) };
}

async function handleAction(event, api, state, stateFile, isRiposte, threadID, message, usersData) {
  if (state.stats.player1.pv <= 0 || state.stats.player2.pv <= 0) {
    return;
  }
  const { body, senderID } = event;
  const action = body.trim();
  let res;
  try {
      res = await apiPost(`${API_URL}/combat`, {
        player1: state.players.player1,
        player2: state.players.player2,
        char1: state.characters.player1,
        char2: state.characters.player2,
        stats: state.stats,
        history: state.history,
        action,
        isRiposte,
        privilegedUID: senderID,
        isAI: state.isAI,
        currentTurn: state.currentTurn,
        aiDifficulty: state.aiDifficulty,
        uniqueRequestID: Date.now() + Math.random()
      }, { 'x-api-key': API_KEY });
  } catch (err) {
      throw new Error("Impossible de joindre l'arbitre (API).");
  }
  const result = safeParseJSON(res.data);
  if (!result || result.decision === 'ignore_message') {
      state.processing = false;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await message.reply(formatMessage("⚠️ L'arbitre n'a pas compris. Réessayez."));
      return;
  }
  await processTurnResult(state, result, message, stateFile, usersData, threadID, state.currentTurn);
  if (state.status !== 'idle' && state.currentTurn === 'player2' && state.isAI) {
      await iaTurn(api, state, stateFile, threadID, message, usersData);
  }
}

async function processTurnResult(state, result, message, stateFile, usersData, threadID, activePlayerKey) {
    state.stats = result.stats || state.stats;
    const actorName = state.players[activePlayerKey].name;
    state.history.push({ action: activePlayerKey === 'player2' && state.isAI ? "Action IA" : `Action ${actorName}`, result });
    const display = `${result.description}\n\n` +
                    `❤️ J1: ${state.stats.player1.pv}PV | 💙 J2: ${state.stats.player2.pv}PV\n` +
                    `🎯 Effets: ${result.impact?.effets_speciaux?.join(', ') || 'Aucun'}`;
    await message.reply(formatMessage(display));
    if (result.decision === 'one_shot' || result.decision === 'combat_termine' || state.stats.player1.pv <= 0 || state.stats.player2.pv <= 0) {
        let winnerKey = null;
        if (result.winner && result.winner !== 'draw') {
            const wName = result.winner.toLowerCase();
            const p1Name = state.players.player1.name.toLowerCase();
            const p1Char = state.characters.player1.toLowerCase();
            if (wName.includes(p1Name) || wName.includes(p1Char) || wName === 'player1') {
                winnerKey = 'player1';
            } else {
                winnerKey = 'player2';
            }
        } else {
            if (state.stats.player1.pv > state.stats.player2.pv) winnerKey = 'player1';
            else if (state.stats.player2.pv > state.stats.player1.pv) winnerKey = 'player2';
            else winnerKey = 'draw';
        }
        if (winnerKey && winnerKey !== 'draw') {
            const winnerName = state.players[winnerKey].name;
            const winnerUID = state.players[winnerKey].uid;
            await message.reply(formatMessage(`🏆 VICTOIRE : ${winnerName.toUpperCase()} !`));
            const winImg = await drawWinnerCard(winnerName, winnerUID, usersData);
            if(winImg) await message.reply({ attachment: winImg });
        } else {
            await message.reply(formatMessage(`💀 DOUBLE K.O !`));
        }
        await apiPost(`${API_URL}/save-combat`, { }, { 'x-api-key': API_KEY });
        if (state.tournament?.active && state.tournament?.currentMatchID) {
            const wUID = winnerKey ? state.players[winnerKey].uid : null;
            await processTournamentMatchEnd(state, state.players[winnerKey]?.name, wUID, threadID, message, usersData, stateFile);
            return;
        }
        const initialState = getInitialState();
        for (const key in initialState) {
            state[key] = initialState[key];
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }
    const nextPlayerKey = activePlayerKey === 'player1' ? 'player2' : 'player1';
    state.currentTurn = nextPlayerKey;
    state.status = result.decision === 'attente_riposte' ? 'riposte' : 'combat';
    if (!state.isAI || nextPlayerKey === 'player1') {
        if (state.status === 'riposte') {
            await message.reply(formatMessage(`⚠️ ${state.players[nextPlayerKey].name}, RIPOSTE REQUISE !`));
        } else {
            await message.reply(formatMessage(`👉 À vous, ${state.players[nextPlayerKey].name} !`));
        }
    }
    state.lastTime = Date.now();
    state.processing = false;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function processTournamentMatchEnd(state, winnerName, winnerUID, threadID, message, usersData, stateFile) {
  try {
    const upRes = await apiPost(`${API_URL}/tournament/update`, {
      tournamentID: state.tournament.id,
      matchID: state.tournament.currentMatchID,
      winnerUID: winnerUID
    }, { 'x-api-key': API_KEY });
    const nextTournamentState = {
      active: true,
      id: state.tournament.id,
      matches: upRes.data.brackets,
      round: upRes.data.round,
      readyStatus: {},
      currentMatchID: null
    };
    if (upRes.data.status === 'finished') {
      await message.reply(formatMessage(`🎉 LE TOURNOI EST TERMINÉ !\nLE GRAND VAINQUEUR EST : ${winnerName.toUpperCase()} !`));
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } else if (upRes.data.status === 'next_round') {
      const bracketImage = await drawBracket(nextTournamentState.matches, nextTournamentState.round, usersData);
      await message.reply(formatMessage(`✅ TOUS LES MATCHS SONT FINIS !\nLancement du ROUND ${nextTournamentState.round} !\n\nSurvivants, envoyez "prêt" !`));
      await message.reply({ attachment: bracketImage });
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      state.tournament = nextTournamentState;
      state.status = 'tournament_lobby';
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } else {
      const bracketImage = await drawBracket(upRes.data.brackets, state.tournament.round, usersData);
      await message.reply(formatMessage(`Match terminé ! En attente des autres combats...`));
      await message.reply({ attachment: bracketImage });
      const initialState = getInitialState();
      for (const key in initialState) {
          state[key] = initialState[key];
      }
      state.tournament = nextTournamentState;
      state.tournament.readyStatus = state.tournament.readyStatus || {};
      state.status = 'tournament_lobby';
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
  } catch (error) {
    console.error("Erreur tournament update:", error.message);
  }
}

async function saveCombat(state, winner, threadID) {
  try {
    await apiPost(`${API_URL}/save-combat`, {
      threadID,
      players: state.players,
      characters: state.characters,
      charInfo: state.charInfo,
      history: state.history,
      winner,
      status: 'finished'
    }, { 'x-api-key': API_KEY });
  } catch (err) {}
}