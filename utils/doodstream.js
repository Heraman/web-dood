// utils/doodstream.js
const axios = require('axios');
const API_KEY = process.env.DOODSTREAM_API_KEY;
const BASE_URL = 'https://doodapi.co/api';

if (!API_KEY) {
    console.error("Kesalahan: DOODSTREAM_API_KEY tidak ditemukan di file .env");
    process.exit(1); // Keluar jika API key tidak ada
}

/**
 * Mengambil semua file dari API Doodstream, menangani pagination.
 * @returns {Promise<Array>} Array berisi objek file video.
 */
async function getAllFiles() {
    let allFiles = [];
    let currentPage = 1;
    let totalPages = 1;
    const perPage = 200; // Maksimum per halaman dari API

    console.log('Memulai pengambilan data dari Doodstream API...');

    try {
        do {
            const url = `${BASE_URL}/file/list?key=${API_KEY}&page=${currentPage}&per_page=${perPage}`;
            console.log(`Mengambil halaman ${currentPage}... URL: ${url}`);
            const response = await axios.get(url);

            if (response.data && response.data.status === 200 && response.data.result) {
                const result = response.data.result;
                if (result.files && result.files.length > 0) {
                     allFiles = allFiles.concat(result.files);
                } else {
                     console.log(`Halaman ${currentPage} tidak memiliki file.`);
                }
                totalPages = parseInt(result.total_pages, 10) || 1; // Update total halaman
                console.log(`Halaman ${currentPage} berhasil diambil. Total halaman: ${totalPages}. Jumlah file di halaman ini: ${result.files ? result.files.length : 0}. Total file sejauh ini: ${allFiles.length}`);
            } else {
                console.error(`Error mengambil data dari API Doodstream (hal ${currentPage}):`, response.data ? response.data.msg : 'Response data tidak ada');
                // Berhenti jika ada error di satu halaman untuk menghindari loop tak terbatas
                break;
            }
            currentPage++;
        } while (currentPage <= totalPages);

        console.log(`Pengambilan data selesai. Total ${allFiles.length} file ditemukan.`);
        return allFiles;
    } catch (error) {
        console.error('Error saat melakukan request ke Doodstream API:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return []; // Kembalikan array kosong jika terjadi error
    }
}


/**
 * Meng-clone video menggunakan file code.
 * @param {string} fileCode - Kode file Doodstream yang akan di-clone.
 * @returns {Promise<object>} Hasil dari API clone.
 */
async function cloneFile(fileCode) {
    const url = `${BASE_URL}/file/clone?key=${API_KEY}&file_code=${fileCode}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error cloning file ${fileCode}:`, error.message);
        if (error.response) {
             console.error('Response data:', error.response.data);
             return error.response.data; // Kembalikan pesan error dari API jika ada
        }
        return { status: 500, msg: `Gagal meng-clone file: ${error.message}` }; // Error internal
    }
}

/**
 * Ekstrak file code dari URL Doodstream.
 * @param {string} url - URL Doodstream (embed atau download).
 * @returns {string|null} File code atau null jika tidak valid.
 */
function extractFileCode(url) {
    try {
        const urlParts = new URL(url);
        const pathSegments = urlParts.pathname.split('/');
        // Ambil segmen terakhir, itu seharusnya file code
        if (pathSegments.length >= 2) {
            return pathSegments[pathSegments.length - 1];
        }
    } catch (e) {
        console.error("URL tidak valid:", url);
    }
    // Coba regex sebagai fallback jika new URL gagal atau format berbeda
    const match = url.match(/\/(?:d|e)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}


module.exports = {
    getAllFiles,
    cloneFile,
    extractFileCode,
};