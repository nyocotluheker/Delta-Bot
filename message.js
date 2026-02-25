import config from './settings/config.js';
import fs from 'fs';
import axios from 'axios';
import chalk from 'chalk';
import jimp from 'jimp';
import util from 'util';
import crypto from 'crypto';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import path from 'path';
import os from 'os';
import speed from 'performance-now';
import { spawn, exec, execSync } from 'child_process';
import pkg from 'socketon';
const { getContentType } = pkg;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import utilities
import { smsg, fetchJson, sleep, formatSize, runtime } from './system/lib/myfunction.js';
import { fquoted } from './system/lib/fquoted.js';

const clientHandler = async (client, m, chatUpdate, store) => {
    try {
        const body = (
            m.mtype === "conversation" ? m.message.conversation :
            m.mtype === "imageMessage" ? m.message.imageMessage.caption :
            m.mtype === "videoMessage" ? m.message.videoMessage.caption :
            m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
            m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson || '{}').id :
            m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId ||
            m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text : ""
        );
        
        const sender = m.key.fromMe ? client.user.id.split(":")[0] + "@s.whatsapp.net" ||
              client.user.id : m.key.participant || m.key.remoteJid;
        
        const senderNumber = sender.split('@')[0];
        const budy = (typeof m.text === 'string' ? m.text : '');
        const prefa = ["", "!", ".", ",", "🐤", "🗿"];

        const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΠΦ_&><`™©®Δ^βα~¦|/\\©^]/;
        const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : '.';
        const from = m.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const botNumber = await client.decodeJid(client.user.id);
        const isBot = botNumber.includes(senderNumber);
        
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const pushname = m.pushName || "No Name";
        const text  = args.join(" ");
        const q = text;
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const qmsg = (quoted.msg || quoted);
        const isMedia = /image|video|sticker|audio/.test(mime);

        // group
        const groupMetadata = m?.isGroup ? await client.groupMetadata(m.chat).catch(() => ({})) : {};
        const groupName = m?.isGroup ? groupMetadata.subject || '' : '';
        const participants = m?.isGroup ? groupMetadata.participants?.map(p => {
            let admin = null;
            if (p.admin === 'superadmin') admin = 'superadmin';
            else if (p.admin === 'admin') admin = 'admin';
            return {
                id: p.id || null,
                jid: p.jid || null,
                admin,
                full: p
            };
        }) || [] : [];
        const groupOwner = m?.isGroup ? participants.find(p => p.admin === 'superadmin')?.jid || '' : '';
        const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.jid || p.id);
        const isBotAdmins = m?.isGroup ? groupAdmins.includes(botNumber) : false;
        const isAdmins = m?.isGroup ? groupAdmins.includes(m.sender) : false;
        const isGroupOwner = m?.isGroup ? groupOwner === m.sender : false;
        
        if (m.message) {
            console.log('\x1b[30m--------------------\x1b[0m');
            console.log(chalk.bgHex("#4a69bd").bold(`▢ New Message`));
            console.log(
                chalk.bgHex("#ffffff").black(
                    `   ▢ Tanggal: ${new Date().toLocaleString()} \n` +
                    `   ▢ Pesan: ${m.body || m.mtype} \n` +
                    `   ▢ Pengirim: ${pushname} \n` +
                    `   ▢ JID: ${senderNumber} \n`
                )
            );
            console.log();
        }
        
        const reaction = async (jidss, emoji) => {
            client.sendMessage(jidss, {
                react: {
                    text: emoji,
                    key: m.key 
                } 
            });
        };
        
        async function reply(text) {
            client.sendMessage(m.chat, {
                text: "\n" + text + "\n",
                contextInfo: {
                    mentionedJid: [sender],
                    externalAdReply: {
                        title: config.settings.title,
                        body: config.settings.description,
                        thumbnailUrl: config.thumbUrl,
                        sourceUrl: config.socialMedia.Telegram,
                        renderLargerThumbnail: false,
                    }
                }
            }, { quoted: fquoted.packSticker });
        }
        
        const pluginsLoader = async (directory) => {
            let plugins = [];
            try {
                const folders = await fs.promises.readdir(directory);
                for (const file of folders) {
                    const filePath = path.join(directory, file);
                    if (filePath.endsWith(".js")) {
                        try {
                            const plugin = await import(`file://${filePath}?t=${Date.now()}`);
                            if (plugin.default) {
                                plugins.push(plugin.default);
                            } else {
                                plugins.push(plugin);
                            }
                        } catch (error) {
                            console.log(`${filePath}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.log('Error loading plugins:', error);
            }
            return plugins;
        };

        const pluginsDisable = true;
        const pluginsDir = path.resolve(__dirname, "./command");
        
        let plugins = [];
        if (fs.existsSync(pluginsDir)) {
            plugins = await pluginsLoader(pluginsDir);
        }
        
        const plug = {
            client,
            prefix,
            command, 
            reply, 
            text, 
            isBot,
            reaction,
            pushname, 
            mime,
            quoted,
            sleep,
            fquoted,
            fetchJson 
        };

        for (let plugin of plugins) {
            if (plugin.command && plugin.command.find(e => e == command.toLowerCase())) {
                if (plugin.isBot && !isBot) {
                    return;
                }
                
                if (plugin.private && !plug.isPrivate) {
                    return reply(config.message.private);
                }

                if (typeof plugin !== "function") return;
                await plugin(m, plug);
            }
        }
        
        if (!pluginsDisable) return;  

        switch (command) {
            case "menu": {
                if (!isBot) return;
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;
                const formattedUsedMem = formatSize(usedMem);
                const formattedTotalMem = formatSize(totalMem);
                let timestamp = speed();
                let latensi = speed() - timestamp;
                let menu = `
 ▢ speed: ${latensi.toFixed(4)} s
 ▢ runtime: ${runtime(process.uptime())}
 ▢ RAM: ${formattedUsedMem} / ${formattedTotalMem}

command:
 ▢ ${prefix}tagall
 ▢ ${prefix}get
 ▢ ${prefix}insp
 ▢ ${prefix}csesi
 ▢ ${prefix}exec
 ▢ ${prefix}eval
 ▢ ${prefix}mesinfo`;
                
                await client.sendMessage(m.chat, {
                    text: menu
                }, { quoted: fquoted.packSticker });
            }
            break;
            
            case "mesinfo": {
                if (!m.quoted) return reply("harap reply ke sebuah pesan untuk mengecek mtype dan id-nya.");
                const type = m.quoted.mtype;
                const id = m.quoted.id;
                reply(`Pesan yang di-reply memiliki:\n- Tipe pesan: *${type}*\n- ID pesan: *${id}*`);
            }
            break;
            
            case "get": {
                if (!isBot) return;
                if (!/^https?:\/\//.test(text)) return reply(`*ex:* ${prefix + command} https://kyuurzy.site`);
                await reaction(m.chat, "⚡");
                
                try {
                    const response = await fetch(text);
                    
                    if (response.headers.get("content-length") > 100 * 1024 * 1024) {
                        throw new Error(`Content-Length: ${response.headers.get("content-length")}`);
                    }

                    const contentType = response.headers.get("content-type");
                    
                    if (contentType.startsWith("image/")) {
                        const buffer = await response.arrayBuffer();
                        return client.sendMessage(m.chat, {
                            image: Buffer.from(buffer)
                        }, { quoted: fquoted.packSticker });
                    }
            
                    if (contentType.startsWith("video/")) {
                        const buffer = await response.arrayBuffer();
                        return client.sendMessage(m.chat, {
                            video: Buffer.from(buffer)
                        }, { quoted: fquoted.packSticker });
                    }
                    
                    if (contentType.startsWith("audio/")) {
                        const buffer = await response.arrayBuffer();
                        return client.sendMessage(m.chat, {
                            audio: Buffer.from(buffer),
                            mimetype: 'audio/mpeg', 
                            ptt: true
                        }, { quoted: fquoted.packSticker });
                    }
            
                    let text_content = await response.text();
                    try {
                        text_content = util.format(JSON.parse(text_content));
                    } catch (e) {
                        // tetap sebagai text
                    }
                    return reply(text_content.slice(0, 65536));
                } catch (error) {
                    return reply(`Error: ${error.message}`);
                }
            }
            break;
            
            case "insp": {
                if (!isBot) return;
                if (!text && !m.quoted) return reply(`*reply:* ${prefix + command}`);
                let quotedType = m.quoted?.mtype || '';
                let quotedMsg = m.quoted?.msg || m.quoted;
                let penis = JSON.stringify({ [quotedType]: quotedMsg }, null, 2);
                const acak = `insp-${crypto.randomBytes(6).toString('hex')}.json`;
                
                await client.sendMessage(m.chat, {
                    document: Buffer.from(penis),
                    fileName: acak,
                    mimetype: "application/json"
                }, { quoted: fquoted.packSticker });
            }
            break;
            
            case 'tagall': {
                if (!isBot) return;
                const textMessage = args.join(" ") || "nothing";
                let teks = `tagall message :\n> *${textMessage}*\n\n`;
                const groupMetadata = await client.groupMetadata(m.chat);
                const participants = groupMetadata.participants;
                for (let mem of participants) {
                    teks += `@${mem.id.split("@")[0]}\n`;
                }

                client.sendMessage(m.chat, {
                    text: teks,
                    mentions: participants.map((a) => a.id)
                }, { quoted: fquoted.packSticker });
            }
            break;
            
            case "exec": {
                if (!isBot) return;
                if (!budy.startsWith(".exec")) return;
                
                const args = budy.trim().split(' ').slice(1).join(' ');
                if (!args) return reply(`*ex:* ${prefix + command} ls`);
                exec(args, (err, stdout) => {
                    if (err) return reply(String(err));
                    if (stdout) return reply(stdout);
                });
            }
            break;
            
            case "eval": {
                if (!isBot) return;
                if (!budy.startsWith(".eval")) return;
                
                const args = budy.trim().split(' ').slice(1).join(' ');
                if (!args) return reply(`*ex:* ${prefix + command} m.chat`);
                let teks;
                try {
                    teks = await eval(`(async () => { ${args.startsWith("return") ? "" : "return"} ${args} })()`);
                } catch (e) {
                    teks = e;
                } finally {
                    await reply(util.format(teks));
                }
            }
            break;
            
            case "csesi": 
            case "clearsesi": {
                if (!isBot) return;
                const sesi = [config.session];
                const array = [];

                sesi.forEach(dirname => {
                    try {
                        const files = fs.readdirSync(dirname);
                        files.forEach(file => {
                            if (file !== 'creds.json') { 
                                array.push(path.join(dirname, file));
                            }
                        });
                    } catch (e) {
                        console.log(e);
                    }
                });

                const deletedFiles = [];

                array.forEach(file => {
                    try {
                        const stats = fs.statSync(file);
                        if (!stats.isDirectory()) {
                            fs.unlinkSync(file);
                            deletedFiles.push(file);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                });

                if (deletedFiles.length > 0) {
                    reply(`Success deleted ${deletedFiles.length} files`);
                    console.log('Deleted files:', deletedFiles);
                } else {
                    reply('tidak ada file yang tersisa di folder session');
                }
            }
            break;
            
            default:
        }
    } catch (err) {
        console.log(util.format(err));
    }
};

export default clientHandler;

// Auto reload handler
const file = __filename;
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    import(`${file}?t=${Date.now()}`);
});
