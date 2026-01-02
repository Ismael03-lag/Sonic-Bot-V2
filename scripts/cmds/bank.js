const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { spawn } = require('child_process');
const crypto = require('crypto');

const BALANCE_FILE = path.join(__dirname, 'balance.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const SECURITY_FILE = path.join(__dirname, 'security.json');
const TEMP_DIR = path.join(__dirname, 'temp_bank_system');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function initFiles() {
    if (!fs.existsSync(BALANCE_FILE)) fs.writeFileSync(BALANCE_FILE, '{}');
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
    if (!fs.existsSync(SECURITY_FILE)) fs.writeFileSync(SECURITY_FILE, '{"transactions":[],"attempts":{}}');
}
initFiles();

function loadBalance() { return JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf8') || '{}'); }
function loadUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}'); }
function loadSecurity() { return JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8') || '{}'); }
function saveBalance(data) { fs.writeFileSync(BALANCE_FILE, JSON.stringify(data, null, 2)); }
function saveUsers(data) { fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)); }
function saveSecurity(data) { fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2)); }

function formatNumber(number) {
    const suffixes = ["", "K", "M", "B", "T", "Q", "Qt", "Sx", "Sp", "O", "N", "D"];
    if (number < 1000) return number.toString();
    const exp = Math.floor(Math.log10(number) / 3);
    const short = number / Math.pow(1000, exp);
    return `${short.toFixed(2)}${suffixes[exp]}`;
}

async function getUserName(uid, api) {
    try {
        const info = await api.getUserInfo([uid]);
        return info[uid]?.name || `User_${uid}`;
    } catch { return `User_${uid}`; }
}

function getBorder() { return "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n"; }

const DISPLAY_MODES = { TEXT: 'text', IMAGE: 'image', VIDEO: 'video' };
const loans = {};
const COOLDOWNS = {};

const VIDEO_COMMANDS = new Set(['solde', 'depot', 'retrait', 'pret', 'transfert', 'vip', 'gamble', 'heist', 'daily']);

function createImageFrame(width, height, type, data, frameIndex = 0, totalFrames = 1) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0a1a');
    bgGradient.addColorStop(0.5, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + Math.random() * 0.03})`;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 1 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(50, 40, width - 100, height - 80);
    
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 6;
    ctx.strokeRect(50, 40, width - 100, height - 80);
    
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊', width / 2, 100);
    
    ctx.font = '24px Arial';
    ctx.fillStyle = '#8a8a8a';
    ctx.fillText('Système Bancaire Ultime', width / 2, 140);
    
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 160);
    ctx.lineTo(width - 100, 160);
    ctx.stroke();
    
    const iconMap = {
        'solde': '💰', 'depot': '📥', 'retrait': '📤', 'pret': '🏦', 'transfert': '🔀',
        'vip': '👑', 'gamble': '🎰', 'heist': '💰', 'vault': '🔐', 'top': '🏆',
        'daily': '🎉', 'stats': '📊', 'menu': '📱', 'error': '❌', 'security': '🔒',
        'success': '✅', 'warning': '⚠️', 'info': 'ℹ️', 'loan': '📝', 'debt': '🎯'
    };
    
    const titleMap = {
        'solde': '𝐒𝐎𝐋𝐃𝐄 𝐃𝐔 𝐂𝐎𝐌𝐏𝐓𝐄', 'depot': '𝐃𝐄𝐏𝐎𝐓 𝐑𝐄𝐔𝐒𝐒𝐈', 'retrait': '𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐄𝐅𝐅𝐄𝐂𝐓𝐔𝐄',
        'pret': '𝐏𝐑𝐄𝐓 𝐀𝐂𝐂𝐎𝐑𝐃𝐄', 'transfert': '𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐂𝐎𝐌𝐏𝐋𝐄𝐓', 'vip': '𝐒𝐓𝐀𝐓𝐔𝐓 𝐕𝐈𝐏',
        'gamble': '𝐉𝐄𝐔 𝐃𝐄 𝐇𝐀𝐒𝐀𝐑𝐃', 'heist': '𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄', 'vault': '𝐂𝐎𝐅𝐅𝐑𝐄-𝐅𝐎𝐑𝐓',
        'top': '𝐂𝐋𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓', 'daily': '𝐑𝐄𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐄 𝐐𝐔𝐎𝐓𝐈𝐃𝐈𝐄𝐍𝐍𝐄', 'stats': '𝐒𝐓𝐀𝐓𝐈𝐒𝐓𝐈𝐐𝐔𝐄𝐒',
        'menu': '𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋', 'error': '𝐄𝐑𝐑𝐄𝐔𝐑', 'security': '𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐄',
        'success': '𝐒𝐔𝐂𝐂𝐄𝐒', 'warning': '𝐀𝐕𝐄𝐑𝐓𝐈𝐒𝐒𝐄𝐌𝐄𝐍𝐓', 'info': '𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍',
        'loan': '𝐏𝐑𝐄𝐓', 'debt': '𝐃𝐄𝐓𝐓𝐄'
    };
    
    const icon = iconMap[type] || '🏦';
    const title = titleMap[type] || '𝐁𝐀𝐍𝐐𝐔𝐄 𝐔𝐂𝐇𝐈𝐖𝐀';
    
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${icon} ${title}`, width / 2, 220);
    
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, 230);
    ctx.lineTo(width / 2 + 150, 230);
    ctx.stroke();
    
    let y = 280;
    ctx.textAlign = 'left';
    ctx.font = '28px Arial';
    
    const renderData = {
        'solde': () => {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(`👤 Utilisateur: ${data.userName}`, 100, y);
            ctx.fillText(`🔢 UID: ${data.userId}`, 100, y + 40);
            ctx.fillText(`💸 Cash: ${formatNumber(data.cash)}💲`, 100, y + 80);
            ctx.fillText(`🏦 Banque: ${formatNumber(data.bank)}💲`, 100, y + 120);
            ctx.fillText(`📈 Intérêts: ${data.vip ? '20% 🌟' : '5%'}`, 100, y + 160);
            ctx.fillText(`🎯 Dette: ${formatNumber(data.debt)}💲`, 100, y + 200);
            ctx.fillText(`🛡️ Assurance: ${data.insurance ? 'ACTIVE' : 'INACTIVE'}`, 100, y + 240);
            ctx.fillText(`👑 Statut: ${data.vip ? 'VIP 🌟' : 'Standard'}`, 100, y + 280);
        },
        'depot': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px Arial';
            ctx.fillStyle = '#00ff00';
            ctx.fillText(`+${formatNumber(data.amount)}💲`, width / 2, y + 60);
            ctx.font = '32px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐃𝐄𝐏𝐎𝐓 𝐑𝐄𝐔𝐒𝐒𝐈', width / 2, y + 120);
            ctx.fillText(`Nouveau solde: ${formatNumber(data.newBalance)}💲`, width / 2, y + 180);
        },
        'retrait': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px Arial';
            ctx.fillStyle = '#ff9900';
            ctx.fillText(`-${formatNumber(data.amount)}💲`, width / 2, y + 60);
            ctx.font = '32px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐄𝐅𝐅𝐄𝐂𝐓𝐔𝐄', width / 2, y + 120);
            ctx.fillText(`Cash disponible: ${formatNumber(data.cash)}💲`, width / 2, y + 180);
        },
        'pret': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px Arial';
            ctx.fillStyle = '#ffff00';
            ctx.fillText(`+${formatNumber(data.amount)}💲`, width / 2, y + 60);
            ctx.font = '32px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('𝐏𝐑𝐄𝐓 𝐀𝐂𝐂𝐎𝐑𝐃𝐄', width / 2, y + 120);
            ctx.fillText(`Dette totale: ${formatNumber(data.debt)}💲`, width / 2, y + 180);
            ctx.fillStyle = '#ff0000';
            ctx.fillText(`⚠️ Remboursez ${formatNumber(data.half)}💲 dans 30min!`, width / 2, y + 240);
        },
        'vip': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('🌟 𝐕𝐈𝐏 𝐀𝐂𝐓𝐈𝐕𝐄 🌟', width / 2, y + 60);
            ctx.font = '28px Arial';
            const advantages = [
                '📈 Intérêts: 20% (au lieu de 5%)',
                '🏦 Prêt max: 4,000,000💲',
                '🔀 Transfert max: 10M💲/jour',
                '🛡️ Pas de pénalités de dette',
                '🎰 Accès exclusif au casino'
            ];
            for (let i = 0; i < advantages.length; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#00ff00' : '#4cc9f0';
                ctx.fillText(advantages[i], width / 2, y + 120 + i * 50);
            }
        },
        'error': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#ff0000';
            ctx.fillText('❌ 𝐄𝐑𝐑𝐄𝐔𝐑', width / 2, y + 60);
            ctx.font = '32px Arial';
            ctx.fillStyle = '#ffffff';
            if (data.message) {
                const lines = data.message.split('\n');
                for (let i = 0; i < Math.min(lines.length, 4); i++) {
                    ctx.fillText(lines[i], width / 2, y + 120 + i * 60);
                }
            }
        },
        'success': () => {
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#00ff00';
            ctx.fillText('✅ 𝐒𝐔𝐂𝐂𝐄𝐒', width / 2, y + 60);
            ctx.font = '32px Arial';
            ctx.fillStyle = '#ffffff';
            if (data.message) {
                const lines = data.message.split('\n');
                for (let i = 0; i < Math.min(lines.length, 4); i++) {
                    ctx.fillText(lines[i], width / 2, y + 120 + i * 60);
                }
            }
        },
        'default': () => {
            ctx.textAlign = 'left';
            ctx.font = '28px Arial';
            const entries = Object.entries(data);
            for (const [key, value] of entries.slice(0, 8)) {
                ctx.fillStyle = '#aaaaaa';
                ctx.fillText(`${key}:`, 100, y);
                ctx.fillStyle = '#4cc9f0';
                ctx.textAlign = 'right';
                ctx.fillText(value, width - 100, y);
                ctx.textAlign = 'left';
                y += 50;
            }
        }
    };
    
    if (renderData[type]) {
        renderData[type]();
    } else {
        renderData.default();
    }
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.font = '18px Arial';
    ctx.fillText(`UID: ${data.userId || 'N/A'} | ${new Date().toLocaleString()}`, width / 2, height - 50);
    
    if (totalFrames > 1) {
        const progress = (frameIndex + 1) / totalFrames;
        ctx.fillStyle = '#333333';
        ctx.fillRect(100, height - 80, width - 200, 20);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(100, height - 80, (width - 200) * progress, 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(`Frame ${frameIndex + 1}/${totalFrames}`, width / 2, height - 65);
    }
    
    return canvas.toBuffer('image/png');
}

