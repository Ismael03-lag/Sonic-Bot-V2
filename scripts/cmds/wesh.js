const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_KEY = 'uchiha-perdu-storm';
const API_URL = 'https://combat-storm.vercel.app';
const IMAGE_URL = 'https://i.ibb.co/S4r4xpF0/file-0000000084f86243b7f327827bf6e062.png';

const formatMessage = msg => `≪━─━─━─◈─━─━─━≫\n${msg}\n≪━─━─━─◈─━─━─━≫`;

function extractJSON(input) {
  if (!input) return null;
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  try { return JSON.parse(str); } catch {}
  const match = str.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

async function apiPost(url, data, headers = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(url, data, { headers, timeout: 60000 });
      if (res.status === 200) return res;
      throw new Error(`Status: ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '5.1.0',
    author: 'L’Uchiha Perdu',
    countDown: 5,
    role: 0,
    shortDescription: { en: 'Mini-jeu de combat textuel multivers' },
    description: { en: 'Jeu de combat avec personnages de divers univers, géré par IA via API.' },
    category: 'Game',
    guide: { en: '{pn} menu' }
  },

  onStart: async function ({ api, event, message, usersData, args }) {
    const { threadID, senderID } = event;
    const userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const prefix = global.GoatBot?.config?.prefix || '!';
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    let state = { status: 'idle', players: {}, lastTime: Date.now(), history: [], characters: {}, charInfo: {}, stats: {}, processing: false, isAI: false, aiDifficulty: 'normal', storyMode: false };
    await fs.ensureDir(stateDir);

    if (await fs.pathExists(stateFile)) {
      try { state = JSON.parse(await fs.readFile(stateFile)); }
      catch { state = { status: 'idle', lastTime: Date.now(), history: [], players: {}, characters: {}, charInfo: {}, stats: {}, processing: false, isAI: false, aiDifficulty: 'normal', storyMode: false }; }
    } else await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

    if (state.status !== 'idle' && Date.now() - state.lastTime > 120000) {
      const winner = state.currentTurn === 'player1' ? state.players.player2?.name || 'Joueur 2' : state.players.player1?.name || 'Joueur 1';
      await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne !`));
      await saveCombat(state, winner, threadID);
      state.status = 'idle';
      await fs.unlink(stateFile);
      return;
    }

    const command = args[0]?.toLowerCase() || '';

    if (!command) {
      try {
        const img = await axios.get(IMAGE_URL, { responseType: 'stream' });
        await message.reply({ body: formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`), attachment: img.data });
      } catch { await message.reply(formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`)); }
      return;
    }

    if (command === 'menu') {
      await message.reply(formatMessage(
        `Menu Uchiha Storm :\n\n` +
        `start : Combat humain\n` +
        `start with AI : Vs IA\n` +
        `start story : Mode histoire\n` +
        `tournament create : Créer\n` +
        `tournament join [ID]\n` +
        `tournament start [ID]\n` +
        `leaderboard\n` +
        `stats [UID]\n` +
        `stop`
      ));
      return;
    }

    if (command === 'stop') {
      if (state.status !== 'idle') {
        await message.reply(formatMessage(`Partie arrêtée par ${senderName} !`));
        state.status = 'idle';
        await fs.unlink(stateFile);
      } else await message.reply(formatMessage("Aucune partie."));
      return;
    }

    if (command === 'leaderboard') {
      try {
        const res = await axios.get(`${API_URL}/leaderboard`, { headers: { 'x-api-key': API_KEY } });
        const top = res.data.map((p, i) => `${i+1}. **${p._id}** : ${p.count} victoires`).join('\n') || 'Aucun';
        await message.reply(formatMessage(`Classement :\n\n${top}`));
      } catch { await message.reply(formatMessage(`Erreur classement`)); }
      return;
    }

    if (command === 'stats' && args[1]) {
      const uid = args[1].replace(/\D/g, '');
      try {
        const res = await axios.get(`${API_URL}/stats/${uid}`, { headers: { 'x-api-key': API_KEY } });
        const { victories, defeats, ratio, characters } = res.data;
        await message.reply(formatMessage(
          `Stats <@${uid}> :\n\n` +
          `Victoires : ${victories}\n` +
          `Défaites : ${defeats}\n` +
          `Ratio : ${ratio}\n` +
          `Persos : ${characters.join(', ') || 'Aucun'}`
        ));
      } catch { await message.reply(formatMessage(`Aucune stat`)); }
      return;
    }

    if (command === 'tournament') {
      if (args[1] === 'create') {
        try {
          const res = await apiPost(`${API_URL}/tournament/create`, { creatorUID: senderID, creatorName: senderName }, { 'x-api-key': API_KEY });
          const { tournamentID } = res.data;
          await message.reply(formatMessage(
            `Tournoi créé !\n\nID: ${tournamentID}\n` +
            `Rejoindre: ${prefix}${this.config.name} tournament join ${tournamentID}\n` +
            `Démarrer: ${prefix}${this.config.name} tournament start ${tournamentID}`
          ));
        } catch { await message.reply(formatMessage(`Erreur création`)); }
        return;
      }
      if (args[1] === 'join' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/join`, { tournamentID: args[2], uid: senderID, name: senderName }, { 'x-api-key': API_KEY });
          const players = res.data.players?.map(p => p.name).join(', ') || 'Aucun';
          await message.reply(formatMessage(`Inscrit !\n\nJoueurs: ${players}`));
        } catch { await message.reply(formatMessage(`Erreur inscription`)); }
        return;
      }
      if (args[1] === 'start' && args[2]) {
        try {
          const res = await apiPost(`${API_URL}/tournament/start`, { tournamentID: args[2] }, { 'x-api-key': API_KEY });
          await message.reply(formatMessage(`Tournoi démarré !\n\nBrackets: ${JSON.stringify(res.data.brackets)}`));
        } catch { await message.reply(formatMessage(`Erreur démarrage`)); }
        return;
      }
      await message.reply(formatMessage(`Commande invalide.`));
      return;
    }

    if (command === 'start') {
      if (args[1]?.toLowerCase() === 'with' && args[2]?.toLowerCase() === 'ai') {
        state.players = { player1: { uid: senderID, name: senderName }, player2: { uid: 'AI', name: 'IA' } };
        state.isAI = true;
        state.status = 'choosing_difficulty';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `${senderName} vs IA !\n\nDifficulté :\n• easy\n• normal\n• hard`
        ));
        return;
      }
      if (args[1]?.toLowerCase() === 'story') {
        state.players = { player1: { uid: senderID, name: senderName }, player2: { uid: 'STORY', name: 'Narrateur' } };
        state.isAI = true;
        state.storyMode = true;
        state.status = 'story_intro';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Mode Histoire !\n\nChoisissez votre personnage.`));
        return;
      }
      state.players = { player1: { uid: senderID, name: senderName } };
      state.status = 'waiting_opponent';
      state.lastTime = Date.now();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await message.reply(formatMessage(
        `${senderName} lance un combat !\n\nRejoignez avec "join" ou taggez.`
      ));
      return;
    }

    await message.reply(formatMessage(`Commande inconnue.`));
  },

  onChat: async function ({ event, api, message, usersData }) {
    if (!event.body) return;
    const { body, senderID, threadID, mentions } = event;
    const userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    if (!await fs.pathExists(stateFile)) return;

    let state;
    try { state = JSON.parse(await fs.readFile(stateFile)); } catch { return; }
    if (state.status === 'idle') return;
    if (state.processing) return message.reply(formatMessage(`Traitement en cours.`));
    state.processing = true;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

    try {
      if (Date.now() - state.lastTime > 120000) {
        const winner = state.currentTurn === 'player1' ? state.players.player2?.name || 'Joueur 2' : state.players.player1?.name || 'Joueur 1';
        await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne !`));
        await saveCombat(state, winner, threadID);
        state.status = 'idle';
        await fs.unlink(stateFile);
        return;
      }

      if (['stop', 'forfait', 'fin'].includes(body.toLowerCase())) {
        const winner = senderID === state.players.player1.uid ? state.players.player2?.name || 'Joueur 2' : state.players.player1?.name || 'Joueur 1';
        await message.reply(formatMessage(`${senderName} abandonne !\n\n${winner} gagne !`));
        await saveCombat(state, winner, threadID);
        state.status = 'idle';
        await fs.unlink(stateFile);
        return;
      }

      if (body.toLowerCase() === 'join' && state.status === 'waiting_opponent') {
        if (state.players.player1.uid === senderID) return message.reply(formatMessage("Pas contre vous-même."));
        state.players.player2 = { uid: senderID, name: senderName };
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`${senderName} a rejoint !\n\nJoueur 1, choisissez.`));
        return;
      }

      if (state.status === 'waiting_opponent' && senderID === state.players.player1.uid) {
        const opponentUID = Object.keys(mentions)[0] || body.trim().replace(/\D/g, '');
        if (!opponentUID || opponentUID === senderID) return message.reply(formatMessage(`UID invalide.`));
        const oppData = await usersData.get(opponentUID) || {};
        state.players.player2 = { uid: opponentUID, name: oppData.name || 'Utilisateur' };
        state.status = 'choosing_char1';
        state.currentTurn = 'player1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Combat : ${state.players.player1.name} vs ${state.players.player2.name}\n\nJoueur 1, choisissez.`));
        return;
      }

      if (state.status === 'choosing_difficulty' && senderID === state.players.player1.uid) {
        const diff = body.trim().toLowerCase();
        if (!['easy', 'normal', 'hard'].includes(diff)) return message.reply(formatMessage(`Difficulté invalide.`));
        state.aiDifficulty = diff;
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Difficulté : **${diff.toUpperCase()}**\n\nChoisissez votre personnage.`));
        return;
      }

      if (state.status === 'story_intro' && senderID === state.players.player1.uid) {
        const char = body.trim();
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        const charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) return message.reply(formatMessage(`Personnage invalide.`));
        state.characters.player1 = char;
        state.charInfo.player1 = charData;
        state.status = 'story_combat';
        state.currentTurn = 'player1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Vous êtes **${char}**.\n\nUn ennemi apparaît !\n\nÀ vous !`));
        return;
      }

      if (state.status === 'choosing_char1' && senderID === state.players.player1.uid) {
        const char = body.trim();
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        const charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) return message.reply(formatMessage(`Personnage invalide.`));
        state.characters.player1 = char;
        state.charInfo.player1 = charData;
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        if (state.isAI && !state.storyMode) await generateAICharacter(state, stateFile, message, threadID);
        else if (state.storyMode) {
          state.status = 'story_combat';
          state.currentTurn = 'player1';
          await message.reply(formatMessage(`Vous êtes **${char}**.\n\nEnnemi en vue !\n\nÀ vous !`));
        } else {
          state.status = 'choosing_char2';
          await message.reply(formatMessage(`Joueur 1 : ${char} !\n\nJoueur 2, choisissez.`));
        }
        return;
      }

      if (state.status === 'choosing_char2' && senderID === state.players.player2.uid) {
        const char = body.trim();
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        const charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) return message.reply(formatMessage(`Personnage invalide.`));
        state.characters.player2 = char;
        state.charInfo.player2 = charData;
        state.stats = { player1: initStats(state.charInfo.player1), player2: initStats(state.charInfo.player2) };
        const pl1 = state.charInfo.player1.power_level || 1;
        const pl2 = state.charInfo.player2.power_level || 1;
        if (Math.max(pl1 / pl2, pl2 / pl1) > 5) {
          const winner = pl1 > pl2 ? 'player1' : 'player2';
          const winnerName = state.players[winner].name;
          await message.reply(formatMessage(`Écart >5x !\n${winnerName} gagne !`));
          await saveCombat(state, winnerName, threadID);
          state.status = 'idle';
          await fs.unlink(stateFile);
          return;
        }
        state.status = 'combat';
        state.currentTurn = 'player1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Combat commence !\n\nJoueur 1, à vous !`));
        return;
      }

      const isPlayerTurn = ['combat', 'riposte', 'story_combat'].includes(state.status);
      const isCorrectPlayer = state.currentTurn && state.players[state.currentTurn]?.uid === senderID;

      if (isPlayerTurn && !isCorrectPlayer && !state.isAI) return message.reply(formatMessage(`Pas votre tour !`));

      if (isPlayerTurn && (isCorrectPlayer || (state.isAI && state.currentTurn === 'player2'))) {
        const action = state.isAI && state.currentTurn === 'player2' ? 'IA_TURN' : body.trim();
        const isRiposte = state.status === 'riposte';
        await handleAction(event, api, state, stateFile, isRiposte, threadID, message, usersData, action);
        return;
      }
    } finally {
      state.processing = false;
      if (state.status !== 'idle') await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }
  }
};

