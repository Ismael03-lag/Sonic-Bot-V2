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
    s += "\n";  // Correction ici : il manquait la fin de la ligne
  }
  return s;
}

function parseDamierMove(move) {
  // Correction : regex correctement fermée et gérée
  const regex = /^([a-h][1-8])\s+([a-h][1-8])$/i;
  const match = move.match(regex);
  if (!match) return null;
  const pos = (p) => [8 - Number(p[1]), p.charCodeAt(0) - 97];
  return [pos(match[1].toLowerCase()), pos(match[2].toLowerCase())];
}

function isInside(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function hasPieces(board, pion, dame) {
  return board.flat().some(cell => cell === pion || cell === dame);
}

function isValidMoveDamier(board, from, to, player) {
  const [fx, fy] = from, [tx, ty] = to;
  if (!isInside(fx, fy) || !isInside(tx, ty)) return false;
  const piece = board[fx][fy];
  if (board[tx][ty] !== EMPTY) return false;

  // Pion blanc
  if (piece === PION_B) {
    if (fx - tx === 1 && Math.abs(ty - fy) === 1) return true; // avance simple
    if (fx - tx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx - 1;
      const midY = fy + (ty - fy) / 2;
      if (board[midX][midY] === PION_N || board[midX][midY] === DAME_N) return "prise";
    }
  }
  // Pion noir
  if (piece === PION_N) {
    if (tx - fx === 1 && Math.abs(ty - fy) === 1) return true;
    if (tx - fx === 2 && Math.abs(ty - fy) === 2) {
      const midX = fx + 1;
      const midY = fy + (ty - fy) / 2;
      if (board[midX][midY] === PION_B || board[midX][midY] === DAME_B) return "prise";
    }
  }
  // Dame blanche
  if (piece === DAME_B) {
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
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
    if (Math.abs(fx - tx) === Math.abs(fy - ty)) {
      const dx = tx > fx ? 1 : -1, dy = ty > fy ? 1 : -1;
      let x = fx + dx, y = fy + dy, found = false;
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
          for (let ty = 0; ty < 8; ty++) {  // Correction ici : ty < 8 et non ty < 8 utilisé deux fois
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
    game.inProgress = false;
    const winner = game.players[0];
    await api.sendMessage(
      `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !`,
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
    board[(fx + tx) / 2][(fy + ty) / 2] = EMPTY;
  }
  checkPromotion(board);

  const hasBlanc = hasPieces(board, PION_B, DAME_B);
  const hasNoir = hasPieces(board, PION_N, DAME_N);
  if (!hasBlanc || !hasNoir) {
    game.inProgress = false;
    const winner = hasBlanc ? game.players[0] : game.players[1];
    await api.sendMessage(
      `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚁𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎 !`,
      threadID
    );
    return;
  }

  game.turn = 0;
  await api.sendMessage(
    `${displayDamier(board)}\n\n𝙲'𝚎𝚜𝚝 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !🔄`,
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
    let playWithBot = false;

    const mentionedIDs = event.mentions ? Object.keys(event.mentions) : [];
    if (mentionedIDs.length > 0) opponentID = mentionedIDs[0];
    else if (args[0] && /^\d+$/.test(args[0])) opponentID = args[0];

    if (!opponentID) playWithBot = true;

    if (opponentID && opponentID == senderID)
      return api.sendMessage("Vous ne pouvez pas jouer contre vous-même !", threadID, event.messageID);

    // Récupération nom auteur via API
    let authorName = "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡";
    try {
      const authorResponse = await fetch('https://author-name.vercel.app/');
      const authorJson = await authorResponse.json();
      authorName = authorJson.author || authorName;
    } catch (e) { /* ignore */ }

    const gameID = playWithBot
      ? `${threadID}:${senderID}:BOT`
      : `${threadID}:${Math.min(senderID, opponentID)}:${Math.max(senderID, opponentID)}`;

    if (damierGames[gameID] && damierGames[gameID].inProgress)
      return api.sendMessage("❌| 𝚄𝚗𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚎𝚜𝚝 𝚍𝚎𝚓𝚊 𝚎𝚗 𝚌𝚘𝚞𝚛𝚜 𝚎𝚗𝚝𝚛𝚎 𝚍𝚎𝚜 𝚓𝚘𝚞𝚎𝚞𝚛𝚜. 𝚅𝚎𝚞𝚒𝚕𝚕𝚎𝚣 𝚙𝚊𝚝𝚒𝚎𝚗𝚝𝚎𝚛 ⏳.", threadID, event.messageID);

    let player1Info, player2Info, botName = "➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ";
    if (playWithBot) {
      player1Info = await api.getUserInfo([senderID]);
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
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${botName} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, à 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚎𝚐𝚊𝚕𝚎𝚖𝚎𝚗𝚝 𝚜𝚊𝚒𝚜𝚒𝚛 𝚝𝚘𝚞𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 "𝚏𝚘𝚛𝚏𝚊𝚒𝚝" 𝚙𝚘𝚞𝚛 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 !`,
        threadID,
        event.messageID
      );
    } else {
      player1Info = await api.getUserInfo([senderID]);
      player2Info = await api.getUserInfo([opponentID]);
      if (!player2Info[opponentID]) return api.sendMessage("Impossible de récupérer les infos du joueur invité.", threadID, event.messageID);

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
        `📣| 𝙻𝚊𝚗𝚌𝚎𝚖𝚎𝚗𝚝 𝚍'𝚞𝚗𝚎 𝚗𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1Info[senderID].name} (⚪) 𝚎𝚝 ${player2Info[opponentID].name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1Info[senderID].name}, à 𝚟𝚘𝚞𝚜 𝚍𝚎 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚛 (𝚎𝚡: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚎𝚐𝚊𝚕𝚎𝚖𝚎𝚗𝚝 𝚜𝚊𝚒𝚜𝚒𝚛 𝚝𝚘𝚞𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 "𝚏𝚘𝚛𝚏𝚊𝚒𝚝" 𝚙𝚘𝚞𝚛 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 !`,
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
      return api.sendMessage(`🏳️| ${currentPlayer.name} 𝚊 𝚊𝚋𝚊𝚗𝚍𝚘𝚗𝚗é 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎. ${opponent.name} 𝚕𝚊 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 🎉✨ !`, threadID);
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
        `📣| 𝙽𝚘𝚞𝚟𝚎𝚕𝚕𝚎 𝚙𝚊𝚛𝚝𝚒𝚎 𝚍𝚎 𝚍𝚊𝚖𝚎𝚜 𝚎𝚗𝚝𝚛𝚎 ${player1.name} (⚪) 𝚎𝚝 ${player2.name} (⚫) !\n━━━━━━━━❪❐❫━━━━━━━━\n${displayDamier(damierGames[gameID].board)}\n━━━━━━━━❪❐❫━━━━━━━━\n${player1.name}, 𝙲'𝚎𝚜𝚝 𝚟𝚘𝚞𝚜 𝚚𝚞𝚒 𝚌𝚘𝚖𝚖𝚎𝚗𝚌𝚎𝚣 (ex: b6 a5).\n📛| 𝚅𝚘𝚞𝚜 𝚙𝚘𝚞𝚟𝚎𝚣 𝚊𝚞𝚜𝚜𝚒 𝚜𝚝𝚘𝚙𝚙𝚎𝚛 𝚕𝚎 𝚓𝚎𝚞 𝚎𝚗 𝚜𝚊𝚒𝚜𝚒𝚜𝚜𝚊𝚗𝚝 𝚜𝚒𝚖𝚙𝚕𝚎𝚖𝚎𝚗𝚝 " 𝚏𝚘𝚛𝚏𝚊𝚒𝚝"`,
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
      board[(fx + tx) / 2][(fy + ty) / 2] = EMPTY;
    }
    checkPromotion(board);

    const hasBlanc = hasPieces(board, PION_B, DAME_B);
    const hasNoir = hasPieces(board, PION_N, DAME_N);
    if (!hasBlanc || !hasNoir) {
      game.inProgress = false;
      const winner = hasBlanc ? game.players[0] : game.players[1];
      return api.sendMessage(
        `${displayDamier(board)}\n\n🎉| ${winner.name} 𝚛𝚎𝚖𝚙𝚘𝚛𝚝𝚎 𝚕𝚊 𝚙𝚊𝚛𝚝𝚒𝚎  !`,
        threadID
      );
    }

    game.turn = (game.turn + 1) % 2;
    const nextPlayer = game.players[game.turn];

    if (game.vsBot && game.turn === 1) {
      await api.sendMessage(
        `${displayDamier(board)}\n\n➤『 𝙷𝙴𝙳𝙶𝙴𝙷𝙾𝙶𝄞𝙶𝙿𝚃 』☜ヅ réfléchit...🤔`,
        threadID
      );
      setTimeout(async () => {
        await botPlay(game, api, threadID);
      }, 1200);
    } else {
      api.sendMessage(
        `${displayDamier(board)}\n\n${nextPlayer.name}, 𝚌'𝚎𝚜𝚝 𝚟𝚘𝚝𝚛𝚎 𝚝𝚘𝚞𝚛 !🔄`,
        threadID
      );
    }
  }
};