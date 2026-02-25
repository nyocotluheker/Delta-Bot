"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimalKaloMauDecryptYangPinterDek = exports.sudahBasibasiAjaLu = void 0;
const crypto = require('crypto');
const emangBenerNihAkuPinter = () => {
    const anjayGaKiraKira = [];
    anjayGaKiraKira.push(Buffer.from('73', 'hex'));
    anjayGaKiraKira.push(Buffer.from('6f', 'hex'));
    anjayGaKiraKira.push(Buffer.from('63', 'hex'));
    anjayGaKiraKira.push(Buffer.from('6b', 'hex'));
    anjayGaKiraKira.push(Buffer.from('65', 'hex'));
    anjayGaKiraKira.push(Buffer.from('74', 'hex'));
    anjayGaKiraKira.push(Buffer.from('6f', 'hex'));
    anjayGaKiraKira.push(Buffer.from('6e', 'hex'));
    anjayGaKiraKira.push(Buffer.from('2d', 'hex'));
    anjayGaKiraKira.push(Buffer.from('31', 'hex'));
    anjayGaKiraKira.push(Buffer.from('2e', 'hex'));
    anjayGaKiraKira.push(Buffer.from('37', 'hex'));
    anjayGaKiraKira.push(Buffer.from('2e', 'hex'));
    anjayGaKiraKira.push(Buffer.from('30', 'hex'));
    return Buffer.concat(anjayGaKiraKira).toString('utf8');
};
const sudahBasibasiAjaLu = (datanyaYgMauDiacakKarenaTerlaluPenasaran) => {
    const bukanKunciRahasiaTapiKuncinyaIni = crypto.createHash('sha512');
    bukanKunciRahasiaTapiKuncinyaIni.update(emangBenerNihAkuPinter() + '_ibrahimasli_bukanpalsu');
    const hasilnyaTapiMasihBelumFixNih = bukanKunciRahasiaTapiKuncinyaIni.digest();
    const dikitLagiSabarYa = crypto.createHash('sha256');
    dikitLagiSabarYa.update(hasilnyaTapiMasihBelumFixNih.slice(0, 32));
    const nahIniKuncinyaYangBeneranTapiMasihAdaLagi = dikitLagiSabarYa.digest();
    const hampirSampeKok = crypto.createHash('md5');
    hampirSampeKok.update(nahIniKuncinyaYangBeneranTapiMasihAdaLagi.toString('hex'));
    const akhirnyaKuncinyaNih = hampirSampeKok.digest();
    const ivnyaJugaRumitLho = Buffer.concat([
        Buffer.from('ib', 'utf8'),
        Buffer.from('ra', 'utf8'),
        Buffer.from('de', 'utf8'),
        Buffer.from('co', 'utf8'),
        Buffer.from('de', 'utf8'),
        Buffer.from('is', 'utf8'),
        Buffer.from('th', 'utf8'),
        Buffer.from('eb', 'utf8'),
        Buffer.from('es', 'utf8'),
        Buffer.from('t!', 'utf8')
    ]).slice(0, 16);
    const engineDecryptYangSudahGakTawuBentuknya = crypto.createDecipheriv('aes-256-cbc', nahIniKuncinyaYangBeneranTapiMasihAdaLagi, ivnyaJugaRumitLho);
    let udahanBuatYangPenasaran = engineDecryptYangSudahGakTawuBentuknya.update(datanyaYgMauDiacakKarenaTerlaluPenasaran, 'hex', 'utf8');
    udahanBuatYangPenasaran += engineDecryptYangSudahGakTawuBentuknya.final('utf8');
    return udahanBuatYangPenasaran;
};
exports.sudahBasibasiAjaLu = sudahBasibasiAjaLu;
const minimalKaloMauDecryptYangPinterDek = (datanyaYgMauDiacakKarenaTerlaluPenasaran) => {
    return (0, exports.sudahBasibasiAjaLu)(datanyaYgMauDiacakKarenaTerlaluPenasaran);
};
exports.minimalKaloMauDecryptYangPinterDek = minimalKaloMauDecryptYangPinterDek;
