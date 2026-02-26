import axios from 'axios';

let handler = async (m, { client, command, reply, text, isBot, reaction, prefix }) => {
    try {
        if (!isBot) return;

        // Cek apakah ada judul lagu
        if (!text) {
            return reply(`🎵 *Cari dan Download Lagu*\n\nContoh: ${prefix + command} Kau masih kekasihku`);
        }

        await reaction(m.chat, "⏳");
        reply(`🔍 Mencari: *${text}*...`);

        // Panggil API 
        const apiUrl = `https://api.deline.web.id/downloader/ytplay?q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });

        if (!response.data.status) {
            throw new Error('Lagu tidak ditemukan');
        }

        const result = response.data.result;

        // Buat caption detail
        const caption = `
*📌 Judul*: ${result.title}
*📊 Kualitas*: ${result.pick.quality}
*📦 Ukuran*: ${result.pick.size}
*🔗 Link*: ${result.url}

✅ *Mengirim audio...*
`.trim();

        // Kirim thumbnail + detail
        await client.sendMessage(m.chat, {
            image: { url: result.thumbnail },
            caption: caption
        }, { quoted: m });

        // Kirim audio
        await client.sendMessage(m.chat, {
            audio: { url: result.dlink },
            mimetype: 'audio/mpeg',
            ptt: true, 
            fileName: `${result.title}.mp3`
        }, { quoted: m });

        await reaction(m.chat, "✅");

    } catch (e) {
        console.error('Error in ytplay:', e);
        await reaction(m.chat, "❌");
        reply(`❌ Gagal: ${e.message || 'Lagu tidak ditemukan'}`);
    }
};

handler.command = ["ytplay", "play", "lagu", "musik"];
handler.isBot = true;
handler.tags = ["downloader", "music"];

export default handler;