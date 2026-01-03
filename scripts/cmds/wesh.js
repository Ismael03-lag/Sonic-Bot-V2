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


function getFilePath(threadID) {
    return path.join(__dirname, 'cache', `uchiha_storm_state_${threadID}.json`);
}

async function loadState(threadID) {
    const file = getFilePath(threadID);
    if (!await fs.pathExists(file)) return null;
    try {
        return JSON.parse(await fs.readFile(file));
    } catch (e) { return null; }
}

async function saveState(threadID, state) {
    const file = getFilePath(threadID);
    try {
        await fs.ensureDir(path.dirname(file));
        await fs.writeFile(file, JSON.stringify(state, null, 2));
    } catch (e) { console.error("Save Error:", e.message); }
}

async function deleteState(threadID) {
    const file = getFilePath(threadID);
    try { await fs.unlink(file); } catch (e) {}
}

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
    tournament: { active: false, id: null, matches: [], readyStatus: {}, currentMatchID: null, round: 1 }
  };
}

function safeParseJSON(input) {
  if (typeof input === 'object' && input !== null) return input;
  if (!input) return null;
  let str = input.toString().trim();
  try { return JSON.parse(str); } 
  catch (e) {
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
        return await Canvas.loadImage(url);
    } catch { return null; }
}

async function drawVS(p1, p2, usersData) {
    const width = 800;
    const height = 400;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#200122');
    grd.addColorStop(1, '#6f0000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    ctx.font = '100px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText("VS", width / 2, height / 2 + 35);
    const img1 = await getAvatar(usersData, p1.uid);
    if (img1) {
        ctx.save(); ctx.beginPath(); ctx.arc(150, 200, 100, 0, Math.PI * 2);
        ctx.lineWidth = 5; ctx.strokeStyle = '#00ccff'; ctx.stroke();
        ctx.clip(); ctx.drawImage(img1, 50, 100, 200, 200); ctx.restore();
    }
    const img2 = await getAvatar(usersData, p2.uid);
    if (img2) {
        ctx.save(); ctx.beginPath(); ctx.arc(650, 200, 100, 0, Math.PI * 2);
        ctx.lineWidth = 5; ctx.strokeStyle = '#ff3300'; ctx.stroke();
        ctx.clip(); ctx.drawImage(img2, 550, 100, 200, 200); ctx.restore();
    }
    ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText(p1.name.substring(0, 12), 150, 350);
    ctx.fillText(p2.name.substring(0, 12), 650, 350);
    const tmp = path.join(__dirname, 'cache', `vs_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawWinnerCard(winnerName, winnerUID, usersData) {
    const width = 1000;
    const height = 500;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#1a1a1a'); grd.addColorStop(0.5, '#000000'); grd.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#FFD700'; ctx.beginPath();
    ctx.arc(width / 2, height / 2, 250, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, width - 20, height - 20);
    ctx.font = 'bold 80px Arial'; ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
    ctx.fillText("VICTOIRE", width / 2, 100); 
    if (winnerUID && winnerUID !== 'IA' && !winnerUID.includes('IA')) {
        try {
            const avatarUrl = await usersData.getAvatarUrl(winnerUID);
            const avatar = await Canvas.loadImage(avatarUrl);
            ctx.save(); ctx.beginPath(); ctx.arc(width / 2, height / 2, 110, 0, Math.PI * 2); 
            ctx.fillStyle = '#FFD700'; ctx.fill();
            ctx.beginPath(); ctx.arc(width / 2, height / 2, 105, 0, Math.PI * 2);
            ctx.clip(); ctx.drawImage(avatar, width / 2 - 105, height / 2 - 105, 210, 210); ctx.restore();
        } catch (e) {}
    } else {
        ctx.fillStyle = '#FF0000'; ctx.font = 'bold 100px Arial'; ctx.fillText("🤖", width / 2, height / 2 + 30);
    }
    ctx.font = 'bold 50px Arial'; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.fillText(winnerName.toUpperCase(), width / 2, 430);
    const tmpPath = path.join(__dirname, 'cache', `winner_${Date.now()}.png`);
    await fs.writeFile(tmpPath, canvas.toBuffer());
    return fs.createReadStream(tmpPath);
}

async function drawParticipants(players, usersData) {
    const cols = 4;
    const rows = Math.ceil(players.length / cols);
    const width = 800;
    const height = 100 + (rows * 180);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`PARTICIPANTS (${players.length}/16)`, width / 2, 60);
    let x = 100, y = 180;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const img = await getAvatar(usersData, p.uid);
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fillStyle = '#333'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        if (img) { ctx.clip(); ctx.drawImage(img, x-60, y-60, 120, 120); }
        ctx.restore();
        ctx.font = '20px Arial'; ctx.fillStyle = '#fff';
        ctx.fillText(p.name.substring(0, 10), x, y + 90);
        x += 200;
        if ((i + 1) % cols === 0) { x = 100; y += 180; }
    }
    const tmp = path.join(__dirname, 'cache', `part_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawBracket(matches, round, usersData) {
    const matchWidth = 350;
    const matchHeight = 100;
    const gapY = 40;
    const groupGapY = 80;
    const totalPairs = Math.ceil(matches.length / 2);
    const height = Math.max(600, (matches.length * matchHeight) + (matches.length * gapY) + (totalPairs * groupGapY) + 200);
    const width = 1000;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, '#141E30'); grd.addColorStop(1, '#243B55');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, width, height);
    ctx.font = "bold 60px Arial"; ctx.fillStyle = '#FFD700'; ctx.textAlign = "center";
    ctx.fillText(`BRACKET - ROUND ${round}`, width / 2, 80);
    let currentY = 150;
    for (let i = 0; i < matches.length; i += 2) {
        const m1 = matches[i];
        const m2 = matches[i+1];
        await drawMatchBox(ctx, m1, 50, currentY, matchWidth, matchHeight, usersData);
        if (m2) await drawMatchBox(ctx, m2, 50, currentY + matchHeight + gapY, matchWidth, matchHeight, usersData);
        currentY += (matchHeight * 2) + gapY + groupGapY;
    }
    const tmp = path.join(__dirname, 'cache', `tree_${Date.now()}.png`);
    await fs.writeFile(tmp, canvas.toBuffer());
    return fs.createReadStream(tmp);
}

async function drawMatchBox(ctx, match, x, y, w, h, usersData) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = match.winner ? '#FFD700' : '#FFF'; ctx.lineWidth = match.winner ? 3 : 1;
    ctx.strokeRect(x, y, w, h);
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left'; ctx.fillStyle = '#FFF';
    ctx.fillText(match.player1.name.substring(0,15), x + 60, y + 35);
    if (match.player2) ctx.fillText(match.player2.name.substring(0,15), x + 60, y + 85);
    else ctx.fillText("BYE", x + 60, y + 85);
}


