/*
fitur : VPS Dashboard - Menampilkan spesifikasi server
author : Modifikasi - IP address dihapus
*/

import os from "os";
import speed from "performance-now";
import { execSync } from "child_process";
import { createCanvas, registerFont } from "canvas";
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fungsi runtime (import dari myfunc.js atau buat sendiri)
function runtime(seconds) {
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
}

// Register font dengan error handling
function safeRegisterFont(fontPath, family, weight) {
    try {
        const fullPath = path.join(__dirname, fontPath);
        if (fs.existsSync(fullPath)) {
            registerFont(fullPath, { family, weight });
        }
    } catch (e) {
        console.log('Font registration skipped:', fontPath);
    }
}

// Coba register font (opsional)
try {
    safeRegisterFont("../../source/fonts/Inter-Regular.ttf", "Inter", "normal");
    safeRegisterFont("../../source/fonts/Inter-SemiBold.ttf", "Inter", "600");
    safeRegisterFont("../../source/fonts/Inter-Bold.ttf", "Inter", "bold");
} catch (e) {
    console.log('Font loading skipped, using default');
}

function formatRuntime(ms) {
    let seconds = Math.floor(ms / 1000);
    let days = Math.floor(seconds / 86400);
    seconds %= 86400;
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return days + " hari " + hours + " jam " + minutes + " menit " + seconds + " detik";
}

function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    let first = null;
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                first = { name, address: net.address };
                break;
            }
        }
        if (first) break;
    }
    return first;
}

function getDiskInfo() {
    try {
        const out = execSync("df -k /").toString().split("\n");
        if (out.length < 2) return null;
        const parts = out[1].trim().split(/\s+/);
        if (parts.length < 5) return null;
        const total = parseInt(parts[1], 10) * 1024;
        const used = parseInt(parts[2], 10) * 1024;
        const free = parseInt(parts[3], 10) * 1024;
        const percent = parseFloat(parts[4].replace("%", ""));
        return { total, used, free, percent };
    } catch {
        return null;
    }
}

