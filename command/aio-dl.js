/*
fitur : All-in-One Downloader (TikTok, Instagram, YouTube, dll)
API : https://api.deline.web.id/downloader/aio?url=
author : Modifikasi dari struktur response Agas
*/

import axios from 'axios';
import crypto from 'crypto';

let handler = async (m, { client, command, reply, text, isBot, reaction, prefix }) => {
    try {
        if (!isBot) return;

        // Cek apakah ada URL yang diberikan
        if (!text) {
            return reply(`Masukkan URL yang ingin di-download!\n\nContoh: ${prefix + command} https://vt.tiktok.com/ZSPwgVrn9/`);
        }

        // Validasi URL
        const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if (!urlPattern.test(text)) {
            return reply('URL tidak valid. Pastikan Anda memasukkan URL yang benar.');
        }

        await reaction(m.chat, "⏳");
        reply('⏱️ Sedang mengambil data... mohon tunggu');

        // Panggil API Deline
        const apiUrl = `https://api.deline.web.id/downloader/aio?url=${encodeURIComponent(text)}`;
        console.log('Calling API:', apiUrl);

        const response = await axios.get(apiUrl, {
            timeout: 30000 // 30 detik timeout
        });

        const data = response.data;

        // Cek status response
        if (!data.status) {
            throw new Error(data.message || 'Gagal mengambil data dari API');
        }

        const result = data.result;
        const extractor = result.extractor; // tiktok, instagram, youtube, dll

        // Buat caption info
        let caption = `📥 *All-in-One Downloader*\n\n`;
        caption += `📌 *Platform*: ${extractor.toUpperCase()}\n`;
        caption += `📝 *Judul*: ${result.title || 'Tidak ada judul'}\n`;
        
        if (result.author) {
            caption += `👤 *Author*: ${result.author.full_name || result.author.username || 'Unknown'}\n`;
        }
        
        caption += `\n⏳ *Mengirim media...*`;

        // Kirim pesan info dulu
        await reply(caption);

        // Proses link video (prioritas video pertama)
        if (result.links?.video && result.links.video.length > 0) {
            const video = result.links.video[0];
            
            // Decode URL (karena dari response berupa base64 atau encoded)
            let videoUrl = video.url;
            
            // Coba decode jika perlu (tergantung format response)
            try {
                // Jika URL berupa base64 (seperti di contoh)
                if (video.url.length > 100 && !video.url.startsWith('http')) {
                    videoUrl = Buffer.from(video.url, 'base64').toString('utf-8');
                }
            } catch (e) {
                console.log('URL tidak perlu di-decode:', e);
            }

            // Kirim video
            await client.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `✅ Video berhasil di-download\n📊 Kualitas: ${video.q_text || 'Unknown'}\n📦 Ukuran: ${video.size || 'Tidak diketahui'}`,
                fileName: `${extractor}_video_${Date.now()}.mp4`
            }, { quoted: m });

            await reaction(m.chat, "✅");
        }
        
        // Jika tidak ada video, cek audio
        else if (result.links?.audio && result.links.audio.length > 0) {
            const audio = result.links.audio[0];
            
            // Decode URL
            let audioUrl = audio.url;
            try {
                if (audio.url.length > 100 && !audio.url.startsWith('http')) {
                    audioUrl = Buffer.from(audio.url, 'base64').toString('utf-8');
                }
            } catch (e) {}

            // Kirim audio
            await client.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: `✅ Audio berhasil di-download`
            }, { quoted: m });

            await reaction(m.chat, "✅");
        }
        
        // Jika tidak ada video/audio, kirim thumbnail atau info
        else if (result.thumbnail) {
            await client.sendMessage(m.chat, {
                image: { url: result.thumbnail },
                caption: `🖼️ Thumbnail dari ${extractor}\n\nURL: ${text}`
            }, { quoted: m });

            await reaction(m.chat, "✅");
        }
        
        else {
            await reaction(m.chat, "❌");
            reply('Tidak ditemukan media yang bisa di-download dari URL tersebut.');
        }

    } catch (e) {
        console.error('Error in aio downloader:', e);
        await reaction(m.chat, "❌");
        
        let errorMsg = 'Terjadi kesalahan: ';
        if (e.response) {
            if (e.response.status === 400) {
                errorMsg += 'API mengembalikan error (400). Mungkin URL tidak valid atau tidak didukung.';
            } else if (e.response.status === 404) {
                errorMsg += 'API tidak ditemukan.';
            } else {
                errorMsg += `HTTP ${e.response.status}: ${e.response.statusText}`;
            }
        } else if (e.code === 'ECONNABORTED') {
            errorMsg += 'Timeout, server terlalu lambat.';
        } else {
            errorMsg += e.message || 'Unknown error';
        }
        
        reply(errorMsg);
    }
};

handler.command = ["aio", "download", "dl", "getvideo", "getaudio", "tiktok", "ig", "yt"];
handler.isBot = true;
handler.tags = ["downloader"];

export default handler;