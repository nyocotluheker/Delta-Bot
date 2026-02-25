/*
fitur : YouTube Play - Search & Download
author : Modifikasi dari source asli
*/

import yts from 'yt-search';

let handler = async (m, { client, command, reply, text, isBot, reaction, prefix }) => {
    try {
        if (!isBot) return;

        // Cek apakah ada teks pencarian
        if (!text) {
            return reply(`🚩 Contoh penggunaan: ${prefix + command} everything u are`);
        }

        await reaction(m.chat, "⏳");
        reply(`🔍 Mencari *"${text}"* di YouTube...`);

        // Cari video di YouTube
        let search = await yts(text);
        let videos = search.videos;
        
        if (!Array.isArray(videos) || videos.length === 0) {
            await reaction(m.chat, "❌");
            return reply(`🍰 Maaf, tidak dapat menemukan lagu dengan kata *"${text}"*`);
        }

        // Ambil video pertama (paling relevan)
        let video = videos[0];

        let title = video.title || '-';
        let duration = video.timestamp || '-';
        let views = video.views ? formatNumber(video.views) : '-';
        let channel = video.author?.name || '-';
        let verified = video.author?.verified ? ' ✅' : '';
        let uploaded = video.ago || '-';
        let thumbnail = video.thumbnail || '';

        let detail = `
*🎵 YouTube Play*

*📌 Judul*: ${title}
*⏱️ Durasi*: ${duration}
*👁️ Views*: ${views}
*📺 Channel*: ${channel}${verified}
*🕒 Upload*: ${uploaded}

Pilih opsi di bawah untuk download:
`.trim();

        // Kirim hasil pencarian dengan tombol
        await client.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: detail,
            buttons: [
                { 
                    buttonId: `${prefix}yta ${video.url}`, 
                    buttonText: { displayText: '🎵 Audio (MP3)' }, 
                    type: 1 
                },
                { 
                    buttonId: `${prefix}ytv ${video.url}`, 
                    buttonText: { displayText: '🎬 Video (MP4)' }, 
                    type: 1 
                }
            ],
            viewOnce: true,
            headerType: 4
        }, { quoted: m });

        await reaction(m.chat, "✅");

    } catch (e) {
        console.error('Error in play command:', e);
        await reaction(m.chat, "❌");
        reply('🍰 Terjadi kesalahan saat memproses: ' + (e.message || 'Unknown error'));
    }
};

handler.command = ["play", "ytplay", "yts", "ytsearch"];
handler.isBot = true;
handler.tags = ["downloader", "music"];

export default handler;

// Fungsi format angka (views, subscribers, dll)
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}