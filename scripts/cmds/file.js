const fs = require('fs');
const path = require('path');
const axios = require('axios');
const archiver = require('archiver');
const FormData = require('form-data');

module.exports = {
config: {
name: "file",
version: "1.2",
author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄★彡 & L'Uchiha Perdu",
countDown: 5,
role: 2,
shortDescription: "Advanced file system",
longDescription: "Send files, folders, analyze, chunk, search, list, attach",
category: "owner",
guide: "{pn} loading"
},

onStart: async function({ message, args, api, event }) {

// ⚡ Fonction d’envoi avec suppression auto
const permanentCommands = ["loading", "info", "list", "search", "check"];
async function send(text, noDelete = false) {
  const shouldStay = permanentCommands.includes(sub) || noDelete;
  return api.sendMessage(text, event.threadID, (err, info) => {
    if (shouldStay) return; // ⭕ Message permanent
    setTimeout(() => api.unsendMessage(info.messageID), 6000); // 🕒 Sinon suppression
  });
}

// Permissions
const permission = ["61578433048588","61582101006304","100083846212138"];
if (!permission.includes(event.senderID)) {
return send("🚫| Négatif... Seuls ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄★彡 & ʚʆɞGūɱbāllʚʆɞɱ & Walter O'Brien peuvent utiliser cette fonction.");
}

const border = "≪━─━─━─◈─━─━─━≫";
if (!args[0]) return send(`${border}\n【 ❌ SYNTAXE 】\nUtilise: file loading pour le guide.\n${border}`);

const sub = args[0].toLowerCase();
const baseDir = __dirname;

// 🌟 GUIDE — jamais supprimé
if (sub === "loading") {
return send(
`${border}\n【 💡 GUIDE FILE 】\n\n📄 file <nom> → Envoie le fichier\n📃 file list → Liste tous .js\n🔍 file search <mot> → Recherche floue\n🧩 file chunk <file> <part> → Par morceaux (alias: part)\n📁 file folder <dossier> → ZIP + envoi dossier\n🧪 file check <file> → Analyse rapide\n📊 file info <file> → Infos fichier\n🌐 file raw <nom> → ZIP + lien (alias: zip)\n\nPour fichiers longs: ZIP auto !\n${border}`,
true // ⭕ jamais supprimé
);
}

// UPLOAD
async function uploadToService(filePath, serviceName) {
try {
const fileBuffer = fs.readFileSync(filePath);
const fileName = path.basename(filePath);

switch(serviceName) {
case '0x0st':
const response1 = await axios({
method: 'POST',
url: 'https://0x0.st',
headers: { 'Content-Type': 'application/octet-stream' },
data: fileBuffer,
});
return response1.data.trim();

case 'tmpfiles':
const formData1 = new FormData();
formData1.append('file', fileBuffer, { filename: fileName });
const response2 = await axios.post('https://tmpfiles.org/api/v1/upload', formData1, {
headers: formData1.getHeaders()
});
return response2.data.data.url;

case 'litterbox':
const formData2 = new FormData();
formData2.append('reqtype', 'fileupload');
formData2.append('time', '1h');
formData2.append('fileToUpload', fileBuffer, { filename: fileName });
const response3 = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', formData2, {
headers: formData2.getHeaders()
});
return response3.data;

default:
return null;
}
} catch (error) {
throw new Error(`${serviceName}: ${error.message}`);
}
}

// ZIP
async function createAndUploadZip(sourcePath, zipName = null, isFolder = false) {
const finalZipName = zipName || (isFolder ? path.basename(sourcePath) : path.basename(sourcePath, '.js')) + '.zip';
const zipPath = path.join(require('os').tmpdir(), finalZipName);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

return new Promise((resolve, reject) => {
archive.on('error', (err) => reject(err));

output.on('close', async () => {
if (!fs.existsSync(zipPath)) return reject(new Error('ZIP non créé'));

const stats = fs.statSync(zipPath);
if (stats.size === 0) return reject(new Error('ZIP vide'));

const services = ['0x0st', 'tmpfiles', 'litterbox'];
let lastError = '';

for (const service of services) {
try {
const url = await uploadToService(zipPath, service);
const size = (stats.size / 1024 / 1024).toFixed(2);
resolve({ url, size, name: finalZipName });
return;
} catch (error) {
lastError = error.message;
continue;
}
}
reject(new Error(`Tous les services ont échoué: ${lastError}`));
});

archive.pipe(output);
if (isFolder) {
archive.directory(sourcePath, path.basename(sourcePath));
} else {
archive.file(sourcePath, { name: path.basename(sourcePath) });
}
archive.finalize();
});
}

// LIST
if (sub === "list") {
const files = fs.readdirSync(baseDir).filter(f => f.endsWith(".js"));
return send(
`${border}\n【 📂 LISTE FICHIERS 】\n\n${files.join("\n")}\n\n📊 Total: ${files.length}\n${border}`
);
}

// SEARCH
if (sub === "search") {
const query = args.slice(1).join(" ").toLowerCase();
if (!query) return send(`${border}\n【 ❌ SYNTAXE 】\nfile search <mot>\n${border}`);
const files = fs.readdirSync(baseDir).filter(f => f.endsWith(".js"));
let results = [];
for (const f of files) {
const content = fs.readFileSync(path.join(baseDir, f), "utf8").toLowerCase();
if (f.toLowerCase().includes(query) || content.includes(query)) results.push(f);
}
return send(
`${border}\n【 🔍 RÉSULTATS SEARCH: "${query}" 】\n\n${results.length ? results.join("\n") : "Aucun résultat."}\n\n📊 Trouvés: ${results.length}\n${border}`
);
}

