const memoryGames = {};
const EMOJIS = ["🍎", "🍌", "🍇", "🍒", "🍉", "🍋", "🍓", "🥝"];

function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createBoard() {
  const pairs = shuffle([...EMOJIS, ...EMOJIS]); // 8 paires pour une grille 4x4
  const board = [];
  for (let i = 0; i < 4; i++) board.push(pairs.slice(i * 4, (i + 1) * 4));
  return board;
}

function createMask() {
  return Array.from({ length: 4 }, () => Array(4).fill(false));
}

function displayBoard(board, mask) {
  let s = "    A   B   C   D\n";
  for (let i = 0; i < 4; i++) {
    s += (i + 1) + " ";
    for (let j = 0; j < 4; j++) {
      s += " ";
      s += mask[i][j] ? board[i][j] : "❓";
      s += " ";
    }
    s += "\n";
  }
  return s;
}

function parseInput(str) {
  // ex: "A1 B2"
  const match = str.trim().toUpperCase().match(/^([A-D][1-4])\s+([A-D][1-4])$/);
  if (!match) return null;
  const pos = p => [parseInt(p[1], 10) - 1, p.charCodeAt(0) - 65];
  return [pos(match[1]), pos(match[2])];
}

function allFound(mask) {
  return mask.flat().every(x => x);
}

module.exports = {
  config: {
    name: "memory",
    aliases: ["memorygame", "memoire"],
    version: "1.0",
    author: "Copilot Chat & Sonic-Shisui",
    category: "game",
    shortDescription: "Jouez au jeu de mémoire à deux.",
    usage: "memory @ami ou memory <ID>",
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID;

    const mentionedIDs = Object.keys(event.mentions);
    if (mentionedIDs.length > 0) opponentID = mentionedIDs[0];
    else if (args[0] && /^\d+$/.test(args[0])) opponentID = args[0];

    if (!opponentID)
      return api.sendMessage("Mentionnez un ami ou donnez son ID pour commencer une partie de mémoire !", threadID, event.messageID);

    if (opponentID == senderID)
      return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);

    const gameID = `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;
    if (memoryGames[gameID] && memoryGames[gameID].inProgress)
      return api.sendMessage("Une partie est déjà en cours entre ces joueurs.", threadID, event.messageID);

    const player1Info = await api.getUserInfo(senderID);
    const player2Info = await api.getUserInfo(opponentID);

    if (!player2Info[opponentID])
      return api.sendMessage("Impossible de trouver l'utilisateur avec cet ID.", threadID, event.messageID);

    memoryGames[gameID] = {
      board: createBoard(),
      mask: createMask(),
      players: [
        { id: senderID, name: player1Info[senderID].name, score: 0 },
        { id: opponentID, name: player2Info[opponentID].name, score: 0 }
      ],
      turn: 0,
      inProgress: true
    };

    api.sendMessage(
      `🧠| Partie de Memory entre ${player1Info[senderID].name} et ${player2Info[opponentID].name} !\n\n${displayBoard(memoryGames[gameID].board, memoryGames[gameID].mask)}\n${player1Info[senderID].name}, commencez en envoyant deux positions (ex: A1 B2).`,
      threadID,
      event.messageID
    );
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim();

    const gameID = Object.keys(memoryGames).find((id) => id.startsWith(`${threadID}:`) && id.includes(senderID));
    if (!gameID) return;
    const game = memoryGames[gameID];
    if (!game.inProgress) return;

    const currentPlayer = game.players[game.turn];

    if (senderID != currentPlayer.id) {
      return api.sendMessage(`Ce n'est pas votre tour !`, threadID, event.messageID);
    }

    // Abandon
    if (["forfait", "abandon"].includes(messageBody.toLowerCase())) {
      const opponent = game.players.find(p => p.id != senderID);
      game.inProgress = false;
      return api.sendMessage(`🏳️| ${currentPlayer.name} a abandonné la partie. ${opponent.name} gagne !`, threadID);
    }

    // Restart
    if (["restart", "rejouer"].includes(messageBody.toLowerCase())) {
      const [player1, player2] = game.players;
      memoryGames[gameID] = {
        board: createBoard(),
        mask: createMask(),
        players: [
          { ...player1, score: 0 },
          { ...player2, score: 0 }
        ],
        turn: 0,
        inProgress: true
      };
      return api.sendMessage(
        `🧠| Nouvelle partie de Memory entre ${player1.name} et ${player2.name} !\n${displayBoard(memoryGames[gameID].board, memoryGames[gameID].mask)}\n${player1.name}, commencez en envoyant deux positions (ex: A1 B2).`,
        threadID
      );
    }

    // Jouer un coup
    const positions = parseInput(messageBody);
    if (!positions) {
      return api.sendMessage("Veuillez donner deux positions valides, exemple : A1 B2", threadID, event.messageID);
    }

    const [[x1, y1], [x2, y2]] = positions;
    if (game.mask[x1][y1] || game.mask[x2][y2] || (x1 === x2 && y1 === y2)) {
      return api.sendMessage("Vous devez choisir deux cases différentes, toutes deux encore cachées.", threadID, event.messageID);
    }

    // On révèle les deux cases temporairement
    game.mask[x1][y1] = true;
    game.mask[x2][y2] = true;

    const b = game.board, m = game.mask, p = game.players, t = game.turn;
    let response = `${displayBoard(b, m)}\n`;

    // Si paires identiques
    if (b[x1][y1] === b[x2][y2]) {
      p[t].score++;
      response += `Bravo ${p[t].name} ! Vous avez trouvé une paire (${b[x1][y1]}) et vous rejouez.\nScores : ${p[0].name} ${p[0].score} - ${p[1].name} ${p[1].score}`;
      // Victoire ?
      if (allFound(m)) {
        game.inProgress = false;
        let winner = p[0].score > p[1].score ? p[0] : p[1];
        if (p[0].score === p[1].score) winner = null;
        response += "\n\n🎉 Partie terminée ! ";
        response += winner ? `Le vainqueur est ${winner.name} !` : "Match nul !";
        response += `\nTapez 'restart' pour rejouer.`;
      }
    } else {
      response += `Raté ! Les deux cartes sont différentes.\nScores : ${p[0].name} ${p[0].score} - ${p[1].name} ${p[1].score}`;
      // On masque à nouveau les cases après un petit délai
      setTimeout(() => {
        m[x1][y1] = false;
        m[x2][y2] = false;
        game.turn = (t + 1) % 2;
        const nextPlayer = game.players[game.turn];
        api.sendMessage(`${displayBoard(b, m)}\n\n${nextPlayer.name}, à toi !`, threadID);
      }, 1600);
      // Retourne la grille avec les deux cartes révélées, puis on arrête là
      return api.sendMessage(response, threadID, event.messageID);
    }

    api.sendMessage(response, threadID, event.messageID);
  }
};