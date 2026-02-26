/*
fitur : HD Video Enhancer (khusus video)
author : Modifikasi - Hanya menyisakan fitur video
*/

import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

let handler = async (m, { client, command, reply, quoted, mime, isBot, reaction, prefix }) => {
    try {
        if (!isBot) return;

        // Deteksi tipe media: hanya video
        const isVideo = /video/.test(mime);

        if (!isVideo) {
            return reply(`❌ *Balas video* dengan perintah *${command}*\n\nContoh:\n${prefix + command} (reply video)`);
        }

        await reaction(m.chat, "⏳");
        reply(`🎬 *HD Video Enhancer*\n\nSedang memproses video ke kualitas HD, mohon tunggu...\n⏱️ Estimasi: 2-5 menit`);

        // Download video dari pesan yang di-reply
        let mediaBuffer = await quoted.download();
        if (!mediaBuffer) {
            throw new Error('Gagal mengunduh video');
        }

        // ========== PROSES VIDEO DENGAN API UNBLURIMAGE ==========
        try {
            let UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
            let SERIAL = crypto.createHash('md5').update(UA + Date.now()).digest('hex');

            const headers = (extra = {}) => Object.assign({
                'accept': '*/*',
                'product-serial': SERIAL,
                'user-agent': UA,
                'Referer': 'https://unblurimage.ai/'
            }, extra);

            // 1. Register File
            let fileName = crypto.randomBytes(3).toString('hex') + '_video.mp4';
            let formReg = new FormData();
            formReg.append('video_file_name', fileName);
            
            let reg = await axios.post('https://api.unblurimage.ai/api/upscaler/v1/ai-video-enhancer/upload-video', formReg, {
                headers: Object.assign(headers(), formReg.getHeaders()),
                timeout: 30000
            });

            let { url: ossUrl, object_name: objectName } = reg.data.result;

            // 2. Upload to OSS
            await axios.put(ossUrl, mediaBuffer, {
                headers: { 'Content-Type': 'video/mp4', 'User-Agent': UA },
                timeout: 60000 // 60 detik untuk upload
            });

            // 3. Create Job
            let formJob = new FormData();
            formJob.append('original_video_file', `https://cdn.unblurimage.ai/${objectName}`);
            formJob.append('resolution', '2k');
            formJob.append('is_preview', 'false');

            let create = await axios.post('https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/create-job', formJob, {
                headers: Object.assign(headers(), formJob.getHeaders()),
                timeout: 30000
            });

            let jobId = create.data.result?.job_id;
            if (!jobId) {
                throw new Error('Gagal membuat tugas pemrosesan video');
            }

            reply(`📊 Job ID: ${jobId}\n⏳ Memproses video... (maks 5 menit)`);

            // 4. Polling Job
            let outputUrl = null;
            for (let i = 0; i < 60; i++) { // Max 5 menit
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                let check = await axios.get(`https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/get-job/${jobId}`, {
                    headers: headers(),
                    timeout: 30000
                });
                
                if (check.data.result?.output_url) {
                    outputUrl = check.data.result.output_url;
                    break;
                }
                
                // Kasih update setiap 30 detik
                if ((i + 1) % 6 === 0) {
                    await reply(`⏳ Masih memproses... (${Math.round((i + 1) * 5 / 60)} menit)`);
                }
            }

            if (!outputUrl) {
                throw new Error('Proses video timeout setelah 5 menit');
            }

            // Kirim video hasil
            await client.sendMessage(m.chat, { 
                video: { url: outputUrl }, 
                caption: `✅ *Video Berhasil di-Enhance!*\n\n📊 *Kualitas*: 2K\n⏱️ *Waktu*: ~${Math.round(outputUrl ? 5 : 0)} menit`
            }, { quoted: m });

            await reaction(m.chat, "✅");

        } catch (e) {
            console.error('Error processing video:', e);
            await reaction(m.chat, "❌");
            reply(`❌ Gagal memproses video: ${e.message || 'Unknown error'}`);
        }

    } catch (e) {
        console.error('Error in hdvideo:', e);
        await reaction(m.chat, "❌");
        reply('❌ Terjadi kesalahan: ' + (e.message || 'Unknown error'));
    }
};

// Command khusus video (hapus command foto)
handler.command = ["hdvideo", "unblurvideo", "enhancevideo", "hdenhance"];
handler.isBot = true;
handler.tags = ["tools", "video"];

export default handler;