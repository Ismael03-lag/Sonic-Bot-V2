const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const Canvas = require('canvas');

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
        currentMatchID: null
    }
  };
}

function extractJSON(input) {
  if (!input) return null;
  let str = typeof input === 'string' ? input : JSON.stringify(input);
  try {
    return JSON.parse(str);
  } catch {
    const match = str.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function apiPost(url, data, headers = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { headers, timeout: 60000 });
      if (response.status === 200) return response;
      throw new Error(`Status: ${response.status}`);
    } catch (err) {
      if (err.response && err.response.data) throw err;
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function drawWinnerCard(winnerName, winnerUID, usersData) {
    const width = 1000;
    const height = 500;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#1a1a1a');
    grd.addColorStop(0.5, '#000000');
    grd.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#FFD700'; 
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
    ctx.shadowBlur = 15;
    ctx.fillText("VICTOIRE", width / 2, 100);
    ctx.shadowBlur = 0;

    if (winnerUID && winnerUID !== 'IA') {
        try {
            const avatarUrl = await usersData.getAvatarUrl(winnerUID);
            const avatar = await Canvas.loadImage(avatarUrl);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 110, 0, Math.PI * 2); 
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, 105, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, width / 2 - 105, height / 2 - 105, 210, 210);
            ctx.restore();
        } catch (e) {}
    } else {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 100px Arial';
        ctx.fillText("🤖", width / 2, height / 2 + 30);
    }

    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(winnerName.toUpperCase(), width / 2, 430);

    const tmpPath = path.join(__dirname, 'cache', `winner_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(tmpPath, buffer);
    return fs.createReadStream(tmpPath);
}

function drawSquareRounded(ctx, x, y, w, h, r, color) {
    ctx.save();
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function checkGradientColor(ctx, color, x1, y1, x2, y2) {
    if (Array.isArray(color)) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        color.forEach((c, index) => {
            gradient.addColorStop(index / (color.length - 1), c);
        });
        return gradient;
    }
    return color;
}

async function drawBracket(matches, usersData) {
    const width = 1000;
    const matchHeight = 180;
    const headerHeight = 100;
    const height = headerHeight + (matches.length * (matchHeight + 20));
    
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainColor = "#2b2b2b";
    const subColor = ["#ff0000", "#990000"];
    const textColor = "#ffffff";

    ctx.fillStyle = mainColor;
    ctx.fillRect(0, 0, width, height);

    ctx.font = "bold 50px Arial"; 
    ctx.fillStyle = checkGradientColor(ctx, subColor, 0, 0, width, 0);
    ctx.textAlign = "center";
    ctx.fillText("TOURNOI - MATCHUPS", width / 2, 70);

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const y = headerHeight + (i * (matchHeight + 20));

        drawSquareRounded(ctx, 50, y, width - 100, matchHeight, 20, "rgba(255, 255, 255, 0.1)");

        const p1Name = match.player1.name;
        const p2Name = match.player2 ? match.player2.name : "???";

        try {
            const ava1 = await usersData.getAvatarUrl(match.player1.uid);
            const img1 = await Canvas.loadImage(ava1);
            ctx.save();
            ctx.beginPath();
            ctx.arc(130, y + matchHeight/2, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img1, 70, y + matchHeight/2 - 60, 120, 120);
            ctx.restore();
        } catch {}

        if (match.player2) {
            try {
                const ava2 = await usersData.getAvatarUrl(match.player2.uid);
                const img2 = await Canvas.loadImage(ava2);
                ctx.save();
                ctx.beginPath();
                ctx.arc(width - 130, y + matchHeight/2, 60, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img2, width - 190, y + matchHeight/2 - 60, 120, 120);
                ctx.restore();
            } catch {}
        }

        ctx.font = "bold 35px Arial";
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.fillText(p1Name, 210, y + matchHeight/2 + 10);

        ctx.textAlign = "right";
        ctx.fillText(p2Name, width - 210, y + matchHeight/2 + 10);

        ctx.font = "bold 60px Arial";
        ctx.fillStyle = "#ff4d4d";
        ctx.textAlign = "center";
        ctx.fillText("VS", width / 2, y + matchHeight/2 + 20);
    }

    const tmpPath = path.join(__dirname, 'cache', `bracket_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(tmpPath, buffer);
    return fs.createReadStream(tmpPath);
}

module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '8.0.0',
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
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const prefix = global.GoatBot?.config?.prefix || '!';
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    const menuImgPath = path.join(stateDir, 'menu_uchiha.png');
    
    let state = getInitialState();
    await fs.ensureDir(stateDir);

    if (await fs.pathExists(stateFile)) {
      try {
        state = JSON.parse(await fs.readFile(stateFile));
      } catch {
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      }
    } else {
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }

    const command = args[0]?.toLowerCase() || '';

    if (state.status !== 'idle' && Date.now() - (state.lastTime || 0) > 300000) {
      const winner = state.currentTurn === 'player1'
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé (5 min) !\n\n${winner} gagne par forfait !`));
      
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await apiPost(`${API_URL}/tournament/update`, { 
              tournamentID: state.tournament.id, 
              matchID: state.tournament.currentMatchID, 
              winnerUID: winnerUID 
          }, { 'x-api-key': API_KEY });
      }

      state = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      return;
    }

    if (!command || command === 'menu') {
      let attachment;
      if (await fs.pathExists(menuImgPath)) {
          attachment = fs.createReadStream(menuImgPath);
      } else {
          try {
              const response = await axios.get(IMAGE_URL, { responseType: 'arraybuffer' });
              await fs.writeFile(menuImgPath, response.data);
              attachment = fs.createReadStream(menuImgPath);
          } catch { attachment = null; }
      }

      await message.reply({
        body: formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`),
        attachment
      });
      return;
    }

    if (command === 'menu') {
      await message.reply(formatMessage(
        `Menu Uchiha Storm :\n\n` +
        `start : Lancer un combat\n` +
        `start ia [difficulty] : Combat contre IA (easy/normal/hard)\n` +
        `tournament create : Créer un tournoi\n` +
        `tournament join [ID] : Rejoindre\n` +
        `tournament start [ID] : Démarrer un tournoi\n` +
        `stop : Arrêter la partie`
      ));
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

      if (args[1] === 'ia') {
        const difficulty = args[2]?.toLowerCase() || 'normal';
        state.players.player2 = { uid: 'IA', name: 'IA Adversaire' };
        state.status = 'choosing_char1';
        state.isAI = true;
        state.aiDifficulty = difficulty;
        state.lastTime = Date.now();
        
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`${senderName} lance un combat contre l'IA (${difficulty}) !\n\nChoisissez votre personnage.`));
        return;
      } else {
        state.status = 'waiting_opponent';
        state.isAI = false;
        state.lastTime = Date.now();
        
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `${senderName} a lancé un combat !\n\n` +
          `Pour rejoindre :\n` +
          `- Envoyez "join"\n` +
          `- Ou taggez un adversaire\n` +
          `- Ou envoyez son ID`
        ));
        return;
      }
    }

    if (command === 'tournament') {
      if (args[1] === 'create') {
        try {
          const res = await apiPost(`${API_URL}/tournament/create`, { creatorUID: senderID, creatorName: senderName }, { 'x-api-key': API_KEY });
          const { tournamentID } = res.data;
          await message.reply(formatMessage(
            `Tournoi créé !\n\nID: ${tournamentID}\n` +
            `Rejoindre: ${prefix}${this.config.name} tournament join ${tournamentID}\n` +
            `Démarrer: ${prefix}${this.config.name} tournament start ${tournamentID}\n` +
            `Inscriptions ouvertes 5 min`
          ));
        } catch (err) {
          await message.reply(formatMessage(`Erreur création tournoi`));
        }
        return;
      }

      if (args[1] === 'join' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/join`, { tournamentID: args[2], uid: senderID, name: senderName }, { 'x-api-key': API_KEY });
          const players = res.data.players?.map(p => p.name).join(', ') || 'Aucun';
          await message.reply(formatMessage(`Vous avez rejoint !\n\nParticipants: ${players}`));
        } catch (err) {
          await message.reply(formatMessage(`Erreur inscription`));
        }
        return;
      }

      if (args[1] === 'start' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/start`, { tournamentID: args[2] }, { 'x-api-key': API_KEY });
          const brackets = res.data.brackets;

          state = getInitialState();
          state.tournament.active = true;
          state.tournament.id = args[2];
          state.tournament.matches = brackets;
          state.status = 'tournament_lobby';
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

          const bracketImage = await drawBracket(brackets, usersData);
          
          let msg = "🏆 LE TOURNOI COMMENCE !\n\n";
          brackets.forEach((m) => {
              msg += `➤ ${m.player1.name} VS ${m.player2.name}\n`;
          });
          msg += `\nLes combattants, envoyez "prêt" pour lancer votre match !`;

          await message.reply({ body: formatMessage(msg), attachment: bracketImage });

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error === 'Nombre impair') {
                return message.reply(formatMessage(`Impossible de démarrer : Nombre de joueurs impair (${err.response.data.currentCount}).\nIl faut un nombre pair.`));
            }
            await message.reply(formatMessage(`Erreur démarrage tournoi.`));
        }
        return;
      }
    }

    await message.reply(formatMessage(`Commande inconnue. Tapez "${prefix}${this.config.name} menu"`));
  },

  onChat: async function ({ event, api, message, usersData }) {
    if (!event.body) return;
    const { body, senderID, threadID, mentions } = event;
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    
    let state = getInitialState();

    if (!await fs.pathExists(stateFile)) return;
    try {
      state = JSON.parse(await fs.readFile(stateFile));
    } catch {
      return;
    }

    if (state.status === 'idle') return;

    if (Date.now() - (state.lastTime || 0) > 300000) {
      const winner = state.currentTurn === 'player1'
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé (5 min) !\n\n${winner} gagne par forfait !`));
      
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          await apiPost(`${API_URL}/tournament/update`, { 
              tournamentID: state.tournament.id, 
              matchID: state.tournament.currentMatchID, 
              winnerUID: winnerUID 
          }, { 'x-api-key': API_KEY });
      }

      state = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      return;
    }

    if (state.tournament?.active && body.toLowerCase().trim() === 'prêt') {
        const matches = state.tournament.matches;
        const matchIndex = matches.findIndex(m => m.player2 && (m.player1.uid === senderID || m.player2.uid === senderID) && !m.winner);
        
        if (matchIndex === -1) return; 

        state.tournament.readyStatus[senderID] = true;
        const match = matches[matchIndex];
        const p1Ready = state.tournament.readyStatus[match.player1.uid];
        const p2Ready = state.tournament.readyStatus[match.player2.uid];

        if (p1Ready && p2Ready) {
            await message.reply(formatMessage(`🔴 MATCH LANCÉ : ${match.player1.name} VS ${match.player2.name} !\n${match.player1.name}, choisissez votre personnage.`));
            
            const tournamentBackup = { ...state.tournament };
            state = getInitialState();
            state.tournament = tournamentBackup; 
            
            state.players.player1 = match.player1;
            state.players.player2 = match.player2;
            state.status = 'choosing_char1';
            state.currentTurn = 'player1';
            state.lastTime = Date.now();
            state.tournament.currentMatchID = match.matchID;
        } else {
             await message.reply(formatMessage(`${state.players[senderID]?.name || 'Un joueur'} est prêt ! En attente de l'adversaire...`));
        }
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        return;
    }

    if (['stop', 'forfait', 'fin'].includes(body.toLowerCase())) {
      const winner = senderID === state.players.player1.uid
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`${senderName} abandonne !\n\n${winner} gagne par forfait !`));
      
      if (state.tournament?.active && state.tournament?.currentMatchID) {
          const winnerUID = winner === state.players.player1.name ? state.players.player1.uid : state.players.player2.uid;
          const upRes = await apiPost(`${API_URL}/tournament/update`, { 
              tournamentID: state.tournament.id, 
              matchID: state.tournament.currentMatchID, 
              winnerUID: winnerUID 
          }, { 'x-api-key': API_KEY });
          
          if (upRes.data.status === 'finished') {
               await message.reply(formatMessage(`🎉 LE TOURNOI EST TERMINÉ !\nLE GRAND VAINQUEUR EST : ${winner.toUpperCase()} !`));
          } else {
               const bracketImage = await drawBracket(upRes.data.brackets, usersData);
               await message.reply({ body: formatMessage(`Match terminé ! Mise à jour du tournoi...`), attachment: bracketImage });
          }
      }

      state = getInitialState();
      if (state.tournament?.active) {
           const tBackup = state.tournament;
           state.tournament = tBackup;
      }
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      return;
    }

    if (body.toLowerCase() === 'join' && state.status === 'waiting_opponent') {
      if (state.players.player1.uid === senderID) {
        return message.reply(formatMessage("Vous ne pouvez pas jouer contre vous-même."));
      }
      userData = await usersData.get(senderID) || {};
      state.players.player2 = { uid: senderID, name: userData.name || 'Utilisateur' };
      state.status = 'choosing_char1';
      state.isAI = false;
      state.lastTime = Date.now();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await message.reply(formatMessage(
        `${userData.name || 'Utilisateur'} a rejoint !\n\n` +
        `Joueur 1 (${state.players.player1.name}), choisissez un personnage.`
      ));
      return;
    }

    const playerUIDs = [state.players.player1?.uid, state.players.player2?.uid].filter(Boolean);
    if (!playerUIDs.includes(senderID)) return;

    if (state.status === 'waiting_opponent' && senderID === state.players.player1.uid) {
      let opponentUID = Object.keys(mentions)[0] || body.trim().replace(/\D/g, '');
      if (!opponentUID || opponentUID === senderID) {
        return message.reply(formatMessage(`UID invalide. Réessayez.`));
      }
      try {
        const oppData = await usersData.get(opponentUID) || {};
        state.players.player2 = { uid: opponentUID, name: oppData.name || 'Utilisateur' };
        state.status = 'choosing_char1';
        state.isAI = false;
        state.currentTurn = 'player1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `Combat : Joueur 1 (${state.players.player1.name}) vs Joueur 2 (${state.players.player2.name})\n\n` +
          `Joueur 1, choisissez un personnage.`
        ));
      } catch {
        await message.reply(formatMessage('Utilisateur non trouvé.'));
      }
      return;
    }

    if (state.processing && (state.status === 'choosing_char1' || state.status === 'choosing_char2')) {
      return;
    }

    if (state.status === 'choosing_char1' && senderID === state.players.player1.uid) {
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const char = body.trim();
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) {
          return message.reply(formatMessage(`Personnage invalide, suggestion: ${charData.suggested_char || 'réessayez.'}`));
        }
        state.characters.player1 = char;
        state.charInfo.player1 = charData;
        state.status = 'choosing_char2';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        
        if (state.isAI) {
          await generateIaCharacter(state, stateFile, message, senderName, threadID);
        } else {
          await message.reply(formatMessage(
            `Joueur 1 a choisi ${char} !\n\n` +
            `Joueur 2 (${state.players.player2.name}), choisissez votre personnage.`
          ));
        }
      } catch (err) {
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur validation (API fail). Partie reset.`));
        await fs.unlink(stateFile).catch(() => {});
      } finally {
        if (state.status !== 'idle') {
            state.processing = false;
            await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      }
      return;
    }

    if (state.status === 'choosing_char2' && senderID === state.players.player2.uid && !state.isAI) {
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      const char = body.trim();
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) {
          return message.reply(formatMessage(`Personnage invalide, suggestion: ${charData.suggested_char || 'réessayez.'}`));
        }
        state.characters.player2 = char;
        state.charInfo.player2 = charData;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await initCombat(state, stateFile, message, threadID);
      } catch (err) {
        state = getInitialState();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur validation (API fail). Partie reset.`));
        await fs.unlink(stateFile).catch(() => {});
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

    if (isPlayerTurn && !isCorrectPlayer) {
      return message.reply(formatMessage(`Pas votre tour ! Attendez que ce soit à vous.`));
    }

    if (isPlayerTurn && isCorrectPlayer) {
      if (state.processing) {
        return message.reply(formatMessage(`Action en cours, attendez la fin.`));
      }
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      try {
        await handleAction(event, api, state, stateFile, state.status === 'riposte', threadID, message, usersData);
        if (state.status !== 'idle' && state.currentTurn === 'player2' && state.isAI) {
          await iaTurn(api, state, stateFile, threadID, message, usersData);
        }
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
  if (!state.isAI) return;
  try {
    const res = await apiPost(`${API_URL}/character`, { character: 'generate_for_ai', opponent_char: state.characters.player1, opponent_power_level: state.charInfo.player1.power_level, aiDifficulty: state.aiDifficulty }, { 'x-api-key': API_KEY });
    let charData = extractJSON(res.data) || res.data;
    if (!charData?.valid) throw new Error('IA char fail');
    state.characters.player2 = charData.suggested_char;
    state.charInfo.player2 = charData;
    state.lastTime = Date.now();
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`L'IA a choisi ${charData.suggested_char} !\n\nLe combat commence ! À vous, ${senderName}.`));
    await initCombat(state, stateFile, message, threadID);
  } catch {
    state.status = 'idle';
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`Erreur génération perso IA. Partie reset.`));
    await fs.unlink(stateFile).catch(() => {});
  }
}

