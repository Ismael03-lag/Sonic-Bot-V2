const { getTime } = global.utils;
const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "logsbot",
		isBot: true,
		version: "2.0",
		author: "𝐋'𝐔𝐜𝐡𝐢𝐡𝐚 𝐏𝐞𝐫𝐝𝐮",
		envConfig: {
			allow: true
		},
		category: "events"
	},

	langs: {
		fr: {
			added: "AJOUT DU BOT",
			kicked: "EXPULSION DU BOT"
		}
	},

	onStart: async ({ usersData, threadsData, event, api, getLang }) => {
		if (
			(event.logMessageType == "log:subscribe" && event.logMessageData.addedParticipants.some(item => item.userFbId == api.getCurrentUserID()))
			|| (event.logMessageType == "log:unsubscribe" && event.logMessageData.leftParticipantFbId == api.getCurrentUserID())
		) return async function () {
			const TARGET_GROUP_ID = "ID_DU_GROUPE_LOGS";
			
			if (!TARGET_GROUP_ID || TARGET_GROUP_ID === "2852439588294507") return;

			const { author, threadID } = event;
			if (author == api.getCurrentUserID()) return;

			let threadName;
			let userName;
			let type;

			if (event.logMessageType == "log:subscribe") {
				if (!event.logMessageData.addedParticipants.some(item => item.userFbId == api.getCurrentUserID())) return;
				threadName = (await api.getThreadInfo(threadID)).threadName;
				userName = await usersData.getName(author);
				type = "added";
			}
			else if (event.logMessageType == "log:unsubscribe") {
				if (event.logMessageData.leftParticipantFbId != api.getCurrentUserID()) return;
				const threadData = await threadsData.get(threadID);
				threadName = threadData.threadName;
				userName = await usersData.getName(author);
				type = "kicked";
			}

			const time = getTime("DD/MM/YYYY HH:mm:ss");
			
			const logText = 
`◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆

〘 ${type === "added" ? "𝑨𝑱𝑶𝑼𝑻 𝑫𝑼 𝑩𝑶𝑻" : "𝑬𝑿𝑷𝑼𝑳𝑺𝑰𝑶𝑵 𝑫𝑼 𝑩𝑶𝑻"} 〙

➤ Événement
→ ${type === "added" ? "Le bot a été ajouté à un nouveau groupe" : "Le bot a été expulsé d'un groupe"}

➤ Détails
→ ${type === "added" ? "Ajouté par" : "Expulsé par"} : ${userName}
→ Groupe : ${threadName}
→ ID du groupe : ${threadID}
→ Date : ${time}

◆ ▬▬▬▬ ❴✪❵ ▬▬▬▬ ◆`;

			try {
				await api.sendMessage(logText, TARGET_GROUP_ID);
				
				const logImage = await this.createLogCanvas(type, userName, threadName, threadID, time);
				const imagePath = path.join(__dirname, `logs_${threadID}_${Date.now()}.png`);
				fs.writeFileSync(imagePath, logImage);
				
				await api.sendMessage({ attachment: fs.createReadStream(imagePath) }, TARGET_GROUP_ID);
				
				fs.unlinkSync(imagePath);
			} catch (err) {
				console.error("Erreur logsbot:", err);
			}
		}.bind(this);
	},

	createLogCanvas: async function (type, userName, groupName, groupID, time) {
		const W = 1200, H = 700;
		const canvas = Canvas.createCanvas(W, H);
		const ctx = canvas.getContext("2d");

		let grd;
		if (type === "added") {
			grd = ctx.createLinearGradient(0, 0, W, H);
			grd.addColorStop(0, "#00b09b");
			grd.addColorStop(1, "#96c93d");
		} else {
			grd = ctx.createLinearGradient(0, 0, W, H);
			grd.addColorStop(0, "#8B0000");
			grd.addColorStop(1, "#FF416C");
		}
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, W, H);

		ctx.fillStyle = "rgba(255,255,255,0.15)";
		ctx.beginPath();
		ctx.ellipse(W/2, 120, 100, 100, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.font = "bold 85px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText(type === "added" ? "✅" : "❌", W/2, 165);

		ctx.font = "bold 48px Arial";
		ctx.fillText(type === "added" ? "AJOUT DU BOT" : "EXPULSION DU BOT", W/2, 250);

		ctx.font = "30px Arial";
		ctx.fillStyle = "rgba(255,255,255,0.95)";
		ctx.textAlign = "left";

		const lines = [
			`Événement: ${type === "added" ? "Bot ajouté à un groupe" : "Bot expulsé d'un groupe"}`,
			`${type === "added" ? "Ajouté par" : "Expulsé par"}: ${userName}`,
			`Groupe: ${groupName}`,
			`ID: ${groupID}`,
			`Date: ${time}`
		];

		lines.forEach((line, i) => {
			ctx.fillText(line, 100, 350 + i * 60);
		});

		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.fillRect(0, H - 80, W, 80);
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "22px Arial";
		ctx.textAlign = "center";
		ctx.fillText("Système de logs - Hedgehog GPT", W/2, H - 40);

		return canvas.toBuffer();
	}
};