async function generateImageForAll(type, data, userId, userName) {
    const width = 1200, height = 800;
    const imageData = { userId, userName, ...data };
    return createImageFrame(width, height, type, imageData);
}

async function generateVideoForAll(type, data, userId, userName) {
    const videoId = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const videoDir = path.join(TEMP_DIR, videoId);
    fs.mkdirSync(videoDir, { recursive: true });
    
    const totalFrames = 90;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i++) {
        const frameData = {
            ...data,
            userId,
            userName,
            progress: i / totalFrames,
            frameIndex: i
        };
        
        const frameBuffer = createImageFrame(1280, 720, type, frameData, i, totalFrames);
        const framePath = path.join(videoDir, `frame_${String(i).padStart(5, '0')}.png`);
        fs.writeFileSync(framePath, frameBuffer);
        frames.push(framePath);
    }
    
    const videoPath = path.join(videoDir, 'output.mp4');
    
    await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-framerate', '30',
            '-i', path.join(videoDir, 'frame_%05d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '18',
            '-preset', 'medium',
            '-y',
            videoPath
        ]);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg error: ${code}`));
        });
        
        ffmpeg.stderr.on('data', () => {});
        ffmpeg.stdout.on('data', () => {});
    });
    
    frames.forEach(frame => {
        try { fs.unlinkSync(frame); } catch {}
    });
    
    const videoBuffer = fs.readFileSync(videoPath);
    
    setTimeout(() => {
        try { fs.rmSync(videoDir, { recursive: true, force: true }); } catch {}
    }, 60000);
    
    return videoBuffer;
}

async function sendResponse(message, type, data, mode, api, event, userName) {
    const userId = event.senderID;
    
    if (mode === DISPLAY_MODES.IMAGE || (mode === DISPLAY_MODES.VIDEO && !VIDEO_COMMANDS.has(type))) {
        try {
            const imageBuffer = await generateImageForAll(type, data, userId, userName);
            const tempImage = path.join(TEMP_DIR, `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
            fs.writeFileSync(tempImage, imageBuffer);
            
            const finalMessage = mode === DISPLAY_MODES.VIDEO && !VIDEO_COMMANDS.has(type) 
                ? message + '\n\n📸 Cette commande est en mode image uniquement.'
                : message;
            
            await api.sendMessage({
                body: finalMessage,
                attachment: fs.createReadStream(tempImage)
            }, event.threadID);
            
            setTimeout(() => {
                try { fs.unlinkSync(tempImage); } catch {}
            }, 15000);
            
        } catch (error) {
            console.error('Image generation error:', error);
            await api.sendMessage(message, event.threadID);
        }
        
    } else if (mode === DISPLAY_MODES.VIDEO && VIDEO_COMMANDS.has(type)) {
        try {
            const videoBuffer = await generateVideoForAll(type, data, userId, userName);
            const tempVideo = path.join(TEMP_DIR, `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);
            fs.writeFileSync(tempVideo, videoBuffer);
            
            await api.sendMessage({
                body: message,
                attachment: fs.createReadStream(tempVideo)
            }, event.threadID);
            
            setTimeout(() => {
                try { fs.unlinkSync(tempVideo); } catch {}
            }, 45000);
            
        } catch (error) {
            console.error('Video generation error:', error);
            
            try {
                const imageBuffer = await generateImageForAll(type, data, userId, userName);
                const tempImage = path.join(TEMP_DIR, `fallback_${Date.now()}.png`);
                fs.writeFileSync(tempImage, imageBuffer);
                
                await api.sendMessage({
                    body: message + '\n\n⚠️ La vidéo a échoué, voici une image.',
                    attachment: fs.createReadStream(tempImage)
                }, event.threadID);
                
                setTimeout(() => {
                    try { fs.unlinkSync(tempImage); } catch {}
                }, 15000);
            } catch (imgError) {
                await api.sendMessage(message, event.threadID);
            }
        }
    } else {
        await api.sendMessage(message, event.threadID);
    }
}

async function checkLoanRepayment(userId, api, lang = 'fr') {
    const loan = loans[userId];
    if (!loan) return;
    
    const balance = loadBalance();
    const users = loadUsers();
    const userBalance = balance[userId] || { bank: 0, cash: 0, debt: 0 };
    const isVIP = users[userId]?.vip || false;
    
    const halfDebt = loan.amount / 2;
    const now = Date.now();
    const timePassed = now - loan.timestamp;
    
    if (timePassed >= 30 * 60 * 1000) {
        if (userBalance.debt > halfDebt) {
            const lostCash = Math.min(userBalance.cash, halfDebt);
            const lostBank = Math.min(userBalance.bank, halfDebt - lostCash);
            
            userBalance.cash -= lostCash;
            userBalance.bank -= lostBank;
            userBalance.debt = Math.max(0, userBalance.debt - (lostCash + lostBank));
            
            const sanctionMsg = `${getBorder()}✧ 𝐒𝐀𝐍𝐂𝐓𝐈𝐎𝐍: ${await getUserName(userId, api)} n'a pas remboursé!\n✧ Confiscation: ${formatNumber(lostCash + lostBank)}💲\n✧ Dette restante: ${formatNumber(userBalance.debt)}💲\n━━━━━━━━━━━━━━━━`;
            
            if (!isVIP) {
                try {
                    const groups = await api.getThreadList(100, null, ['INBOX']);
                    const userGroups = groups.filter(g => g.isGroup);
                    const shameMsg = `🚨 𝐀𝐋𝐄𝐑𝐓𝐄 𝐃𝐄𝐁𝐈𝐓𝐄𝐔𝐑!\n${await getUserName(userId, api)} a échoué à rembourser ${formatNumber(halfDebt)}💲!\nÉvitez les transactions avec cet utilisateur.\n━━━━━━━━━━━━━━━━`;
                    
                    let sent = 0;
                    for (const group of userGroups) {
                        if (sent >= 3) break;
                        try { await api.sendMessage(shameMsg, group.threadID); sent++; } catch {}
                    }
                } catch {}
            }
            
            await api.sendMessage(sanctionMsg, loan.threadID);
            
            if (userBalance.debt > 0) {
                loans[userId] = { ...loan, stage: 2, timestamp: now };
                setTimeout(() => checkLoanRepayment(userId, api, lang), 30 * 60 * 1000);
            } else { delete loans[userId]; }
        } else {
            loans[userId] = { ...loan, stage: 2, timestamp: now };
            const warningMsg = `${getBorder()}✧ Remboursement partiel accepté!\n✧ Il reste ${formatNumber(userBalance.debt)}💲 à payer.\n✧ Délai: 30 minutes supplémentaires.\n━━━━━━━━━━━━━━━━`;
            await api.sendMessage(warningMsg, loan.threadID);
            setTimeout(() => checkLoanRepayment(userId, api, lang), 30 * 60 * 1000);
        }
        
        saveBalance(balance);
    }
}