async function initCombat(state, stateFile, message, threadID) {
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

    const preResult = extractJSON(preRes.data) || { decision: "normal_combat" };

    if (preResult.decision === "instant_one_shot") {
      const winnerKey = preResult.winner;
      const winnerName = state.players[winnerKey].name;
      const winnerChar = state.characters[winnerKey];
      const loserKey = winnerKey === 'player1' ? 'player2' : 'player1';
      const loserName = state.players[loserKey].name;
      const display = `${preResult.description || 'Analyse pré-combat...'}\n\nONE-SHOT INSTANTANÉ !\n${winnerName} (${winnerChar}) anéantit ${loserName} avant même le début !\nRaison : ${preResult.one_shot_reason || 'Écart cosmique !'}`;
      await message.reply(formatMessage(display));
      
      const winnerUID = winnerKey === 'player1' ? state.players.player1.uid : state.players.player2.uid;
      const winnerCard = await drawWinnerCard(winnerName, winnerUID, {}); 
      await message.reply({ attachment: winnerCard });
      
      await saveCombat(state, winnerName, threadID);
      
      const cleanState = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(cleanState, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      state.status = 'idle'; 
      return;
    }
  } catch (err) {
    console.error('Pré-combat check échoué:', err);
  }

  await message.reply(formatMessage(`Le combat commence ! À vous, ${state.players.player1.name}.`));

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
      isRiposte: false,
      privilegedUID: state.players.player1.uid,
      isAI: true,
      currentTurn: 'player2',
      aiDifficulty: state.aiDifficulty
    }, { 'x-api-key': API_KEY });
    const result = res.data;
    if (result.decision === 'ignore_message') return;
    state.stats = result.stats || state.stats;
    state.history.push({ action: `IA: ${result.taunt || 'Action IA'}`, result });
    const pv1 = state.stats.player1?.pv ?? 100;
    const pv2 = state.stats.player2?.pv ?? 100;
    const effects = result.impact?.effets_speciaux?.join(', ') || 'Aucun';
    const actions = result.possible_actions?.join(', ') || 'Aucune';
    const display = `${result.description}\n\n` +
      `PV restants :\n` +
      `- Joueur 1 (${state.players.player1.name}): ${pv1} PV\n` +
      `- IA: ${pv2} PV\n\n` +
      `Effets: ${effects}\n\n` +
      `Actions: ${actions}`;
    await message.reply(formatMessage(display));

    if (result.decision === 'one_shot' || result.decision === 'combat_termine') {
      const winner = result.decision === 'one_shot' ? (result.winner === 'player1' ? state.players.player1.name : 'IA') : (pv1 > 0 ? state.players.player1.name : 'IA');
      const winnerUID = result.decision === 'one_shot' ? (result.winner === 'player1' ? state.players.player1.uid : 'IA') : (pv1 > 0 ? state.players.player1.uid : 'IA');
      
      const extra = result.decision === 'one_shot' ? `\nONE-SHOT ! Raison: ${result.one_shot_reason || 'Puissance écrasante !'}` : '';
      await message.reply(formatMessage(`Combat terminé !${extra}`));
      
      const winnerCard = await drawWinnerCard(winner, winnerUID, usersData);
      await message.reply({ attachment: winnerCard });
      
      await saveCombat(state, winner, threadID);
      
      const cleanState = getInitialState();
      await fs.writeFile(stateFile, JSON.stringify(cleanState, null, 2));
      await fs.unlink(stateFile).catch(() => {});
      state.status = 'idle';
      return;
    }

    if (result.decision === 'attente_riposte') {
      state.status = 'riposte';
    } else {
      state.status = 'combat';
    }
    state.currentTurn = 'player1';
    await message.reply(formatMessage(`À vous maintenant !`));
  } finally {
    if (state.status !== 'idle') {
        state.processing = false;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
  }
}

