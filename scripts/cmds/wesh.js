const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_KEY = 'uchiha-perdu-storm';
const API_URL = 'https://combat-storm.vercel.app';
const IMAGE_URL = 'https://i.ibb.co/S4r4xpF0/file-0000000084f86243b7f327827bf6e062.png';

const formatMessage = (msg) => `≪━─━─━─◈─━─━─━≫\n${msg}\n≪━─━─━─◈─━─━─━≫`;

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
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = {
  config: {
    name: 'uchiha-storm',
    version: '4.1.0',
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
    let userData = await usersData.get(senderID) || {};
    const senderName = userData.name || 'Utilisateur';
    const prefix = global.GoatBot?.config?.prefix || '!';
    const stateDir = path.join(__dirname, 'cache');
    const stateFile = path.join(stateDir, `uchiha_storm_state_${threadID}.json`);
    let state = { status: 'idle', players: {}, lastTime: Date.now(), history: [], characters: {}, charInfo: {}, stats: {}, processing: false, isAI: false, aiDifficulty: 'normal' };
    await fs.ensureDir(stateDir);

    if (await fs.pathExists(stateFile)) {
      try {
        state = JSON.parse(await fs.readFile(stateFile));
      } catch {
        state = { status: 'idle', lastTime: Date.now(), history: [], players: {}, characters: {}, charInfo: {}, stats: {}, processing: false, isAI: false, aiDifficulty: 'normal' };
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      }
    } else {
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    }

    const command = args[0]?.toLowerCase() || '';

    if (state.status !== 'idle' && Date.now() - (state.lastTime || 0) > 120000) {
      const winner = state.currentTurn === 'player1'
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne par forfait !`));
      await saveCombat(state, winner, threadID);
      await fs.unlink(stateFile);
      return;
    }

    if (!command) {
      try {
        const img = await axios.get(IMAGE_URL, { responseType: 'stream' });
        await message.reply({
          body: formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`),
          attachment: img.data
        });
      } catch {
        await message.reply(formatMessage(`Bienvenue à Uchiha Storm, ${senderName} !\n\nTapez "${prefix}${this.config.name} menu"`));
      }
      return;
    }

    if (command === 'menu') {
      await message.reply(formatMessage(
        `Menu Uchiha Storm :\n\n` +
        `start : Lancer un combat PvP\n` +
        `start ai [facile/normal/difficile] : Contre IA\n` +
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
        await fs.unlink(stateFile);
      } else {
        await message.reply(formatMessage("Aucune partie en cours."));
      }
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
          await message.reply(formatMessage(`Tournoi démarré !\n\nBrackets: ${JSON.stringify(res.data.brackets)}`));
        } catch (err) {
          await message.reply(formatMessage(`Erreur démarrage tournoi`));
        }
        return;
      }
    }

    if (command === 'start') {
      state.players = { player1: { uid: senderID, name: senderName } };
      if (args[1] === 'ai') {
        state.isAI = true;
        state.aiDifficulty = args[2]?.toLowerCase() || 'normal';
        if (!['facile', 'normal', 'difficile'].includes(state.aiDifficulty)) state.aiDifficulty = 'normal';
        state.players.player2 = { uid: 'AI', name: 'IA' };
        state.status = 'choosing_char1';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `${senderName} a lancé un combat contre l'IA (diff: ${state.aiDifficulty}) !\n\n` +
          `Choisissez un personnage.`
        ));
      } else {
        state.status = 'waiting_opponent';
        state.lastTime = Date.now();
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `${senderName} a lancé un combat !\n\n` +
          `Pour rejoindre :\n` +
          `- Envoyez "join"\n` +
          `- Ou taggez un adversaire\n` +
          `- Ou envoyez son ID`
        ));
      }
      return;
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
    let state = { status: 'idle', players: {}, lastTime: Date.now(), history: [], characters: {}, charInfo: {}, stats: {}, processing: false, isAI: false, aiDifficulty: 'normal' };

    if (!await fs.pathExists(stateFile)) return;
    try {
      state = JSON.parse(await fs.readFile(stateFile));
    } catch {
      return;
    }

    if (state.status === 'idle') return;

    if (Date.now() - (state.lastTime || 0) > 120000) {
      const winner = state.currentTurn === 'player1'
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`Temps écoulé !\n\n${winner} gagne par forfait !`));
      await saveCombat(state, winner, threadID);
      await fs.unlink(stateFile);
      return;
    }

    if (['stop', 'forfait', 'fin'].includes(body.toLowerCase())) {
      const winner = senderID === state.players.player1.uid
        ? (state.players.player2?.name || 'Joueur 2')
        : (state.players.player1?.name || 'Joueur 1');
      await message.reply(formatMessage(`${senderName} abandonne !\n\n${winner} gagne par forfait !`));
      await saveCombat(state, winner, threadID);
      await fs.unlink(stateFile);
      return;
    }

    if (body.toLowerCase() === 'join' && state.status === 'waiting_opponent') {
      if (state.players.player1.uid === senderID) {
        return message.reply(formatMessage("Vous ne pouvez pas jouer contre vous-même."));
      }
      userData = await usersData.get(senderID) || {};
      state.players.player2 = { uid: senderID, name: userData.name || 'Utilisateur' };
      state.status = 'choosing_char1';
      state.lastTime = Date.now();
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      await message.reply(formatMessage(
        `${userData.name || 'Utilisateur'} a rejoint !\n\n` +
        `Joueur 1 (${state.players.player1.name}), choisissez un personnage.`
      ));
      return;
    }

    const playerUIDs = [state.players.player1?.uid, state.players.player2?.uid].filter(Boolean);
    if (!playerUIDs.includes(senderID) && senderID !== 'AI') return;

    if (state.status === 'waiting_opponent' && senderID === state.players.player1.uid) {
      let opponentUID = Object.keys(mentions)[0] || body.trim().replace(/\D/g, '');
      if (!opponentUID || opponentUID === senderID) {
        return message.reply(formatMessage(`UID invalide. Réessayez.`));
      }
      try {
        const oppData = await usersData.get(opponentUID) || {};
        state.players.player2 = { uid: opponentUID, name: oppData.name || 'Utilisateur' };
        state.status = 'choosing_char1';
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

    if (state.status === 'choosing_char1' && senderID === state.players.player1.uid) {
      const char = body.trim();
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) {
          return message.reply(formatMessage(`Personnage invalide, réessayez.`));
        }
        state.characters.player1 = char;
        state.charInfo.player1 = charData;
        if (state.isAI) {
          const aiRes = await apiPost(`${API_URL}/character`, { character: 'generate_for_ai', opponent_char: state.characters.player1, opponent_power_level: state.charInfo.player1.power_level }, { 'x-api-key': API_KEY });
          let aiCharData = extractJSON(aiRes.data) || aiRes.data;
          if (!aiCharData?.valid) {
            return message.reply(formatMessage(`Erreur génération IA, réessayez.`));
          }
          state.characters.player2 = aiCharData.suggested_char || 'IA Générée';
          state.charInfo.player2 = aiCharData;
          state.stats = {
            player1: initStats(state.charInfo.player1),
            player2: initStats(state.charInfo.player2)
          };
          const pl1 = state.charInfo.player1.power_level || 1;
          const pl2 = state.charInfo.player2.power_level || 1;
          if (Math.max(pl1 / pl2, pl2 / pl1) > 5) {
            const winner = pl1 > pl2 ? 'player1' : 'player2';
            const winnerName = state.players[winner].name;
            await message.reply(formatMessage(
              `Écart trop grand (>5x) !\n${winnerName} (${state.characters[winner]}) gagne instantanément !\nCombat terminé !`
            ));
            await saveCombat(state, winnerName, threadID);
            await fs.unlink(stateFile);
            return;
          }
          state.status = 'combat';
          state.currentTurn = 'player1';
          state.lastTime = Date.now();
          state.processing = false;
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          await message.reply(formatMessage(
            `L'IA a choisi ${state.characters.player2} !\n\n` +
            `Le combat commence !\n\n` +
            `Joueur 1 (${state.players.player1.name}), à vous d'attaquer !`
          ));
        } else {
          state.status = 'choosing_char2';
          state.lastTime = Date.now();
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
          await message.reply(formatMessage(
            `Joueur 1 a choisi ${char} !\n\n` +
            `Joueur 2 (${state.players.player2.name}), choisissez votre personnage.`
          ));
        }
      } catch (err) {
        state.status = 'idle';
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur validation (API fail). Partie reset.`));
      }
      return;
    }

    if (state.status === 'choosing_char2' && senderID === state.players.player2.uid) {
      const char = body.trim();
      try {
        const res = await apiPost(`${API_URL}/character`, { character: char }, { 'x-api-key': API_KEY });
        let charData = extractJSON(res.data) || res.data;
        if (!charData?.valid) {
          return message.reply(formatMessage(`Personnage invalide, réessayez.`));
        }
        state.characters.player2 = char;
        state.charInfo.player2 = charData;
        state.stats = {
          player1: initStats(state.charInfo.player1),
          player2: initStats(state.charInfo.player2)
        };
        const pl1 = state.charInfo.player1.power_level || 1;
        const pl2 = state.charInfo.player2.power_level || 1;
        if (Math.max(pl1 / pl2, pl2 / pl1) > 5) {
          const winner = pl1 > pl2 ? 'player1' : 'player2';
          const winnerName = state.players[winner].name;
          await message.reply(formatMessage(
            `Écart trop grand (>5x) !\n${winnerName} (${state.characters[winner]}) gagne instantanément !\nCombat terminé !`
          ));
          await saveCombat(state, winnerName, threadID);
          await fs.unlink(stateFile);
          return;
        }
        state.status = 'combat';
        state.currentTurn = 'player1';
        state.lastTime = Date.now();
        state.processing = false;
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(
          `Le combat commence !\n\n` +
          `Joueur 1 (${state.players.player1.name}), à vous d'attaquer !`
        ));
      } catch (err) {
        state.status = 'idle';
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur validation (API fail). Partie reset.`));
      }
      return;
    }

    const isPlayerTurn = state.status === 'combat' || state.status === 'riposte';
    const isCorrectPlayer = state.currentTurn && state.players[state.currentTurn]?.uid === senderID;

    if (isPlayerTurn && !isCorrectPlayer && senderID !== 'AI') {
      return message.reply(formatMessage(`Pas votre tour ! Attendez que ce soit à vous.`));
    }

    if (isPlayerTurn && (isCorrectPlayer || senderID === 'AI')) {
      if (state.processing) {
        return message.reply(formatMessage(`Action en cours, attendez la fin.`));
      }
      state.processing = true;
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      try {
        await handleAction(event, api, state, stateFile, state.status === 'riposte', threadID, message, usersData);
      } finally {
        state.processing = false;
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      }
      return;
    }
  }
};

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
        aiDifficulty: state.aiDifficulty,
        storyMode: false
      }, { 'x-api-key': API_KEY });
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        state.status = 'idle';
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        await message.reply(formatMessage(`Erreur combat (API fail après retries). Partie reset.`));
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
  const p2 = await usersData.get(state.players.player2.uid) || {};
  const p1Name = p1.name || 'Joueur 1';
  const p2Name = p2.name || 'Joueur 2';

  const pv1 = state.stats.player1?.pv ?? 100;
  const pv2 = state.stats.player2?.pv ?? 100;
  const effects = result.impact?.effets_speciaux?.join(', ') || 'Aucun';
  const actions = result.possible_actions?.join(', ') || 'Aucune';

  const display = `${result.description}\n\n` +
    `PV restants :\n` +
    `- Joueur 1 (${p1Name}): ${pv1} PV\n` +
    `- Joueur 2 (${p2Name}): ${pv2} PV\n\n` +
    `Effets: ${effects}\n\n` +
    `Actions: ${actions}`;

  await message.reply(formatMessage(display));

  if (result.decision === 'combat_termine') {
    const winner = pv1 > 0 ? p1Name : p2Name;
    await message.reply('Combat terminé !');
    await saveCombat(state, winner, threadID);
    await fs.unlink(stateFile);
    return;
  }

  let nextTurnMessage = '';
  if (result.decision === 'attente_riposte') {
    state.status = 'riposte';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = await usersData.get(state.players[state.currentTurn].uid) || {};
    nextTurnMessage = `Joueur ${state.currentTurn === 'player1' ? '1' : '2'} (${next.name || 'Utilisateur'}), ripostez !\n\n` +
      `Options: ${result.possible_actions.join(', ')}`;
  } else {
    state.status = 'combat';
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    const next = await usersData.get(state.players[state.currentTurn].uid) || {};
    nextTurnMessage = `Joueur ${state.currentTurn === 'player1' ? '1' : '2'} (${next.name || 'Utilisateur'}), à vous !`;
  }

  state.lastTime = Date.now();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

  await message.reply(formatMessage(nextTurnMessage));

  if (state.currentTurn === 'player2' && state.isAI) {
    await message.reply(formatMessage(`Tour de l'IA...`));
    await handleAction({ body: 'IA_TURN', senderID: 'AI' }, api, state, stateFile, state.status === 'riposte', threadID, message, usersData);
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