const LANG = {
    fr: {
        menu: `${getBorder()}✧ 𝐂𝐡𝐨𝐢𝐬𝐢𝐬𝐬𝐞𝐳 𝐮𝐧𝐞 𝐨𝐩𝐭𝐢𝐨𝐧:\n\n💰 𝐅𝐢𝐧𝐚𝐧𝐜𝐞:\n➤ ~bank solde [motdepasse]\n➤ ~bank déposer [montant] [motdepasse]\n➤ ~bank retirer [montant] [motdepasse]\n➤ ~bank transfer [uid] [montant] [motdepasse]\n\n🏦 𝐏𝐫ê𝐭𝐬:\n➤ ~bank prêt [montant] [motdepasse]\n➤ ~bank dette [motdepasse]\n➤ ~bank rembourser [montant] [motdepasse]\n\n🎯 𝐈𝐧𝐯𝐞𝐬𝐭𝐢𝐬𝐬𝐞𝐦𝐞𝐧𝐭𝐬:\n➤ ~bank investir [montant]\n➤ ~bank hrinvest [montant]\n➤ ~bank crypto [montant]\n\n🎰 𝐉𝐞𝐮 & 𝐑𝐢𝐬𝐪𝐮𝐞:\n➤ ~bank gamble [montant] [motdepasse]\n➤ ~bank casino [montant]\n➤ ~bank heist [cible]\n➤ ~bank loterie buy\n\n🛡️ 𝐒é𝐜𝐮𝐫𝐢𝐭é:\n➤ ~bank setpassword [motdepasse]\n➤ ~bank changepassword [nouveau] [ancien]\n➤ ~bank removepassword [motdepasse]\n➤ ~bank vault deposit [montant]\n➤ ~bank vault withdraw [montant]\n➤ ~bank insure buy\n\n👑 𝐕𝐈𝐏 & 𝐒𝐭𝐚𝐭𝐮𝐭:\n➤ ~bank vip\n➤ ~bank vip list\n➤ ~bank leaderboard\n➤ ~bank achievements\n\n⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐭𝐢𝐨𝐧:\n➤ ~bank mode text/image/video\n➤ ~bank language fr/en\n➤ ~bank stats [global]\n\n🔧 𝐀𝐝𝐦𝐢𝐧 (é𝐥𝐢𝐭𝐞):\n➤ ~bank admin set [uid] [valeur]\n➤ ~bank admin vip [uid]\n➤ ~bank admin prison [uid] [minutes]\n━━━━━━━━━━━━━━━━`,
        
        solde: (bank, cash, debt, vip) => `${getBorder()}✧ 𝐕𝐨𝐭𝐫𝐞 𝐬𝐨𝐥𝐝𝐞:\n\n💰 Cash: ${formatNumber(cash)}💲\n🏦 Banque: ${formatNumber(bank)}💲\n📈 Intérêts: ${vip ? '20% 🌟' : '5%'}\n🎯 Dette: ${formatNumber(debt)}💲${vip ? '\n👑 Statut: VIP 🌟' : ''}\n━━━━━━━━━━━━━━━━`,
        
        depositSuccess: (amount, balance) => `${getBorder()}✧ 𝐃é𝐩ô𝐭 𝐫é𝐮𝐬𝐬𝐢!\n✧ Montant: ${formatNumber(amount)}💲\n✧ Nouveau solde: ${formatNumber(balance)}💲\n━━━━━━━━━━━━━━━━`,
        
        withdrawSuccess: (amount, cash) => `${getBorder()}✧ 𝐑𝐞𝐭𝐫𝐚𝐢𝐭 𝐫é𝐮𝐬𝐬𝐢!\n✧ Montant: ${formatNumber(amount)}💲\n✧ Cash disponible: ${formatNumber(cash)}💲\n━━━━━━━━━━━━━━━━`,
        
        loanSuccess: (amount, debt, half) => `${getBorder()}✧ 𝐏𝐫ê𝐭 𝐚𝐜𝐜𝐨𝐫𝐝é!\n✧ Montant: ${formatNumber(amount)}💲\n✧ Dette totale: ${formatNumber(debt)}💲\n⚠️ Remboursez ${formatNumber(half)}💲 dans 30min!\n━━━━━━━━━━━━━━━━`,
        
        transferSuccess: (amount, target, name) => `${getBorder()}✧ 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫𝐭 𝐞𝐟𝐟𝐞𝐜𝐭𝐮é!\n✧ Montant: ${formatNumber(amount)}💲\n✧ Destinataire: ${name}\n✧ UID: ${target}\n━━━━━━━━━━━━━━━━`,
        
        vipActivated: () => `${getBorder()}🎉 𝐒𝐓𝐀𝐓𝐔𝐓 𝐕𝐈𝐏 𝐀𝐂𝐓𝐈𝐕𝐄!\n\n🌟 𝐀𝐯𝐚𝐧𝐭𝐚𝐠𝐞𝐬:\n• Intérêts: 20% (au lieu de 5%)\n• Prêt max: 4,000,000💲\n• Transfert max: 10M💲/jour\n• Pas de pénalités de dette\n• Accès exclusif au casino\n\n👑 Bienvenue dans l'élite!\n━━━━━━━━━━━━━━━━`,
        
        debtWarning: (debt, time) => `      ➔【𝐀𝐋𝐄𝐑𝐓𝐄 𝐃𝐄𝐓𝐓𝐄】\n✧════════════✧\n⚠️ Dette impayée: ${formatNumber(debt)}💲\n⏰ Temps restant: ${time} minutes\n❌ Sanction à l'échéance!\n✧════════════✧`,
        
        adminOnly: () => `      ➔【𝐀𝐂𝐂𝐄𝐒 𝐑𝐄𝐅𝐔𝐒𝐄】\n✧════════════✧\n✧ Seuls les administrateurs peuvent utiliser cette commande.\n✧════════════✧`
    },
    en: {
        menu: `${getBorder()}✧ 𝐂𝐡𝐨𝐨𝐬𝐞 𝐚𝐧 𝐨𝐩𝐭𝐢𝐨𝐧:\n\n💰 𝐅𝐢𝐧𝐚𝐧𝐜𝐞:\n➤ ~bank balance [password]\n➤ ~bank deposit [amount] [password]\n➤ ~bank withdraw [amount] [password]\n➤ ~bank transfer [uid] [amount] [password]\n\n🏦 𝐋𝐨𝐚𝐧𝐬:\n➤ ~bank loan [amount] [password]\n➤ ~bank debt [password]\n➤ ~bank repay [amount] [password]\n\n🎯 𝐈𝐧𝐯𝐞𝐬𝐭𝐦𝐞𝐧𝐭𝐬:\n➤ ~bank invest [amount]\n➤ ~bank hrinvest [amount]\n➤ ~bank crypto [amount]\n\n🎰 𝐆𝐚𝐦𝐞 & 𝐑𝐢𝐬𝐤:\n➤ ~bank gamble [amount] [password]\n➤ ~bank casino [amount]\n➤ ~bank heist [target]\n➤ ~bank lottery buy\n\n🛡️ 𝐒𝐞𝐜𝐮𝐫𝐢𝐭𝐲:\n➤ ~bank setpassword [password]\n➤ ~bank changepassword [new] [old]\n➤ ~bank removepassword [password]\n➤ ~bank vault deposit [amount]\n➤ ~bank vault withdraw [amount]\n➤ ~bank insure buy\n\n👑 𝐕𝐈𝐏 & 𝐒𝐭𝐚𝐭𝐮𝐬:\n➤ ~bank vip\n➤ ~bank vip list\n➤ ~bank leaderboard\n➤ ~bank achievements\n\n⚙️ 𝐂𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐭𝐢𝐨𝐧:\n➤ ~bank mode text/image/video\n➤ ~bank language fr/en\n➤ ~bank stats [global]\n\n🔧 𝐀𝐝𝐦𝐢𝐧 (𝐞𝐥𝐢𝐭𝐞):\n➤ ~bank admin set [uid] [value]\n➤ ~bank admin vip [uid]\n➤ ~bank admin prison [uid] [minutes]\n━━━━━━━━━━━━━━━━`,
        
        solde: (bank, cash, debt, vip) => `${getBorder()}✧ 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞:\n\n💰 Cash: ${formatNumber(cash)}💲\n🏦 Bank: ${formatNumber(bank)}💲\n📈 Interest: ${vip ? '20% 🌟' : '5%'}\n🎯 Debt: ${formatNumber(debt)}💲${vip ? '\n👑 Status: VIP 🌟' : ''}\n━━━━━━━━━━━━━━━━`,
        
        depositSuccess: (amount, balance) => `${getBorder()}✧ 𝐃𝐞𝐩𝐨𝐬𝐢𝐭 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n✧ Amount: ${formatNumber(amount)}💲\n✧ New balance: ${formatNumber(balance)}💲\n━━━━━━━━━━━━━━━━`,
        
        withdrawSuccess: (amount, cash) => `${getBorder()}✧ 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰𝐚𝐥 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n✧ Amount: ${formatNumber(amount)}💲\n✧ Available cash: ${formatNumber(cash)}💲\n━━━━━━━━━━━━━━━━`,
        
        loanSuccess: (amount, debt, half) => `${getBorder()}✧ 𝐋𝐨𝐚𝐧 𝐚𝐩𝐩𝐫𝐨𝐯𝐞𝐝!\n✧ Amount: ${formatNumber(amount)}💲\n✧ Total debt: ${formatNumber(debt)}💲\n⚠️ Repay ${formatNumber(half)}💲 in 30min!\n━━━━━━━━━━━━━━━━`,
        
        transferSuccess: (amount, target, name) => `${getBorder()}✧ 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫 𝐜𝐨𝐦𝐩𝐥𝐞𝐭𝐞𝐝!\n✧ Amount: ${formatNumber(amount)}💲\n✧ Recipient: ${name}\n✧ UID: ${target}\n━━━━━━━━━━━━━━━━`,
        
        vipActivated: () => `${getBorder()}🎉 𝐕𝐈𝐏 𝐒𝐓𝐀𝐓𝐔𝐒 𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄𝐃!\n\n🌟 𝐀𝐝𝐯𝐚𝐧𝐭𝐚𝐠𝐞𝐬:\n• Interest: 20% (instead of 5%)\n• Max loan: 4,000,000💲\n• Max transfer: 10M💲/day\n• No debt penalties\n• Exclusive casino access\n\n👑 Welcome to the elite!\n━━━━━━━━━━━━━━━━`,
        
        debtWarning: (debt, time) => `      ➔【𝐃𝐄𝐁𝐓 𝐀𝐋𝐄𝐑𝐓】\n✧════════════✧\n⚠️ Unpaid debt: ${formatNumber(debt)}💲\n⏰ Time remaining: ${time} minutes\n❌ Sanction at maturity!\n✧════════════✧`,
        
        adminOnly: () => `      ➔【𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃】\n✧════════════✧\n✧ Only administrators can use this command.\n✧════════════✧`
    }
};