function initStats(info = {}) {
  return {
    pv: 100,
    endurance: 100,
    ...(info.resource_name && info.resource_name !== 'none' ? { [info.resource_name]: 100 } : {})
  };
}

async function handleAction(event, api, state, stateFile, isRiposte, threadID, message, usersData) {
  const { body, senderID } = event;
  const action = body.trim();
  let retries = 3;
  let res;
  while (retries > 0) {
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
  aiDifficulty: state.aiDifficulty
}, { 'x-api-key': API_KEY });    
  break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        state.status = 'idle';
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur combat (API fail après retries). Partie reset.`));
        await fs.unlink(stateFile).catch(() => {});
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const result = res.data;
  if (result.decision === 'ignore_message') return;

  state.stats = result.stats || state.stats;
  state.history.push({ action: isRiposte ? `Riposte: ${action}` : action, result });

  const p1 = await usersData.get(state.players.player1.uid) || {};
  const p2 = state.players.player2.uid === 'IA' ? { name: 'IA Adversaire' } : await usersData.get(state.players.player2.uid) || {};
  const p1Name = p1.name || 'Joueur 1';
  const p2Name = p2.name || 'Joueur 2';

  const pv1 = state.stats.player1?.pv ?? 100;
  const pv2 = state.stats.player2?.pv ?? 100;
  const effects = result.impact?.effets_speciaux?.join(', ') || 'Aucun';
  const actions = result.possible_actions?.join(', ') || 'Aucune';

  const display = `${result.description}\n\n` +
    `PV restants :\n` +
    `- Joueur 1 (${p1Name}): ${pv1} PV\n` +
    `- ${state.isAI ? 'IA' : 'Joueur 2'} (${p2Name}): ${pv2} PV\n\n` +
    `Effets: ${effects}\n\n` +
    `Actions: ${actions}`;

  await message.reply(formatMessage(display));

  if (result.decision === 'one_shot' || result.decision === 'combat_termine') {
    const winnerName = result.decision === 'one_shot' ? (result.winner === 'player1' ? p1Name : p2Name) : (pv1 > 0 ? p1Name : p2Name);
    const winnerUID = result.decision === 'one_shot' ? (result.winner === 'player1' ? state.players.player1.uid : state.players.player2.uid) : (pv1 > 0 ? state.players.player1.uid : state.players.player2.uid);
    
    const extra = result.decision === 'one_shot' ? `\nONE-SHOT ! Raison: ${result.one_shot_reason || 'Puissance écrasante !'}` : '';
    await message.reply(formatMessage(`Combat terminé !${extra}`));
    
    const winnerCard = await drawWinnerCard(winnerName, winnerUID, usersData);
    await message.reply({ attachment: winnerCard });

    await saveCombat(state, winnerName, threadID);

    if (state.tournament?.active && state.tournament?.currentMatchID) {
        const upRes = await apiPost(`${API_URL}/tournament/update`, { 
            tournamentID: state.tournament.id, 
            matchID: state.tournament.currentMatchID, 
            winnerUID: winnerUID 
        }, { 'x-api-key': API_KEY });
        
        if (upRes.data.status === 'finished') {
             await message.reply(formatMessage(`🎉 LE TOURNOI EST TERMINÉ !\nLE GRAND VAINQUEUR EST : ${winnerName.toUpperCase()} !`));
        } else {
             const bracketImage = await drawBracket(upRes.data.brackets, usersData);
             await message.reply({ body: formatMessage(`Match terminé ! Mise à jour du tournoi...`), attachment: bracketImage });
        }
    }
    
    const cleanState = getInitialState();
    if (state.tournament?.active) {
         const tBackup = state.tournament;
         state.tournament = tBackup;
    }
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    if (!state.tournament?.active) {
        await fs.unlink(stateFile).catch(() => {});
    }
    state.status = 'idle';
    return;
  }

  if (result.decision === 'attente_riposte') {
    state.status = 'riposte';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = state.currentTurn === 'player1' ? p1 : p2;
    await message.reply(formatMessage(
      `${state.isAI && state.currentTurn === 'player2' ? 'IA' : `Joueur ${state.currentTurn === 'player1' ? '1' : '2'}`} (${next.name || 'Utilisateur'}), ripostez !\n\n` +
      `Options: ${result.possible_actions.join(', ')}`
    ));
  } else {
    state.status = 'combat';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = state.currentTurn === 'player1' ? p1 : p2;
    await message.reply(formatMessage(
      `${state.isAI && state.currentTurn === 'player2' ? 'Tour de l\'IA...' : `Joueur ${state.currentTurn === 'player1' ? '1' : '2'} (${next.name || 'Utilisateur'}), à vous !`}`
    ));
  }

  state.lastTime = Date.now();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
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
  } catch (err) {
    console.error('Erreur sauvegarde combat:', err);
  }
}
