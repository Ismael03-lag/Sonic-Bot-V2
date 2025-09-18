const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "gist",
    version: "1.1",
    category: "Tools",
    author: "MarianCross",
    description: "Create Gist and get raw file URL.",
  },

  async handleCommand({ message, event, args }) {


    if (!args[0]) {
      return message.reply("Please specify a file name.", event.threadID);
    }

    const fileName = args[0];
    const filePath = path.join(__dirname, "..", "cmds", fileName);
    const filePathJs = filePath + ".js";

    let finalPath = null;
    if (fs.existsSync(filePath)) {
      finalPath = filePath;
    } else if (fs.existsSync(filePathJs)) {
      finalPath = filePathJs;
    } else {
      return message.reply("File not found!", event.threadID);
    }

    try {
      const fileContent = fs.readFileSync(finalPath, 'utf8');
      const fetch = await import('node-fetch').then(mod => mod.default);

      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          "Authorization": `token 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`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "RAVEN auto-generated Gist",
          public: false,
          files: {
            [path.basename(finalPath)]: {
              content: fileContent,
            },
          },
        }),
      });

      const data = await response.json();

      if (!data.files) {
        return message.reply(`Failed to create Gist: ${data.message || "Unknown error"}`, event.threadID);
      }

      const rawUrl = data.files[path.basename(finalPath)].raw_url;
      return message.reply(rawUrl, event.threadID); // J'ai modifié cette ligne pour n'envoyer que l'URL

    } catch (error) {
      console.error("Error while creating Gist:", error);
      return message.reply(`Error: ${error.message}`, event.threadID);
    }
  },

  onStart(params) {
    return this.handleCommand(params);
  },
};