module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '20.0.0',
    author: 'L\'Uchiha Perdu',
    countDown: 5,
    role: 0,
    shortDescription: { en: 'Jeu de combat' },
    description: { en: 'Jeu de combat géré par IA.' },
    category: 'Game',
    guide: { en: '{pn} menu' }
  },

  onStart: async function ({ api, event, message, usersData, args }) {
    const { threadID, senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || '!';
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const menuImgPath = path.join(__dirname, 'cache', 'menu_uchiha.png');
    await fs.ensureDir(path.join(__dirname, 'cache'));
   
    let state = await loadState(threadID);
    if (!state) {
        state = getInitialState();
        await saveState(threadID, state);
    }

    const command = args[0]?.toLowerCase() || '';

    if (state.status !== 'idle' && Date.now() - (state.lastTime || 0) > 600000) {
      state = getInitialState();
      await saveState(threadID, state);
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
            `📜 Menu Uchiha Storm :\n\n` +
            `🔹 ${prefix}uchiha-storm start : Lancer 1v1\n` +
            `🔹 ${prefix}uchiha-storm start ia : Vs IA\n` +
            `🔹 ${prefix}uchiha-storm tournament create : Créer tournoi\n` +
            `🔹 ${prefix}uchiha-storm stop : Arrêter\n`
          ));
      } else {
          await message.reply(formatMessage(`Bienvenue, ${senderName} !\nTapez "${prefix}${this.config.name} menu"`));
          if (attachment) await message.reply({ attachment });
      }
      return;
    }

    // STOP
    if (command === 'stop') {
        await deleteState(threadID);
        await message.reply(formatMessage("Partie arrêtée."));
        return;
    }

    if (command === 'start') {
      state = getInitialState(); 
      state.players.player1 = { uid: senderID, name: senderName };
      
      const mentions = event.mentions || {};
      if (Object.keys(mentions).includes(BOT_UID) || args[1] === 'ia') {
          const difficulty = args[2]?.toLowerCase() || 'normal';
          state.players.player2 = { uid: 'IA', name: 'IA' };
          state.status = 'choosing_char1';
          state.isAI = true;
          state.aiDifficulty = difficulty;
          state.lastTime = Date.now();
          await saveState(threadID, state);
          const vsImg = await drawVS(state.players.player1, { uid: 'IA', name: 'IA' }, usersData);
          await message.reply(formatMessage(`🤖 MODE IA (${difficulty}) !\n${senderName}, choisissez votre personnage.`));
          if(vsImg) await message.reply({ attachment: vsImg });
      } else {
        state.status = 'waiting_opponent';
        state.lastTime = Date.now();
        await saveState(threadID, state);
        await message.reply(formatMessage(`⚔️ COMBAT LANCÉ !\nEnvoyez "join" pour rejoindre !`));
      }
      return;
    }

    if (command === 'tournament') {
      if (args[1] === 'create') {
        try {
            const res = await apiPost(`${API_URL}/tournament/create`, { creatorUID: senderID, creatorName: senderName }, { 'x-api-key': API_KEY });
            await message.reply(formatMessage(`Tournoi créé !\nID: ${res.data.tournamentID}\nRejoindre: ${prefix}uchiha-storm tournament join ${res.data.tournamentID}`));
        } catch (e) { message.reply("Erreur API Tournoi."); }
      }
      else if (args[1] === 'join' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/join`, { tournamentID: args[2], uid: senderID, name: senderName }, { 'x-api-key': API_KEY });
          const partImg = await drawParticipants(res.data.players, usersData);
          await message.reply(formatMessage(`Rejoint ! (${res.data.players.length} joueurs)`));
          await message.reply({ attachment: partImg });
        } catch (err) { await message.reply(formatMessage(`Erreur inscription (Tournoi plein ou fini).`)); }
      }
      else if (args[1] === 'start' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/start`, { tournamentID: args[2] }, { 'x-api-key': API_KEY });
          state = getInitialState();
          state.tournament = { active: true, id: args[2], matches: res.data.brackets, round: res.data.round, readyStatus: {} };
          state.status = 'tournament_lobby';
          await saveState(threadID, state);
          const bracketImage = await drawBracket(res.data.brackets, res.data.round, usersData);
          await message.reply(formatMessage(`🏆 Tournoi lancé !\nCombattants, envoyez "prêt" !`));
          await message.reply({ attachment: bracketImage });
        } catch (err) { await message.reply(formatMessage(`Erreur lancement (Nombre impair ?).`)); }
      }
      return;
    }
  },

  onChat: async function ({ event, api, message, usersData }) {
    if (!event.body) return;
    const { body, senderID, threadID } = event;
    const txt = body.toLowerCase().trim();
    
    let state = await loadState(threadID);
    if (!state || state.status === 'idle') return;

    if (Date.now() - (state.lastTime || 0) > 600000) {
        await deleteState(threadID);
        await message.reply(formatMessage("⏳ Temps écoulé. Partie annulée."));
        return;
    }

    if (['stop', 'forfait', 'fin', 'quitter'].includes(txt)) {
        await deleteState(threadID);
        await message.reply(formatMessage("Abandon détecté. Partie terminée."));
        return;
    }

    if (txt === 'join' && state.status === 'waiting_opponent') {
        if (state.players.player1.uid === senderID) return;
        const userData = await usersData.get(senderID);
        state.players.player2 = { uid: senderID, name: userData.name };
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await saveState(threadID, state);
        const vsImg = await drawVS(state.players.player1, state.players.player2, usersData);
        await message.reply(formatMessage(`${userData.name} rejoint !\n${state.players.player1.name}, quel personnage ?`));
        if(vsImg) await message.reply({ attachment: vsImg });
        return;
    }


    if (state.status === 'tournament_lobby' && txt === 'prêt' && state.tournament.active) {
        const matches = state.tournament.matches;
        const myMatch = matches.find(m => !m.winner && (m.player1.uid === senderID || m.player2.uid === senderID));
        if (!myMatch) return;

        state.tournament.readyStatus = state.tournament.readyStatus || {};
        state.tournament.readyStatus[senderID] = true;
        
        if (state.tournament.readyStatus[myMatch.player1.uid] && state.tournament.readyStatus[myMatch.player2.uid]) {
            state.tournament.currentMatchID = myMatch.matchID;
            state.players.player1 = myMatch.player1;
            state.players.player2 = myMatch.player2;
            state.status = 'choosing_char1';
            state.currentTurn = 'player1';
            await message.reply(formatMessage(`🔴 MATCH : ${myMatch.player1.name} VS ${myMatch.player2.name} !\n${myMatch.player1.name}, choix du perso !`));
        } else {
            await message.reply(formatMessage("Vous êtes prêt ! En attente de l'adversaire..."));
        }
        await saveState(threadID, state);
        return;
    }

    if ((state.status === 'combat' || state.status === 'riposte') && state.isAI && state.currentTurn === 'player2') {
        if (state.processing) return;
        state.processing = true;
        await saveState(threadID, state);
        await iaTurn(api, state, threadID, message, usersData);
        return;
    }

    const isPlayerTurn = state.status === 'combat' || state.status === 'riposte';
    const isCorrectPlayer = state.currentTurn && state.players[state.currentTurn]?.uid === senderID;

    if ((state.status === 'choosing_char1' && senderID === state.players.player1.uid) || (state.status === 'choosing_char2' && senderID === state.players.player2.uid)) {
        if (state.processing) return;
        state.processing = true;
        await saveState(threadID, state);

        const charName = body.trim();
        const isP1 = senderID === state.players.player1.uid;

        try {
            const res = await apiPost(`${API_URL}/character`, { character: charName }, { 'x-api-key': API_KEY });
            const charData = safeParseJSON(res.data);

            if (!charData || !charData.valid) {
                state.processing = false;
                await saveState(threadID, state);
                return message.reply(formatMessage(`❌ Personnage invalide.`));
            }

            if (isP1) {
                state.characters.player1 = charName;
                state.charInfo.player1 = charData;
                state.status = 'choosing_char2';
                state.lastTime = Date.now();
                await saveState(threadID, state);

                if (state.isAI) {
                    await generateIaCharacter(state, message, state.players.player1.name, threadID);
                } else {
                    await message.reply(formatMessage(`✅ ${charName} OK !\nAu J2 !`));
                }
            } else {
                state.characters.player2 = charName;
                state.charInfo.player2 = charData;
                await initCombat(state, message, threadID, usersData);
            }
        } catch (e) {
            state.processing = false;
            await saveState(threadID, state);
            console.error(e);
            await message.reply("Erreur API (Personnage).");
        }
        return;
    }

    // ACTIONS JOUEURS
    if (isPlayerTurn && isCorrectPlayer) {
        if (state.processing) return;
        state.processing = true;
        await saveState(threadID, state);

        try {
            await handleAction(event, api, state, threadID, message, usersData);
            
            let newState = await loadState(threadID);
            if (newState && newState.status !== 'idle' && newState.currentTurn === 'player2' && newState.isAI) {
                 await iaTurn(api, newState, threadID, message, usersData);
            }
        } catch (e) {
         
            console.error(e);
            let rescueState = await loadState(threadID);
            if (rescueState) {
                rescueState.processing = false;
                await saveState(threadID, rescueState);
            }
        }
    }
  }
};

