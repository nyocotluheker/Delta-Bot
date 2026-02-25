/*
fitur : Edit Gambar dengan AI (Nanana.app)
author : Modifikasi
*/

import cheerio from "cheerio";
import crypto from "crypto";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import axios from "axios";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let handler = async (m, { client, command, reply, quoted, mime, isBot, reaction, text, prefix }) => {
    try {
        if (!isBot) return;

        // Cek apakah ada gambar yang di-quote
        const q = m.quoted || m;
        const mimeType = (q.msg || q).mimetype || "";

        if (!mimeType.startsWith("image/")) {
            return reply(`❌ Reply gambar dengan caption *${prefix + command} [prompt]*\n\nContoh: ${prefix + command} jadikan anime`);
        }

        // Cek apakah ada prompt
        if (!text) {
            return reply(`❌ Prompt wajib diisi!\n\nContoh: ${prefix + command} jadikan anime`);
        }

        await reaction(m.chat, "🕒");
        reply(`🎨 *Memproses gambar...*\n📝 Prompt: *"${text}"*\n⏱️ Estimasi: 1-2 menit`);

        // Download gambar
        const buffer = await q.download();
        if (!buffer) {
            await reaction(m.chat, "❌");
            return reply("❌ Gagal mengunduh gambar");
        }

        // Buat folder tmp jika belum ada
        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Simpan gambar sementara
        const filePath = path.join(tmpDir, `nanana_${Date.now()}.jpg`);
        fs.writeFileSync(filePath, buffer);

        try {
            // Proses gambar dengan Nanana
            const result = await nanana(filePath, text);

            // Kirim hasil (LANGSUNG PAKAI URL DARI RESULT)
            await client.sendMessage(
                m.chat,
                {
                    image: { url: result.image }, // Langsung pakai URL dari Nanana
                    caption: `✅ *Gambar Berhasil Diedit!*\n\n📝 *Prompt*: ${text}\n⏱️ *Waktu*: ${result.time || '~2 menit'}`
                },
                { quoted: m }
            );

            await reaction(m.chat, "✅");

        } catch (err) {
            console.error('Error in nanana process:', err);
            await reaction(m.chat, "❌");
            reply(`❌ Gagal edit gambar: ${err.message || 'Unknown error'}`);
        } finally {
            // Hapus file sementara
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

    } catch (e) {
        console.error('Error in editimg command:', e);
        await reaction(m.chat, "❌");
        reply('❌ Terjadi kesalahan: ' + (e.message || 'Unknown error'));
    }
};

handler.command = ["editimg", "editgambar", "nanana", "aiimg", "aiedit"];
handler.isBot = true;
handler.tags = ["ai", "tools"];
handler.limit = true;

export default handler;

// ============================================
// FUNGSI-FUNGSI NANANA
// ============================================

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function genxfpid() {
    const p1 = crypto.randomBytes(16).toString("hex");
    const p2 = crypto.randomBytes(32).toString("hex");
    return Buffer.from(`${p1}.${p2}`).toString("base64");
}

// Fungsi untuk mendapatkan email sementara
function generateEmail() {
    const username = crypto.randomBytes(6).toString("hex");
    return `${username}@akunlama.com`;
}

// API 1secmail sebagai alternatif yang lebih stabil
const tempMail = {
    // Dapatkan inbox
    getInbox: async (email) => {
        try {
            const [username, domain] = email.split('@');
            const response = await axios.get(
                `https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`,
                { timeout: 10000 }
            );
            return response.data || [];
        } catch (e) {
            console.error('Error getting inbox:', e);
            return [];
        }
    },

    // Baca email tertentu
    readMessage: async (email, id) => {
        try {
            const [username, domain] = email.split('@');
            const response = await axios.get(
                `https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${id}`,
                { timeout: 10000 }
            );
            return response.data;
        } catch (e) {
            console.error('Error reading message:', e);
            return null;
        }
    },

    // Ekstrak OTP dari konten email
    extractOTP: (content) => {
        if (!content || !content.body) return null;
        
        // Cari pola 6 digit angka
        const body = content.body;
        const otpMatch = body.match(/\b\d{6}\b/);
        return otpMatch ? otpMatch[0] : null;
    }
};

const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "origin": "https://nanana.app",
    "referer": "https://nanana.app/en"
};

