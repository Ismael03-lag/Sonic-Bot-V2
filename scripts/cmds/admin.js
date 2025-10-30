const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

const SUPER_ADMIN = "61578433048588";

module.exports = {
	config: {
		name: "admin",
		version: "2.0",
		author: "ミ★𝐒𝐎𝐍𝐈𝐂✄𝐄𝚇𝙴 3.0★彡",
		countDown: 5,
		role: 2,
		description: {
			vi: "Thêm, xóa, sửa quyền admin (Super Admin không thể xóa, cảnh báo trong nhóm khi ai đó thử xóa)",
			en: "Add, remove, edit admin role (Super Admin cannot be removed, warn in group if someone tries)"
		},
		category: "box chat",
		guide: {
			vi: '   {pn} [add | -a] <uid | @tag>: Thêm quyền admin cho người dùng'
				+ '\n	  {pn} [remove | -r] <uid | @tag>: Xóa quyền admin của người dùng (trừ Super Admin)'
				+ '\n	  {pn} [list | -l]: Liệt kê danh sách admin',
			en: '   {pn} [add | -a] <uid | @tag>: Add admin role for user'
				+ '\n	  {pn} [remove | -r] <uid | @tag>: Remove admin role of user (except Super Admin)'
				+ '\n	  {pn} [list | -l]: List all admins'
		}
	},

	langs: {
		vi: {
			added: "✅ | Đã thêm quyền admin cho %1 người dùng:\n%2",
			alreadyAdmin: "\n⚠️ | %1 người dùng đã có quyền admin từ trước rồi:\n%2",
			missingIdAdd: "⚠️ | Vui lòng nhập ID hoặc tag người dùng muốn thêm quyền admin",
			removed: "✅ | Đã xóa quyền admin của %1 người dùng:\n%2",
			notAdmin: "⚠️ | %1 người dùng không có quyền admin:\n%2",
			missingIdRemove: "⚠️ | Vui lòng nhập ID hoặc tag người dùng muốn xóa quyền admin",
			listAdmin: "👑 | Danh sách admin:\n%1",
			cannotRemoveSuper: "⛔ | Không thể xóa Super Admin (%1)",
			reportRemoveTry: "🚨 | CẢNH BÁO! Người dùng 🔥 %1 (ID: %2) đã cố gắng xóa 👑 Super Admin!"
		},
		en: {
			added: "✅ | Added admin role for %1 users:\n%2",
			alreadyAdmin: "\n⚠️ | %1 users already have admin role:\n%2",
			missingIdAdd: "⚠️ | Please enter ID or tag user to add admin role",
			removed: "✅ | Removed admin role of %1 users:\n%2",
			notAdmin: "⚠️ | %1 users don't have admin role:\n%2",
			missingIdRemove: "⚠️ | Please enter ID or tag user to remove admin role",
			listAdmin: "👑𝑨𝑫𝑴𝑰𝑵'𝑺 𝑩𝑶𝑻👑\n◆━━━━━━━▣✦▣━━━━━━━━◆\n%1",
			cannotRemoveSuper: "⛔",
			reportRemoveTry: "\n🚨 | 𝐀𝐋𝐄𝐑𝐓 ! %1 (%2) 𝐯𝐨𝐮𝐬 𝐧'𝐚𝐯𝐞𝐳 𝐩𝐨𝐢𝐧𝐭 𝐥'𝐚𝐮𝐭𝐨𝐫𝐢𝐬𝐚𝐭𝐢𝐨𝐧 𝐝𝐞 𝐫𝐞𝐭𝐢𝐫𝐞𝐫 𝐜𝐞𝐭 𝐚𝐝𝐦𝐢𝐧 👑!"
		}
	},

	onStart: async function ({ message, args, usersData, event, getLang }) {
		switch (args[0]) {
			case "add":
			case "-a": {
				if (args[1]) {
					let uids = [];
					if (Object.keys(event.mentions).length > 0)
						uids = Object.keys(event.mentions);
					else if (event.messageReply)
						uids.push(event.messageReply.senderID);
					else
						uids = args.filter(arg => !isNaN(arg));
					const notAdminIds = [];
					const adminIds = [];
					for (const uid of uids) {
						if (config.adminBot.includes(uid))
							adminIds.push(uid);
						else
							notAdminIds.push(uid);
					}

					config.adminBot.push(...notAdminIds);
					const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(
						(notAdminIds.length > 0 ? getLang("added", notAdminIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
						+ (adminIds.length > 0 ? getLang("alreadyAdmin", adminIds.length, adminIds.map(uid => `• ${uid}`).join("\n")) : "")
					);
				}
				else
					return message.reply(getLang("missingIdAdd"));
			}
			case "remove":
			case "-r": {
				if (args[1]) {
					let uids = [];
					if (Object.keys(event.mentions).length > 0)
						uids = Object.keys(event.mentions);
					else
						uids = args.filter(arg => !isNaN(arg));

					// 🔒 Protection Super Admin
					if (uids.includes(SUPER_ADMIN)) {
						const userName = await usersData.getName(event.senderID);
						await message.reply(getLang("cannotRemoveSuper", SUPER_ADMIN));
						await message.send(
							"====⛔ 𝐀𝐃𝐌𝐈𝐍 𝐀𝐋𝐄𝐑𝐓 ⛔====\n" +
							"n◆━━━━━━━▣✦▣━━━━━━━━◆" +
							getLang("reportRemoveTry", userName, event.senderID) +
							"\n◆━━━━━━━▣✦▣━━━━━━━━◆\n" +
							""
						);
						return;
					}

					const notAdminIds = [];
					const adminIds = [];
					for (const uid of uids) {
						if (config.adminBot.includes(uid))
							adminIds.push(uid);
						else
							notAdminIds.push(uid);
					}
					for (const uid of adminIds)
						config.adminBot.splice(config.adminBot.indexOf(uid), 1);
					const getNames = await Promise.all(adminIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(
						(adminIds.length > 0 ? getLang("removed", adminIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
						+ (notAdminIds.length > 0 ? getLang("notAdmin", notAdminIds.length, notAdminIds.map(uid => `• ${uid}`).join("\n")) : "")
					);
				}
				else
					return message.reply(getLang("missingIdRemove"));
			}
			case "list":
			case "-l": {
				const getNames = await Promise.all(config.adminBot.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
				return message.reply(getLang("listAdmin", getNames.map(({ uid, name }) => `╭──⊚\n│${name}\n│${uid}\n╰─────────⊚`).join("\n")));
			}
			default:
				return message.SyntaxError();
		}
	}
};