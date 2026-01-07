const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

function drawHeart(ctx, x, y, size, color, opacity = 1, glow = false) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
  }
  ctx.beginPath();
  const h = size * 0.3;
  ctx.moveTo(x, y + h);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + h);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size / 1.25, x, y + size);
  ctx.bezierCurveTo(x, y + size / 1.25, x + size / 2, y + size / 2, x + size / 2, y + h);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + h);
  ctx.fill();
  ctx.restore();
}

module.exports = {
  config: {
    name: "cupidon",
    version: "8.0",
    author: "Sømå Sønïč",
    role: 0,
    shortDescription: { en: "🖤💘 Cupidon Cinematic Background Edition" },
    guide: { en: "{p}cupidon @tag" },
  },

  onStart: async function({ message, event, api }) {
    const mentions = Object.keys(event.mentions);
    if (!mentions.length) return message.reply("𝗠𝗲𝗻𝘁𝗶𝗼𝗻𝗻𝗲 𝗹𝗮 𝗽𝗲𝗿𝘀𝗼𝗻𝗻𝗲 💝");

    try {
      const user1 = event.senderID;
      const user2 = mentions[0];

      const info1 = await api.getUserInfo(user1);
      const info2 = await api.getUserInfo(user2);
      const name1 = info1[user1].name.toUpperCase();
      const name2 = info2[user2].name.toUpperCase();

      const lovePercent = Math.floor(Math.random() * 101);
      const canvas = createCanvas(1200, 650);
      const ctx = canvas.getContext("2d");

      let heartColor, status, statusColor;
      if (lovePercent >= 85) {
        heartColor = "#ff0000";
        status = "AMOUR ABSOLU";
        statusColor = "#ff0000";
      } else if (lovePercent >= 50) {
        heartColor = "#ffffff";
        status = "ESPOIR RÉEL";
        statusColor = "#ffffff";
      } else {
        heartColor = "#333333";
        status = "FRIENDZONE";
        statusColor = "#777777";
      }

      const bgGrad = ctx.createRadialGradient(600, 325, 0, 600, 325, 650);
      bgGrad.addColorStop(0, "#1a0808");
      bgGrad.addColorStop(1, "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 650);

      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 1200;
        const y = Math.random() * 650;
        const size = Math.random() * 30 + 10;
        drawHeart(ctx, x, y, size, heartColor, 0.15, false);
      }

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const av1 = await loadImage(`https://graph.facebook.com/${user1}/picture?width=512&height=512&access_token=${token}`);
      const av2 = await loadImage(`https://graph.facebook.com/${user2}/picture?width=512&height=512&access_token=${token}`);

      const drawAvatar = (img, x) => {
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.arc(x, 250, 135, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, 250, 130, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(img, x - 130, 250 - 130, 260, 260);
        ctx.restore();
      };

      drawAvatar(av1, 250);
      drawAvatar(av2, 950);

      const centerX = 600, centerY = 250;
      drawHeart(ctx, centerX, centerY - 40, 100, heartColor, 0.9, true);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 85px sans-serif";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.fillText(`${lovePercent}%`, centerX, centerY + 180);

      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(150, 480, 900, 130);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 480, 900, 130);

      ctx.font = "bold 70px sans-serif";
      ctx.fillStyle = statusColor;
      ctx.letterSpacing = "12px";
      ctx.shadowBlur = 20;
      ctx.shadowColor = statusColor;
      ctx.fillText(status, centerX, 565);

      ctx.font = "22px sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.shadowBlur = 0;
      ctx.fillText(name1, 250, 430);
      ctx.fillText(name2, 950, 430);

      const filePath = path.join(__dirname, `cupidon_bg_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: `🌑 𝗔𝗡𝗔𝗟𝗬𝗦𝗘 𝗖𝗜𝗡𝗘́𝗠𝗔𝗧𝗜𝗤𝗨𝗘\n────────────────\nScore : ${lovePercent}%\nVerdict : ${status}`,
        attachment: fs.createReadStream(filePath)
      });
      
      fs.unlinkSync(filePath);

    } catch (error) {
      console.error(error);
      message.reply("Erreur lors de la création du fond cinématographique.");
    }
  }
};