async function generateIaCharacter(state, message, senderName, threadID) {
  try {
    const res = await apiPost(`${API_URL}/character`, { character: 'generate_for_ai', opponent_char: state.characters.player1, opponent_power_level: state.charInfo.player1?.power_level, aiDifficulty: state.aiDifficulty }, { 'x-api-key': API_KEY });
    let charData = safeParseJSON(res.data);
    const suggestedName = charData.suggested_char;
    const resStats = await apiPost(`${API_URL}/character`, { character: suggestedName }, { 'x-api-key': API_KEY });
    let aiStats = safeParseJSON(resStats.data);
    
    state.characters.player2 = suggestedName;
    state.charInfo.player2 = aiStats;
    
    await saveState(threadID, state);
    await message.reply(formatMessage(`🤖 L'IA choisit : ${suggestedName} !`));
    await initCombat(state, message, threadID, {});
  } catch (error) {
    await deleteState(threadID);
    await message.reply(formatMessage(`Erreur IA. Reset.`));
  }
}

async function initCombat(state, message, threadID, usersData) {
  state.stats = { player1: { pv: 100, endurance: 100 }, player2: { pv: 100, endurance: 100 } };
 
  try { await apiPost(`${API_URL}/pre-combat-check`, { char1: state.characters.player1, char2: state.characters.player2, info1: state.charInfo.player1, info2: state.charInfo.player2 }, { 'x-api-key': API_KEY }); } catch (e) {}

  await message.reply(formatMessage(`🔔 DÉBUT DU COMBAT !\n${state.characters.player1} VS ${state.characters.player2}\nÀ vous, ${state.players.player1.name} !`));
  
  state.status = 'combat';
  state.currentTurn = 'player1';
  state.processing = false;
  await saveState(threadID, state);
}

