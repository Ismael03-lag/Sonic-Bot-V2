const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const games = new Map();

function generateMaze(width, height) {
    const maze = Array.from({ length: height }, () => Array.from({ length: width }, () => ({
        n: true, s: true, e: true, w: true, visited: false, type: "normal"
    })));
    const stack = [[0, 0]];
    maze[0][0].visited = true;
    while (stack.length > 0) {
        const [x, y] = stack[stack.length - 1];
        const neighbors = [];
        if (y > 0 && !maze[y - 1][x].visited) neighbors.push([x, y - 1, 'n', 's']);
        if (y < height - 1 && !maze[y + 1][x].visited) neighbors.push([x, y + 1, 's', 'n']);
        if (x > 0 && !maze[y][x - 1].visited) neighbors.push([x - 1, y, 'w', 'e']);
        if (x < width - 1 && !maze[y][x + 1].visited) neighbors.push([x + 1, y, 'e', 'w']);
        if (neighbors.length > 0) {
            const [nx, ny, dir, opp] = neighbors[Math.floor(Math.random() * neighbors.length)];
            maze[y][x][dir] = false; maze[ny][nx][opp] = false;
            maze[ny][nx].visited = true; stack.push([nx, ny]);
        } else { stack.pop(); }
    }
    const types = ["trap", "portal", "key", "shield"];
    types.forEach(t => { for(let i=0; i<2; i++) { maze[Math.floor(Math.random()*height)][Math.floor(Math.random()*width)].type = t; }});
    return maze;
}

function drawShape(ctx, x, y, size, shape, color, isOut) {
    ctx.fillStyle = color;
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (shape === 'square') ctx.rect(x - size, y - size, size * 2, size * 2);
    else if (shape === 'triangle') { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size); }
    else { ctx.arc(x, y, size, 0, Math.PI * 2); }
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    if (isOut) {
        ctx.strokeStyle = "red"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - 12, y - 12); ctx.lineTo(x + 12, y + 12);
        ctx.moveTo(x + 12, y - 12); ctx.lineTo(x - 12, y + 12); ctx.stroke();
    }
}