function drawPanel(ctx, x, y, w, h, radius) {
    const r = radius;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

let handler = async (m, plug) => {
    const { client, reaction, isBot } = plug;

    try {
        if (!isBot) return;

        await reaction(m.chat, "🖥️");

        const timestamp = speed();
        const latensi = speed() - timestamp;
        const latencyMs = latensi * 1000;

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;

        const load = os.loadavg()[0];
        const cpuCores = os.cpus().length;
        const cpuUsage = (load * 100) / cpuCores;

        const osPlatform = os.type();
        const osArch = os.arch();
        const osRelease = os.release();
        const osHostname = os.hostname();

        const uptimeServer = formatRuntime(os.uptime() * 1000);
        const botRuntime = runtime(process.uptime());
        const serverTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });

        const net = getNetworkInfo();
        const disk = getDiskInfo();

        const width = 1400;
        const height = 780;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Background
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, "#020617");
        bgGradient.addColorStop(0.5, "#020617");
        bgGradient.addColorStop(1, "#020617");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Header Panel
        ctx.fillStyle = "rgba(15,23,42,0.85)";
        ctx.strokeStyle = "rgba(148,163,184,0.15)";
        ctx.lineWidth = 1.2;
        drawPanel(ctx, 40, 30, width - 80, 90, 20);

        // Title
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "bold 34px 'Inter', 'Arial', sans-serif";
        ctx.fillText("System Monitor", 60, 75);

        ctx.fillStyle = "#6b7280";
        ctx.font = "600 18px 'Inter', 'Arial', sans-serif";
        ctx.fillText("dashboard server", 60, 105);

        // Latency
        ctx.textAlign = "right";
        ctx.font = "600 22px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#a855f7";
        ctx.fillText(latencyMs.toFixed(2) + " ms", width - 70, 72);
        ctx.font = "14px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("Latency", width - 70, 96);
        ctx.textAlign = "left";

        // Cards
        const cardWidth = 310;
        const cardHeight = 160;
        const topY = 150;
        const gapX = 25;

        // CPU Card
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        ctx.strokeStyle = "rgba(55,65,81,0.7)";
        drawPanel(ctx, 40, topY, cardWidth, cardHeight, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 18px 'Inter', 'Arial', sans-serif";
        ctx.fillText("CPU Usage", 60, topY + 32);
        ctx.font = "bold 40px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(cpuUsage.toFixed(1) + " %", 60, topY + 85);
        ctx.font = "14px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(os.cpus()[0].model.slice(0, 30), 60, topY + 115);
        ctx.fillText(cpuCores + " Cores", 60, topY + 137);

        // Memory Card
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        drawPanel(ctx, 40 + cardWidth + gapX, topY, cardWidth, cardHeight, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 18px 'Inter', 'Arial', sans-serif";
        ctx.fillText("Memory", 60 + cardWidth + gapX, topY + 32);
        ctx.font = "bold 40px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#22c55e";
        ctx.fillText(memUsage.toFixed(1) + " %", 60 + cardWidth + gapX, topY + 85);
        ctx.font = "14px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("Used " + (usedMem / 1024 / 1024 / 1024).toFixed(2) + " GB", 60 + cardWidth + gapX, topY + 115);
        ctx.fillText("Total " + (totalMem / 1024 / 1024 / 1024).toFixed(2) + " GB", 60 + cardWidth + gapX, topY + 137);

        // Disk Card
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        drawPanel(ctx, 40 + 2 * (cardWidth + gapX), topY, cardWidth, cardHeight, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 18px 'Inter', 'Arial', sans-serif";
        ctx.fillText("Disk", 60 + 2 * (cardWidth + gapX), topY + 32);
        if (disk) {
            ctx.font = "bold 40px 'Inter', 'Arial', sans-serif";
            ctx.fillStyle = "#a855f7";
            ctx.fillText(disk.percent.toFixed(1) + " %", 60 + 2 * (cardWidth + gapX), topY + 85);
            ctx.font = "14px 'Inter', 'Arial', sans-serif";
            ctx.fillStyle = "#9ca3af";
            ctx.fillText("Used " + (disk.used / 1024 / 1024 / 1024).toFixed(2) + " GB", 60 + 2 * (cardWidth + gapX), topY + 115);
            ctx.fillText("Total " + (disk.total / 1024 / 1024 / 1024).toFixed(2) + " GB", 60 + 2 * (cardWidth + gapX), topY + 137);
        } else {
            ctx.font = "16px 'Inter', 'Arial', sans-serif";
            ctx.fillStyle = "#f97316";
            ctx.fillText("Disk info tidak tersedia", 60 + 2 * (cardWidth + gapX), topY + 90);
        }

        // Bot Status Panel
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        ctx.strokeStyle = "rgba(55,65,81,0.7)";
        drawPanel(ctx, 40, 340, 640, 170, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 20px 'Inter', 'Arial', sans-serif";
        ctx.fillText("Bot Status", 60, 370);
        ctx.font = "16px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#e5e7eb";
        ctx.fillText("Runtime    : " + botRuntime, 60, 405);
        ctx.fillText("Node.js    : " + process.version, 60, 430);
        ctx.fillText("Server Time: " + serverTime, 60, 455);

        // Server Info Panel
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        drawPanel(ctx, 720, 340, 640, 170, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 20px 'Inter', 'Arial', sans-serif";
        ctx.fillText("Server Info", 740, 370);
        ctx.font = "16px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#e5e7eb";
        ctx.fillText("Hostname : " + osHostname, 740, 405);
        ctx.fillText("Platform : " + osPlatform + " (" + osArch + ")", 740, 430);
        ctx.fillText("OS       : " + osRelease, 740, 455);
        ctx.fillText("Uptime   : " + uptimeServer, 740, 480);

        // Network Panel (IP Address DIHAPUS)
        ctx.fillStyle = "rgba(15,23,42,0.95)";
        drawPanel(ctx, 40, 540, width - 80, 180, 18);
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 20px 'Inter', 'Arial', sans-serif";
        ctx.fillText("Network", 60, 570);
        ctx.font = "16px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#e5e7eb";
        if (net) {
            ctx.fillText("Interface : " + net.name, 60, 605);
            // IP Address TIDAK DITAMPILKAN
        } else {
            ctx.fillText("Tidak ada interface jaringan publik yang terdeteksi.", 60, 605);
        }
        ctx.fillText("Latency   : " + latencyMs.toFixed(2) + " ms", 60, 630);

        // Footer
        ctx.font = "14px 'Inter', 'Arial', sans-serif";
        ctx.fillStyle = "#4b5563";
        ctx.textAlign = "right";
        ctx.fillText("Delta Force Bot", width - 60, height - 30);
        ctx.textAlign = "left";

        // Konversi ke buffer
        const buffer = canvas.toBuffer("image/png");

        // Kirim gambar + caption
        await client.sendMessage(
            m.chat,
            { 
                image: buffer, 
                caption: `*— Spesifikasi Server VPS 🖥️*
- *OS Platform :* ${osPlatform} (${osArch})
- *OS Release :* ${osRelease}
- *CPU Core :* ${os.cpus().length} Core
- *Model CPU :* ${os.cpus()[0].model}
- *Load Avg :* ${(os.loadavg()[0] * 100 / os.cpus().length).toFixed(2)}%

*— Memori (RAM) 💾*
- *Total RAM :* ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB
- *Terpakai :* ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB (${memUsage.toFixed(2)}%)
- *Tersisa :* ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB

*— Disk Storage 💽*
${disk ? `- *Total Disk:* ${(disk.total / 1024 / 1024 / 1024).toFixed(2)} GB
- *Terpakai:* ${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB (${disk.percent.toFixed(1)}%)
- *Tersisa:* ${(disk.free / 1024 / 1024 / 1024).toFixed(2)} GB` : '- *Disk info tidak tersedia*'}

*— Network 🌐*
- *Interface:* ${net ? net.name : 'Tidak terdeteksi'}
- *Latency:* ${latencyMs.toFixed(2)} ms
- *Hostname:* ${osHostname}

*— Runtime ⏱️*
- *Bot Runtime:* ${botRuntime}
- *Server Uptime:* ${uptimeServer}
- *Server Time:* ${serverTime}`
            },
            { quoted: m }
        );

        await reaction(m.chat, "✅");

    } catch (e) {
        console.error('Error in vpsdash:', e);
        await reaction(m.chat, "❌");
        plug.reply('❌ Terjadi kesalahan: ' + (e.message || 'Unknown error'));
    }
};

handler.command = ["ping", "server", "spec", "dashboard"];
handler.help = ["owner"];
handler.tags = ["system"];
handler.isBot = true;
handler.owner = true; // Hanya owner yang bisa menggunakan

export default handler;