import pkg from 'socketon';
const { extractMessageContent, jidNormalizedUser, proto, delay, getContentType, areJidsSameUser, generateWAMessage } = pkg;
import chalk from 'chalk';
import fs from 'fs';
import Crypto from 'crypto';
import axios from 'axios';
import moment from 'moment-timezone';
import { sizeFormatter } from 'human-readable';
import util from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import jimp from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);

export const resize = async (image, width, height) => {
    try {
        let oyy = await jimp.read(image);
        let kiyomasa = await oyy.resize(width, height).getBufferAsync(jimp.MIME_JPEG);
        return kiyomasa;
    } catch (e) {
        console.error('Error resize:', e);
        return image;
    }
};

export const generateMessageTag = (epoch) => {
    let tag = unixTimestampSeconds().toString();
    if (epoch)
        tag += '.--' + epoch;
    return tag;
};

export const processTime = (timestamp, now) => {
    return moment.duration(now - moment(timestamp * 1000)).asSeconds();
};

export const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export const getBuffer = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err) {
        console.error('Error getBuffer:', err);
        return null;
    }
};

export const formatSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

export const fetchJson = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        console.error('Error fetchJson:', err);
        return null;
    }
};

export const runtime = function(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

export const clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
};

export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const isUrl = (url) => {
    return url ? url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi')) : null;
};

export const getTime = (format, date) => {
    if (date) {
        return moment(date).locale('id').format(format);
    } else {
        return moment.tz('Asia/Jakarta').locale('id').format(format);
    }
};

export const formatDate = (n, locale = 'id') => {
    let d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

export const getGroupAdmins = (participants) => {
    let admins = [];
    if (!participants || !Array.isArray(participants)) return admins;
    for (let i of participants) {
        if (i.admin === "superadmin" || i.admin === "admin") {
            admins.push(i.id);
        }
    }
    return admins || [];
};

// ============================================
// FUNGSI SMSG YANG SUDAH DIPERBAIKI
// ============================================
export const smsg = async (client, m, store) => {
    if (!m) return m;
    
    try {
        let M = proto.WebMessageInfo;
        
        // Proses key
        if (m.key) {
            m.id = m.key.id;
            m.from = m.key.remoteJid?.startsWith('status') 
                ? jidNormalizedUser(m.key?.participant || m.participant) 
                : jidNormalizedUser(m.key.remoteJid);
            m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
            m.chat = m.key.remoteJid;
            m.fromMe = m.key.fromMe;
            m.isGroup = m.chat?.endsWith('@g.us');
            m.sender = client.decodeJid(
                m.fromMe && client.user?.id || 
                m.participant || 
                m.key.participant || 
                m.chat || ''
            );
            if (m.isGroup) m.participant = client.decodeJid(m.key.participant) || '';
        }
        
        // Proses message
        if (m.message) {
            m.mtype = getContentType(m.message);
            
            // Handle viewOnceMessage
            if (m.mtype === 'viewOnceMessage') {
                m.msg = m.message[m.mtype]?.message?.[
                    getContentType(m.message[m.mtype]?.message)
                ];
            } else {
                m.msg = m.message[m.mtype];
            }
            
            // Set body/text
            m.body = m.message?.conversation || 
                     m.msg?.caption || 
                     m.msg?.text || 
                     (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) || 
                     (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId) || 
                     (m.mtype === 'viewOnceMessage' && m.msg?.caption) || 
                     '';
            
            // Quoted message
            let quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
            m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            
            // Proses quoted message
            if (quoted) {
                let type = getContentType(quoted);
                m.quoted = m.quoted[type];
                
                if (['productMessage'].includes(type)) {
                    type = getContentType(m.quoted);
                    m.quoted = m.quoted[type];
                }
                
                if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
                
                m.quoted.key = {
                    remoteJid: m.msg?.contextInfo?.remoteJid || m.from,
                    participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
                    fromMe: areJidsSameUser(
                        jidNormalizedUser(m.msg?.contextInfo?.participant), 
                        jidNormalizedUser(client.user?.id)
                    ),
                    id: m.msg?.contextInfo?.stanzaId,
                };
                
                m.quoted.mtype = type;
                m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid) 
                    ? m.quoted.key.participant 
                    : m.quoted.key.remoteJid;
                m.quoted.id = m.msg?.contextInfo?.stanzaId;
                m.quoted.chat = m.msg?.contextInfo?.remoteJid || m.chat;
                m.quoted.isBaileys = m.quoted.id?.startsWith('BAE5') && m.quoted.id.length === 16;
                m.quoted.sender = client.decodeJid(m.msg?.contextInfo?.participant);
                m.quoted.fromMe = m.quoted.sender === (client.user && client.user.id);
                m.quoted.text = m.quoted?.text || 
                                m.quoted?.caption || 
                                m.quoted?.conversation || 
                                m.quoted?.contentText || 
                                m.quoted?.selectedDisplayText || 
                                m.quoted?.title || '';
                m.quoted.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];
                
                // Fungsi untuk ambil quoted object
                m.getQuotedObj = m.getQuotedMessage = async () => {
                    if (!m.quoted.id) return false;
                    let q = await store?.loadMessage(m.chat, m.quoted.id, client);
                    return q ? smsg(client, q, store) : false; // PAKAI smsg LANGSUNG, BUKAN exports.smsg
                };
                
                // Buat fake object
                let vM = m.quoted.fakeObj = M.fromObject({
                    key: {
                        remoteJid: m.quoted.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id
                    },
                    message: quoted,
                    ...(m.isGroup ? { participant: m.quoted.sender } : {})
                });
                
                m.quoted.delete = () => client.sendMessage(m.quoted.chat, { delete: vM.key });
                m.quoted.copyNForward = (jid, forceForward = false, options = {}) => 
                    client.copyNForward(jid, vM, forceForward, options);
                m.quoted.download = () => client.downloadMediaMessage(m.quoted);
            }
        }
        
        // Download function
        if (m.msg?.url) m.download = () => client.downloadMediaMessage(m.msg);
        
        // Text fallback dengan optional chaining
        m.text = m.msg?.text || 
                 m.msg?.caption || 
                 m.message?.conversation || 
                 m.msg?.contentText || 
                 m.msg?.selectedDisplayText || 
                 m.msg?.title || 
                 '';
        
        // Reply function
        m.reply = (text, chatId = m.chat, options = {}) => {
            return Buffer.isBuffer(text) 
                ? client.sendMedia(chatId, text, 'file', '', m, { ...options })
                : client.sendText(chatId, text, m, { ...options });
        };
        
        // Copy functions
        m.copy = () => smsg(client, M.fromObject(M.toObject(m)), store); // PAKAI smsg LANGSUNG
        m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => 
            client.copyNForward(jid, m, forceForward, options);
        
        return m;
        
    } catch (e) {
        console.error('Error in smsg:', e);
        return m; // Return original message jika error
    }
};