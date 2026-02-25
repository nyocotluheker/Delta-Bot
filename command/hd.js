/*
fitur : hdmedia (HD Photo & Video Enhancer)
- Foto: Menggunakan API Deline (https://api.deline.web.id/tools/hd) - return langsung gambar
- Video: Menggunakan API unblurimage.ai (dari kode asli)
author : Modifikasi
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

        // Deteksi tipe media: foto atau video
        const isImage = /image/.test(mime);
        const isVideo = /video/.test(mime);

        if (!isImage && !isVideo) {
            return reply(`Balas *foto* atau *video* dengan perintah *${command}*\n\nContoh:\n${prefix + command} (reply foto/video)`);
        }

        const mediaType = isImage ? 'foto' : 'video';
        await reaction(m.chat, "⏳");
        reply(`Sedang memproses ${mediaType} ke kualitas HD, mohon tunggu... ${isVideo ? '(bisa memakan waktu beberapa menit)' : ''}`);

        // Download media dari pesan yang di-reply
        let mediaBuffer = await quoted.download();

        let outputUrl = null;

        if (isImage) {
            // ========== PROSES UNTUK FOTO (API DELINE - LANGSUNG GAMBAR) ==========
            try {
                // 1. Upload gambar ke server sementara (telegra.ph)
                const uploadForm = new FormData();
                uploadForm.append('file', mediaBuffer, { filename: 'image.jpg' });
                
                const upload = await axios.post('https://telegra.ph/upload', uploadForm, {
                    headers: uploadForm.getHeaders()
                });
                
                if (!upload.data?.[0]?.src) {
                    throw new Error('Gagal upload gambar ke telegra.ph');
                }
                
                const imageUrl = 'https://telegra.ph' + upload.data[0].src;
                console.log('Image uploaded to:', imageUrl);
                
                // 2. Panggil API Deline dengan URL gambar
                const apiUrl = `https://api.deline.web.id/tools/hd?url=${encodeURIComponent(imageUrl)}`;
                console.log('Calling Deline API:', apiUrl);
                
                // API Deline mengembalikan langsung gambar (buffer)
                const response = await axios({
                    method: 'get',
                    url: apiUrl,
                    responseType: 'arraybuffer',
                    timeout: 60000 // 60 detik timeout
                });
                
                if (response.status === 200) {
                    // Kirim langsung gambar hasil HD ke pengguna
                    await client.sendMessage(m.chat, {
                        image: Buffer.from(response.data),
                        caption: '✅ Foto berhasil ditingkatkan ke HD (via Deline API)'
                    }, { quoted: m });
                    
                    await reaction(m.chat, "✅");
                    return;
                } else {
                    throw new Error(`API Deline mengembalikan status: ${response.status}`);
                }
                
            } catch (e) {
                console.error('Error processing image with Deline API:', e);
                await reaction(m.chat, "❌");
                return reply(`Gagal memproses foto: ${e.message || 'Unknown error'}`);
            }
            
        } else {
            // ========== PROSES UNTUK VIDEO (API UNBLURIMAGE) ==========
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
                    headers: Object.assign(headers(), formReg.getHeaders())
                });

                let { url: ossUrl, object_name: objectName } = reg.data.result;

                // 2. Upload to OSS
                await axios.put(ossUrl, mediaBuffer, {
                    headers: { 'Content-Type': 'video/mp4', 'User-Agent': UA }
                });

                // 3. Create Job
                let formJob = new FormData();
                formJob.append('original_video_file', `https://cdn.unblurimage.ai/${objectName}`);
                formJob.append('resolution', '2k');
                formJob.append('is_preview', 'false');

                let create = await axios.post('https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/create-job', formJob, {
                    headers: Object.assign(headers(), formJob.getHeaders())
                });

                let jobId = create.data.result.job_id;
                if (!jobId) {
                    throw new Error('Gagal membuat tugas pemrosesan video');
                }

                // 4. Polling Job
                let outputUrl = null;
                for (let i = 0; i < 60; i++) { // Max 5 menit
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    let check = await axios.get(`https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/get-job/${jobId}`, {
                        headers: headers()
                    });
                    
                    if (check.data.result?.output_url) {
                        outputUrl = check.data.result.output_url;
                        break;
                    }
                }

                if (!outputUrl) {
                    throw new Error('Proses video timeout atau gagal');
                }

                // Kirim video hasil
                await client.sendMessage(m.chat, { 
                    video: { url: outputUrl }, 
                    caption: '✅ Video Berhasil di-Enhance (2K)' 
                }, { quoted: m });

                await reaction(m.chat, "✅");

            } catch (e) {
                console.error('Error processing video:', e);
                await reaction(m.chat, "❌");
                reply('Gagal memproses video: ' + (e.message || 'Unknown error'));
            }
        }

    } catch (e) {
        console.error('Error in hdmedia:', e);
        await reaction(m.chat, "❌");
        reply('Terjadi kesalahan: ' + (e.message || 'Unknown error'));
    }
};

handler.command = ["hd", "hdfoto", "hdphoto", "hdvideo", "unblur", "enhance", "hdenhance"];
handler.isBot = true;

export default handler;