async function generateAICharacter(state, stateFile, message, threadID) {
  try {
    const res = await apiPost(`${API_URL}/character`, {
      character: 'generate_for_ai',
      opponent_char: state.characters.player1,
      opponent_power_level: state.charInfo.player1.power_level
    }, { 'x-api-key': API_KEY });
    const data = res.data?.valid && res.data.suggested_char ? res.data : { valid: true, suggested_char: 'Guerrier Mystérieux', power_level: state.charInfo.player1.power_level };
    state.characters.player2 = data.suggested_char;
    state.charInfo.player2 = data;
    await message.reply(formatMessage(`L'IA choisit **${state.characters.player2}** !`));
    state.stats = { player1: initStats(state.charInfo.player1), player2: initStats(state.charInfo.player2) };
    const pl1 = state.charInfo.player1.power_level || 1;
    const pl2 = state.charInfo.player2.power_level || 1;
    if (Math.max(pl1 / pl2, pl2 / pl1) > 5) {
      const winner = pl1 > pl2 ? 'player1' : 'player2';
      const winnerName = state.players[winner].name;
      await message.reply(formatMessage(`Écart >5x !\n${winnerName} gagne !`));
      await saveCombat(state, winnerName, threadID);
      state.status = 'idle';
      await fs.unlink(stateFile);
      return;
    }
    state.status = 'combat';
    state.currentTurn = 'player1';
    state.lastTime = Date.now();
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    await message.reply(formatMessage(`Combat commence !\n\nJoueur 1, à vous !`));
  } catch {
    state.status = 'idle';
    await fs.unlink(stateFile);
    await message.reply(formatMessage(`Erreur IA. Partie annulée.`));
  }
}

