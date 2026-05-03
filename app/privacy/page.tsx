import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[#050507] text-[#F5F1E8]">
      <div className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-6 md:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-[#8F887C]">
              INFORMASI
            </div>
            <h1 className="mt-2 text-[30px] font-bold tracking-tight text-white md:text-[34px]">
              Kebijakan Privasi
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
              Kebijakan privasi ini menjelaskan bagaimana DRAMALOTUS ("kami")
              mengelola informasi pribadi Anda saat menggunakan platform
              streaming drama china kami, termasuk aplikasi, situs web, dan
              layanan terkait lainnya.
            </p>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                1. Pendahuluan
              </h2>
              <p>
                Kami berkomitmen untuk melindungi privasi dan keamanan data
                Anda. Dokumen ini memberikan gambaran lengkap mengenai jenis
                data yang kami kumpulkan, tujuan pemrosesan, pihak yang
                terlibat, serta hak-hak yang dapat Anda gunakan untuk
                mengontrol informasi pribadi Anda.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                2. Informasi yang Kami Kumpulkan
              </h2>
              <p>
                Kami mengumpulkan beberapa jenis data pribadi saat Anda
                berinteraksi dengan layanan kami:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">Data Akun:</strong> nama
                  lengkap, alamat email, nomor telepon, foto profil, preferensi
                  tontonan, riwayat penelusuran, daftar favorit, serta status
                  langganan atau VIP Anda.
                </li>
                <li>
                  <strong className="text-white">Data Penggunaan:</strong>
                  riwayat penayangan drama, durasi tontonan, interaksi dengan
                  fitur seperti komentar atau ulasan, pencarian, preferensi
                  audio/subtitle, serta perilaku lainnya yang membantu kami
                  memahami minat dan kualitas layanan.
                </li>
                <li>
                  <strong className="text-white">
                    Data Perangkat dan Teknis:
                  </strong>{" "}
                  alamat IP, model perangkat, sistem operasi, versi aplikasi,
                  jenis browser, pengenal perangkat (device identifier),
                  cookie, dan data diagnostik lain yang diperlukan untuk
                  menjaga keamanan dan stabilitas sistem.
                </li>
                <li>
                  <strong className="text-white">Data Pembayaran:</strong>{" "}
                  informasi transaksi, metode pembayaran, dan catatan
                  penagihan yang difasilitasi oleh mitra pembayaran tepercaya.
                  Kami tidak menyimpan detail kartu secara langsung, namun
                  menerima notifikasi status dari penyedia pembayaran.
                </li>
                <li>
                  <strong className="text-white">Data Komunikasi:</strong> isi
                  permintaan dukungan, tanggapan survei, partisipasi program
                  promosi, dan korespondensi lain yang Anda kirimkan kepada tim
                  kami.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                3. Cara Kami Menggunakan Informasi Anda
              </h2>
              <p>
                Informasi yang kami kumpulkan dimanfaatkan untuk kebutuhan
                berikut:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Menyediakan akses streaming drama china yang lancar dan personal.</li>
                <li>Memverifikasi identitas, mengelola akun, dan menjaga keamanan pengguna.</li>
                <li>
                  Menganalisis performa konten, melakukan personalisasi
                  rekomendasi, serta meningkatkan antarmuka.
                </li>
                <li>
                  Menerapkan penagihan, memproses transaksi, dan mengelola
                  keuntungan VIP.
                </li>
                <li>
                  Mengirimkan notifikasi penting terkait pembaruan fitur,
                  perubahan ketentuan, atau dukungan teknis.
                </li>
                <li>
                  Melakukan riset internal dan metrik untuk memastikan kualitas
                  platform tetap optimal.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                4. Dasar Hukum Pemrosesan Data
              </h2>
              <p>
                Kami memproses data pribadi Anda berdasarkan dasar hukum
                berikut:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Persetujuan eksplisit yang Anda berikan saat membuat akun atau
                  mengaktifkan fitur tertentu.
                </li>
                <li>
                  Pelaksanaan perjanjian layanan streaming antara Anda dan kami.
                </li>
                <li>
                  Kewajiban hukum yang berlaku, termasuk permintaan otoritas
                  resmi.
                </li>
                <li>
                  Kepentingan sah kami untuk mencegah penyalahgunaan, menjaga
                  keamanan, dan mengembangkan produk.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                5. Berbagi Informasi dengan Pihak Ketiga
              </h2>
              <p>
                Kami dapat membagikan informasi pribadi kepada pihak ketiga
                tepercaya dalam kondisi terbatas dan terkontrol, termasuk:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Penyedia infrastruktur teknologi, penyimpanan awan, dan
                  layanan streaming konten.
                </li>
                <li>
                  Mitra pembayaran dan penagihan untuk memproses transaksi
                  secara aman.
                </li>
                <li>
                  Tim dukungan, analitik, atau pemasaran yang membantu
                  peningkatan pengalaman pengguna.
                </li>
                <li>
                  Otoritas hukum atau regulator jika diwajibkan undang-undang
                  atau proses peradilan.
                </li>
              </ul>
              <p className="mt-3">
                Setiap pihak ketiga yang menerima data diwajibkan untuk
                menerapkan standar keamanan yang sebanding dan hanya
                menggunakan data sesuai tujuan yang disepakati.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                6. Cookie dan Teknologi Pelacakan
              </h2>
              <p>
                Kami menggunakan cookie, beacon, dan teknologi serupa untuk
                mengelola sesi, mengingat preferensi, serta mengukur efektivitas
                kampanye dan rekomendasi konten. Anda dapat mengatur ulang
                preferensi cookie melalui pengaturan browser atau perangkat.
                Penonaktifan cookie tertentu dapat memengaruhi kinerja
                platform.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                7. Pilihan dan Hak Pengguna
              </h2>
              <p>
                Anda memiliki hak berikut terkait data pribadi Anda:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Mengakses dan memperoleh salinan data pribadi yang kami simpan.</li>
                <li>Memperbaiki informasi yang tidak lengkap atau tidak akurat.</li>
                <li>
                  Meminta penghapusan data, sejauh diperbolehkan oleh hukum yang
                  berlaku.
                </li>
                <li>
                  Menolak atau membatasi pemrosesan tertentu, termasuk
                  penggunaan data untuk pemasaran.
                </li>
                <li>
                  Menarik persetujuan kapan saja tanpa memengaruhi hukum
                  pemrosesan sebelumnya.
                </li>
                <li>
                  Memindahkan data ke penyedia layanan lain (data portability)
                  jika secara teknis memungkinkan.
                </li>
              </ul>
              <p className="mt-3">
                Untuk menggunakan hak-hak ini, Anda dapat menghubungi kami
                melalui informasi kontak yang tercantum di bagian akhir. Kami
                akan menanggapi permintaan Anda dalam jangka waktu yang wajar
                sesuai ketentuan perundang-undangan.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                8. Keamanan Data
              </h2>
              <p>
                Kami menerapkan langkah keamanan teknis dan organisasi,
                termasuk enkripsi, kontrol akses, audit sistem, dan pemantauan
                anomali untuk melindungi data dari akses ilegal, kehilangan,
                atau penyalahgunaan. Walaupun kami berupaya maksimal, tidak ada
                metode transmisi atau penyimpanan elektronik yang 100% aman.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                9. Retensi Data
              </h2>
              <p>
                Kami menyimpan data pribadi selama diperlukan untuk memenuhi
                tujuan pengumpulan, kewajiban hukum, penyelesaian sengketa, dan
                penegakan perjanjian. Setelah periode retensi berakhir, data
                akan dihapus atau dianonimkan.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                10. Layanan Pihak Ketiga
              </h2>
              <p>
                Platform kami dapat menautkan ke layanan pihak ketiga seperti
                jaringan iklan, media sosial, atau aplikasi mitra. Harap
                periksa kebijakan privasi masing-masing pihak karena kami tidak
                bertanggung jawab atas praktik mereka.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                11. Privasi Anak-Anak
              </h2>
              <p>
                Layanan DRAMALOTUS ditujukan bagi pengguna berusia minimal 13
                tahun. Kami tidak secara sengaja mengumpulkan data anak-anak di
                bawah usia tersebut. Jika Anda adalah orang tua atau wali dan
                mengetahui anak Anda memberikan data kepada kami, segera
                hubungi kami untuk penghapusan.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-[16px] font-semibold text-white">
                12. Perubahan Kebijakan
              </h2>
              <p>
                Kami dapat memperbarui kebijakan privasi ini secara berkala.
                Versi terbaru akan selalu tersedia di halaman ini dengan tanggal
                pembaruan yang diperbarui. Jika perubahan bersifat material,
                kami akan memberi tahu Anda melalui email atau notifikasi dalam
                aplikasi.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
