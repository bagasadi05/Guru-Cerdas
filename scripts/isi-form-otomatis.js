const { chromium } = require('playwright');

// Daftar nama acak untuk diisi di halaman 1
const names = ['Budi', 'Andi', 'Siti', 'Agus', 'Lina', 'Rudi', 'Ayu', 'Dika', 'Putri', 'Dimas'];

async function isiKuesioner() {
  // Set headless: false agar kita bisa melihat prosesnya di layar
  const browser = await chromium.launch({ headless: false }); 
  const page = await browser.newPage();
  
  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScDH9OXb9kGEtVPo1AKa1s1L5zZemHdkXDorE9CU9jzocGsMw/viewform';
  console.log('Membuka Google Form...');
  
  try {
    await page.goto(formUrl, { waitUntil: 'networkidle' });

    // ==========================================
    // HALAMAN 1: Profil Responden
    // ==========================================
    console.log('Mengisi Halaman 1...');
    
    // 1. Nama (Pilih acak dari array)
    const randomName = names[Math.floor(Math.random() * names.length)] + ' ' + Math.floor(Math.random() * 100);
    await page.getByRole('textbox', { name: 'Nama' }).fill(randomName);

    // 2. Usia (Pilihan: "18-24 Tahun")
    await page.getByLabel('18-24 Tahun').click();

    // 3. Jenis Kelamin (Acak Laki-laki / Perempuan)
    const jk = Math.random() > 0.5 ? 'Laki-laki' : 'Perempuan';
    await page.getByLabel(jk, { exact: true }).click();

    // 4. Kriteria Wajib (Harus "Ya")
    // Karena ada beberapa opsi "Ya", kita gunakan locators yang spesifik
    const questionContainers = await page.locator('div[role="listitem"]').all();
    for (const container of questionContainers) {
      const text = await container.innerText();
      if (text.includes('Berdomisili di Kota Madiun') || 
          text.includes('Pengguna aktif Tiktok') || 
          text.includes('Pernah membeli minuman matcha')) {
        await container.locator('div[aria-label="Ya"]').click();
      }
    }

    // Lanjut ke halaman 2
    console.log('Klik Berikutnya...');
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // jeda sedikit agar animasi selesai

    // ==========================================
    // HALAMAN 2 DAN SETERUSNYA: Kuisioner Likert
    // ==========================================
    // Kita buat loop untuk menghandle jika ada lebih dari 1 halaman pertanyaan
    let isFinished = false;
    let pageCount = 2;

    while (!isFinished) {
      console.log(`Mengisi Halaman ${pageCount}...`);
      
      // Cari semua grup radio button (Setiap baris pertanyaan Likert adalah 1 radiogroup)
      const radioGroups = await page.locator('[role="radiogroup"]').all();
      
      for (let i = 0; i < radioGroups.length; i++) {
        const group = radioGroups[i];
        
        // Ambil semua opsi (1-5) dalam pertanyaan ini
        const options = await group.locator('[role="radio"]').all();
        
        if (options.length > 0) {
          // Pilih jawaban secara cerdas
          // Pilihan 0 = STS(1), 1 = TS(2), 2 = N(3), 3 = S(4), 4 = SS(5)
          // Kita akan buat dominan menjawab Setuju (3) atau Sangat Setuju (4), kadang Netral (2)
          // Bobot array: [2, 3, 3, 4, 4] -> Dominan 4 dan 5 (indeks 3 dan 4)
          const choices = [2, 3, 3, 4, 4]; 
          let randomChoiceIndex = choices[Math.floor(Math.random() * choices.length)];
          
          // Pastikan index tidak melebihi opsi yang ada
          if (randomChoiceIndex >= options.length) {
            randomChoiceIndex = options.length - 1;
          }

          // Gunakan force: true untuk memastikan ter-klik meskipun tertutup elemen lain
          await options[randomChoiceIndex].click({ force: true });
        }
      }

      // Cek apakah ada tombol "Berikutnya" atau "Kirim"
      const btnBerikutnya = page.getByRole('button', { name: 'Berikutnya' });
      const btnKirim = page.getByRole('button', { name: 'Kirim' });

      if (await btnBerikutnya.isVisible()) {
        console.log('Klik Berikutnya...');
        await btnBerikutnya.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        pageCount++;
      } else if (await btnKirim.isVisible()) {
        console.log('Halaman terakhir tercapai. Mengklik Kirim...');
        // UNCOMMENT BARIS DI BAWAH INI UNTUK BENAR-BENAR MENGIRIM DATA
        // await btnKirim.click();
        
        isFinished = true;
      } else {
        // Jika tidak ada keduanya (error/anomali)
        isFinished = true;
      }
    }

    console.log('✅ Selesai! Form berhasil diisi.');
    
    // Tahan browser agar Anda bisa melihat hasilnya sebelum ditutup (10 detik)
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Terjadi kesalahan:', error.message);
  } finally {
    await browser.close();
  }
}

isiKuesioner();