async function iaTurn(api, state, threadID, message, usersData) {
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
        isAI: true, 
        currentTurn: 'player2', 
        aiDifficulty: state.aiDifficulty 
    }, { 'x-api-key': API_KEY });
    
    const result = safeParseJSON(res.data);
    if (!result || result.decision === 'ignore_message') {
        state.processing = false;
        await saveState(threadID, state);
        return;
    }
    await processTurnResult(state, result, message, usersData, threadID, 'player2');
  } catch (error) {
    state.processing = false;
    await saveState(threadID, state);
  }
}

async function handleAction(event, api, state, threadID, message, usersData) {
  const action = event.body.trim();
  const res = await apiPost(`${API_URL}/combat`, { 
      player1: state.players.player1, 
      player2: state.players.player2, 
      char1: state.characters.player1, 
      char2: state.characters.player2, 
      stats: state.stats, 
      history: state.history, 
      action: action, 
      isRiposte: state.status === 'riposte', 
      isAI: state.isAI, 
      currentTurn: state.currentTurn, 
      aiDifficulty: state.aiDifficulty 
  }, { 'x-api-key': API_KEY });

  const result = safeParseJSON(res.data);
  if (!result || result.decision === 'ignore_message') {
      await message.reply(formatMessage("Action ignorée (incohérente)."));
      state.processing = false;
      await saveState(threadID, state);
      return; 
  }
  await processTurnResult(state, result, message, usersData, threadID, state.currentTurn);
}

