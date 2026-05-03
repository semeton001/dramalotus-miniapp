import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#050507] text-[#F5F1E8]">
      <div className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-6 md:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-[#8F887C]">
              INFORMASI
            </div>
            <h1 className="mt-2 text-[30px] font-bold tracking-tight text-white md:text-[34px]">
              Syarat & Ketentuan
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-[#F5F1E8] transition hover:border-[#C9A45C]/16 hover:bg-white/[0.05]"
          >
            Kembali
          </Link>
        </div>

        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.98)_0%,rgba(12,13,19,0.98)_100%)] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="space-y-6 text-[14px] leading-7 text-[#D7CBB7]">
            <p>
              Dokumen ini ("Ketentuan") mengatur penggunaan Anda terhadap semua
              layanan DRAMALOTUS, termasuk situs web, aplikasi, konten
              streaming, dan fitur interaktif lainnya. Dengan membuat akun atau
              mengakses layanan kami, Anda menyatakan setuju untuk terikat oleh
              ketentuan berikut.
            </p>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                1. Definisi
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">"Layanan"</strong> berarti
                  seluruh produk digital DRAMALOTUS, termasuk, namun tidak
                  terbatas pada, aplikasi web, aplikasi seluler, dan integrasi
                  pihak ketiga.
                </li>
                <li>
                  <strong className="text-white">"Pengguna"</strong> berarti
                  setiap individu yang mengakses atau menggunakan layanan kami.
                </li>
                <li>
                  <strong className="text-white">"Konten"</strong> berarti
                  video, audio, teks, gambar, ulasan, metadata, dan materi lain
                  yang tersedia di platform.
                </li>
                <li>
                  <strong className="text-white">"Konten Pihak Ketiga"</strong>{" "}
                  berarti seluruh materi audiovisual termasuk film, drama, dan
                  media lain yang bersumber dari penyedia atau pemegang lisensi
                  eksternal dan ditampilkan melalui platform.
                </li>
                <li>
                  <strong className="text-white">"Akun"</strong> berarti
                  kredensial yang dibuat pengguna untuk mengakses layanan yang
                  dipersonalisasi.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                2. Penerimaan Ketentuan
              </h2>
              <p>
                Dengan mengakses atau menggunakan layanan, Anda menerima
                ketentuan ini dan semua kebijakan yang dirujuk, termasuk
                Kebijakan Privasi. Jika Anda tidak setuju, mohon hentikan
                penggunaan layanan kami. Kami dapat memperbarui ketentuan
                sewaktu-waktu dan akan mengumumkan perubahan signifikan melalui
                notifikasi atau email.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                3. Akses dan Kelayakan
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Layanan ditujukan bagi pengguna berusia minimal 13 tahun.
                  Pengguna di bawah 18 tahun memerlukan persetujuan orang tua
                  atau wali.
                </li>
                <li>
                  Anda bertanggung jawab memastikan perangkat dan koneksi
                  internet memadai untuk streaming konten video.
                </li>
                <li>
                  Kami dapat membatasi akses di wilayah tertentu karena izin
                  lisensi konten.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                4. Pembuatan dan Keamanan Akun
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Anda wajib memberikan informasi yang akurat, lengkap, dan
                  terbaru saat membuat akun.
                </li>
                <li>
                  Anda bertanggung jawab menjaga kerahasiaan kredensial masuk
                  dan segera memberi tahu kami jika menduga adanya penggunaan
                  tidak sah.
                </li>
                <li>
                  Kami dapat menangguhkan atau mengakhiri akun jika informasi
                  yang diberikan tidak valid atau melanggar ketentuan ini.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                5. Langganan, Pembayaran, dan Refund
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Beberapa konten atau fitur premium memerlukan langganan atau
                  pembelian dalam aplikasi. Harga dapat berubah sewaktu-waktu.
                </li>
                <li>
                  Semua pembayaran diproses melalui mitra pembayaran resmi.
                  Anda harus mematuhi syarat dan kebijakan privasi mereka.
                </li>
                <li>
                  Jika transaksi gagal, kami dapat menangguhkan akses premium
                  hingga pembayaran diselesaikan.
                </li>
                <li>
                  Kecuali diwajibkan oleh hukum, pembayaran yang telah
                  dikonfirmasi tidak dapat dikembalikan. Namun kami dapat
                  memberikan kredit dalam kondisi tertentu.
                </li>
                <li>
                  Jika konten tertentu dihapus atau tidak tersedia karena
                  pencabutan lisensi oleh pihak ketiga atau tindakan hukum,
                  pengguna tidak berhak atas pengembalian dana atas layanan VIP
                  yang sedang berjalan.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                6. Penggunaan yang Diperbolehkan
              </h2>
              <p>
                Anda setuju untuk menggunakan layanan hanya untuk keperluan yang
                sah dan dengan cara yang tidak merugikan pihak lain.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Streaming dan mengunduh konten semata-mata untuk konsumsi
                  personal dan non-komersial.
                </li>
                <li>
                  Mematuhi hak cipta, merek dagang, dan hukum berlaku terkait
                  konten yang tersedia.
                </li>
                <li>
                  Tidak mem-bypass, memodifikasi, atau menonaktifkan fitur
                  keamanan atau DRM kami.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                7. Larangan
              </h2>
              <p>Anda dilarang melakukan tindakan berikut:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Mengunggah, menyebarkan, atau mengakses konten ilegal,
                  berbahaya, cabul, atau melanggar hak pihak ketiga.
                </li>
                <li>
                  Memperbanyak, mencatat, atau mendistribusikan ulang konten
                  tanpa izin tertulis.
                </li>
                <li>
                  Melakukan aktivitas otomatis seperti scraping, crawling, atau
                  penggunaan bot yang mengganggu layanan.
                </li>
                <li>
                  Memalsukan identitas, menyalahgunakan program referral, atau
                  mengelabui sistem penagihan.
                </li>
                <li>
                  Mengupload malware, melakukan serangan DDoS, atau mencoba
                  mendapatkan akses tidak sah ke server kami.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                8. Konten dan Hak Kekayaan Intelektual
              </h2>
              <p>
                DRAMALOTUS beroperasi sebagai platform penyedia layanan
                streaming yang menampilkan konten dari penyedia dan pemegang
                lisensi pihak ketiga. Kami tidak memproduksi, memiliki, atau
                mengklaim hak cipta atas konten film, drama, atau materi
                audiovisual yang tersedia di platform ini.
              </p>
              <p className="mt-3">
                Seluruh hak cipta atas konten yang ditampilkan tetap menjadi
                milik pemegang hak asli atau pihak yang memberikan lisensi
                kepada kami. DRAMALOTUS tidak bertanggung jawab atas keakuratan,
                legalitas, atau kesesuaian konten yang disediakan oleh pihak
                ketiga tersebut.
              </p>
              <p className="mt-3">
                Elemen-elemen yang menjadi milik DRAMALOTUS — termasuk nama
                merek, logo, desain antarmuka, dan fitur platform — dilindungi
                oleh hak kekayaan intelektual yang berlaku dan tidak boleh
                digunakan tanpa izin tertulis dari kami.
              </p>
              <p className="mt-3">
                Jika Anda meyakini bahwa konten tertentu di platform kami
                melanggar hak cipta Anda, silakan ajukan laporan melalui
                prosedur yang dijelaskan pada bagian Pelaporan Pelanggaran Hak
                Cipta (DMCA) di bawah.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                9. Program Promosi dan Hadiah
              </h2>
              <p>
                Kami dapat menyelenggarakan program hadiah, undian, atau
                promosi khusus. Ketentuan tambahan dapat berlaku dan akan
                diinformasikan secara terpisah. Penyertaan Anda menunjukkan
                penerimaan terhadap ketentuan tambahan tersebut.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                10. Penghentian
              </h2>
              <p>
                Kami berhak menangguhkan atau mengakhiri akses Anda jika terjadi
                pelanggaran ketentuan, tindakan penipuan, atau penggunaan
                layanan yang merugikan. Anda dapat menutup akun kapan saja
                melalui pengaturan atau menghubungi tim dukungan. Setelah akun
                ditutup, akses ke konten premium akan berakhir.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                11. Penafian Konten dan Perlindungan Intermediari
              </h2>
              <p>
                DRAMALOTUS bertindak semata-mata sebagai platform perantara
                (intermediary) yang menyediakan akses ke Konten Pihak Ketiga.
                Kami tidak membuat, mengedit, mengkurasi, memoderasi, atau
                memverifikasi konten yang ditampilkan di platform sebelum konten
                tersebut tersedia bagi pengguna.
              </p>
              <p className="mt-3">
                Seluruh Konten Pihak Ketiga disediakan "sebagaimana adanya"
                (as-is) dan "sebagaimana tersedia" (as-available) tanpa jaminan
                dalam bentuk apa pun, baik tersurat maupun tersirat, termasuk
                namun tidak terbatas pada jaminan kelayakan jual, kesesuaian
                untuk tujuan tertentu, atau tidak adanya pelanggaran hak pihak
                ketiga.
              </p>
              <p className="mt-3">
                DRAMALOTUS tidak bertanggung jawab dan tidak memberikan jaminan
                atas:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Keakuratan, kelengkapan, legalitas, atau keandalan Konten
                  Pihak Ketiga.
                </li>
                <li>
                  Pelanggaran hak cipta, merek dagang, atau hak kekayaan
                  intelektual lainnya oleh Konten Pihak Ketiga.
                </li>
                <li>
                  Kerugian yang timbul dari penggunaan atau kepercayaan terhadap
                  Konten Pihak Ketiga oleh pengguna.
                </li>
                <li>
                  Ketersediaan konten tertentu di wilayah atau waktu tertentu,
                  yang dapat berubah tanpa pemberitahuan.
                </li>
                <li>
                  Kualitas streaming yang dapat dipengaruhi oleh koneksi
                  internet, perangkat, dan faktor teknis lain.
                </li>
              </ul>
              <p className="mt-3">
                Jika terdapat klaim bahwa konten tertentu melanggar hak pihak
                ketiga, kami akan mengambil tindakan sesuai prosedur DMCA yang
                dijelaskan dalam ketentuan ini, termasuk penghapusan konten yang
                dilaporkan dalam waktu yang wajar.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                12. Batasan Tanggung Jawab
              </h2>
              <p>
                Sejauh diizinkan oleh hukum, DRAMALOTUS tidak bertanggung jawab
                atas kerugian tidak langsung, insidental, khusus, atau
                konsekuensial akibat penggunaan atau ketidakmampuan menggunakan
                layanan, termasuk namun tidak terbatas pada:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Klaim pelanggaran hak kekayaan intelektual yang timbul dari
                  Konten Pihak Ketiga.
                </li>
                <li>
                  Penghapusan atau tidak tersedianya konten akibat pencabutan
                  lisensi atau permintaan takedown.
                </li>
                <li>
                  Kerugian yang timbul dari tindakan atau kelalaian penyedia
                  konten pihak ketiga.
                </li>
                <li>
                  Gangguan layanan, kehilangan data, atau masalah teknis
                  lainnya.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                13. Ganti Rugi
              </h2>
              <p>
                Anda setuju untuk mengganti rugi dan membebaskan DRAMALOTUS,
                pemilik, direksi, karyawan, afiliasi, mitra, serta penyedia
                konten pihak ketiga kami dari dan terhadap setiap klaim,
                tuntutan, kerugian, biaya (termasuk biaya hukum yang wajar),
                atau tanggung jawab yang timbul dari atau terkait dengan:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Pelanggaran Anda terhadap ketentuan ini.</li>
                <li>
                  Penggunaan layanan dengan cara yang melanggar hukum atau hak
                  pihak ketiga.
                </li>
                <li>
                  Konten yang Anda kirimkan, unggah, atau distribusikan melalui
                  platform.
                </li>
                <li>
                  Klaim pihak ketiga yang timbul akibat penggunaan Anda atas
                  Konten Pihak Ketiga di luar lingkup yang diizinkan.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                14. Perubahan Layanan
              </h2>
              <p>
                Kami dapat menambah, mengubah, atau menghapus fitur kapan saja
                untuk meningkatkan pengalaman pengguna atau memenuhi kewajiban
                hukum. Jika perubahan berdampak signifikan pada layanan
                berbayar, kami akan memberi pemberitahuan sebelumnya.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                15. Pelaporan Pelanggaran Hak Cipta (DMCA)
              </h2>
              <p>
                DRAMALOTUS menghormati hak kekayaan intelektual pihak lain. Jika
                Anda meyakini bahwa konten yang tersedia di platform kami
                melanggar hak cipta Anda, silakan kirimkan pemberitahuan
                tertulis ke alamat email berikut:
              </p>
              <p className="mt-3 font-semibold text-white">
                Kirim laporan ke support@dramalotus.com
              </p>
              <p className="mt-3">
                Pemberitahuan pelanggaran hak cipta harus memuat informasi
                berikut:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Identitas lengkap pelapor (nama, alamat, nomor telepon, dan
                  alamat email).
                </li>
                <li>
                  Deskripsi karya berhak cipta yang diyakini telah dilanggar.
                </li>
                <li>
                  URL atau lokasi spesifik konten yang diduga melanggar di
                  platform kami.
                </li>
                <li>
                  Pernyataan bahwa Anda memiliki keyakinan itikad baik bahwa
                  penggunaan materi tersebut tidak diizinkan oleh pemilik hak
                  cipta, agennya, atau hukum yang berlaku.
                </li>
                <li>
                  Pernyataan bahwa informasi dalam pemberitahuan adalah akurat
                  dan, di bawah ancaman hukuman sumpah palsu, bahwa Anda adalah
                  pemilik hak cipta atau berwenang bertindak atas nama pemilik.
                </li>
                <li>
                  Tanda tangan elektronik atau fisik dari pemilik hak cipta atau
                  perwakilan yang berwenang.
                </li>
              </ul>
              <p className="mt-3">
                Kami akan meninjau setiap laporan yang diterima dan mengambil
                tindakan yang sesuai, termasuk penghapusan konten yang
                melanggar, dalam waktu yang wajar sesuai ketentuan hukum yang
                berlaku.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                16. Hukum yang Berlaku
              </h2>
              <p>
                Ketentuan ini diatur oleh hukum yang berlaku dimana DRAMALOTUS
                beroperasi. Setiap sengketa akan diselesaikan di pengadilan
                yang berwenang di wilayah domisili DRAMALOTUS, kecuali
                ditentukan lain oleh regulasi yang bersifat mengikat.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
