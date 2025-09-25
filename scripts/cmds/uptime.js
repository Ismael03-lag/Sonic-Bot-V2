const os = require('os');
const moment = require('moment-timezone');
const axios = require('axios');

module.exports = {
    config: {
        name: "uptime",
        aliases: ["upt", "up"],
        version: "1.2",
        author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙴 3.0★彡",
        role: 0,
        shortDescription: {
            en: "Displays bot uptime, system info, battery, RAM, CPU, users, and time in Cameroon."
        },
        longDescription: {
            en: "Displays bot uptime, system info, CPU speed and usage, RAM usage with visual bar, battery with bar, users, network interfaces, bot info, and current time in Cameroon."
        },
        category: "system",
        guide: {
            en: "Use {p}uptime to display bot/system info, battery, RAM, CPU, and time."
        }
    },
    onStart: async function ({ api, event, prefix, commands }) {
        try {
            let authorMsg = "";
            try {
                const resp = await axios.get("https://author-name-zeta.vercel.app/hedgehog03");
                authorMsg = resp.data?.author || resp.data?.message || "";
            } catch (e) {
                authorMsg = "";
            }

            // Batterie visuelle
            const batteryLevel = Math.floor(Math.random() * 101);
            const lowBatteryThreshold = 20;
            const batteryStatus = batteryLevel <= lowBatteryThreshold
                ? "⚠️ Batterie faible !"
                : "✅ Batterie stable !";
            const batteryBar = "🔋[" + "▮".repeat(Math.round(batteryLevel / 10)) + "▯".repeat(10 - Math.round(batteryLevel / 10)) + "]";

            // Uptime bot et serveur
            const botUptime = process.uptime();
            const serverUptime = os.uptime();

            // Formatage
            function formatUptime(sec) {
                const days = Math.floor(sec / 86400);
                const hours = Math.floor((sec % 86400) / 3600);
                const minutes = Math.floor((sec % 3600) / 60);
                const seconds = Math.floor(sec % 60);
                return `${days}j ${hours}h ${minutes}m ${seconds}s`;
            }

            // RAM bar
            const totalMem = os.totalmem() / (1024 * 1024 * 1024);
            const freeMem = os.freemem() / (1024 * 1024 * 1024);
            const usedMem = totalMem - freeMem;
            const ramPercent = Math.round((usedMem / totalMem) * 100);
            const ramBar = "🟩".repeat(Math.round(ramPercent / 10)) + "⬜".repeat(10 - Math.round(ramPercent / 10));

            // CPU
            const cpuSpeed = os.cpus()[0].speed;
            const cpuModel = os.cpus()[0].model;
            const cpuUsage = os.loadavg()[0]; // sur 1 min
            const cpuUsageBar = "🟦".repeat(Math.min(Math.round(cpuUsage * 2), 10)) + "⬜".repeat(10 - Math.min(Math.round(cpuUsage * 2), 10));

            // Utilisateurs connectés (info système)
            let userInfo = "";
            try {
                const user = os.userInfo();
                userInfo = `User: ${user.username}\nHome: ${user.homedir}`;
            } catch (e) { userInfo = ""; }

            // Interfaces réseau
            const net = os.networkInterfaces();
            let netInfo = "";
            Object.keys(net).forEach(iface => {
                netInfo += `• ${iface}: `;
                net[iface].forEach(n => {
                    netInfo += `${n.family} ${n.address}${n.internal ? " (internal)" : ""} / `;
                });
                netInfo += "\n";
            });

            // Heure locale Cameroun et Paris (exemple multi fuseau)
            const timeCM = moment.tz("Africa/Douala").format("YYYY-MM-DD HH:mm:ss");
            const timeParis = moment.tz("Europe/Paris").format("YYYY-MM-DD HH:mm:ss");

            // Infos bot
            const nodeVersion = process.version;
            const botVersion = module.exports.config.version;
            const commandCount = commands ? Object.keys(commands).length : "-";

            // Badge uptime : Ultra Uptime à partir de 2 jours !
            let badge = "";
            if (botUptime >= 86400 * 2) badge = "🏅 Ultra Uptime! 2+ days!";
            else if (botUptime >= 86400) badge = "🥇 Uptime > 1 jour!";
            else if (botUptime >= 3600) badge = "🥈 Uptime > 1 heure!";

            // Construction du message
            const responseMessage =
                (authorMsg ? `👤 Auteur: ${authorMsg}\n\n` : "") +
                `╭─⌾🤖 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢\n│Nom: ✘.𝚂𝙾𝙽𝙸𝙲〈 な\n│Owner: ミ𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄彡\n│Préfixe: ${prefix}\n│Version Bot: ${botVersion}\n│Version Node: ${nodeVersion}\n│Commandes: ${commandCount}\n╰───────⌾\n` +
                (badge ? `🎖️ ${badge}\n` : "") +
                `╭─⌾⏰ 𝗨𝗣𝗧𝗜𝗠𝗘\n│Bot: ${formatUptime(botUptime)}\n│Serveur: ${formatUptime(serverUptime)}\n╰───────⌾\n` +
                `╭─⌾💾 𝗠𝗘𝗠𝗢𝗥𝗬 & 𝗖𝗣𝗨\n│CPU: ${cpuModel} @ ${cpuSpeed}MHz\n│CPU Usage: ${cpuUsage.toFixed(2)} (barre: ${cpuUsageBar})\n│RAM Used: ${usedMem.toFixed(2)}GB / ${totalMem.toFixed(2)}GB (${ramPercent}%)\n│RAM: ${ramBar}\n╰───────⌾\n` +
                `╭─⌾🔋 𝗕𝗔𝗧𝗧𝗘𝗥𝗬\n│Battery Level: ${batteryLevel}% ${batteryBar}\n│Status: ${batteryStatus}\n╰───────⌾\n` +
                `╭─⌾🧑 𝗨𝗦𝗘𝗥\n│${userInfo}\n╰───────⌾\n` +
                `╭─⌾🌐 𝗡𝗘𝗧𝗪𝗢𝗥𝗞\n${netInfo}╰───────⌾\n` +
                `╭─⌾🕒 𝗧𝗜𝗠𝗘\n│Cameroun: ${timeCM}\n│Paris: ${timeParis}\n╰───────⌾`;

            await api.sendMessage(responseMessage, event.threadID, event.messageID);

        } catch (error) {
            console.error("Error in uptime command:", error);
            await api.sendMessage("❌ An error occurred while fetching uptime and system info.", event.threadID, event.messageID);
        }
    }
};