async function processTurnResult(state, result, message, usersData, threadID, activePlayerKey) {
    state.stats = result.stats || state.stats;
    const actorName = state.players[activePlayerKey].name;
    
    state.history.push({ 
        action: `Action ${actorName}`, 
        result 
    });

    const display = `${result.description}\n\n❤️ J1: ${state.stats.player1.pv}PV | 💙 J2: ${state.stats.player2.pv}PV`;
    await message.reply(formatMessage(display));

    if (result.decision === 'one_shot' || result.decision === 'combat_termine' || state.stats.player1.pv <= 0 || state.stats.player2.pv <= 0) {
        
        let winnerKey = null;
        if (result.winner && result.winner !== 'draw') {
            const w = result.winner.toLowerCase();
            const p1 = state.players.player1.name.toLowerCase();
            if (w.includes(p1) || w === 'player1') winnerKey = 'player1';
            else winnerKey = 'player2';
        } else {
            winnerKey = state.stats.player1.pv > state.stats.player2.pv ? 'player1' : 'player2';
        }

        const wName = state.players[winnerKey].name;
        const wUID = state.players[winnerKey].uid;

        await message.reply(formatMessage(`🏆 VICTOIRE : ${wName.toUpperCase()} !`));
        const winImg = await drawWinnerCard(wName, wUID, usersData);
        if(winImg) await message.reply({ attachment: winImg });

        await apiPost(`${API_URL}/save-combat`, { /* data */ }, { 'x-api-key': API_KEY });

        if (state.tournament?.active) {
             await processTournamentMatchEnd(state, wName, wUID, threadID, message, usersData);
             return;
        }

        await deleteState(threadID);
        return;
    }

    const nextPlayerKey = activePlayerKey === 'player1' ? 'player2' : 'player1';
    state.currentTurn = nextPlayerKey;
    state.status = result.decision === 'attente_riposte' ? 'riposte' : 'combat';

    if (state.status === 'riposte') {
        await message.reply(formatMessage(`⚠️ ${state.players[nextPlayerKey].name}, RIPOSTE REQUISE !`));
    } else {
        await message.reply(formatMessage(`👉 À vous, ${state.players[nextPlayerKey].name} !`));
    }

    state.lastTime = Date.now();
    state.processing = false;
    await saveState(threadID, state);
}

