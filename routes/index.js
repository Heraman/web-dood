// routes/index.js
const express = require('express');
const router = express.Router();
const { getAllFiles } = require('../utils/doodstream');

const ITEMS_PER_PAGE = 12; // Jumlah video per halaman untuk list utama/pencarian

// Fungsi helper untuk pagination
function paginateResults(items, page, perPage) {
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || ITEMS_PER_PAGE;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / perPageNum);
    const startIndex = (pageNum - 1) * perPageNum;
    const endIndex = startIndex + perPageNum;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
        items: paginatedItems,
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalItems,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
    };
}


// Halaman Utama
router.get('/', async (req, res, next) => {
    try {
        const allFiles = await getAllFiles();

        if (!allFiles || allFiles.length === 0) {
             console.log("Tidak ada file yang bisa ditampilkan di halaman utama.");
             return res.render('index', {
                 latestVideos: [],
                 mostViewedVideos: [],
                 errorMessage: "Tidak ada video yang ditemukan di akun Doodstream Anda."
             });
        }


        // Urutkan video terbaru (berdasarkan tanggal upload descending)
        const sortedByDate = [...allFiles].sort((a, b) => {
            // Coba parsing tanggal, beri nilai default jika tidak valid
             const dateA = a.uploaded ? new Date(a.uploaded).getTime() : 0;
             const dateB = b.uploaded ? new Date(b.uploaded).getTime() : 0;
             if (isNaN(dateA) || isNaN(dateB)) {
                 // Handle kasus dimana tanggal mungkin null atau format tidak benar
                 console.warn("Format tanggal tidak valid ditemukan:", a.uploaded, b.uploaded);
                 // Tempatkan item dengan tanggal tidak valid di akhir
                 if (isNaN(dateA) && !isNaN(dateB)) return 1;
                 if (!isNaN(dateA) && isNaN(dateB)) return -1;
                 return 0; // Jika keduanya tidak valid, anggap sama
             }
             return dateB - dateA; // Descending
        });

        // Urutkan video paling banyak ditonton (berdasarkan views descending)
        const sortedByViews = [...allFiles].sort((a, b) => {
             const viewsA = parseInt(a.views, 10) || 0;
             const viewsB = parseInt(b.views, 10) || 0;
             return viewsB - viewsA; // Descending
        });

        // Ambil maksimal 8 video untuk setiap list di homepage
        const latestVideos = sortedByDate.slice(0, 8);
        const mostViewedVideos = sortedByViews.slice(0, 8);

        // Ubah download_url menjadi embed_url untuk thumbnail link (jika perlu)
        // Atau langsung link ke halaman player kita /video/:file_code
         latestVideos.forEach(vid => vid.player_url = `/video/${vid.file_code}`);
         mostViewedVideos.forEach(vid => vid.player_url = `/video/${vid.file_code}`);


        res.render('index', {
            latestVideos,
            mostViewedVideos,
            errorMessage: null // Tidak ada error jika sampai sini
        });
    } catch (error) {
        console.error("Error di route /:", error);
        next(error); // Teruskan error ke error handler Express
    }
});


// Halaman Pencarian
router.get('/search', async (req, res, next) => {
    const query = req.query.q || '';
    const page = req.query.page || 1;

    if (!query) {
        return res.redirect('/'); // Kembali ke home jika query kosong
    }

    try {
        const allFiles = await getAllFiles();
        const filteredFiles = allFiles.filter(file =>
            file.title && file.title.toLowerCase().includes(query.toLowerCase())
        );

         // Ubah download_url menjadi embed_url dan tambahkan player_url
         filteredFiles.forEach(vid => {
            vid.embed_url = vid.download_url ? vid.download_url.replace('/d/', '/e/') : '';
            vid.player_url = `/video/${vid.file_code}`;
         });


        const paginationData = paginateResults(filteredFiles, page, ITEMS_PER_PAGE);

        res.render('search', {
            query: query,
            results: paginationData.items,
            currentPage: paginationData.currentPage,
            totalPages: paginationData.totalPages,
            totalItems: paginationData.totalItems,
            hasNextPage: paginationData.hasNextPage,
            hasPrevPage: paginationData.hasPrevPage,
             // Tambahkan parameter query ke link pagination
            paginationBaseUrl: `/search?q=${encodeURIComponent(query)}`
        });
    } catch (error) {
        console.error("Error di route /search:", error);
        next(error);
    }
});


module.exports = router;