const fetch = require('node-fetch');

const damierGames = {};

const EMPTY = "🟩";
const PION_B = "⚪";
const PION_N = "⚫";
const DAME_B = "🔵";
const DAME_N = "🔴";

function createDamierBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = PION_N;
    }
  }
  for (let i = 5; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) board[i][j] = PION_B;
    }
  }
  return board;
}

function displayDamier(board) {
  let s = "  a b c d e f g h\n";
  for (let i = 0; i < 8; i++) {
    s += (8 - i) + " ";
    for (let j = 0; j < 8; j++) {
      s += board[i][j] + " ";
    }
    s += (-8])$/);
  if (!match) return null;
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1]), pos(match[2])];
}

function isInside(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function hasPieces(board, pion, dame) {
  return board.flat().some(cell => cell === pion || cell === dame);
}

function isValidMoveDamier(board, from, to, player) {
  const [fx, fy] = from, [tx, ty] = to;
  const piece = board[fx][fy];
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  if (board[tx][ty] !== EMPTY) return false;

  // Pion blanc
  if (piece === PION_B) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true; // avance simple
    if (fx - tx === 2 && Math.abs(ty - fy) === 2 &&
        (board[fx-1][fy + (ty-fy)/2] === PION_N || board[fx-1][fy + (ty-fy)/2] === DAME_N)) return "prise";
  }
  // Pion noir
  if (piece === PION_N) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2 &&
        (board[fx+1][fy + (ty-fy)/2] === PION_B || board[fx+1][fy + (ty-fy)/2] === DAME_B)) return "prise";
  }
  // Dame blanche
  if (piece === DAME_B) {
    if (Math.abs(fx-tx) === Math.abs(fy-ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx+dx, y = fy+dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === PION_N || board[x][y] === DAME_N) {
          if (found) return false; // déjà un pion à prendre
          found = true;
        } else if (board[x][y] !== EMPTY) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  // Dame noire
  if (piece === DAME_N) {
    if (Math.abs(fx-tx) === Math.abs(fy-ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx+dx, y = fy+dy, found = false;
      while (x !== tx && y !== ty) {
        if (board[x][y] === PION_B || board[x][y] === DAME_B) {
          if (found) return false;
          found = true;
        } else if (board[x][y] !== EMPTY) return false;
        x += dx; y += dy;
      }
      return found ? "prise" : true;
    }
  }
  return false;
}

function checkPromotion(board) {
  for (let j = 0; j < 8; j++) {
    if (board[0][j] === PION_B) board[0][j] = DAME_B;
    if (board[7][j] === PION_N) board[7][j] = DAME_N;
  }
}

function getAllLegalMoves(board, player) {
  const moves = [];
  const myPion = player === 0 ? PION_B : PION_N;
  const myDame = player === 0 ? DAME_B : DAME_N;
  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      if ([myPion, myDame].includes(board[fx][fy])) {
        for (let tx = 0; tx < 8; tx++) {
          for (let ty = ty < 8; ty++) {
            if ((fx !== tx || fy !== ty) && isValidMoveDamier(board, [fx, fy], [tx, ty], player === 0 ? "blanc" : "noir")) {
              moves.push([[fx, fy], [tx, ty]]);
            }
          }
        }
      }
    }
  }
  return moves;
}