function initStats(info = {}) {
  return { pv: 100, endurance: 100, ...(info.resource_name && info.resource_name !== 'none' ? { [info.resource_name]: 100 } : {}) };
}

async function handleAction(event, api, state, stateFile, isRiposte, threadID, message, usersData, action) {
  const { senderID } = event;
  let res;
  try {
    res = await apiPost(`${API_URL}/combat`, {
      player1: state.players.player1,
      player2: state.players.player2,
      char1: state.characters.player1,
      char2: state.characters.player2,
      stats: state.stats,
      history: state.history.slice(-50),
      action,
      isRiposte,
      privilegedUID: senderID,
      isAI: state.isAI,
      currentTurn: state.currentTurn,
      aiDifficulty: state.aiDifficulty,
      storyMode: state.storyMode
    }, { 'x-api-key': API_KEY });
  } catch {
    state.status = 'idle';
    await fs.unlink(stateFile);
    await message.reply(formatMessage(`Erreur API. Partie annulée.`));
    return;
  }

  const result = res?.data;
  if (!result || result.decision === 'ignore_message') return;

  state.stats = result.stats || state.stats;
  state.history.push({ action: isRiposte ? `Riposte: ${action}` : action, result });

  const p1 = await usersData.get(state.players.player1.uid) || {};
  const p2 = await usersData.get(state.players.player2.uid) || {};
  const p1Name = p1.name || 'Joueur 1';
  const p2Name = p2.name || 'Joueur 2';

  const pv1 = state.stats.player1?.pv ?? 100;
  const pv2 = state.stats.player2?.pv ?? 100;
  const effects = result.impact?.effets_speciaux?.join(', ') || 'Aucun';
  const actions = result.possible_actions?.join(', ') || 'Aucune';

  let display = state.storyMode 
    ? result.description 
    : `${result.description}\n\nPV :\n- ${p1Name}: ${pv1}\n- ${p2Name}: ${pv2}\n\nEffets: ${effects}\nActions: ${actions}`;

  if (result.taunt && state.isAI && state.currentTurn === 'player2') {
    display = `${result.description}\n\n**${state.characters.player2}** : *“${result.taunt}”*\n\nPV :\n- ${p1Name}: ${pv1}\n- ${p2Name}: ${pv2}`;
  }

  await message.reply(formatMessage(display));

  if (result.decision === 'combat_termine') {
    const winner = pv1 > 0 ? p1Name : p2Name;
    await message.reply(formatMessage(`Combat terminé !\n\n${winner} gagne !`));
    await saveCombat(state, winner, threadID);
    state.status = 'idle';
    await fs.unlink(stateFile);
    return;
  }

  if (result.decision === 'attente_riposte') {
    state.status = state.storyMode ? 'story_combat' : 'riposte';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = await usersData.get(state.players[state.currentTurn].uid) || {};
    await message.reply(formatMessage(`${next.name || 'Utilisateur'}, ripostez !\n\nOptions: ${result.possible_actions.join(', ')}`));
  } else {
    state.status = state.storyMode ? 'story_combat' : 'combat';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = await usersData.get(state.players[state.currentTurn].uid) || {};
    await message.reply(formatMessage(`${next.name || 'Utilisateur'}, à vous !`));
  }

  state.lastTime = Date.now();
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
  } catch {}
}