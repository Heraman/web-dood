// routes/video.js
const express = require('express');
const router = express.Router();
const { getAllFiles, cloneFile, extractFileCode } = require('../utils/doodstream');

// Halaman Player
router.get('/:file_code', async (req, res, next) => {
    const fileCode = req.params.file_code;
    if (!fileCode) {
        return res.status(400).send("File code tidak valid.");
    }

    try {
         // Cara 1: Langsung buat URL (lebih cepat jika hanya butuh player/download)
         // const embedUrl = `https://vidply.com/e/${fileCode}`; // Ganti domain jika perlu
         // const downloadUrl = `https://vidply.com/d/${fileCode}`; // Ganti domain jika perlu
         // res.render('player', { video: { title: `Video ${fileCode}`, embed_url: embedUrl, download_url: downloadUrl } });


        // Cara 2: Cari detail video dari list (jika butuh title, dll) - bisa lambat jika banyak video
        const allFiles = await getAllFiles(); // Perlu optimasi jika sangat banyak video
        const video = allFiles.find(f => f.file_code === fileCode);

        if (!video) {
            return res.status(404).send("Video tidak ditemukan.");
        }

        // Buat embed URL dari download URL
        video.embed_url = video.download_url ? video.download_url.replace('/d/', '/e/') : '';
        // Pastikan download_url ada
        if (!video.download_url) {
             console.warn(`Download URL tidak ditemukan untuk file code: ${fileCode}, membuat URL manual.`);
             video.download_url = `https://vidply.com/d/${fileCode}`; // Sesuaikan domain jika perlu
             video.embed_url = `https://vidply.com/e/${fileCode}`;
        }


        res.render('player', { video: video });

    } catch (error) {
        console.error(`Error di route /video/${fileCode}:`, error);
        next(error);
    }
});


// Halaman Upload (GET - menampilkan form)
router.get('/upload/form', (req, res) => {
    res.render('upload', { results: null, error: null }); // Tampilkan form kosong awal
});

// Halaman Upload (POST - memproses upload)
router.post('/upload/process', async (req, res, next) => {
    const uploadType = req.body.uploadType; // 'single' atau 'bulk'
    const urlsInput = req.body.urls; // Bisa satu URL atau banyak dipisahkan newline

    if (!urlsInput) {
         return res.render('upload', { results: null, error: 'URL tidak boleh kosong.' });
    }

    const urls = urlsInput.split(/[\r\n]+/).map(url => url.trim()).filter(url => url); // Pisahkan per baris, bersihkan whitespace, filter baris kosong

    if (urls.length === 0) {
          return res.render('upload', { results: null, error: 'Tidak ada URL valid yang dimasukkan.' });
    }

     if (uploadType === 'single' && urls.length > 1) {
          return res.render('upload', { results: null, error: 'Mode Single Upload hanya memperbolehkan satu URL.' });
     }


    const results = [];
    let hasError = false;

    try {
        for (const url of urls) {
            const fileCode = extractFileCode(url);
            if (!fileCode) {
                results.push({ url: url, status: 'Error', message: 'Format URL tidak valid atau tidak dapat mengekstrak file code.' });
                hasError = true;
                continue; // Lanjut ke URL berikutnya
            }

            console.log(`Memproses clone untuk URL: ${url}, File Code: ${fileCode}`);
            const cloneResult = await cloneFile(fileCode);
            console.log(`Hasil clone untuk ${fileCode}:`, cloneResult);


            if (cloneResult && cloneResult.status === 200 && cloneResult.result) {
                results.push({
                    url: url,
                    status: 'Success',
                    message: 'Upload (clone) berhasil.',
                    newFileCode: cloneResult.result.filecode,
                    embedUrl: cloneResult.result.embed_url || cloneResult.result.protected_embed,
                    downloadUrl: cloneResult.result.download_url || cloneResult.result.protected_download
                });
            } else {
                results.push({
                    url: url,
                    status: 'Error',
                    message: cloneResult.msg || 'Gagal meng-clone video.'
                });
                hasError = true;
            }
             // Tambahkan jeda singkat antar request jika API punya rate limit
             await new Promise(resolve => setTimeout(resolve, 500)); // Jeda 0.5 detik
        }

        res.render('upload', { results: results, error: hasError ? 'Beberapa URL gagal di-clone.' : null });

    } catch (error) {
        console.error("Error di proses upload:", error);
        // Render halaman upload dengan pesan error umum
         res.render('upload', { results: results, error: `Terjadi kesalahan saat memproses upload: ${error.message}` });
        // Atau gunakan next(error) jika ingin ditangani oleh error handler global
        // next(error);
    }
});

module.exports = router;