async function botPlay(game, api, threadID) {
  const board = game.board;
  const moves = getAllLegalMoves(board, 1);
  if (moves.length === 0) {
    game.inProgress = false ${winner.name} remporte la partie (le bot ne peut plus jouer) !`,
      threadID
    );
    return;
  }
  let botMove = moves.find(([from, to]) => isValidMoveDamier(board, from, to, "noir") === "prise");
  if (!botMove) botMove = moves[0];

  const [[fx, fy], [tx, ty]] = botMove;
  const piece = board[fx][fy];
  board[tx][ty] = piece;
  board[fx][fy] = EMPTY;
  if (isValidMoveDamier(board, [fx, fy], [tx, ty], "noir") === "prise") {
    board[(fx+tx)/2][(fy+ty)/2] = EMPTY;
  }
  checkPromotion(board);

  const hasBlanc = hasPieces(board, PION_B, DAME_B);
  const hasNoir = hasPieces(board, PION_N, DAME_N);
  if (!hasBlanc || !hasNoir) {
    game.inProgress = false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    await api.sendMessage(
      `${displayDamier(board)}\n\n🎉| ${winner.name} remporte la partie !`,
      threadID
    );
    return;
  }

  game.turn = 0;
  await api.sendMessage(
    `${displayDamier(board)}\n\nÀ vous de jouer !`,
    threadID
  );
}

module.exports = {
  config: {
    name: "dames",
    aliases: ["damiers", "checkers"],
    version: "1.1",
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡",
    category: "game",
    shortDescription: "Jouez aux dames contre un ami ou le bot.",
    usage: "dames @ami | dames <ID> | dames"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    let opponentID;

    const mentionedIDs = Object.keys(event.mentions);
    if (mentionedIDs.length > 0) opponentID = mentionedIDs[0];
    else if (args[0] && /^\d+$/.test(args[0])) opponentID = args[0];

    let play = false;
    if (!opponentID) playWithBot = true;

    if (opponentID && opponentID == senderID)
      return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);

    let authorName = "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡";
    try {
      const authorResponse = await fetch('https://author-name.vercel.app/');
      const authorJson = await authorResponse.json();
      authorName = authorJson.author || authorName;
    } catch (e) { /* ignore, garde Auteur inconnu */ }

    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;

    if (damierGames[gameID] && damierGames[gameID].inProgress)
      return api.sendMessage("Une partie est déjà en cours entre ces joueurs.", threadID, event.messageID);

    let player1Info, player2Info, botName = "🤖 Bot";
    if (playWithBot) {
      player1Info = await api.getUserInfo(senderID);
      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: "BOT", name: botName, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: true
      };
      api.sendMessage(
        `🎲| Partie de dames entre ${player1Info[senderID].name} (⚪) et ${botName} (⚫) !\nAuteur : ${authorName}\n\n${displayDamier(damierGames[gameID].board)}\n\n${player1Info[senderID].name}, à vous de commencer (ex: b6 a5).`,
        threadID,
        event.messageID
      );
    } else {
      player1Info = await api.getUserInfo(senderID);
      player cet ID.", threadID, event.messageID);

      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [
          { id: senderID, name: player1Info[senderID].name, color: "blanc" },
          { id: opponentID, name: player2Info[opponentID].name, color: "noir" }
        ],
        turn: 0,
        inProgress: true,
        vsBot: false
      };

      api.sendMessage(
        `🎲| Partie de dames entre ${player1Info[senderID].name} (⚪) et ${player2Info[opponentID].name} (⚫) !\nAuteur : ${authorName}\n\n${displayDamier(damierGames[gameID].board)}\n\n${player1Info[senderID].name}, à vous de commencer (ex: b6 a5).`,
        threadID,
        event.messageID
      );
    }
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const messageBody = event.body.trim();

    // Trouver la game correspondante (contre ami ou bot)
    const gameID = Object.keys(damierGames).find((id) =>
      id.startsWith(`${threadID}:`) && (id.includes(senderID) || id.endsWith(':BOT'))
    );
    if (!gameID) return;
    const game = damierGames[gameID];
    if (!game.inProgress) return;

    const board = game.board;
    const currentPlayer = game.players[game.turn];

    if (!game.vsBot && senderID != currentPlayer.id) {
      return api.sendMessage(`Ce n'est pas votre tour !`, threadID, event.messageID);
    }
    if (game.vsBot && game.turn === 1) return;

    if (["forfait", "abandon"].includes(messageBody.toLowerCase())) {
      const opponent = game.players.find(p => p.id != senderID);
      game.inProgress = false;
      return api.sendMessage(`🏳️| ${currentPlayer.name} a abandonné la partie. ${opponent.name} gagne !`, threadID);
    }

    if (["restart", "rejouer"].includes(messageBody.toLowerCase())) {
      const [player1, player2] = game.players;
      damierGames[gameID] = {
        board: createDamierBoard(),
        players: [player1, player2],
        turn: 0,
        inProgress: true,
        vsBot: game.vsBot
      };
      return api.sendMessage(
        `🎲| Nouvelle partie de dames entre ${player1.name} (⚪) et ${player2.name} (⚫) !\n${displayDamier(damierGames[gameID].board)}\n\n${player1.name}, commencez (ex: b6 a5).`,
        threadID
      );
    }

    const move = parseDamierMove(messageBody);
    if (!move) {
      return api.sendMessage(`Mouvement invalide. Utilisez la notation : b6 a5`, threadID, event.messageID);
    }

    const [[fx, fy], [tx, ty]] = move;
    const piece = board[fx][fy];

    if (
      (game.turn === 0 && ![PION_B, DAME_B].includes(piece)) ||
      (game.turn === 1 && ![PION_N, DAME_N].includes(piece))
    ) {
      return api.sendMessage(`Vous ne pouvez déplacer que vos propres pions !`, threadID, event.messageID);
    }

    const moveState = isValidMoveDamier(board, [fx, fy], [tx, ty], game.turn === 0 ? "blanc" : "noir");
    if (!moveState) {
      return api.sendMessage(`Coup illégal ou impossible.`, threadID, event.messageID);
    }

    board[tx][ty] = piece;
    board[fx][fy] = EMPTY;
    if (moveState === "prise") {
      board[(fx+tx)/2][(fy+ty)/2] = EMPTY;
    }
    checkPromotion(board);

    const hasBlanc = hasPieces(board, PION_B, DAME_B);
    const hasNoir = hasPieces(board, PION_N, DAME_N);
    if (!hasBlanc || ! ? game.players[0] : game.players[1];
      return api.sendMessage(
        `${displayDamier(board)}\n\n🎉| ${winner.name} remporte la partie !`,
        threadID
      );
    }

    game.turn = (game.turn + 1) % 2;
    const nextPlayer = game.players[game.turn];

    if (game.vsBot && game.turn === 1) {
      await api.sendMessage(
        `${displayDamier(board)}\n\n🤖 Bot réfléchit...`,
        threadID
      );
      setTimeout(async () => {
        await botPlay(game, api, threadID);
      }, 1200);
    } else {
      api.sendMessage(
        `${displayDamier(board)}\n\n${nextPlayer.name}, à vous de jouer !`,
        threadID
      );
    }
  }
};