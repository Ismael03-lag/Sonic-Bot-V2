const fs = require("fs");


module.exports = {
  config: {
    name: "bank",
    description: "Deposit or withdraw money from the bank and earn interest",
    guide: {
      vi: "",
      en: "Bank:\nInterest - Balance - Withdraw - Deposit - Transfer - Richest - Loan - Payloan - Lottery - Gamble - HighRiskInvest[hrinvest] - Heist"
    },
    category: "game",
    countDown: 1,
    role: 0,
    author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝐗𝐄 3.0★彡"
  },
  onStart: async function ({ args, message, event,api, usersData }) {
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);

    const userMoney = await usersData.get(event.senderID, "money");
    const user = parseInt(event.senderID);
    const info = await api.getUserInfo(user);
                        const username = info[user].name;
    const bankData = JSON.parse(fs.readFileSync("./bank.json", "utf8"));

    if (!bankData[user]) {
      bankData[user] = { bank: 0, lastInterestClaimed: Date.now() };
      fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    }

    const command = args[0]?.toLowerCase();
    const amount = parseInt(args[1]);
    const recipientUID = parseInt(args[2]);

    switch (command) {
      case "deposit":
  const depositPassword = args[1];
  const depositAmount = parseInt(args[2]);

  if (!depositPassword || !depositAmount) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide both a password and a valid amount for deposit.🔑\n\nIf you don't set your password then set by -bank setpassword (password)\n\nExample: -bank deposit (your_password) (your_amount)");
  }

  if (bankData[user].password !== depositPassword) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑");
  }

  if (isNaN(depositAmount) || depositAmount <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid deposit amount.💸");
  }

  if (userMoney < depositAmount) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have the required amount✖");
  }

  bankData[user].bank += depositAmount;
  await usersData.set(event.senderID, {
    money: userMoney - depositAmount
  });
  fs.writeFileSync("./bank.json", JSON.stringify(bankData));

  return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully deposited ${depositAmount}$ into your bank account.`);


      case "withdraw":
  const withdrawPassword = args[1]; 
  const withdrawAmount = parseInt(args[2]); 

  if (!withdrawPassword || !withdrawAmount) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide both a password and a valid amount for withdrawal.🔑\n\nIf you don't set your password then set by -bank setpassword (password)\n\nExample: -bank withdraw (your_password) (your_amount)");
  }

  if (bankData[user].password !== withdrawPassword) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect password. Please try again.🔑");
  }

  const balance = bankData[user].bank || 0;

  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid withdrawal amount.💸");
  }

  if (withdrawAmount > balance) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The requested amount is greater than the available balance in your bank account.👽");
  }

  bankData[user].bank = balance - withdrawAmount;
  await usersData.set(event.senderID, {
    money: userMoney + withdrawAmount
  });
  fs.writeFileSync("./bank.json", JSON.stringify(bankData));

  return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully withdrew ${withdrawAmount}$ from your bank account.`);

        case "hrinvest":
  const investmentAmount = parseInt(args[1]);

  if (isNaN(investmentAmount) || investmentAmount <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid investment amount.💸");
  }

  const riskOutcome = Math.random() < 0.7; 
  const potentialReturns = investmentAmount * (riskOutcome ? 2 : 0.2); 

  if (riskOutcome) {
    bankData[user].bank -= investmentAmount;
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your high-risk investment of ${investmentAmount}$ was risky, and you lost your money. 😔`);
  } else {
    bankData[user].bank += potentialReturns;
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Congratulations! Your high-risk investment of ${investmentAmount}$ paid off, and you earned ${potentialReturns}$ in returns! 🎉`);
  }
        case "gamble":
  // Vérifie si l'utilisateur atteint automatiquement le statut VIP
  if (bankData[user].bank >= 100000000000 && bankData[user].role !== "VIP") {
    bankData[user].role = "VIP"; // Attribue automatiquement le statut VIP
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    message.reply(
      "🎉 Congratulations! You've been added to the VIP list because your bank balance reached 100,000,000,000$! You can now access the 'gamble' feature. 👑"
    );
  }

  // Vérifie si l'utilisateur est VIP
  if (bankData[user].role !== "VIP") {
    return message.reply(
      "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Only VIP users can access the 'gamble' feature.\n✧ Reach a bank balance of 100,000,000,000$ to unlock VIP status. 👑"
    );
  }

  const betAmount = parseInt(args[1]);

  // Vérifie si le montant du pari est valide
  if (isNaN(betAmount) || betAmount <= 0) {
    return message.reply(
      "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount to bet.💸"
    );
  }

  // Vérifie si l'utilisateur a suffisamment d'argent pour parier
  if (userMoney < betAmount) {
    return message.reply(
      "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You don't have enough money to place that bet. 🙅‍♂"
    );
  }

  // Détermine si l'utilisateur gagne ou perd
  const winChance = Math.random() < 0.5; // 50% de chance de gagner
  if (winChance) {
    const winnings = betAmount * 2; // Gains doublés si l'utilisateur gagne
    bankData[user].bank += winnings;
    await usersData.set(event.senderID, {
      money: userMoney - betAmount + winnings
    });
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(
      `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Congratulations! You've won ${winnings}$! 🎉`
    );
  } else {
    // Si l'utilisateur perd, on déduit le montant du pari
    bankData[user].bank -= betAmount;
    await usersData.set(event.senderID, {
      money: userMoney - betAmount
    });
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(
      `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Oh no! You've lost ${betAmount}$ in the gamble. 😢`
    );
  }
        case "heist":
  const heistSuccessChance = 0.2; 
  const heistWinAmount = 1000; 
  const heistLossAmount = 500; 

  const isSuccess = Math.random() < heistSuccessChance;

  if (isSuccess) {
    const winnings = heistWinAmount;
    bankData[user].bank += winnings;
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist successful! You've won ${winnings}$! 💰`);
  } else {
    const lossAmount = heistLossAmount;
    bankData[user].bank -= lossAmount;
    fs.writeFileSync("./bank.json", JSON.stringify(bankData));
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Bank heist failed! You've lost ${lossAmount}$! 😔`);
  }
      case "show":
        const bankBalance = bankData[user].bank !== undefined && !isNaN(bankData[user].bank) ? bankData[user].bank : 0;
        return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your bank balance is: ${bankBalance}$ •\n✧To withdraw money.\n type:\n${p}Bank Withdraw 'your withdrawal amount'•\n✧To earn interest\ntype:\n${p}Bank Interest•`);

      case "interest":
        const interestRate = 0.001; 
        const lastInterestClaimed = bankData[user].lastInterestClaimed || Date.now();
        const currentTime = Date.now();
        const timeDiffInSeconds = (currentTime - lastInterestClaimed) / 1000;
        const interestEarned = bankData[user].bank * (interestRate / 970) * timeDiffInSeconds;
        if (bankData[user].bank <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have any money in your bank account to earn interest.💸🤠");
        }

        bankData[user].lastInterestClaimed = currentTime;
        bankData[user].bank += interestEarned;

        fs.writeFileSync("./bank.json", JSON.stringify(bankData));

        return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You have earned interest of ${interestEarned.toFixed(2)} $ . It has been successfully added to your account balance..✅`);

    case "transfer":
  const senderBalance = bankData[user]?.bank || 0;
  if (isNaN(amount) || amount <= 0) {
      return message.reply(
          "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please enter a valid amount greater than 0 for the transfer. ♻"
      );
  }
  if (senderBalance < amount) {
      return message.reply(
          "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Insufficient funds in your bank account to complete this transfer. ✖"
      );
  }
  if (isNaN(recipientUID) || recipientUID <= 0) {
      return message.reply(
          `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Please provide a valid recipient ID (UID).\nExample:\n${p}bank transfer 5000 123456789`
      );
  }
  if (recipientUID === user) {
      return message.reply(
          "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You cannot transfer money to yourself. 🔄"
      );
  }
  if (!bankData[recipientUID]) {
      bankData[recipientUID] = { bank: 0, lastInterestClaimed: Date.now(), password: null };
  }
  bankData[user].bank -= amount;
  bankData[recipientUID].bank += amount;

  try {
      fs.writeFileSync("./bank.json", JSON.stringify(bankData));
  } catch (error) {
      return message.reply(
          "⚠️ An error occurred while updating the bank data. Please try again or contact support."
      );
  }

  let recipientName = "Unknown User";
  try {
      const recipientInfo = await api.getUserInfo(recipientUID);
      recipientName = recipientInfo[recipientUID]?.name || "Unknown User";
  } catch (error) { }

  // Message de confirmation pour les deux utilisateurs
  const transferMsg = `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You have transferred ${amount}$ to:\n✧ Name: ${recipientName}\n✧ BankID: ${recipientUID}\nYour current bank balance: ${bankData[user].bank}$\n\n~ HEDGEHOG Database ✅`;

  // Message de notification pour le destinataire
  const recipientMsg = `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You have received ${amount}$ from:\n✧ Name: ${username}\n✧ BankID: ${user}\nYour current bank balance: ${bankData[recipientUID].bank}$\n\n~ HEDGEHOG Database ✅`;

  // Envoie le message en inbox à l'expéditeur (lui-même)
  try {
      await api.sendMessage(transferMsg, user);
  } catch (e) { }
  // Envoie le message en inbox au destinataire
  try {
      await api.sendMessage(recipientMsg, recipientUID);
  } catch (e) { }

  // Confirme dans la conversation où la commande a été passée
  return message.reply(transferMsg);

   case "balance":
  // Vérifier si l'utilisateur a un compte bancaire initialisé
  if (!bankData[user]) {
    return message.reply(
      "==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ You do not have a bank account. Please create one by performing a transaction like 'deposit'."
    );
  }

  // Obtenir le solde bancaire de l'utilisateur
  const userBankBalance = bankData[user].bank || 0;

  // Répondre avec le solde actuel
  return message.reply(
    `==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧ Your current bank balance is: ${userBankBalance}$.\n✧ To deposit money, use:\n${p}bank deposit [amount]\n✧ To withdraw money, use:\n${p}bank withdraw [amount]\n━━━━━━━━━━━━━━━━`
  );

      case "top":
        const bankDataCp = JSON.parse(fs.readFileSync('./bank.json', 'utf8'));

        const topUsers = Object.entries(bankDataCp)
          .sort(([, a], [, b]) => b.bank - a.bank)
          .slice(0, 25);

        const output = (await Promise.all(topUsers.map(async ([userID, userData], index) => {
          const userName = await usersData.getName(userID);
          return `[${index + 1}. ${userName}]`;
        }))).join('\n');

        return message.reply("𝐑𝐢𝐜𝐡𝐞𝐬𝐭 𝐩𝐞𝐨𝐩𝐥𝐞 𝐢𝐧 𝐭𝐡𝐞 𝐔𝐂𝐇𝐈𝐖𝐀 𝐬𝐲𝐬𝐭𝐞𝐦👑🤴:\n" + output);

        case "setpassword":
  const newPassword = args[1];
  if (!newPassword) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide a new password to set.🔑");
  }
  bankData[user].password = newPassword;
  fs.writeFileSync("./bank.json", JSON.stringify(bankData));
  return message.reply("[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]\n━━━━━━━━━━━━━━━━\n✧Your password has been set successfully.🔑");

