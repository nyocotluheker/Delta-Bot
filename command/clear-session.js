import config from '../settings/config.js';
import { readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let handler = async (m, { reply, args }) => {
  const sesi = [config.session];
  const array = [];

  sesi.forEach(dirname => {
    try {
      const fullPath = join(process.cwd(), dirname);
      const files = readdirSync(fullPath);
      files.forEach(file => {
        if (file !== 'creds.json') { 
          array.push(join(fullPath, file));
        }
      });
    } catch (err) {
      console.log(`Error reading directory ${dirname}:`, err);
    }
  });

  const deletedFiles = [];

  array.forEach(file => {
    try {
      const stats = statSync(file);

      if (stats.isDirectory()) {
        console.log(`skipping directory: ${file}`);
      } else {
        unlinkSync(file);
        deletedFiles.push(file);
      }
    } catch (err) {
      console.log(`Error processing file ${file}:`, err);
    }
  });

  if (deletedFiles.length > 0) {
    reply(`✅ Success deleted ${deletedFiles.length} files`);
    console.log('Deleted files:', deletedFiles);
  } else {
    reply('❌ Tidak ada file yang tersisa di folder session (selain creds.json)');
  }
};

handler.help = ['clearsession'];
handler.tags = ['owner'];
handler.command = ["csesi", "clearsesi", "clearsession"];
handler.isBot = true;

export default handler;