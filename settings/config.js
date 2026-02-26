import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    owner: "-",
    botNumber: "-",
    setPair: "AAAAAAAA",
    thumbUrl: "https://github.com/nyocotluheker/Delta-Bot/blob/8f8e8720e25023c88746288d0d23e0efc647e177/system/lib/media/IMG_20250729_172932.jpg",
    session: "sessions",
    status: {
        public: true,
        terminal: true,
        reactsw: true
    },
    message: {
        owner: "no, this is for owners only",
        group: "this is for groups only",
        admin: "this command is for admin only",
        private: "this is specifically for private chat"
    },
    settings: {
        title: "ᴅᴇʟᴛᴀ ғᴏʀᴄᴇ",
        packname: 'ᴢᴀx-ᴡᴀʙᴏᴛ',
        description: "this script was created by ᴀᴢᴀxᴍ",
        author: 'https://id.wwbs.net',
        footer: "zax, the 1973`"
    },
    newsletter: {
        name: "zax-wb",
        id: "120363408150041165@newsletter"
    },
    socialMedia: {
        YouTube: "https://youtube.com/@ambadev",
        GitHub: "https://github.com/nyocotluheker",
        Telegram: "https://t.me/zaxsql",
        ChannelWA: "https://whatsapp.com/channel/0029VbCKPRs9mrGcwiG4gp14"
    }
};

export default config;

// Auto reload
const file = __filename;
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    import(`${file}?t=${Date.now()}`);
});