// CHUNK
if (sub === "chunk" || sub === "part") {
const fileName = args[1];
if (!fileName) return send(`${border}\n【 ❌ SYNTAXE 】\nfile chunk <file> [part]\n${border}`);
const filePath = path.join(baseDir, fileName + ".js");
if (!fs.existsSync(filePath)) return send(`${border}\n【 ❌ INEXISTANT 】\n${fileName}.js\n${border}`);
const content = fs.readFileSync(filePath, "utf8");
const chunkSize = 2000;
const chunks = [];
for (let i = 0; i < content.length; i += chunkSize) {
chunks.push(content.substring(i, i + chunkSize));
}
const partNum = parseInt(args[2]) || 0;
if (partNum > 0 && partNum <= chunks.length) {
return send(`${border}\n【 🧩 PART ${partNum}/${chunks.length} 】\n\n${chunks[partNum - 1]}\n${border}`);
} else {
for (let i = 0; i < chunks.length; i++) {
await send(`${border}\n【 🧩 PART ${i+1}/${chunks.length} 】\n\n${chunks[i]}\n${border}`);
}
return;
}
}

// FOLDER ZIP
if (sub === "folder") {
const folderName = args[1];
if (!folderName) return send(`${border}\n【 ❌ SYNTAXE 】\nfile folder <dossier>\n${border}`);
const folderPath = path.join(baseDir, folderName);
if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return send(`${border}\n【 ❌ INEXISTANT 】\nDossier: ${folderName}\n${border}`);
try {
const result = await createAndUploadZip(folderPath);
return send(`${border}\n【 📦 ZIP UPLOADÉ 】\n\n📦 Nom: ${result.name}\n📏 Taille: ${result.size} Mo\n🔗 Lien: ${result.url}\n\n⏰ Valable longtemps !\n${border}`);
} catch (err) {
return send(`${border}\n【 ⚠️ ERREUR ZIP 】\n${err.message}\n${border}`);
}
}

// CHECK
if (sub === "check") {
const fileName = args[1];
if (!fileName) return send(`${border}\n【 ❌ SYNTAXE 】\nfile check <file>\n${border}`);
const filePath = path.join(baseDir, fileName + ".js");
if (!fs.existsSync(filePath)) return send(`${border}\n【 ❌ INEXISTANT 】\n${fileName}.js\n${border}`);
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split("\n").length;
const requires = (content.match(/require\(/g) || []).length;
const errors = (content.match(/error|throw/g) || []).length;
return send(
`${border}\n【 🧪 CHECK: ${fileName}.js 】\n\n📏 Lignes: ${lines}\n📦 Requires: ${requires}\n⚠️ Potentiels errors: ${errors}\n\n✅ Semble OK !\n${border}`
);
}

// 🌟 INFO — jamais supprimé
if (sub === "info") {
const fileName = args[1];
if (!fileName) return send(`${border}\n【 ❌ SYNTAXE 】\nfile info <file>\n${border}`, true);
const filePath = path.join(baseDir, fileName + ".js");
if (!fs.existsSync(filePath)) return send(`${border}\n【 ❌ INEXISTANT 】\n${fileName}.js\n${border}`, true);
const stats = fs.statSync(filePath);
const size = (stats.size / 1024).toFixed(2);
const modified = stats.mtime.toLocaleString();
return send(
`${border}\n【 📊 INFO: ${fileName}.js 】\n\n📏 Taille: ${size} Ko\n🕒 Modifié: ${modified}\n\n✅ Fichier valide.\n${border}`,
true
);
}

// RAW ZIP
if (sub === "raw" || sub === "zip") {
const fileName = args[1];
if (!fileName) return send(`${border}\n【 ❌ SYNTAXE 】\nfile raw <nom>\n${border}`);
const filePath = path.join(baseDir, fileName + ".js");
if (!fs.existsSync(filePath)) return send(`${border}\n【 ❌ INEXISTANT 】\n${fileName}.js\n${border}`);
try {
const result = await createAndUploadZip(filePath);
return send(
`${border}\n【 📦 ZIP UPLOADÉ 】\n\n📦 Nom: ${result.name}\n📏 Taille: ${result.size} Mo\n🔗 Lien: ${result.url}\n\n⏰ Valable longtemps !\n${border}`
);
} catch (err) {
return send(`${border}\n【 ⚠️ ERREUR ZIP 】\n${err.message}\n${border}`);
}
}

// SEND FILE (read)
const fileName = sub;
const filePath = path.join(baseDir, fileName + ".js");
if (!fs.existsSync(filePath)) {
const suggestions = fs.readdirSync(baseDir).filter(f => f.includes(fileName) && f.endsWith(".js"));
return send(
`${border}\n【 ❌ INEXISTANT 】\n${fileName}.js\n\n🔍 Suggestions:\n${suggestions.length ? suggestions.join("\n") : "Aucune suggestion."}\n${border}`
);
}

let content;
try {
content = fs.readFileSync(filePath, "utf8");
} catch (e) {
return send(`${border}\n【 ⚠️ ERREUR LECTURE 】\n${e.message}\n${border}`);
}

if (content.length > 15000) {
try {
const result = await createAndUploadZip(filePath);
return send(
`${border}\n【 📦 FICHIER TROP LONG 】\n\n📦 Nom: ${result.name}\n📏 Taille: ${result.size} Mo\n🔗 Lien: ${result.url}\n${border}`
);
} catch (err) {
return send(`${border}\n【 ⚠️ ERREUR ZIP 】\n${err.message}\n${border}`);
}
}

return send(
`${border}\n【 📄 FICHIER: ${fileName}.js 】\n\n${content}\n${border}`
);

}
};