async function drawMaze(game, threadID) {
    const cellSize = 45;
    const padding = 30;
    const canvas = createCanvas(game.width * cellSize + padding * 2, game.height * cellSize + padding * 2);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < game.height; y++) {
        for (let x = 0; x < game.width; x++) {
            const cell = game.maze[y][x];
            const px = x * cellSize + padding; const py = y * cellSize + padding;
            if (cell.type === "trap") { ctx.fillStyle = "rgba(255, 0, 255, 0.15)"; ctx.fillRect(px+5, py+5, cellSize-10, cellSize-10); }
            if (cell.type === "portal") { ctx.fillStyle = "rgba(0, 255, 255, 0.15)"; ctx.fillRect(px+5, py+5, cellSize-10, cellSize-10); }
            if (cell.type === "key" && !game.keyPicked) { ctx.font = "20px serif"; ctx.fillText("🔑", px+12, py+30); }
            
            ctx.strokeStyle = "#00FFFF"; ctx.lineWidth = 3;
            if (cell.n) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.stroke(); }
            if (cell.s) { ctx.beginPath(); ctx.moveTo(px, py + cellSize); ctx.lineTo(px + cellSize, py + cellSize); ctx.stroke(); }
            if (cell.e) { ctx.beginPath(); ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.stroke(); }
            if (cell.w) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cellSize); ctx.stroke(); }
        }
    }
    ctx.fillStyle = game.keyPicked ? "#FF0000" : "#444444";
    ctx.fillRect((game.width-1)*cellSize+padding+10, (game.height-1)*cellSize+padding+10, cellSize-20, cellSize-20);
    ctx.font = "25px serif"; ctx.fillText("🐂", game.monster.x*cellSize+padding+10, game.monster.y*cellSize+padding+32);
    game.players.forEach(p => drawShape(ctx, p.x*cellSize+padding+cellSize/2, p.y*cellSize+padding+cellSize/2, 13, p.shape, p.color, p.isOut));

    const filePath = path.join(__dirname, `maze_${threadID}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer());
    return filePath;
}

module.exports = {
    config: { name: "labyrinthe", version: "11.0", author: "Sømå Sønïč", role: 0, category: "game" },

    onStart: async function ({ message, event, args, api }) {
        const { threadID, senderID } = event;
        const subCmd = args[0]?.toLowerCase();

        if (subCmd === "party") {
            const info = await api.getUserInfo(senderID);
            games.set(threadID, {
                host: senderID, players: [], status: "lobby", width: 12, height: 12, 
                keyPicked: false, monster: { x: 11, y: 0 }, turnIndex: 0
            });
            return message.reply("🏁 LABYRINTHE OUVERT !\n━━━━━━━━━━━━━━━\n🔹 Rejoindre : `labyrinthe join`\n🚀 Lancer : `start` (par l'hôte)\n🏳️ Abandon : Écris 'forfait'");
        }

        if (subCmd === "join") {
            const game = games.get(threadID);
            if (!game || game.status !== "lobby") return message.reply("❌ Pas de lobby.");
            if (game.players.some(p => p.id === senderID)) return message.reply("⚠️ Déjà inscrit.");
            
            const info = await api.getUserInfo(senderID);
            const configs = [{c:"#00FF00",s:"circle"},{c:"#00F0FF",s:"square"},{c:"#FF00FF",s:"triangle"},{c:"#FFFF00",s:"circle"}];
            const conf = configs[game.players.length % configs.length];
            
            game.players.push({ id: senderID, name: info[senderID].name, x: 0, y: 0, color: conf.c, shape: conf.s, isOut: false, skipTurns: 0 });
            
            let list = game.players.map((p, i) => `${i+1}. ${p.name} (${p.shape})`).join("\n");
            return message.reply(`✅ Inscription OK !\n\n📝 JOUEURS :\n${list}`);
        }
    },

    onChat: async function ({ message, event, api }) {
        const { threadID, senderID, body } = event;
        const game = games.get(threadID);
        if (!game) return;

        const input = body.toLowerCase().trim();

        if (input === "forfait" && game.status === "playing") {
            const p = game.players.find(pl => pl.id === senderID);
            if (!p || p.isOut) return;
            p.isOut = true;
            await message.reply(`🏳️ ${p.name} a abandonné ! Son pion reste figé avec une ❌.`);
            if (game.players[game.turnIndex].id === senderID) game.turnIndex = (game.turnIndex + 1) % game.players.length;
            return;
        }

        if (input === "start" && game.status === "lobby" && senderID === game.host) {
            if (game.players.length < 2) return message.reply("⚠️ Il faut 2 joueurs.");
            game.status = "playing";
            game.maze = generateMaze(game.width, game.height);
            game.currentDice = Math.floor(Math.random() * 6) + 1;
            const img = await drawMaze(game, threadID);
            await message.reply({ body: `🚩 GO ! Tour de ${game.players[0].name}\n🎲 Dé: ${game.currentDice}`, attachment: fs.createReadStream(img) });
            return fs.unlinkSync(img);
        }

        if (game.status === "playing") {
            let p = game.players[game.turnIndex];
            while (p.isOut) { game.turnIndex = (game.turnIndex + 1) % game.players.length; p = game.players[game.turnIndex]; }
            if (senderID !== p.id || !/^[zqsd]+$/.test(input)) return;
            if (input.length > game.currentDice) return message.reply(`🎲 Max ${game.currentDice} !`);

            let steps = 0, hitWall = false;
            for (let char of input) {
                const cell = game.maze[p.y][p.x];
                if (char === "z" && !cell.n) p.y--;
                else if (char === "s" && !cell.s) p.y++;
                else if (char === "q" && !cell.w) p.x--;
                else if (char === "d" && !cell.e) p.x++;
                else { hitWall = true; break; }
                steps++;
                if (game.maze[p.y][p.x].type === "key") game.keyPicked = true;
                if (p.x === game.width-1 && p.y === game.height-1 && game.keyPicked) return message.reply(`🏆 VICTOIRE DE ${p.name} !`);
            }

            game.turnIndex = (game.turnIndex + 1) % game.players.length;
            game.currentDice = Math.floor(Math.random() * 6) + 1;
            const dist = Math.abs(p.x - 11) + Math.abs(p.y - 11);
            const hint = dist < 5 ? "🔥 Brûlant !" : "❄️ Froid...";
            const img = await drawMaze(game, threadID);
            await message.reply({ body: `${hitWall?"💥 Mur !":"✅ OK"}\n🌡️ Indice: ${hint}\n\n👉 Suivant: ${game.players[game.turnIndex].name}\n🎲 Dé: ${game.currentDice}`, attachment: fs.createReadStream(img) });
            return fs.unlinkSync(img);
        }
    }
};