module.exports = {
    config: {
        name: "bank",
        version: "8.0",
        author: "Uchiha Perdu & ʚʆɞ Sømå Sønïč ʚʆɞ",
        role: 0,
        category: "💰 Économie",
        shortDescription: "Système bancaire ultime avec vidéo",
        longDescription: "Gestion bancaire complète avec sécurité, investissements, prêts, et modes texte/image/vidéo",
        guide: "{pn} [commande] [options]"
    },
    
    onStart: async function({ message, event, args, api, usersData }) {
        const userId = event.senderID;
        const threadId = event.threadID;
        
        let balance = loadBalance();
        let users = loadUsers();
        let security = loadSecurity();
        
        if (!balance[userId]) {
            balance[userId] = {
                bank: 0,
                cash: 1000,
                debt: 0,
                vault: 0,
                password: null,
                insurance: false,
                karma: 0,
                failedHeists: 0,
                prisonUntil: 0,
                dailyStreak: 0,
                lastDaily: 0,
                lastInterest: 0
            };
        }
        
        if (!users[userId]) {
            const userName = await getUserName(userId, api);
            users[userId] = {
                name: userName,
                language: 'fr',
                vip: false,
                displayMode: DISPLAY_MODES.TEXT,
                achievements: []
            };
        }
        
        const userData = balance[userId];
        if (userData.prisonUntil > Date.now()) {
            const prisonTime = Math.ceil((userData.prisonUntil - Date.now()) / (60 * 1000));
            const lang = users[userId].language || 'fr';
            await sendResponse(
                `      ➔【𝐏𝐑𝐈𝐒𝐎𝐍】\n✧════════════✧\n✧════════════✧\n✧ Vous êtes en prison! ⛓️\n⏰ Temps restant: ${prisonTime} minutes\n🚫 Commandes bloquées: gamble, heist, invest, loan\n━━━━━━━━━━━━━━━━`,
                'error',
                { Status: 'Prison', 'Temps restant': `${prisonTime}min`, message: 'Compte bloqué temporairement' },
                users[userId].displayMode,
                api,
                event,
                users[userId].name
            );
            return;
        }
        
        if (security.attempts?.[userId] && Date.now() - security.attempts[userId].timestamp > 5 * 60 * 1000) {
            delete security.attempts[userId];
        }
        
        const userLang = users[userId].language || 'fr';
        const isVIP = users[userId].vip || false;
        const displayMode = users[userId].displayMode || DISPLAY_MODES.TEXT;
        const userName = users[userId].name;
        
        const noPasswordCommands = ['setpassword', 'mode', 'language', 'vip', 'vip list', 'leaderboard', 'top', 'help', 'menu'];
        
        const command = args[0]?.toLowerCase();
        const subCommand = args[1]?.toLowerCase();
        
        if (!command) {
            await sendResponse(
                LANG[userLang].menu,
                'menu',
                { 'Mode actuel': displayMode.toUpperCase(), Langue: userLang.toUpperCase(), Statut: isVIP ? 'VIP 🌟' : 'Standard' },
                displayMode,
                api,
                event,
                userName
            );
            return;
        }
        
        const ADMIN_UID = ["61578433048588", "100083846212138"];
        if (command === 'admin') {
            if (userId !== ADMIN_UID) {
                await sendResponse(LANG[userLang].adminOnly(), 'error', { message: 'Accès admin refusé' }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'set' && args[2] && args[3]) {
                const target = args[2];
                const amount = parseInt(args[3]);
                if (!balance[target]) balance[target] = { bank: 0, cash: 0, debt: 0 };
                balance[target].bank = amount;
                saveBalance(balance);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: Solde de ${target} défini à ${formatNumber(amount)}💲\n━━━━━━━━━━━━━━━━`, 'success', { message: `Solde défini pour ${target}: ${formatNumber(amount)}💲` }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'vip' && args[2]) {
                const target = args[2];
                if (!users[target]) users[target] = { language: 'fr', vip: false };
                users[target].vip = true;
                saveUsers(users);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: VIP accordé à ${target}\n━━━━━━━━━━━━━━━━`, 'success', { message: `VIP accordé à ${target}` }, displayMode, api, event, userName);
                return;
            }
            
            if (subCommand === 'prison' && args[2] && args[3]) {
                const target = args[2];
                const minutes = parseInt(args[3]);
                if (!balance[target]) balance[target] = { prisonUntil: 0 };
                balance[target].prisonUntil = Date.now() + minutes * 60 * 1000;
                saveBalance(balance);
                await sendResponse(`${getBorder()}✅ 𝐀𝐝𝐦𝐢𝐧: ${target} en prison pour ${minutes} minutes\n━━━━━━━━━━━━━━━━`, 'success', { message: `${target} en prison pour ${minutes} minutes` }, displayMode, api, event, userName);
                return;
            }
        }
        
        let password = args[args.length - 1];
        const requiresPassword = !noPasswordCommands.includes(command) && 
                                !noPasswordCommands.includes(`${command} ${subCommand}`);
        
        if (requiresPassword && balance[userId].password) {
            if (!password || password !== balance[userId].password.toString()) {
                if (!security.attempts) security.attempts = {};
                if (!security.attempts[userId]) {
                    security.attempts[userId] = { count: 0, timestamp: Date.now() };
                }
                
                security.attempts[userId].count++;
                
                if (security.attempts[userId].count >= 3) {
                    balance[userId].prisonUntil = Date.now() + 5 * 60 * 1000;
                    saveBalance(balance);
                    security.attempts[userId] = { count: 0, timestamp: Date.now() };
                    
                    await sendResponse(
                        `      ➔【𝐁𝐋𝐎𝐐𝐔𝐄】\n✧════════════✧\n❌ Trop de tentatives!\n🔒 Compte bloqué 5 minutes\n✧════════════✧`,
                        'error',
                        { message: 'Compte bloqué - trop de tentatives' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                saveSecurity(security);
                
                await sendResponse(
                    `      ➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ Mot de passe incorrect!\n⚠️ Tentative ${security.attempts[userId].count}/3\n✧════════════✧`,
                    'error',
                    { message: 'Mot de passe incorrect' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                return;
            }
            
            if (security.attempts?.[userId]) {
                delete security.attempts[userId];
                saveSecurity(security);
            }
            
            args.pop();
        }
        
        switch (command) {
            case 'solde':
            case 'balance': {
                await sendResponse(
                    LANG[userLang].solde(balance[userId].bank, balance[userId].cash, balance[userId].debt, isVIP),
                    'solde',
                    { cash: balance[userId].cash, bank: balance[userId].bank, debt: balance[userId].debt, vip: isVIP, insurance: balance[userId].insurance },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'déposer':
            case 'deposit': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Montant invalide!\n💡 Exemple: ~bank déposer 1000 motdepasse\n✧════════════✧`,
                        'error',
                        { message: 'Montant invalide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ Cash insuffisant!\n💰 Vous avez: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { message: 'Cash insuffisant' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].cash -= amount;
                balance[userId].bank += amount;
                saveBalance(balance);
                
                if (!security.transactions) security.transactions = [];
                security.transactions.push({ userId, type: 'DEPOSIT', amount, timestamp: Date.now() });
                saveSecurity(security);
                
                await sendResponse(
                    LANG[userLang].depositSuccess(amount, balance[userId].bank),
                    'depot',
                    { amount, newBalance: balance[userId].bank },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'retirer':
            case 'withdraw': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Montant invalide!\n💡 Exemple: ~bank retirer 1000 motdepasse\n✧════════════✧`,
                        'error',
                        { message: 'Montant invalide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].bank < amount) {
                    await sendResponse(
                        `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ Solde bancaire insuffisant!\n🏦 Vous avez: ${formatNumber(balance[userId].bank)}💲\n✧════════════✧`,
                        'error',
                        { message: 'Solde bancaire insuffisant' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].bank -= amount;
                balance[userId].cash += amount;
                saveBalance(balance);
                
                await sendResponse(
                    LANG[userLang].withdrawSuccess(amount, balance[userId].cash),
                    'retrait',
                    { amount, cash: balance[userId].cash },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'prêt':
            case 'loan': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Montant invalide!\n💡 Exemple: ~bank prêt 50000 motdepasse\n✧════════════✧`,
                        'error',
                        { message: 'Montant invalide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const maxLoan = isVIP ? 4000000 : 1000000;
                const remainingLoan = maxLoan - balance[userId].debt;
                
                if (remainingLoan <= 0) {
                    await sendResponse(
                        `      ➔【𝐋𝐈𝐌𝐈𝐓𝐄】\n✧════════════✧\n✧ Limite de prêt atteinte!\n🎯 Dette actuelle: ${formatNumber(balance[userId].debt)}💲\n✧════════════✧`,
                        'error',
                        { message: 'Limite de prêt atteinte' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (amount > remainingLoan) {
                    await sendResponse(
                        `      ➔【𝐃𝐄𝐏𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓】\n✧════════════✧\n✧ Vous ne pouvez emprunter que ${formatNumber(remainingLoan)}💲 de plus!\n✧════════════✧`,
                        'error',
                        { message: 'Montant dépassant la limite' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].cash += amount;
                balance[userId].debt += amount;
                saveBalance(balance);
                
                loans[userId] = { amount, threadID: threadId, timestamp: Date.now(), stage: 1 };
                setTimeout(() => checkLoanRepayment(userId, api, userLang), 30 * 60 * 1000);
                
                await sendResponse(
                    LANG[userLang].loanSuccess(amount, balance[userId].debt, amount / 2),
                    'pret',
                    { amount, debt: balance[userId].debt, half: amount / 2 },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'transfer':
            case 'transférer': {
                const target = args[1];
                const amount = parseInt(args[2]);
                
                if (!target || !amount || amount <= 0) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Syntaxe: ~bank transfer [UID] [montant] [motdepasse]\n✧════════════✧`,
                        'error',
                        { message: 'Syntaxe invalide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ Cash insuffisant!\n💰 Vous avez: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { message: 'Cash insuffisant' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (!balance[target]) {
                    balance[target] = { bank: 0, cash: 0, debt: 0, vault: 0, password: null };
                }
                
                if (!users[target]) {
                    users[target] = { name: await getUserName(target, api), language: 'fr', vip: false };
                }
                
                balance[userId].cash -= amount;
                balance[target].cash += amount;
                saveBalance(balance);
                saveUsers(users);
                
                const targetName = users[target].name;
                
                try {
                    await api.sendMessage(
                        `${getBorder()}🎉 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐓 𝐑𝐄Ç𝐔!\n\n✧ Montant: ${formatNumber(amount)}💲\n✧ Expéditeur: ${userName}\n✧ Votre nouveau cash: ${formatNumber(balance[target].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        target
                    );
                } catch {}
                
                await sendResponse(
                    LANG[userLang].transferSuccess(amount, target, targetName),
                    'transfert',
                    { amount, target: targetName, uid: target },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'vip': {
                if (subCommand === 'list') {
                    const vipUsers = Object.entries(users)
                        .filter(([_, data]) => data.vip)
                        .map(([uid, data]) => `${data.name} (${uid})`)
                        .join('\n');
                    
                    await sendResponse(
                        `${getBorder()}👑 𝐋𝐈𝐒𝐓𝐄 𝐕𝐈𝐏:\n\n${vipUsers || 'Aucun VIP pour le moment'}\n━━━━━━━━━━━━━━━━`,
                        'vip',
                        { message: vipUsers || 'Aucun VIP' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (isVIP) {
                    await sendResponse(
                        `${getBorder()}✅ Vous êtes déjà VIP! 🌟\n━━━━━━━━━━━━━━━━`,
                        'vip',
                        { message: 'Déjà VIP' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const requiredBalance = 3000000000;
                if (balance[userId].bank >= requiredBalance) {
                    users[userId].vip = true;
                    saveUsers(users);
                    
                    if (!users[userId].achievements.includes('VIP')) {
                        users[userId].achievements.push('VIP');
                        saveUsers(users);
                    }
                    
                    await sendResponse(
                        LANG[userLang].vipActivated(),
                        'vip',
                        { required: requiredBalance, current: balance[userId].bank },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    const missing = requiredBalance - balance[userId].bank;
                    await sendResponse(
                        `${getBorder()}❌ 𝐒𝐎𝐋𝐃𝐄 𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓!\n\n💰 Requis: ${formatNumber(requiredBalance)}💲\n🏦 Vous avez: ${formatNumber(balance[userId].bank)}💲\n🎯 Manquant: ${formatNumber(missing)}💲\n━━━━━━━━━━━━━━━━`,
                        'error',
                        { message: 'Solde insuffisant pour VIP' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }
            
            case 'mode': {
                const mode = args[1]?.toLowerCase();
                if (!mode || !Object.values(DISPLAY_MODES).includes(mode)) {
                    await sendResponse(
                        `${getBorder()}🎨 𝐌𝐎𝐃𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:\n\n➤ ~bank mode text\n➤ ~bank mode image\n➤ ~bank mode video\n\n📱 Mode actuel: ${displayMode.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { message: 'Modes disponibles' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                users[userId].displayMode = mode;
                saveUsers(users);
                
                await sendResponse(
                    `${getBorder()}✅ Mode d'affichage changé: ${mode.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                    'success',
                    { message: `Mode changé en ${mode}` },
                    mode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'language':
            case 'langue': {
                const lang = args[1]?.toLowerCase();
                if (lang !== 'fr' && lang !== 'en') {
                    await sendResponse(
                        `${getBorder()}🌍 𝐋𝐀𝐍𝐆𝐔𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒:\n\n➤ ~bank language fr\n➤ ~bank language en\n\n🗣️ Langue actuelle: ${userLang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { message: 'Langues disponibles' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (lang === userLang) {
                    await sendResponse(
                        `${getBorder()}ℹ️ Langue déjà définie sur ${lang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { message: 'Langue déjà définie' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                users[userId].language = lang;
                saveUsers(users);
                
                await sendResponse(
                    `${getBorder()}✅ Langue changée: ${lang.toUpperCase()}\n━━━━━━━━━━━━━━━━`,
                    'success',
                    { message: `Langue changée en ${lang}` },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'setpassword': {
                const newPassword = args[1];
                if (!newPassword) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Syntaxe: ~bank setpassword [motdepasse]\n✧════════════✧`,
                        'error',
                        { message: 'Mot de passe manquant' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = newPassword;
                saveBalance(balance);
                
                await sendResponse(
                    `      ➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ Mot de passe défini avec succès!\n✧════════════✧`,
                    'security',
                    { message: 'Mot de passe défini' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'changepassword': {
                const newPass = args[1];
                const oldPass = args[2];
                
                if (!newPass || !oldPass) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Syntaxe: ~bank changepassword [nouveau] [ancien]\n✧════════════✧`,
                        'error',
                        { message: 'Arguments manquants' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].password !== oldPass) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n✧ Ancien mot de passe incorrect!\n✧════════════✧`,
                        'error',
                        { message: 'Ancien mot de passe incorrect' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = newPass;
                saveBalance(balance);
                
                await sendResponse(
                    `      ➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ Mot de passe changé avec succès!\n✧════════════✧`,
                    'security',
                    { message: 'Mot de passe changé' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'removepassword': {
                if (!balance[userId].password) {
                    await sendResponse(
                        `      ➔【𝐈𝐍𝐅𝐎】\n✧════════════✧\n✧ ℹ️ Aucun mot de passe défini!\n✧════════════✧`,
                        'info',
                        { message: 'Pas de mot de passe défini' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].password = null;
                saveBalance(balance);
                
                await sendResponse(
                    `      ➔【𝐌𝐎𝐓 𝐃𝐄 𝐏𝐀𝐒𝐒𝐄】\n✧════════════✧\n✧ ✅ Mot de passe supprimé!\n✧════════════✧`,
                    'security',
                    { message: 'Mot de passe supprimé' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'gamble': {
                const amount = parseInt(args[1]);
                if (!amount || amount <= 0) {
                    await sendResponse(
                        `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n ✧ Syntaxe: ~bank gamble [montant] [motdepasse]\n✧════════════✧`,
                        'error',
                        { message: 'Montant invalide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].cash < amount) {
                    await sendResponse(
                        `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧ Cash insuffisant!\n💰 Vous avez: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                        'error',
                        { message: 'Cash insuffisant' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                balance[userId].cash -= amount;
                const win = Math.random() < 0.5;
                const winAmount = win ? amount * 2 : 0;
                
                if (win) {
                    balance[userId].cash += winAmount;
                    if (!users[userId].achievements.includes('Gambler')) {
                        users[userId].achievements.push('Gambler');
                    }
                    
                    await sendResponse(
                        `${getBorder()}🎰 𝐉𝐀𝐂𝐊𝐏𝐎𝐓!\n\n💰 Pari: ${formatNumber(amount)}💲\n🎉 Gain: ${formatNumber(winAmount)}💲\n💸 Nouveau cash: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'gamble',
                        { result: 'WIN', amount: winAmount },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    if (balance[userId].insurance) {
                        const refund = Math.floor(amount * 0.5);
                        balance[userId].cash += refund;
                        
                        await sendResponse(
                            `${getBorder()}💸 𝐏𝐄𝐑𝐓𝐄 𝐀𝐒𝐒𝐔𝐑𝐄𝐄!\n\n💰 Pari: ${formatNumber(amount)}💲\n🛡️ Remboursé: ${formatNumber(refund)}💲 (50%)\n💸 Nouveau cash: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                            'gamble',
                            { result: 'LOST_INSURED', refund: refund },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                    } else {
                        await sendResponse(
                            `${getBorder()}💸 𝐏𝐄𝐑𝐓𝐄!\n\n💰 Pari: ${formatNumber(amount)}💲\n😢 Perdu: ${formatNumber(amount)}💲\n💸 Nouveau cash: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                            'gamble',
                            { result: 'LOST', loss: amount },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                    }
                }
                break;
            }
            
            case 'heist': {
                const target = args[1];
                
                if (COOLDOWNS[`heist_${userId}`] && Date.now() - COOLDOWNS[`heist_${userId}`] < 30 * 60 * 1000) {
                    const remaining = Math.ceil((30 * 60 * 1000 - (Date.now() - COOLDOWNS[`heist_${userId}`])) / (60 * 1000));
                    await sendResponse(
                        `      ➔【𝐂𝐎𝐎𝐋𝐃𝐎𝐖𝐍】\n✧════════════✧\n✧⏰ Heist en cooldown!\n🕒 Temps restant: ${remaining} minutes\n✧════════════✧`,
                        'error',
                        { message: 'Heist en cooldown' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (balance[userId].failedHeists >= 5) {
                    balance[userId].prisonUntil = Date.now() + 60 * 60 * 1000;
                    saveBalance(balance);
                    
                    await sendResponse(
                        `      ➔【𝐏𝐑𝐈𝐒𝐎𝐍】\n✧════════════✧\n✧ \n🚨 Trop d'échecs!\n⛓️ Prison: 1 heure\n✧════════════✧`,
                        'error',
                        { message: 'Trop d\'échecs de heist' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const success = Math.random() < 0.35;
                COOLDOWNS[`heist_${userId}`] = Date.now();
                
                if (success) {
                    let stealAmount = 0;
                    
                    if (target) {
                        if (!balance[target]) {
                            await sendResponse(
                                `      ➔【𝐄𝐑𝐑𝐄𝐔𝐑】\n✧════════════✧\n ✧ Cible introuvable!\n✧════════════✧`,
                                'error',
                                { message: 'Cible introuvable' },
                                displayMode,
                                api,
                                event,
                                userName
                            );
                            return;
                        }
                        
                        stealAmount = Math.min(balance[target].cash * 0.3, 1000000);
                        balance[target].cash -= stealAmount;
                        
                        try {
                            await api.sendMessage(
                                `      ➔【𝐕𝐎𝐋】\n✧════════════✧\n 🚨 Vous avez été braqué!\n💰 Volé: ${formatNumber(stealAmount)}💲\n💸 Votre cash: ${formatNumber(balance[target].cash)}💲\n✧════════════✧`,
                                target
                            );
                        } catch {}
                    } else {
                        stealAmount = Math.floor(Math.random() * 500000) + 100000;
                    }
                    
                    balance[userId].cash += stealAmount;
                    balance[userId].failedHeists = 0;
                    
                    if (!users[userId].achievements.includes('Heist Master')) {
                        users[userId].achievements.push('Heist Master');
                    }
                    
                    await sendResponse(
                        `${getBorder()}💰 𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄 𝐑𝐄𝐔𝐒𝐒𝐈!\n\n🎯 Type: ${target ? 'Ciblé' : 'Banque'}\n💸 Volé: ${formatNumber(stealAmount)}💲\n💰 Nouveau cash: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'heist',
                        { result: 'SUCCESS', amount: stealAmount, type: target ? 'TARGETED' : 'BANK' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    balance[userId].failedHeists = (balance[userId].failedHeists || 0) + 1;
                    const penalty = Math.min(balance[userId].cash * 0.2, 50000);
                    balance[userId].cash -= penalty;
                    
                    if (balance[userId].failedHeists >= 3) {
                        balance[userId].prisonUntil = Date.now() + 30 * 60 * 1000;
                    }
                    
                    await sendResponse(
                        `${getBorder()}🚔 𝐁𝐑𝐀𝐐𝐔𝐀𝐆𝐄 𝐄𝐂𝐇𝐎𝐔𝐄!\n\n💸 Pénalité: ${formatNumber(penalty)}💲\n❌ Échecs consécutifs: ${balance[userId].failedHeists}\n${balance[userId].failedHeists >= 3 ? '⛓️ Prison: 30 minutes' : ''}\n━━━━━━━━━━━━━━━━`,
                        'heist',
                        { result: 'FAILED', penalty: penalty, fails: balance[userId].failedHeists },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }
            
            case 'insure':
            case 'insurance': {
                if (subCommand === 'buy') {
                    const cost = 5000;
                    if (balance[userId].cash < cost) {
                        await sendResponse(
                            `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n ✧ Cash insuffisant!\n💰 Coût: ${formatNumber(cost)}💲\n💸 Vous avez: ${formatNumber(balance[userId].cash)}💲\n✧════════════✧`,
                            'error',
                            { message: 'Cash insuffisant' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].cash -= cost;
                    balance[userId].insurance = true;
                    
                    if (!users[userId].achievements.includes('Insured')) {
                        users[userId].achievements.push('Insured');
                    }
                    
                    await sendResponse(
                        `${getBorder()}🛡️ 𝐀𝐒𝐒𝐔𝐑𝐀𝐍𝐂𝐄 𝐀𝐂𝐇𝐄𝐓𝐄𝐄!\n\n💰 Coût: ${formatNumber(cost)}💲\n✅ Protection activée pour 24h\n🔒 Couvre: Pertes gamble, échecs heist\n━━━━━━━━━━━━━━━━`,
                        'security',
                        { insurance: 'BOUGHT', cost: cost },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                await sendResponse(
                    `${getBorder()}🛡️ 𝐀𝐒𝐒𝐔𝐑𝐀𝐍𝐂𝐄:\n\n➤ ~bank insure buy\n💡 Coût: 5,000💲\n✅ Protège vos pertes\n━━━━━━━━━━━━━━━━`,
                    'info',
                    { message: 'Information assurance' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'vault': {
                const action = args[1]?.toLowerCase();
                const amount = parseInt(args[2]);
                
                if (!action || !amount || amount <= 0) {
                    await sendResponse(
                        `${getBorder()}🔐 𝐂𝐎𝐅𝐅𝐑𝐄-𝐅𝐎𝐑𝐓:\n\n➤ ~bank vault deposit [montant]\n➤ ~bank vault withdraw [montant]\n💡 Sécurisé contre les braquages\n━━━━━━━━━━━━━━━━`,
                        'info',
                        { message: 'Information coffre-fort' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                if (action === 'deposit') {
                    if (balance[userId].cash < amount) {
                        await sendResponse(
                            `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n ✧ Cash insuffisant!\n✧════════════✧`,
                            'error',
                            { message: 'Cash insuffisant' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].cash -= amount;
                    balance[userId].vault += amount;
                    
                    await sendResponse(
                        `${getBorder()}🔐 𝐃𝐄𝐏𝐎𝐓 𝐕𝐀𝐔𝐋𝐓!\n\n💰 Montant: ${formatNumber(amount)}💲\n🏦 Vault: ${formatNumber(balance[userId].vault)}💲\n💸 Cash restant: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'vault',
                        { action: 'DEPOSIT', amount: amount, vault: balance[userId].vault },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else if (action === 'withdraw') {
                    if (balance[userId].vault < amount) {
                        await sendResponse(
                            `      ➔【𝐈𝐍𝐒𝐔𝐅𝐅𝐈𝐒𝐀𝐍𝐓】\n✧════════════✧\n✧════════════✧\n✧ Fonds vault insuffisants!\n✧════════════✧`,
                            'error',
                            { message: 'Fonds vault insuffisants' },
                            displayMode,
                            api,
                            event,
                            userName
                        );
                        return;
                    }
                    
                    balance[userId].vault -= amount;
                    balance[userId].cash += amount;
                    
                    await sendResponse(
                        `${getBorder()}🔓 𝐑𝐄𝐓𝐑𝐀𝐈𝐓 𝐕𝐀𝐔𝐋𝐓!\n\n💰 Montant: ${formatNumber(amount)}💲\n🏦 Vault restant: ${formatNumber(balance[userId].vault)}💲\n💸 Nouveau cash: ${formatNumber(balance[userId].cash)}💲\n━━━━━━━━━━━━━━━━`,
                        'vault',
                        { action: 'WITHDRAW', amount: amount, vault: balance[userId].vault },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }
            
            case 'top':
            case 'leaderboard': {
                const sorted = Object.entries(balance)
                    .filter(([uid, data]) => data.bank > 0)
                    .sort(([, a], [, b]) => b.bank - a.bank)
                    .slice(0, 10);
                
                if (sorted.length === 0) {
                    await sendResponse(
                        `${getBorder()}📊 𝐂𝐋𝐀𝐒𝐒𝐄𝐌𝐄𝐍𝐓 𝐕𝐈𝐃𝐄\n\nAucun ninja n'a encore de fonds en banque!\n━━━━━━━━━━━━━━━━`,
                        'top',
                        { message: 'Classement vide' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                let leaderboard = `${getBorder()}🏆 𝐓𝐎𝐏 𝟏𝟎 𝐁𝐀𝐍𝐐𝐔𝐄 🏆\n\n`;
                
                for (let i = 0; i < sorted.length; i++) {
                    const [uid, data] = sorted[i];
                    const name = users[uid]?.name || `User_${uid}`;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
                    leaderboard += `${medal} ${i + 1}. ${name}: ${formatNumber(data.bank)}💲\n`;
                }
                
                const topUser = sorted[0];
                const topName = users[topUser[0]]?.name || `User_${topUser[0]}`;
                leaderboard += `\n👑 ${topName} domine la banque!\n━━━━━━━━━━━━━━━━`;
                
                const topData = {};
                sorted.forEach(([uid, data], i) => {
                    topData[`${i + 1}. ${users[uid]?.name || uid.substring(0, 6)}`] = formatNumber(data.bank) + '💲';
                });
                
                await sendResponse(leaderboard, 'top', topData, displayMode, api, event, userName);
                break;
            }
            
            case 'daily': {
                const now = Date.now();
                const lastDaily = balance[userId].lastDaily || 0;
                
                if (now - lastDaily < 24 * 60 * 60 * 1000) {
                    const next = new Date(lastDaily + 24 * 60 * 60 * 1000);
                    const hours = Math.ceil((next - now) / (60 * 60 * 1000));
                    
                    await sendResponse(
                        `      ➔【𝐂𝐎𝐎𝐋𝐃𝐎𝐖𝐍】\n✧════════════✧\n⏰ Daily déjà récupéré!\n🕒 Prochain: ${hours} heures\n✧════════════✧`,
                        'error',
                        { message: 'Daily déjà récupéré' },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const baseReward = 1000;
                const streakBonus = Math.min(balance[userId].dailyStreak || 0, 30) * 50;
                const randomBonus = Math.floor(Math.random() * 500);
                const totalReward = baseReward + streakBonus + randomBonus;
                
                balance[userId].cash += totalReward;
                balance[userId].dailyStreak = (balance[userId].dailyStreak || 0) + 1;
                balance[userId].lastDaily = now;
                
                if (!users[userId].achievements.includes('Daily Player')) {
                    users[userId].achievements.push('Daily Player');
                }
                
                if (balance[userId].dailyStreak % 7 === 0) {
                    balance[userId].cash += 10000;
                    await sendResponse(
                        `${getBorder()}🎉 𝐃𝐀𝐈𝐋𝐘 𝐱𝟕!\n\n💰 Base: ${formatNumber(baseReward)}💲\n🔥 Streak: ${balance[userId].dailyStreak} jours\n🎲 Bonus: ${formatNumber(randomBonus)}💲\n🎁 Spécial 7j: +10,000💲\n💸 Total: ${formatNumber(totalReward + 10000)}💲\n━━━━━━━━━━━━━━━━`,
                        'daily',
                        { reward: totalReward + 10000, streak: balance[userId].dailyStreak, special: true },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                } else {
                    await sendResponse(
                        `${getBorder()}🎉 𝐃𝐀𝐈𝐋𝐘 𝐑𝐄𝐂𝐔𝐏𝐄𝐑𝐄!\n\n💰 Base: ${formatNumber(baseReward)}💲\n🔥 Streak: ${balance[userId].dailyStreak} jours\n🎲 Bonus: ${formatNumber(randomBonus)}💲\n💸 Total: ${formatNumber(totalReward)}💲\n━━━━━━━━━━━━━━━━`,
                        'daily',
                        { reward: totalReward, streak: balance[userId].dailyStreak },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                }
                break;
            }
            
            case 'stats': {
                if (subCommand === 'global' && isVIP) {
                    const totalUsers = Object.keys(balance).length;
                    const totalMoney = Object.values(balance).reduce((sum, data) => sum + data.bank + data.cash, 0);
                    const totalDebt = Object.values(balance).reduce((sum, data) => sum + data.debt, 0);
                    const vipCount = Object.values(users).filter(u => u.vip).length;
                    
                    await sendResponse(
                        `${getBorder()}📊 𝐒𝐓𝐀𝐓𝐒 𝐆𝐋𝐎𝐁𝐀𝐋𝐄𝐒\n\n👥 Utilisateurs: ${totalUsers}\n💰 Argent total: ${formatNumber(totalMoney)}💲\n🎯 Dette totale: ${formatNumber(totalDebt)}💲\n👑 VIPs: ${vipCount}\n🏦 Transactions: ${security.transactions?.length || 0}\n━━━━━━━━━━━━━━━━`,
                        'stats',
                        { users: totalUsers, money: totalMoney, debt: totalDebt, vips: vipCount },
                        displayMode,
                        api,
                        event,
                        userName
                    );
                    return;
                }
                
                const achievements = users[userId].achievements.join(', ') || 'Aucun';
                const karma = balance[userId].karma || 0;
                const karmaLevel = karma < 0 ? 'Risqué ⚠️' : karma < 10 ? 'Normal' : karma < 50 ? 'Fiable ✅' : 'Légendaire 👑';
                
                await sendResponse(
                    `${getBorder()}📊 𝐕𝐎𝐒 𝐒𝐓𝐀𝐓𝐒\n\n👤 Nom: ${userName}\n🎯 UID: ${userId}\n🏦 Banque: ${formatNumber(balance[userId].bank)}💲\n💰 Cash: ${formatNumber(balance[userId].cash)}💲\n🔐 Vault: ${formatNumber(balance[userId].vault)}💲\n🎯 Dette: ${formatNumber(balance[userId].debt)}💲\n❤️ Karma: ${karma} (${karmaLevel})\n🏆 Achievements: ${achievements}\n🔥 Daily Streak: ${balance[userId].dailyStreak || 0} jours\n━━━━━━━━━━━━━━━━`,
                    'stats',
                    { bank: balance[userId].bank, cash: balance[userId].cash, vault: balance[userId].vault, debt: balance[userId].debt, karma: karma, achievements: achievements },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            case 'help':
            case 'menu': {
                await sendResponse(
                    LANG[userLang].menu,
                    'menu',
                    { 'Mode actuel': displayMode.toUpperCase(), 'Langue': userLang.toUpperCase(), 'Statut': isVIP ? 'VIP 🌟' : 'Standard' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
            
            default: {
                await sendResponse(
                    `${getBorder()}❌ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄 𝐈𝐍𝐂𝐎𝐍𝐍𝐔𝐄\n\n💡 Tapez ~bank pour voir le menu\n🔍 Ou ~bank help pour l'aide\n━━━━━━━━━━━━━━━━`,
                    'error',
                    { message: 'Commande inconnue' },
                    displayMode,
                    api,
                    event,
                    userName
                );
                break;
            }
        }
        
        saveBalance(balance);
        saveUsers(users);
        saveSecurity(security);
    }
};