async function getAuth() {
    const email = generateEmail();
    console.log('Using email:', email);

    // Kirim OTP
    await axios.post(
        "https://nanana.app/api/auth/email-otp/send-verification-otp",
        { email, type: "sign-in" },
        { headers: { ...baseHeaders, "Content-Type": "application/json" } }
    );

    // Tunggu OTP masuk
    let otpCode = null;
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3 detik = 60 detik

    while (!otpCode && attempts < maxAttempts) {
        await delay(3000);
        
        const messages = await tempMail.getInbox(email);
        
        if (messages.length > 0) {
            // Ambil pesan terbaru
            const latestMsg = messages[messages.length - 1];
            const content = await tempMail.readMessage(email, latestMsg.id);
            otpCode = tempMail.extractOTP(content);
            
            if (otpCode) {
                console.log('OTP found:', otpCode);
                break;
            }
        }
        
        attempts++;
    }

    if (!otpCode) {
        throw new Error("Gagal mendapatkan OTP setelah 60 detik");
    }

    // Login dengan OTP
    const signin = await axios.post(
        "https://nanana.app/api/auth/sign-in/email-otp",
        { email, otp: otpCode },
        { headers: { ...baseHeaders, "Content-Type": "application/json" } }
    );

    const cookies = signin.headers["set-cookie"];
    const cookieString = cookies
        ? cookies.map(c => c.split(";")[0]).join("; ")
        : "";

    return {
        ...baseHeaders,
        Cookie: cookieString,
        "x-fp-id": genxfpid()
    };
}

async function uploadImage(imgPath, authHeaders) {
    const form = new FormData();
    form.append("image", fs.createReadStream(imgPath));

    const res = await axios.post(
        "https://nanana.app/api/upload-img",
        form,
        { 
            headers: { ...authHeaders, ...form.getHeaders() },
            timeout: 30000 // 30 detik timeout upload
        }
    );

    return res.data.url;
}

async function createJob(imgUrl, prompt, authHeaders) {
    const res = await axios.post(
        "https://nanana.app/api/image-to-image",
        { prompt, image_urls: [imgUrl] },
        { 
            headers: { ...authHeaders, "Content-Type": "application/json" },
            timeout: 30000
        }
    );

    return res.data.request_id;
}

async function cekJob(jobId, authHeaders) {
    const res = await axios.post(
        "https://nanana.app/api/get-result",
        { requestId: jobId, type: "image-to-image" },
        { 
            headers: { ...authHeaders, "Content-Type": "application/json" },
            timeout: 30000
        }
    );

    return res.data;
}

async function nanana(imgPath, prompt) {
    const startTime = Date.now();
    
    try {
        // Dapatkan authentication
        const authHeaders = await getAuth();
        
        // Upload gambar
        const uploadUrl = await uploadImage(imgPath, authHeaders);
        console.log('Image uploaded:', uploadUrl);
        
        // Buat job
        const jobId = await createJob(uploadUrl, prompt, authHeaders);
        console.log('Job created:', jobId);
        
        // Polling hasil
        let result;
        let attempt = 0;

        do {
            await delay(3000);
            result = await cekJob(jobId, authHeaders);
            attempt++;
            
            if (attempt % 5 === 0) {
                console.log(`Waiting for job ${jobId}... attempt ${attempt}`);
            }
            
            if (attempt > 40) throw new Error("Job timeout (maks 2 menit)");
        } while (!result.completed);

        if (!result.data?.images?.length) {
            throw new Error("Gagal mendapatkan hasil");
        }

        const endTime = Date.now();
        const processingTime = Math.round((endTime - startTime) / 1000);

        return {
            job_id: jobId,
            image: result.data.images[0].url, // LANGSUNG PAKAI URL INI
            time: `${processingTime} detik`
        };

    } catch (error) {
        console.error('Nanana error:', error);
        throw new Error(`Gagal memproses: ${error.message}`);
    }
}