case "changepassword":
  const currentPassword = args[1];
  const newPwd = args[2]; 

  if (!currentPassword || !newPwd) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please provide your current password and a new password to change.🔑");
  }

  if (bankData[user].password !== currentPassword) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Incorrect current password. Please try again.🔑");
  }
  bankData[user].password = newPwd; 
  feFileSync  ("./bank.json", JSON.stringify(bankData));
  return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your password has been changed successfully.🔑");

case "removepassword":
  if (!bankData[user].password) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You do not have a password set for your account.🔒");
  }
  bankData[user].password = null;
  fs.writeFileSync("./bank.json", JSON.stringify(bankData));
  return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Your password has been removed successfully.🔒");


case "loan":
  const maxLoanAmount = 10000;
  const userLoan = bankData[user].loan || 0;
  const loanPayed = bankData[user].loanPayed !== undefined ? bankData[user].loanPayed : true;

  if (!amount) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid loan amount..❗");
  }

  if (amount > maxLoanAmount) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The maximum loan amount is 10000 ‼");
  }

  if (!loanPayed && userLoan > 0) {
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You cannot take a new loan until you pay off your current loan..🌚\nYour current loan to pay: ${userLoan}$`);
  }

  bankData[user].loan = userLoan + amount;
  bankData[user].loanPayed = false;
  bankData[user].bank += amount;

  fs.writeFileSync("./bank.json", JSON.stringify(bankData));

  return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You have successfully taken a loan of ${amount}$. Please note that loans must be repaid within a certain period.😉`);

          case "vip":
        // Sous-commande : "vip list"
        if (args[1] && args[1].toLowerCase() === "list") {
          const bankDataCp = JSON.parse(fs.readFileSync('./bank.json', 'utf8'));
          // Cherche tous les VIP
          const vipUsers = Object.entries(bankDataCp)
            .filter(([, data]) => data.role === "VIP")
            .sort(([, a], [, b]) => (b.bank || 0) - (a.bank || 0));
          if (vipUsers.length === 0) {
            return message.reply("👑 Il n'y a actuellement aucun membre VIP.");
          }
          // Prépare la liste avec noms et ID
          const vipList = (await Promise.all(vipUsers.map(async ([id, data], i) => {
            let name = "Inconnu";
            try {
              name = await usersData.getName(id);
            } catch {}
            return `[${i + 1}] ${name} (ID: ${id}) • Solde: ${data.bank || 0}$`;
          }))).join('\n');
          return message.reply("👑 Liste des membres VIP :\n" + vipList);
        }

        // Sinon, comportement VIP habituel :
        if (bankData[user].role === "VIP") {
          return message.reply(
            "🎉 You are already a VIP member! Enjoy your exclusive privileges. 👑"
          );
        }
        if (bankData[user].bank >= 100000000000) {
          bankData[user].role = "VIP";
          fs.writeFileSync("./bank.json", JSON.stringify(bankData));
          return message.reply(
            "🎉 Congratulations! You've been added to the VIP list because your bank balance reached 100,000,000,000$! You can now access VIP-exclusive features. 👑"
          );
        } else {
          return message.reply(
            "⛔ You need at least 100,000,000,000$ in your bank balance to become a VIP member. Keep saving! 💸"
          );
        }
           case "payloan":
  const loanBalance = bankData[user].loan || 0;

  if (isNaN(amount) || amount <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Please enter a valid amount to repay your loan..❗");
  }

  if (loanBalance <= 0) {
    return message.reply("==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You don't have any pending loan payments.😄");
  }

  if (amount > loanBalance) {
    return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧The amount required to pay off the loan is greater than your due amount. Please pay the exact amount.😊\nYour total loan: ${loanBalance}$`);
  }

  if (amount > userMoney) {
    return message.reply(`[🏦 ==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧You do not have ${amount}$ in your balance to repay the loan.❌\nType ${p}bal\nto view your current main balance..😞`);
  }

  bankData[user].loan = loanBalance - amount;

  if (loanBalance - amount === 0) {
    bankData[user].loanPayed = true;
  }

  await usersData.set(event.senderID, {
    money: userMoney - amount
  });


  fs.writeFileSync("./bank.json", JSON.stringify(bankData));

  return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━━\n✧Successfully repaid ${amount}$ towards your loan.✅\n\nto check type:\n${p}bank balance\n\nAnd your current loan to pay: ${bankData[user].loan}$`);


default:
        return message.reply(`==[🏦 𝐔𝐂𝐇𝐈𝐖𝐀 𝐁𝐀𝐍𝐊 🏦]==\n━━━━━━━━━━━━━━━\n📲| 𝙿𝚕𝚎𝚊𝚜𝚎 𝚞𝚜𝚎 𝚘𝚗𝚎 𝚘𝚏 𝚝𝚑𝚎 𝚏𝚘𝚕𝚕𝚘𝚠𝚒𝚗𝚐 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚜✧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐃𝐞𝐩𝐨𝐬𝐢𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐖𝐢𝐭𝐡𝐝𝐫𝐚𝐰\n✰ ${p}𝐁𝐚𝐧𝐤 𝐒𝐡𝐨𝐰\n✰ ${p}𝐁𝐚𝐧𝐤 𝐈𝐧𝐭𝐞𝐫𝐞𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐓𝐫𝐚𝐧𝐬𝐟𝐞𝐫\n✰ ${p}𝐁𝐚𝐧𝐤 𝐓𝐨𝐩\n✰ ${p}𝐁𝐚𝐧𝐤 𝐋𝐨𝐚𝐧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐏𝐚𝐲𝐥𝐨𝐚𝐧\n✰ ${p}𝐁𝐚𝐧𝐤 𝐇𝐫𝐢𝐧𝐯𝐞𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐆𝐚𝐦𝐛𝐥𝐞\n✰ ${p}𝐁𝐚𝐧𝐤 𝐇𝐞𝐢𝐬𝐭\n✰ ${p}𝐁𝐚𝐧𝐤 𝐁𝐚𝐥𝐚𝐧𝐜𝐞\n✰ ${p}𝐁𝐚𝐧𝐤 𝐕𝐈𝐏\n━━━━━━━━━━━━━━━━\n ===[🏦 𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗 🏦]===\n✧𝙿𝚕𝚎𝚊𝚜𝚎 𝚊𝚍𝚍 𝚙𝚊𝚜𝚜𝚠𝚘𝚛𝚍 𝚏𝚘𝚛 𝚜𝚎𝚌𝚞𝚛𝚎 𝚊𝚌𝚌𝚘𝚞𝚗𝚝✧\n✰ ${p}𝗕𝗮𝗻𝗸 𝘀𝗲𝘁𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n✰ ${p}𝗕𝗮𝗻𝗸 𝗰𝗵𝗮𝗻𝗴𝗲𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n✰ ${p}𝗕𝗮𝗻𝗸 𝗿𝗲𝗺𝗼𝘃𝗲𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱\n━━━━━━━━━━━━━━━━`);
    }
  }
};