import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export const fquoted = {
    packSticker: {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "120363400662819774@g.us"
        },
        message: {
            stickerPackMessage: {
                stickerPackId: "\u0000",
                name: "zax-wb",
                publisher: "kkkk"
            }
        }
    }
};

// Auto reload
const file = __filename;
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    import(`${file}?t=${Date.now()}`);
});