async function processTournamentMatchEnd(state, winnerName, winnerUID, threadID, message, usersData) {
  try {
    const upRes = await apiPost(`${API_URL}/tournament/update`, { tournamentID: state.tournament.id, matchID: state.tournament.currentMatchID, winnerUID: winnerUID }, { 'x-api-key': API_KEY });
    
    state.tournament.matches = upRes.data.brackets;
    state.tournament.round = upRes.data.round;
    state.tournament.currentMatchID = null; 
    
    const status = upRes.data.status;

    if (status === 'finished') {
        await message.reply(formatMessage(`🎉 TOURNOI TERMINÉ !\nCHAMPION : ${winnerName} !`));
        await deleteState(threadID);
    } else if (status === 'next_round') {
        const img = await drawBracket(state.tournament.matches, state.tournament.round, usersData);
        await message.reply(formatMessage(`ROUND SUIVANT !\nEnvoyez "prêt" !`));
        await message.reply({ attachment: img });
        state.status = 'tournament_lobby';
        state.tournament.readyStatus = {};
        await saveState(threadID, state);
    } else {
        const img = await drawBracket(state.tournament.matches, state.tournament.round, usersData);
        await message.reply(formatMessage(`Match fini. En attente des autres...`));
        await message.reply({ attachment: img });
        state.status = 'tournament_lobby';
        await saveState(threadID, state);
    }
  } catch (error) {
    console.error(error);
    await deleteState(threadID); 
  }
}