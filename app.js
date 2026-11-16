/* =====================================================================
   APP.JS v15 — SIM TATIB (localStorage) — UI v2 (design system modern)
   Perubahan v15 (tampilan, logika v14 tetap sama):
   - Ikon SVG konsisten di sidebar, judul halaman & tombol aksi
   - Sidebar berkelompok (Menu Utama / Referensi / Pengguna) + kartu user
   - Dialog konfirmasi custom (uiConfirm) pengganti confirm() bawaan
   - Login split-screen, topbar putih, tabel & form restyle
   Perubahan v14:
   1. No. HP/WA orang tua kini DISIMPAN LANGSUNG DI DATA SISWA (Kelola
      Data Siswa, field noHpOrtu). Form Input Pelanggaran membaca nomor
      LANGSUNG dari data siswa yang dipilih (fallback: akun ortu
      terhubung via NIS). Nomor tidak hilang lagi walau akun orang tua
      belum dibuat. Juga dipakai oleh tombol 💬 WA Ortu di BK.
   2. Form Input Pelanggaran punya dropdown SEMESTER (Ganjil/Genap) &
      TAHUN PELAJARAN — otomatis mengikuti tanggal, bisa diubah manual.
   3. Notifikasi ORANG TUA & SISWA YANG MELANGGAR DIPISAH (flag
      untukOrtu / untukSiswa — masing-masing hanya melihat punyanya) dan
      kini diberi label penerima pada kartu notifikasi.
   4. Status pemanggilan BK TANPA DROPDOWN (badge status):
      Menunggu BK → klik 💬 WA Ortu = Dipanggil
      → klik tombol centang ✅ di kolom Aksi = Selesai.
   ===================================================================== */

/* ---------- ERROR TRAP GLOBAL ---------- */
window.addEventListener("error", e => {
  try { toast("⚠️ Error: " + (e.message || "tidak diketahui"), "err"); } catch (_) { }
});
window.addEventListener("unhandledrejection", e => {
  try { toast("⚠️ Error: " + ((e.reason && e.reason.message) || e.reason || "tidak diketahui"), "err"); } catch (_) { }
});

/* ---------- 1. DATABASE LOKAL ---------- */
const DB_PREFIX = "simtatib_";
const dbRead = key => {
  try { return JSON.parse(localStorage.getItem(DB_PREFIX + key)) || []; }
  catch (e) { return []; }
};
const dbWrite = (key, val) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(val));
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const getUsers       = () => dbRead("users");
const getJenis       = () => dbRead("jenis");
const getJurusan     = () => dbRead("jurusan");
const getKelas       = () => dbRead("kelas");
const getPelanggaran = () => dbRead("pelanggaran");
const getPanggilan   = () => dbRead("panggilan");
const getNotifikasi  = () => dbRead("notifikasi");
const saveUsers       = v => dbWrite("users", v);
const saveJenis       = v => dbWrite("jenis", v);
const saveJurusan     = v => dbWrite("jurusan", v);
const saveKelas       = v => dbWrite("kelas", v);
const savePelanggaran = v => dbWrite("pelanggaran", v);
const savePanggilan   = v => dbWrite("panggilan", v);
const saveNotifikasi  = v => dbWrite("notifikasi", v);

/* ---------- 2. KONFIGURASI ---------- */
const FOTO_LOGO = "";
const LOGO_KANDIDAT = ["logo.png", "logo.jpg", "logo.jpeg", "tutwuri.png", "tutwuri.jpg"];

const BATAS_PANGGILAN = 5;
const ROLE_LABEL = { admin: "Admin", tatib: "Tim Tatib", bk: "Guru BK",
                     walikelas: "Wali Kelas", siswa: "Siswa", ortu: "Orang Tua" };
const JENIS_DEFAULT = [
  "Terlambat",
  "Seragam tidak sesuai ketentuan",
  "Memakai make up tebal",
  "Membawa make up",
  "Memakai aksesoris saat sekolah",
  "Membawa rokok dan miras",
  "Pulang tidak sesuai dengan jadwal",
];
const JURUSAN_DEFAULT = ["RPL", "TKJ", "AKL", "DKV"];
const TINGKAT_OPSI    = ["X", "XI", "XII"];

let currentUser = null;

/* ---------- 3. UTIL ---------- */
const $ = id => document.getElementById(id);
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtTanggal = t => {
  if (!t) return "-";
  const d = new Date(t + "T00:00:00");
  return isNaN(d) ? t : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const fmtWaktu = ts => {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
function semesterDariTanggal(t) {
  if (!t) return "-";
  const d = new Date(t + "T00:00:00");
  if (isNaN(d)) return "-";
  const y = d.getFullYear(), m = d.getMonth() + 1;
  return m >= 7 ? `Ganjil ${y}/${y + 1}` : `Genap ${y - 1}/${y}`;
}
function toast(msg, type = "ok") {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.className = "toast", 4500);
}
function setKoneksi(html, ok) {
  const el = $("koneksiStatus");
  if (!el) return;
  el.innerHTML = html;
  el.className = ok ? "status-online" : "status-offline";
}

/* ---------- 3b. IKON SVG (gaya lucide, stroke currentColor) ---------- */
const ICON_PATHS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  landmark: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 9 5H3z"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  cap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icn ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;

/* ---------- 4. LOGO ---------- */
function setupLogo() {
  const img = $("loginLogo"), twh = $("logoTwh");
  const brandImg = $("brandLogoFoto"), brandSvg = $("brandLogoSvg");
  if (!img || !twh || !brandImg || !brandSvg) return;

  function pakaiFoto(src) {
    img.src = src;
    show(img); hide(twh);
    brandImg.src = src;
    hide(brandSvg); show(brandImg);
  }
  function pakaiSvg() {
    hide(img); show(twh);
    hide(brandImg); show(brandSvg);
  }

  img.onerror = pakaiSvg;

  if (FOTO_LOGO) { pakaiFoto(FOTO_LOGO); return; }

  (function coba(i) {
    if (i >= LOGO_KANDIDAT.length) { pakaiSvg(); return; }
    const test = new Image();
    test.onload = () => pakaiFoto(LOGO_KANDIDAT[i]);
    test.onerror = () => coba(i + 1);
    test.src = LOGO_KANDIDAT[i];
  })(0);
}

/* ---------- 5. SEED DATA AWAL ---------- */
function buatKelasDefault() {
  const arr = [];
  JURUSAN_DEFAULT.forEach(j => {
    TINGKAT_OPSI.forEach(t => {
      arr.push({ id: genId(), nama: `${t} ${j} A`, tingkat: t, jurusan: j, rombel: "A" });
    });
  });
  return arr;
}

function seedIfEmpty() {
  if (!getUsers().length) {
    const wk1 = { id: genId(), username: "wk1", password: "wk123",
                  nama: "Bu Sari (Wali X RPL A)", role: "walikelas" };
    saveUsers([
      { id: genId(), username: "admin",     password: "admin123", nama: "Administrator", role: "admin" },
      { id: genId(), username: "tatib1",    password: "tatib123", nama: "Pak Tatib",     role: "tatib" },
      wk1,
      { id: genId(), username: "bk1",       password: "bk123",    nama: "Bu Rina (BK)",  role: "bk" },
      { id: genId(), username: "budi",      password: "siswa123", nama: "Budi Santoso",  role: "siswa", nis: "SIS001", jurusan: "RPL", kelas: "X RPL A", alamat: "Jl. Merdeka No. 10", noHpOrtu: "6281234567890", walikelasId: wk1.id },
      { id: genId(), username: "ortu_budi", password: "ortu123",  nama: "Bapak Santoso", role: "ortu",  anakNis: "SIS001", noHp: "6281234567890" },
    ]);
    setKoneksi("🟢 Database lokal aktif — akun demo baru saja dibuat.", true);
  } else {
    setKoneksi("🟢 Database lokal aktif — siap login.", true);
  }
  if (!getJenis().length) {
    saveJenis(JENIS_DEFAULT.map((nama, i) => ({
      id: genId(), kode: "P" + String(i + 1).padStart(2, "0"), nama,
    })));
  }
  if (!getJurusan().length) {
    saveJurusan(JURUSAN_DEFAULT.map(nama => ({ id: genId(), nama })));
  }
  if (!getKelas().length) {
    saveKelas(buatKelasDefault());
  }
}

function nextKode() {
  let max = 0;
  getJenis().forEach(j => {
    const m = /^P(\d+)$/.exec(j.kode || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "P" + String(max + 1).padStart(2, "0");
}

/* ---------- 6. LOGIN / LOGOUT ---------- */
function doLogin() {
  const username = $("loginUser").value.trim();
  const password = $("loginPass").value;
  const err = $("loginError");
  hide(err);
  if (!username || !password) { err.textContent = "Username & password wajib diisi."; show(err); return; }

  const user = getUsers().find(u => u.username === username);
  if (!user) { err.textContent = "Username tidak ditemukan."; show(err); return; }
  if (user.password !== password) { err.textContent = "Password salah."; show(err); return; }

  currentUser = user;
  localStorage.setItem("simtatib_session", user.id);
  hide(err);
  masukApp();
}

function restoreSession() {
  const uid = localStorage.getItem("simtatib_session");
  if (!uid) return;
  const user = getUsers().find(u => u.id === uid);
  if (user) { currentUser = user; masukApp(); }
  else localStorage.removeItem("simtatib_session");
}

function doLogout() {
  localStorage.removeItem("simtatib_session");
  currentUser = null;
  hide($("appPage")); show($("loginPage"));
  $("loginPass").value = "";
}

/* ---------- 7. NAVIGASI ---------- */
/* Menu per role, dikelompokkan: [ [JudulBagian, [ [idPage, ikon, label], ... ] ] ] */
const MENU = {
  admin: [
    ["Menu Utama", [
      ["dashboard", "grid", "Dashboard"],
      ["input", "plus", "Input Pelanggaran"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
    ]],
    ["Referensi", [
      ["jenis", "book", "Bentuk Pelanggaran"],
      ["jurusan", "landmark", "Kelola Jurusan"],
      ["kelas", "layers", "Kelola Kelas"],
    ]],
    ["Pengguna", [
      ["siswa", "cap", "Data Siswa"],
      ["tatib", "shield", "Tim Tatib"],
      ["wkrole", "users", "Wali Kelas"],
      ["bkrole", "phone", "Guru BK"],
      ["ortu", "heart", "Orang Tua"],
    ]],
  ],
  tatib: [
    ["Menu Utama", [
      ["dashboard", "grid", "Dashboard"],
      ["input", "plus", "Input Pelanggaran"],
      ["jenis", "book", "Bentuk Pelanggaran"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
    ]],
  ],
  bk: [
    ["Bimbingan Konseling", [
      ["bkdash", "phone", "Pemanggilan BK"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  walikelas: [
    ["Wali Kelas", [
      ["wkdash", "home", "Kelas Saya"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  siswa: [
    ["Akun Saya", [
      ["riwayat", "history", "Pelanggaran Saya"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  ortu: [
    ["Akun Saya", [
      ["riwayat", "history", "Pelanggaran Anak"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
};

const menuList = role => MENU[role].flatMap(([, items]) => items);
const firstPage = role => menuList(role)[0][0];

/* Notifikasi dipisah per penerima:
   - ortu  : hanya notif ber-flag untukOrtu (via NIS anak)
   - siswa : hanya notif ber-flag untukSiswa (via NIS sendiri)
   - bk    : hanya notif ber-flag untukBk
   - walikelas: hanya notif ber-flag untukWk (cocok wkId) */
function notifUntukSaya() {
  if (!currentUser) return [];
  if (currentUser.role === "siswa")
    return getNotifikasi().filter(n => n.untukSiswa && n.nis === currentUser.nis);
  if (currentUser.role === "ortu")
    return getNotifikasi().filter(n => n.untukOrtu && n.nis === currentUser.anakNis);
  if (currentUser.role === "bk")
    return getNotifikasi().filter(n => n.untukBk);
  if (currentUser.role === "walikelas")
    return getNotifikasi().filter(n => n.untukWk && n.wkId === currentUser.id);
  return [];
}

function masukApp() {
  hide($("loginPage")); show($("appPage"));
  $("userName").textContent = currentUser.nama;
  $("userBadge").textContent = ROLE_LABEL[currentUser.role] || currentUser.role;
  $("userBadge").className = "badge-role role-" + currentUser.role;
  $("userAvatar").textContent = (currentUser.nama || "?").trim().split(/\s+/)
    .slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  buildSidebar();
  openPage(firstPage(currentUser.role));
  pushBrowserNotif();
}

function buildSidebar() {
  const sb = $("sidebar");
  const unread = notifUntukSaya().filter(n => !n.dibaca).length;
  sb.innerHTML = MENU[currentUser.role].map(([judul, items]) => `
    <div class="nav-group">
      <div class="nav-group-label">${esc(judul)}</div>
      ${items.map(([id, icn, label]) => {
        const badge = (id === "notifikasi" && unread)
          ? ` <span class="notif-badge">${unread}</span>` : "";
        return `<button class="nav-item" data-page="${id}">${icon(icn)}<span>${label}</span>${badge}</button>`;
      }).join("")}
    </div>`).join("") + `
    <div class="nav-footer">
      <div class="nav-footer-card">
        <span class="avatar avatar-sm">${esc($("userAvatar").textContent)}</span>
        <div class="nav-footer-meta">
          <b>${esc(currentUser.nama)}</b>
          <small>${esc(ROLE_LABEL[currentUser.role] || currentUser.role)}</small>
        </div>
      </div>
    </div>`;
  sb.querySelectorAll(".nav-item").forEach(b =>
    b.addEventListener("click", () => { openPage(b.dataset.page); tutupSidebarMobile(); }));
}

function openPage(id) {
  document.querySelectorAll(".page").forEach(p => hide(p));
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active", b.dataset.page === id));
  const page = $("page-" + id);
  if (page) show(page);
  if (id === "dashboard")   loadDashboard();
  if (id === "bkdash")      loadBkDash();
  if (id === "wkdash")      loadWkDash();
  if (id === "input")       initInputPage();
  if (id === "jenis")       loadJenis();
  if (id === "pelanggaran") loadPelanggaran();
  if (id === "jurusan")     loadJurusan();
  if (id === "kelas")       loadKelas();
  if (id === "siswa")       loadSiswa();
  if (id === "tatib")       loadAkun("tatib");
  if (id === "wkrole")      loadAkun("walikelas");
  if (id === "bkrole")      loadAkun("bk");
  if (id === "ortu")        loadAkun("ortu");
  if (id === "notifikasi")  loadNotifikasi();
  if (id === "riwayat")     loadRiwayat();
}

function muatUlangHalamanAktif() {
  const aktif = document.querySelector(".nav-item.active");
  if (aktif) openPage(aktif.dataset.page);
}

/* Sidebar mobile (off-canvas) */
function toggleSidebarMobile() { document.body.classList.toggle("sb-open"); }
function tutupSidebarMobile() { document.body.classList.remove("sb-open"); }

/* ---------- 8. DASHBOARD (admin & tatib) ---------- */
function loadDashboard() {
  $("dashNama").textContent = currentUser.nama;
  $("dashRole").textContent = ROLE_LABEL[currentUser.role] || currentUser.role;
  $("dashRole").className = "badge-role role-" + currentUser.role;
  $("adminToolsCard").classList.toggle("hidden", currentUser.role !== "admin");

  const pel  = getPelanggaran();
  const pang = getPanggilan();
  const terlibat = new Set(pel.map(p => p.siswaKey || p.nis)).size;
  const aktif = pang.filter(p => p.status !== "Selesai").length;

  $("dashRingkas").innerHTML =
    `Total pelanggaran tercatat: <b>${pel.length}</b> &nbsp;•&nbsp; ` +
    `Siswa terlibat: <b>${terlibat}</b> &nbsp;•&nbsp; Pemanggilan aktif: <b>${aktif}</b>`;

  renderPanggilan(
    [...pang].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    "panggilanWrap",
    { canWa: true, canSelesai: currentUser.role === "admin",
      canHapus: currentUser.role === "admin" }
  );
}

/* Status TANPA dropdown:
   - teks badge status (Menunggu BK / Dipanggil / Selesai)
   - 💬 WA Ortu  → status jadi "Dipanggil" (lihat kirimWa)
   - ✅ Selesai  → status jadi "Selesai" (lihat tandaiSelesai) */
function renderPanggilan(list, wrapId, opt) {
  const wrap = $(wrapId);
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("check")}<p>Belum ada siswa yang mencapai ${BATAS_PANGGILAN}x pelanggaran dalam satu semester.</p></div>`;
    return;
  }
  const statusClass = {
    "Menunggu BK": "status-menunggu",
    "Dipanggil": "status-dipanggil",
    "Selesai": "status-selesai",
  };
  wrap.innerHTML = `
    <table><thead><tr><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Semester</th><th>Jumlah</th>
    <th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${list.map(p => `<tr>
      <td>${esc(p.namaSiswa)}</td><td>${esc(p.nis || "-")}</td><td>${esc(p.kelas || "-")}</td>
      <td>${esc(p.semester || "-")}</td><td><b>${p.jumlah}x</b></td>
      <td><span class="bk-status ${statusClass[p.status] || ""}">${esc(p.status)}</span></td>
      <td>
        ${opt.canWa ? `<button class="btn btn-wa btn-sm" data-wa="${p.id}">${icon("chat")} WA Ortu</button>` : ""}
        ${opt.canSelesai && p.status !== "Selesai" ? `<button class="btn btn-sm btn-primary" data-done="${p.id}" title="Tandai pemanggilan selesai">${icon("check")} Selesai</button>` : ""}
        ${opt.canHapus ? `<button class="btn btn-danger btn-sm" data-del="${p.id}">Hapus</button>` : ""}
      </td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-wa]").forEach(b =>
    b.addEventListener("click", () => kirimWa(b.dataset.wa)));
  wrap.querySelectorAll("[data-done]").forEach(b =>
    b.addEventListener("click", () => tandaiSelesai(b.dataset.done)));
  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    const ok = await uiConfirm({
      title: "Hapus catatan panggilan ini?",
      html: `<p>Catatan pemanggilan akan dihapus dari daftar.</p>`,
      okText: "Hapus",
    });
    if (!ok) return;
    savePanggilan(getPanggilan().filter(p => p.id !== b.dataset.del));
    toast("Catatan panggilan dihapus.");
    muatUlangHalamanAktif();
  }));
}

/* ---------- 9. PEMANGGILAN OLEH BK ---------- */
function loadBkDash() {
  renderPanggilan(
    [...getPanggilan()].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    "bkdashWrap",
    { canWa: true, canSelesai: true, canHapus: false }
  );
}

/* Tombol ✅ Selesai → status "Selesai" */
function tandaiSelesai(id) {
  const panggilan = getPanggilan();
  const item = panggilan.find(p => p.id === id);
  if (!item) return;
  item.status = "Selesai";
  item.diubahOleh = currentUser.nama;
  item.selesaiPada = Date.now();
  savePanggilan(panggilan);
  toast(`✅ Pemanggilan ${item.namaSiswa} ditandai SELESAI.`);
  muatUlangHalamanAktif();
}

function kirimNotifPanggilan(p) {
  const notif = getNotifikasi();
  if (p.nis && p.nis !== "-") {
    // ===== NOTIFIKASI KHUSUS ORANG TUA =====
    getUsers().filter(u => u.role === "ortu" && u.anakNis === p.nis).forEach(o => {
      notif.push({
        id: genId(), ts: Date.now(), nis: p.nis, untukOrtu: true,
        judul: "⚠️ PEMANGGILAN ORANG TUA & SISWA",
        pesan: `Anak Anda ${p.namaSiswa} (${p.jurusan || "-"} ${p.kelas || "-"}) telah melakukan pelanggaran tata tertib sebanyak ${p.jumlah}x pada semester ${p.semester}. Anda dipanggil oleh ${p.dipanggilOleh || "Guru BK"} untuk hadir ke sekolah bersama anak Anda.`,
        dibaca: false,
      });
    });
    // ===== NOTIFIKASI KHUSUS SISWA YANG MELANGGAR =====
    const su = getUsers().find(u => u.role === "siswa" && u.nis === p.nis);
    if (su) {
      notif.push({
        id: genId(), ts: Date.now(), nis: p.nis, untukSiswa: true,
        judul: "⚠️ Kamu & Orang Tuamu Dipanggil",
        pesan: `Kamu telah melakukan pelanggaran sebanyak ${p.jumlah}x pada semester ${p.semester}. Guru BK akan memanggil orang tuamu. Segera perbaiki diri dan jaga tata tertib ya.`,
        dibaca: false,
      });
      // ===== NOTIFIKASI KHUSUS WALI KELAS =====
      if (su.walikelasId) {
        const wk = getUsers().find(u => u.id === su.walikelasId && u.role === "walikelas");
        if (wk) {
          notif.push({
            id: genId(), ts: Date.now(), untukWk: true, wkId: wk.id,
            judul: "📞 Siswa Bimbingan Dipanggil BK",
            pesan: `Siswa bimbingan Anda ${su.nama} (${su.jurusan || "-"} ${su.kelas || "-"}) telah ${p.jumlah}x melanggar pada semester ${p.semester} dan dipanggil oleh ${p.dipanggilOleh || "Guru BK"}. Mohon pendampingan.`,
            dibaca: false,
          });
        }
      }
    }
  }
  saveNotifikasi(notif);
}

/* ---------- 10. DASHBOARD WALI KELAS ---------- */
function siswaBimbinganSaya() {
  return getUsers().filter(u => u.role === "siswa" && u.walikelasId === currentUser.id);
}

function loadWkDash() {
  $("wkNama").textContent = currentUser.nama;
  const semNow = semesterDariTanggal(new Date().toISOString().slice(0, 10));
  const siswaKelas = siswaBimbinganSaya();
  $("wkInfo").innerHTML =
    `Semester berjalan: <b>${semNow}</b> &nbsp;•&nbsp; Jumlah siswa bimbingan: <b>${siswaKelas.length}</b>`;

  const wrap = $("wkSiswaWrap");
  if (!siswaKelas.length) {
    wrap.innerHTML = `<div class="empty">${icon("users")}<p>Belum ada siswa yang ditugaskan kepada Anda. Admin dapat menugaskan lewat menu Kelola Siswa (kolom Wali Kelas).</p></div>`;
    return;
  }

  const pel = getPelanggaran();
  const pang = getPanggilan();

  wrap.innerHTML = `<table><thead><tr>
    <th>NIS</th><th>Nama</th><th>Jurusan/Kelas</th><th>Pelanggaran (sem. ini)</th><th>Status</th>
    </tr></thead><tbody>
    ${siswaKelas.map(s => {
      const jml = pel.filter(p => p.siswaKey === s.nis &&
        (p.semester || semesterDariTanggal(p.tanggal)) === semNow).length;
      const st = pang.find(p => p.siswaKey === s.nis && p.semester === semNow && p.status !== "Selesai");
      let status, warna = "muted";
      if (st) { status = st.status; warna = ""; }
      else if (jml >= BATAS_PANGGILAN) { status = "Antrian BK"; warna = ""; }
      else if (jml >= 3) { status = "Peringatan"; warna = ""; }
      else { status = "Aman"; }
      return `<tr>
        <td>${esc(s.nis || "-")}</td><td>${esc(s.nama)}</td>
        <td>${esc(s.jurusan || "-")} / ${esc(s.kelas || "-")}</td>
        <td><b>${jml}</b> / ${BATAS_PANGGILAN}</td>
        <td class="${warna}"><b>${esc(status)}</b></td>
      </tr>`;
    }).join("")}
    </tbody></table>`;
}

/* ---------- 11. MASTER JURUSAN (admin) ---------- */
let editJurusanId = null;

function jumlahSiswaDengan(field, nama) {
  return getUsers().filter(u => u.role === "siswa" && u[field] === nama).length;
}

function loadJurusan() {
  const list = [...getJurusan()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $("jurusanWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("landmark")}<p>Belum ada data Jurusan. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Nama Jurusan</th><th>Dipakai oleh</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(x => `<tr>
      <td><b>${esc(x.nama)}</b></td><td>${jumlahSiswaDengan("jurusan", x.nama)} siswa</td>
      <td><button class="btn btn-sm" data-ejr="${x.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-djr="${x.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ejr]").forEach(b =>
    b.addEventListener("click", () => startEditJurusan(b.dataset.ejr)));
  wrap.querySelectorAll("[data-djr]").forEach(b =>
    b.addEventListener("click", () => deleteJurusan(b.dataset.djr)));
}

function submitJurusan(e) {
  e.preventDefault();
  const nama = $("jRNama").value.trim();
  if (!nama) { toast("Nama Jurusan wajib diisi.", "err"); return; }

  const list = getJurusan();
  if (list.some(x => (x.nama || "").toLowerCase() === nama.toLowerCase() && x.id !== editJurusanId)) {
    toast(`Jurusan "${nama}" sudah ada dalam daftar.`, "err"); return;
  }

  if (editJurusanId) {
    const item = list.find(x => x.id === editJurusanId);
    if (!item) { toast("Data tidak ditemukan.", "err"); return; }
    item.nama = nama;
    toast("Jurusan berhasil diperbarui.");
  } else {
    list.push({ id: genId(), nama });
    toast("Jurusan baru ditambahkan.");
  }
  saveJurusan(list);
  resetJurusanForm();
  loadJurusan();
}

function startEditJurusan(id) {
  const item = getJurusan().find(x => x.id === id);
  if (!item) return;
  editJurusanId = id;
  $("jRNama").value = item.nama;
  $("btnSubmitJurusan").textContent = "Simpan Perubahan";
  $("formJurusanTitle").textContent = "Edit Jurusan";
  show($("btnCancelJurusan"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetJurusanForm() {
  editJurusanId = null;
  $("formJurusan").reset();
  $("btnSubmitJurusan").textContent = "Tambah";
  $("formJurusanTitle").textContent = "Tambah Jurusan";
  hide($("btnCancelJurusan"));
}

async function deleteJurusan(id) {
  const list = getJurusan();
  const item = list.find(x => x.id === id);
  if (!item) return;
  const dipakaiSiswa = jumlahSiswaDengan("jurusan", item.nama);
  const dipakaiKelas = getKelas().filter(k => k.jurusan === item.nama).length;
  const catatan = [];
  if (dipakaiSiswa) catatan.push(`Dipakai <b>${dipakaiSiswa}</b> siswa (data mereka tetap menyimpan nilainya).`);
  if (dipakaiKelas) catatan.push(`Dipakai <b>${dipakaiKelas}</b> kelas (nama kelas tidak berubah).`);
  const ok = await uiConfirm({
    title: `Hapus Jurusan "${esc(item.nama)}"?`,
    html: catatan.length
      ? `<p>Yakin ingin menghapus jurusan ini?</p><ul class="modal-list">${catatan.map(c => `<li>${c}</li>`).join("")}</ul>`
      : `<p>Yakin ingin menghapus jurusan ini dari daftar?</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveJurusan(list.filter(x => x.id !== id));
  toast("Jurusan dihapus.");
  loadJurusan();
}

/* ---------- 12. MASTER KELAS (Tingkat + Jurusan + Rombongan) ---------- */
let editKelasId = null;

function isiDropdownKelasJurusan() {
  const cur = $("kJurusan").value;
  const list = [...getJurusan()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  $("kJurusan").innerHTML = list.length
    ? list.map(x => `<option value="${esc(x.nama)}">${esc(x.nama)}</option>`).join("")
    : `<option value="">— daftar jurusan kosong, tambahkan di menu Kelola Jurusan —</option>`;
  $("kJurusan").value = cur;
  if ($("kJurusan").selectedIndex === -1) $("kJurusan").value = "";
}

function updateKelasPreview() {
  const t = $("kTingkat").value, j = $("kJurusan").value, r = $("kRombel").value;
  $("kPreview").textContent = (t && j && r)
    ? `Kelas akan tersimpan sebagai: ${t} ${j} ${r}` : "";
}

function loadKelas() {
  isiDropdownKelasJurusan();
  updateKelasPreview();

  const list = [...getKelas()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $("kelasWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("layers")}<p>Belum ada data Kelas. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Tingkat</th><th>Jurusan</th><th>Rombongan</th><th>Nama Kelas</th><th>Dipakai oleh</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(x => `<tr>
      <td>${esc(x.tingkat || "-")}</td><td>${esc(x.jurusan || "-")}</td><td>${esc(x.rombel || "-")}</td>
      <td><b>${esc(x.nama)}</b></td><td>${jumlahSiswaDengan("kelas", x.nama)} siswa</td>
      <td><button class="btn btn-sm" data-ek="${x.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-dk="${x.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ek]").forEach(b =>
    b.addEventListener("click", () => startEditKelas(b.dataset.ek)));
  wrap.querySelectorAll("[data-dk]").forEach(b =>
    b.addEventListener("click", () => deleteKelas(b.dataset.dk)));
}

function submitKelas(e) {
  e.preventDefault();
  const tingkat = $("kTingkat").value;
  const jurusan = $("kJurusan").value;
  const rombel  = $("kRombel").value;

  if (!jurusan) {
    toast("Pilih Jurusan. Jika daftar kosong, tambahkan dulu di menu Kelola Jurusan.", "err"); return;
  }
  const nama = `${tingkat} ${jurusan} ${rombel}`;

  const list = getKelas();
  if (list.some(x => (x.nama || "").toLowerCase() === nama.toLowerCase() && x.id !== editKelasId)) {
    toast(`Kelas "${nama}" sudah ada dalam daftar.`, "err"); return;
  }

  if (editKelasId) {
    const item = list.find(x => x.id === editKelasId);
    if (!item) { toast("Data tidak ditemukan.", "err"); return; }
    Object.assign(item, { nama, tingkat, jurusan, rombel });
    toast("Kelas berhasil diperbarui.");
  } else {
    list.push({ id: genId(), nama, tingkat, jurusan, rombel });
    toast(`Kelas "${nama}" ditambahkan.`);
  }
  saveKelas(list);
  resetKelasForm();
  loadKelas();
}

function startEditKelas(id) {
  const item = getKelas().find(x => x.id === id);
  if (!item) return;

  if (!(item.tingkat && item.jurusan && item.rombel)) {
    toast(`Kelas "${item.nama}" dibuat dengan format lama dan tidak dapat diedit di form baru. Hapus lalu tambah ulang dengan format baru (contoh: XI RPL A).`, "warn");
    return;
  }

  isiDropdownKelasJurusan();
  if (![...$("kJurusan").options].some(o => o.value === item.jurusan)) {
    const opt = document.createElement("option");
    opt.value = item.jurusan;
    opt.textContent = item.jurusan + " (jurusan sudah dihapus)";
    $("kJurusan").appendChild(opt);
  }

  editKelasId = id;
  $("kTingkat").value = item.tingkat;
  $("kJurusan").value = item.jurusan;
  $("kRombel").value = item.rombel;
  updateKelasPreview();
  $("btnSubmitKelas").textContent = "Simpan Perubahan";
  $("formKelasTitle").textContent = "Edit Kelas";
  show($("btnCancelKelas"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetKelasForm() {
  editKelasId = null;
  $("formKelas").reset();
  $("kTingkat").value = "X";
  $("kRombel").value = "A";
  isiDropdownKelasJurusan();
  updateKelasPreview();
  $("btnSubmitKelas").textContent = "Tambah";
  $("formKelasTitle").textContent = "Tambah Kelas";
  hide($("btnCancelKelas"));
}

async function deleteKelas(id) {
  const list = getKelas();
  const item = list.find(x => x.id === id);
  if (!item) return;
  const dipakai = jumlahSiswaDengan("kelas", item.nama);
  const ok = await uiConfirm({
    title: `Hapus Kelas "${esc(item.nama)}"?`,
    html: dipakai
      ? `<p>Saat ini dipakai <b>${dipakai}</b> siswa (data siswa tetap menyimpan nilainya).</p>`
      : `<p>Yakin ingin menghapus kelas ini dari daftar?</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveKelas(list.filter(x => x.id !== id));
  toast("Kelas dihapus.");
  loadKelas();
}

/* ---------- 13. DROPDOWN REFERENSI (jurusan & kelas, untuk form siswa) ---------- */
function isiSatuDropdown(id, list) {
  const el = $(id);
  if (!el) return;
  const sorted = [...list].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  el.innerHTML = `<option value="">— pilih —</option>` +
    sorted.map(x => `<option value="${esc(x.nama)}">${esc(x.nama)}</option>`).join("");
}

function isiDropdownKelasSiswa(kelasTerpilih = "") {
  const dropdownJurusan = $("sJurusan");
  const dropdownKelas = $("sKelas");
  if (!dropdownJurusan || !dropdownKelas) return;

  const jurusanDipilih = dropdownJurusan.value || "";
  const daftarKelas = jurusanDipilih
    ? getKelas().filter(k => (k.jurusan || "").trim().toLowerCase() === jurusanDipilih.trim().toLowerCase())
    : [];

  dropdownKelas.innerHTML = `<option value="">${jurusanDipilih ? "— pilih kelas —" : "— pilih jurusan terlebih dahulu —"}</option>` +
    [...daftarKelas].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
      .map(k => `<option value="${esc(k.nama)}">${esc(k.nama)}</option>`).join("");
  dropdownKelas.disabled = !jurusanDipilih;

  if (kelasTerpilih && daftarKelas.some(k => k.nama === kelasTerpilih)) {
    dropdownKelas.value = kelasTerpilih;
  } else {
    dropdownKelas.value = "";
  }
}

function isiDropdownReferensi() {
  const jurusanSiswa = $("sJurusan")?.value || "";
  isiSatuDropdown("sJurusan", getJurusan());
  if (jurusanSiswa && [...$("sJurusan").options].some(o => o.value === jurusanSiswa)) {
    $("sJurusan").value = jurusanSiswa;
  }
  isiDropdownKelasSiswa($("sKelas")?.value || "");
}

function pastikanOpsi(selId, val) {
  if (!val) return;
  const el = $(selId);
  if (!el) return;
  if ([...el.options].some(o => o.value === val)) return;
  const opt = document.createElement("option");
  opt.value = val;
  opt.textContent = val + " (lama — tidak ada di daftar)";
  el.appendChild(opt);
}

/* ---------- 14. KELOLA BENTUK PELANGGARAN ---------- */
let editJenisId = null;

function loadJenis() {
  const list = [...getJenis()].sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));
  const wrap = $("jenisWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("book")}<p>Belum ada bentuk pelanggaran. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Kode</th><th>Nama Bentuk Pelanggaran</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(j => `<tr>
      <td><b>${esc(j.kode)}</b></td><td>${esc(j.nama)}</td>
      <td><button class="btn btn-sm" data-ej="${j.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-dj="${j.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ej]").forEach(b =>
    b.addEventListener("click", () => startEditJenis(b.dataset.ej)));
  wrap.querySelectorAll("[data-dj]").forEach(b =>
    b.addEventListener("click", () => deleteJenis(b.dataset.dj)));
}

function submitJenis(e) {
  e.preventDefault();
  const nama = $("jNama").value.trim();
  if (!nama) { toast("Nama bentuk pelanggaran wajib diisi.", "err"); return; }

  const jenis = getJenis();
  const dup = jenis.find(j =>
    (j.nama || "").toLowerCase() === nama.toLowerCase() && j.id !== editJenisId);
  if (dup) { toast("Bentuk pelanggaran itu sudah ada dalam daftar.", "err"); return; }

  if (editJenisId) {
    const j = jenis.find(x => x.id === editJenisId);
    if (!j) { toast("Data tidak ditemukan.", "err"); return; }
    j.nama = nama;
    saveJenis(jenis);
    toast("Bentuk pelanggaran berhasil diperbarui.");
  } else {
    jenis.push({ id: genId(), kode: nextKode(), nama });
    saveJenis(jenis);
    toast("Bentuk pelanggaran baru ditambahkan.");
  }
  resetJenisForm();
  loadJenis();
}

function startEditJenis(id) {
  const j = getJenis().find(x => x.id === id);
  if (!j) return;
  editJenisId = id;
  $("jNama").value = j.nama;
  $("btnSubmitJenis").textContent = "Simpan Perubahan";
  $("formJenisTitle").textContent = "Edit Bentuk Pelanggaran";
  show($("btnCancelJenis"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetJenisForm() {
  editJenisId = null;
  $("formJenis").reset();
  $("btnSubmitJenis").textContent = "Tambah";
  $("formJenisTitle").textContent = "Tambah Bentuk Pelanggaran";
  hide($("btnCancelJenis"));
}

async function deleteJenis(id) {
  const j = getJenis().find(x => x.id === id);
  if (!j) return;
  const ok = await uiConfirm({
    title: `Hapus "${esc(j.nama)}"?`,
    html: `<p>Bentuk pelanggaran akan dihapus dari daftar. Catatan lama tetap menyimpan nama jenisnya.</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveJenis(getJenis().filter(x => x.id !== id));
  toast("Bentuk pelanggaran dihapus.");
  loadJenis();
}

/* ---------- 15. INPUT PELANGGARAN ---------- */
function isiDropdownSiswaPelanggaran(siswaTerpilih = "") {
  const dropdown = $("mSiswa");
  if (!dropdown) return;

  const siswa = getUsers()
    .filter(u => u.role === "siswa")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));

  dropdown.innerHTML = `<option value="">— pilih siswa —</option>` +
    siswa.map(s => `<option value="${esc(s.id)}">${esc(s.nama)} — NIS: ${esc(s.nis || "-")} (${esc(s.kelas || "-")})</option>`).join("");

  if (siswaTerpilih && siswa.some(s => s.id === siswaTerpilih)) {
    dropdown.value = siswaTerpilih;
  }
  dropdown.disabled = siswa.length === 0;
  if (!siswa.length) {
    dropdown.innerHTML = `<option value="">— belum ada data siswa di Kelola Data Siswa —</option>`;
  }
  isiDataSiswaPelanggaran();
}

/* ===== NO. HP ORANG TUA LANGSUNG DARI DATA SISWA =====
   Nomor disimpan langsung pada record siswa (field noHpOrtu) yang
   dikelola di menu Kelola Data Siswa, sehingga tetap tersedia walau
   akun orang tua belum dibuat. Fallback: akun orang tua terhubung NIS. */
function getNoHpOrtuSiswa(siswa) {
  if (!siswa) return "";
  const ortu = siswa.nis
    ? getUsers().find(u => u.role === "ortu" && u.anakNis === siswa.nis)
    : null;
  return String(siswa.noHpOrtu || ortu?.noHp || siswa.noHp || "").trim();
}

/* No. HP READONLY — diambil LANGSUNG dari data siswa (Kelola Data Siswa) */
function isiDataSiswaPelanggaran() {
  const id = $("mSiswa")?.value || "";
  const siswa = getUsers().find(u => u.id === id && u.role === "siswa");
  const info = $("noHpInfo");

  if (!siswa) {
    $("mNoHp").value = "";
    if (info) info.textContent = "Pilih siswa — nomor HP orang tua terisi otomatis dari data siswa di menu Kelola Data Siswa.";
    return;
  }

  const noHp = getNoHpOrtuSiswa(siswa);
  $("mNoHp").value = noHp;
  if (info) {
    info.textContent = noHp
      ? `Nomor diambil langsung dari data siswa: ${siswa.nama} (${siswa.kelas || "-"}) — menu Kelola Data Siswa.`
      : `⚠️ Data siswa ${siswa.nama} belum punya No. HP orang tua. Isi kolom "No. HP/WA Orang Tua" di menu Kelola Data Siswa.`;
  }
}

/* Dropdown Tahun Pelajaran: rentang tahun sekarang -2 s/d +1 */
function isiDropdownTahunPelajaran() {
  const now = new Date().getFullYear();
  const opts = [];
  for (let y = now - 2; y <= now + 1; y++) opts.push(`${y}/${y + 1}`);
  $("inTahun").innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join("");
}

/* Semester & tahun pelajaran otomatis mengikuti tanggal (dapat dioverride manual) */
function sinkronSemesterDariTanggal() {
  const t = $("inTanggal").value;
  if (!t) return;
  const d = new Date(t + "T00:00:00");
  if (isNaN(d)) return;
  const y = d.getFullYear(), m = d.getMonth() + 1;
  const sem = (m >= 7) ? "Ganjil" : "Genap";
  const thn = (m >= 7) ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  isiDropdownTahunPelajaran();               // pastikan daftar tahun tersedia
  $("inSemester").value = sem;
  $("inTahun").value = thn;
  if ($("inTahun").selectedIndex === -1) {   // tanggal di luar rentang daftar
    pastikanOpsi("inTahun", thn);
    $("inTahun").value = thn;
  }
  updateSemInfo();
}

function updateSemInfo() {
  const sem = $("inSemester").value;
  const thn = $("inTahun").value;
  $("semInfo").textContent = (sem && thn)
    ? `Semester terpilih: ${sem} — Tahun Pelajaran ${thn}`
    : "";
}

function initInputPage() {
  isiDropdownSiswaPelanggaran();

  const jenisList = [...getJenis()].sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));
  $("inJenis").innerHTML = jenisList.length
    ? jenisList.map(j => `<option value="${j.id}">${esc(j.kode)} — ${esc(j.nama)}</option>`).join("")
    : `<option value="">— Belum ada daftar, tambahkan di menu Bentuk Pelanggaran —</option>`;

  $("inTanggal").value = new Date().toISOString().slice(0, 10);
  isiDropdownTahunPelajaran();
  sinkronSemesterDariTanggal();
}

function submitPelanggaran(e) {
  e.preventDefault();

  const siswaId = $("mSiswa").value;
  const siswaTerpilih = getUsers().find(u => u.id === siswaId && u.role === "siswa");
  const noHp = $("mNoHp").value.trim();

  if (!siswaTerpilih) {
    toast("Pilih siswa yang sudah terdaftar di menu Kelola Data Siswa.", "err");
    return;
  }

  const nama = siswaTerpilih.nama;
  const jurusanNama = siswaTerpilih.jurusan || "";
  const kelasNama = siswaTerpilih.kelas || "";
  const dataKelasDipilih = getKelas().find(k => k.nama === kelasNama);

  if (!nama || !siswaTerpilih.nis || !jurusanNama || !kelasNama) {
    toast("Data siswa belum lengkap. Periksa NIS, jurusan, dan kelas di menu Kelola Data Siswa.", "err");
    return;
  }

  if (dataKelasDipilih &&
     (dataKelasDipilih.jurusan || "").trim().toLowerCase() !== jurusanNama.trim().toLowerCase()) {
    toast("Jurusan dan kelas pada data siswa tidak sesuai. Perbaiki melalui menu Kelola Data Siswa.", "err");
    return;
  }

  const jenis = getJenis().find(x => x.id === $("inJenis").value);
  if (!jenis) {
    toast("Pilih bentuk pelanggaran. Jika daftar kosong, tambahkan dulu di menu Bentuk Pelanggaran.", "err");
    return;
  }

  const tanggal = $("inTanggal").value;
  if (!tanggal) { toast("Lengkapi tanggal.", "err"); return; }

  // Semester & tahun pelajaran dari dropdown (bisa dioverride manual)
  const semesterPilihan = $("inSemester").value;
  const tahunPelajaran = $("inTahun").value;
  if (!semesterPilihan || !tahunPelajaran) {
    toast("Lengkapi semester dan tahun pelajaran.", "err"); return;
  }
  const semesterFinal = `${semesterPilihan} ${tahunPelajaran}`;

  const s = {
    key: siswaTerpilih.nis,
    nis: siswaTerpilih.nis,
    nama: siswaTerpilih.nama,
    jurusan: jurusanNama,
    kelas: kelasNama,
    waNumber: noHp || null
  };

  const pel = getPelanggaran();
  pel.push({
    id: genId(), ts: Date.now(),
    siswaKey: s.key, nis: s.nis, namaSiswa: s.nama,
    jurusan: s.jurusan, kelas: s.kelas,
    jenisId: jenis.id, jenisKode: jenis.kode, jenisNama: jenis.nama,
    semester: semesterFinal,
    tanggal, keterangan: $("inKet").value.trim(),
    dicatatOleh: currentUser.nama,
  });
  savePelanggaran(pel);

  toast("Pelanggaran tersimpan.");
  $("formPelanggaran").reset();
  isiDropdownSiswaPelanggaran();
  $("inTanggal").value = new Date().toISOString().slice(0, 10);
  isiDropdownTahunPelajaran();
  sinkronSemesterDariTanggal();
  cekBatasPanggilan(s, tanggal, semesterFinal);
}

/* ---------- 16. ATURAN 5x PER SEMESTER → ANTRIAN BK ---------- */
function cekBatasPanggilan(s, tanggal, semester) {
  const sem = semester || semesterDariTanggal(tanggal);
  const jumlah = getPelanggaran().filter(p => p.siswaKey === s.key && p.semester === sem).length;

  if (jumlah < BATAS_PANGGILAN) {
    toast(`Total pelanggaran ${s.nama} (semester ${sem}): ${jumlah}/${BATAS_PANGGILAN}`);
    return;
  }

  const panggilan = getPanggilan();
  const sudahAdaAktif = panggilan.some(p =>
    p.siswaKey === s.key && p.semester === sem && p.status !== "Selesai");

  if (!sudahAdaAktif) {
    panggilan.push({
      id: genId(), ts: Date.now(),
      siswaKey: s.key, nis: s.nis, namaSiswa: s.nama,
      jurusan: s.jurusan, kelas: s.kelas, semester: sem,
      jumlah, status: "Menunggu BK", waNumber: s.waNumber,
      keterangan: `Siswa ${jumlah}x melanggar pada semester ${sem} — menunggu penanganan Guru BK.`,
    });

    const notif = getNotifikasi();
    getUsers().filter(u => u.role === "bk").forEach(bk => {
      notif.push({
        id: genId(), ts: Date.now(), untukBk: true,
        judul: "📋 Tugas Pemanggilan Baru",
        pesan: `${s.nama} (${s.jurusan || "-"} ${s.kelas || "-"}) telah ${jumlah}x melanggar pada semester ${sem}. Silakan proses pemanggilan orang tua & siswa di menu Pemanggilan BK.`,
        dibaca: false,
      });
    });

    const su = getUsers().find(u => u.role === "siswa" && u.nis === s.nis);
    if (su && su.walikelasId) {
      const wk = getUsers().find(u => u.id === su.walikelasId && u.role === "walikelas");
      if (wk) {
        notif.push({
          id: genId(), ts: Date.now(), untukWk: true, wkId: wk.id,
          judul: "📚 Siswa Bimbingan Mencapai Batas",
          pesan: `Siswa bimbingan Anda ${su.nama} (${su.jurusan || "-"} ${su.kelas || "-"}) telah ${jumlah}x melanggar pada semester ${sem}. Siswa masuk antrian pemanggilan Guru BK.`,
          dibaca: false,
        });
      }
    }
    saveNotifikasi(notif);
    savePanggilan(panggilan);

    toast(`⚠️ ${s.nama} mencapai ${jumlah}x pada semester ${sem}! Masuk antrian pemanggilan GURU BK (wali kelas ikut diberi tahu).`, "warn");
  } else {
    toast(`Total pelanggaran ${s.nama} (${sem}): ${jumlah}x (sudah dalam antrian BK).`, "warn");
  }
}

/* ---------- 17. KIRIM WHATSAPP ---------- */
/* Klik 💬 WA Ortu = status otomatis menjadi "Dipanggil"
   (hanya jika status masih "Menunggu BK" & nomor valid) */
function kirimWa(panggilanId) {
  const panggilan = getPanggilan();
  const p = panggilan.find(x => x.id === panggilanId);
  if (!p) { toast("Data panggilan tidak ditemukan.", "err"); return; }

  /* Nomor dibaca LANGSUNG dari data siswa (Kelola Data Siswa),
     fallback ke akun orang tua lalu ke nomor saat panggilan dibuat. */
  const siswaP = (p.nis && p.nis !== "-")
    ? getUsers().find(u => u.role === "siswa" && u.nis === p.nis)
    : null;
  const noHpRaw = getNoHpOrtuSiswa(siswaP) || p.waNumber;
  const noHp = noHpRaw ? String(noHpRaw).replace(/\D/g, "") : "";

  if (!noHp || noHp.length < 8) {
    toast("Nomor HP orang tua belum tersedia/valid. Isi di Kelola Siswa (data ortu) atau Kelola Orang Tua.", "err");
    return;
  }

  if (p.status === "Menunggu BK") {
    p.status = "Dipanggil";
    p.dipanggilOleh = currentUser.nama;
    if (!p.notifTerkirim) {
      kirimNotifPanggilan(p);
      p.notifTerkirim = true;
    }
    savePanggilan(panggilan);
    toast(`📞 Status ${p.namaSiswa}: DIPANGGIL (WA diklik oleh ${currentUser.nama}). Notifikasi terkirim ke orang tua, siswa & wali kelas.`, "warn");
  } else {
    toast("Membuka WhatsApp dengan pesan siap kirim…");
  }

  const msg =
    `Yth. Bapak/Ibu Wali dari ${p.namaSiswa}\n\n` +
    `Dari: Guru BK / Tim Tata Tertib Sekolah\n\n` +
    `Kami informasikan bahwa anak Anda:\n` +
    `Nama    : ${p.namaSiswa}\n` +
    `Jurusan : ${p.jurusan || "-"}\n` +
    `Kelas   : ${p.kelas || "-"}\n\n` +
    `Telah melakukan pelanggaran tata tertib sebanyak ${p.jumlah} kali pada semester ${p.semester || "-"}.\n` +
    `Mohon Bapak/Ibu bersama siswa hadir ke sekolah untuk pemanggilan.\n\n` +
    `Terima kasih.`;

  window.open("https://wa.me/" + noHp + "?text=" + encodeURIComponent(msg), "_blank");
  muatUlangHalamanAktif();
}

/* ---------- 18. DATA PELANGGARAN ---------- */
let semuaPelanggaran = [];

function loadPelanggaran() {
  semuaPelanggaran = [...getPelanggaran()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  renderPelanggaran();
}

function renderPelanggaran() {
  let data = semuaPelanggaran;

  if (currentUser.role === "walikelas") {
    const nisSaya = new Set(siswaBimbinganSaya().map(u => u.nis));
    data = data.filter(p => nisSaya.has(p.nis));
  }

  const q = $("cariPelanggaran").value.trim().toLowerCase();
  data = data.filter(p => !q ||
    (p.namaSiswa || "").toLowerCase().includes(q) ||
    (p.nis || "").toLowerCase().includes(q) ||
    (p.jenisNama || "").toLowerCase().includes(q));

  const wrap = $("pelanggaranWrap");
  if (!data.length) {
    wrap.innerHTML = currentUser.role === "walikelas"
      ? `<div class="empty">${icon("clipboard")}<p>Tidak ada pelanggaran siswa bimbingan Anda.</p></div>`
      : `<div class="empty">${icon("clipboard")}<p>Tidak ada data pelanggaran.</p></div>`;
    return;
  }

  const bolehHapus = ["admin", "tatib"].includes(currentUser.role);
  wrap.innerHTML = `<table><thead><tr>
    <th>Tanggal</th><th>Semester</th><th>Siswa</th><th>Jurusan/Kelas</th>
    <th>Pelanggaran</th><th>Pencatat</th>${bolehHapus ? "<th></th>" : ""}
    </tr></thead><tbody>
    ${data.map(p => `<tr>
      <td>${fmtTanggal(p.tanggal)}</td><td>${esc(p.semester || "-")}</td>
      <td>${esc(p.namaSiswa)}<br><small class="muted">${esc(p.nis || "-")}</small></td>
      <td>${esc(p.jurusan || "-")} / ${esc(p.kelas || "-")}</td>
      <td><b>${esc(p.jenisKode)}</b> — ${esc(p.jenisNama)}${p.keterangan ? `<br><small class="muted">${esc(p.keterangan)}</small>` : ""}</td>
      <td>${esc(p.dicatatOleh || "-")}</td>
      ${bolehHapus ? `<td><button class="btn btn-danger btn-sm" data-del="${p.id}">Hapus</button></td>` : ""}
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    const ok = await uiConfirm({
      title: "Hapus data pelanggaran ini?",
      html: `<p>Catatan pelanggaran akan dihapus permanen.</p>`,
      okText: "Hapus",
    });
    if (!ok) return;
    savePelanggaran(getPelanggaran().filter(p => p.id !== b.dataset.del));
    toast("Data dihapus."); loadPelanggaran();
  }));
}

/* ---------- 19. KELOLA SISWA ---------- */
let editSiswaId = null;

function isiDropdownWk() {
  const cur = $("sWk").value;
  const wkList = getUsers().filter(u => u.role === "walikelas");
  $("sWk").innerHTML = `<option value="">— belum ditugaskan —</option>` +
    wkList.map(w => `<option value="${w.id}">${esc(w.nama)}</option>`).join("");
  $("sWk").value = cur;
  if ($("sWk").selectedIndex === -1) $("sWk").value = "";
}

function loadSiswa() {
  isiDropdownWk();
  isiDropdownReferensi();

  const users = getUsers();
  const siswa = users.filter(u => u.role === "siswa")
    .sort((a, b) => (a.nis || "").localeCompare(b.nis || ""));
  const wrap = $("siswaWrap");

  if (!siswa.length) {
    wrap.innerHTML = `<div class="empty">${icon("cap")}<p>Belum ada data siswa. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Username</th><th>NIS</th><th>Nama</th><th>Jurusan/Kelas</th><th>Alamat</th>
    <th>Wali Kelas</th><th>No. HP Ortu</th><th>Orang Tua Terhubung</th><th>Aksi</th>
    </tr></thead><tbody>
    ${siswa.map(u => {
      const o = users.find(x => x.role === "ortu" && x.anakNis === u.nis);
      const wk = u.walikelasId ? users.find(x => x.id === u.walikelasId && x.role === "walikelas") : null;
      const hp = u.noHpOrtu || (o ? (o.noHp || "") : "");
      return `<tr>
      <td>${esc(u.username)}</td><td>${esc(u.nis || "")}</td><td>${esc(u.nama)}</td>
      <td>${esc(u.jurusan || "-")} / ${esc(u.kelas || "-")}</td>
      <td>${esc(u.alamat || "-")}</td>
      <td>${wk ? esc(wk.nama) : '<span class="muted">—</span>'}</td>
      <td>${hp ? esc(hp) : '<span class="muted">—</span>'}</td>
      <td>${o ? `${esc(o.nama)}<br><small class="muted">akun: ${esc(o.username)}</small>` : '<span class="muted">— belum ada —</span>'}</td>
      <td><button class="btn btn-sm" data-es="${u.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-ds="${u.id}">Hapus</button></td>
    </tr>`;
    }).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-es]").forEach(b =>
    b.addEventListener("click", () => startEditSiswa(b.dataset.es)));
  wrap.querySelectorAll("[data-ds]").forEach(b =>
    b.addEventListener("click", () => deleteSiswa(b.dataset.ds)));
}

function submitSiswa(e) {
  e.preventDefault();
  const username = $("sUser").value.trim();
  const password = $("sPass").value.trim();
  const nis      = $("sNis").value.trim();
  const nama     = $("sNama").value.trim();
  const jurusan = $("sJurusan").value;
  const kelas = $("sKelas").value;
  const dataKelas = getKelas().find(k => k.nama === kelas);
  const kelasSesuaiJurusan = !!(dataKelas && jurusan &&
    (dataKelas.jurusan || "").trim().toLowerCase() === jurusan.trim().toLowerCase());
  const alamat   = $("sAlamat").value.trim();
  const wkId     = $("sWk").value || null;
  const oNama    = $("sOrtuNama").value.trim();
  const oHp      = $("sOrtuHp").value.trim();
  const oUser    = $("sOrtuUser").value.trim();
  const oPass    = $("sOrtuPass").value.trim();

  if (!username || !nama || !nis || !jurusan || !kelas || !alamat) {
    toast("Lengkapi Username, NIS, Nama, Jurusan, Kelas, dan Alamat.", "err");
    return;
  }
  if (!kelasSesuaiJurusan) {
    toast("Kelas tidak sesuai dengan jurusan yang dipilih. Silakan pilih ulang jurusan dan kelas.", "err");
    return;
  }
  if (!editSiswaId && !password) {
    toast("Password wajib diisi untuk siswa baru.", "err"); return;
  }

  const users = getUsers();
  if (users.some(u => u.username === username && u.id !== editSiswaId)) {
    toast("Username sudah dipakai user lain!", "err"); return;
  }
  if (users.some(u => u.role === "siswa" && u.nis === nis && u.id !== editSiswaId)) {
    toast("NIS sudah dipakai siswa lain!", "err"); return;
  }

  let siswaObj;
  if (editSiswaId) {
    siswaObj = users.find(u => u.id === editSiswaId);
    if (!siswaObj) { toast("Data tidak ditemukan.", "err"); return; }
    Object.assign(siswaObj, { nama, jurusan, kelas, alamat, noHpOrtu: oHp, walikelasId: wkId });
    if (password) siswaObj.password = password;
    if (currentUser.id === siswaObj.id) currentUser = siswaObj;
  } else {
    siswaObj = { id: genId(), username, password, nama, role: "siswa",
                 nis, jurusan, kelas, alamat, noHpOrtu: oHp, walikelasId: wkId };
    users.push(siswaObj);
  }

  let ortu = users.find(u => u.role === "ortu" && u.anakNis === nis);
  let pesanOrtu = "";
  if (oUser && !ortu) {
    if (users.some(u => u.username === oUser)) {
      saveUsers(users);
      toast("Siswa tersimpan, TAPI username ortu sudah dipakai user lain — akun ortu tidak dibuat.", "err");
      resetSiswaForm(); loadSiswa();
      return;
    }
    ortu = { id: genId(), username: oUser, password: oPass || "ortu123",
             nama: oNama || ("Orang Tua " + nama), role: "ortu",
             anakNis: nis, noHp: oHp };
    users.push(ortu);
    pesanOrtu = ` Akun ortu dibuat: ${oUser} / ${oPass || "ortu123"}.`;
  } else if (ortu) {
    if (oNama) ortu.nama = oNama;
    if (oHp)   ortu.noHp = oHp;
    if (oPass) ortu.password = oPass;
    pesanOrtu = " Data akun ortu terhubung ikut diperbarui.";
  }

  saveUsers(users);
  toast(editSiswaId ? "Data siswa diperbarui." + pesanOrtu
                    : "Siswa baru ditambahkan." + pesanOrtu);
  resetSiswaForm(); loadSiswa();
}

function startEditSiswa(id) {
  const u = getUsers().find(x => x.id === id);
  if (!u) return;
  editSiswaId = id;
  $("sUser").value = u.username; $("sUser").disabled = true;
  $("sNis").value = u.nis || "";  $("sNis").disabled = true;
  $("sPass").value = "";
  $("sNama").value = u.nama || "";

  const dataKelasLama = getKelas().find(k => k.nama === u.kelas);
  const jurusanSiswa = u.jurusan || dataKelasLama?.jurusan || "";
  pastikanOpsi("sJurusan", jurusanSiswa);
  $("sJurusan").value = jurusanSiswa;
  isiDropdownKelasSiswa();
  if (u.kelas && ![...$("sKelas").options].some(o => o.value === u.kelas)) {
    pastikanOpsi("sKelas", u.kelas);
  }
  $("sKelas").value = u.kelas || "";
  $("sAlamat").value = u.alamat || "";
  $("sWk").value = u.walikelasId || "";
  const o = getUsers().find(x => x.role === "ortu" && x.anakNis === u.nis);
  $("sOrtuNama").value = o ? (o.nama || "") : "";
  $("sOrtuHp").value = u.noHpOrtu || (o ? (o.noHp || "") : "");
  $("sOrtuUser").value = o ? (o.username || "") : "";
  $("sOrtuPass").value = "";
  $("btnSubmitSiswa").textContent = "Simpan Perubahan";
  $("formSiswaTitle").textContent = "Edit Data Siswa";
  show($("btnCancelSiswa"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetSiswaForm() {
  editSiswaId = null;
  $("formSiswa").reset();
  $("sUser").disabled = false;
  $("sNis").disabled = false;
  $("sJurusan").value = "";
  isiDropdownKelasSiswa();
  $("sKelas").value = "";
  $("sWk").value = "";
  $("btnSubmitSiswa").textContent = "Tambah Siswa";
  $("formSiswaTitle").textContent = "Tambah Siswa Baru";
  hide($("btnCancelSiswa"));
}

async function deleteSiswa(id) {
  const users = getUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  const ortu = users.find(x => x.role === "ortu" && x.anakNis === u.nis);
  const ok = await uiConfirm({
    title: `Hapus siswa "${esc(u.nama)}"?`,
    html: ortu
      ? `<p>Akun orang tua terhubung (<b>${esc(ortu.username)}</b>) juga akan ikut dihapus.</p>`
      : `<p>Data siswa akan dihapus dari daftar.</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveUsers(users.filter(x => x.id !== id && !(ortu && x.id === ortu.id)));
  toast("Data siswa dihapus.");
  loadSiswa();
}

/* ---------- 20. IMPORT SISWA DARI EXCEL ---------- */
const KOLOM_TEMPLATE = ["Username", "Password", "NIS", "Nama", "Jurusan", "Kelas", "Alamat",
                        "Wali Kelas", "Nama Orang Tua", "No. HP Orang Tua",
                        "Username Orang Tua", "Password Orang Tua"];

function unduhTemplateSiswa() {
  if (typeof XLSX === "undefined") { toast("Library Excel belum termuat (butuh koneksi internet).", "err"); return; }
  const contoh = [
    ["budi02", "siswa123", "SIS002", "Budi Susilo", "RPL", "X RPL A", "Jl. Melati No. 5",
     "Bu Sari (Wali X RPL A)", "Bapak Susilo", "6281234567891", "ortu_budi02", "ortu123"]
  ];
  const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, ...contoh]);
  ws["!cols"] = KOLOM_TEMPLATE.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Siswa");
  XLSX.writeFile(wb, "template-import-siswa.xlsx");
  toast("Template Excel diunduh. Isi lalu unggah kembali.");
}

function importSiswaDariExcel(file) {
  if (typeof XLSX === "undefined") { toast("Library Excel belum termuat (butuh koneksi internet).", "err"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) { toast("File Excel kosong.", "err"); return; }
      prosesImportSiswa(rows);
    } catch (err) {
      console.error(err);
      toast("Gagal membaca file Excel. Pastikan format sesuai template.", "err");
    }
  };
  reader.readAsArrayBuffer(file);
}

function prosesImportSiswa(rows) {
  const users = getUsers();
  const kelasMaster = getKelas();
  const wkList = users.filter(u => u.role === "walikelas");
  let berhasil = 0, gagal = 0;
  const errors = [];

  rows.forEach((r, i) => {
    const no = i + 2;
    const username = String(r["Username"] || "").trim();
    const password = String(r["Password"] || "").trim();
    const nis = String(r["NIS"] || "").trim();
    const nama = String(r["Nama"] || "").trim();
    const jurusanSheet = String(r["Jurusan"] || "").trim();
    const kelas = String(r["Kelas"] || "").trim();
    const alamat = String(r["Alamat"] || "").trim();
    const wkNama = String(r["Wali Kelas"] || "").trim();
    const oNama = String(r["Nama Orang Tua"] || "").trim();
    const oHp = String(r["No. HP Orang Tua"] || "").trim();
    const oUser = String(r["Username Orang Tua"] || "").trim();
    const oPass = String(r["Password Orang Tua"] || "").trim();

    if (!username || !password || !nis || !nama || !kelas) {
      gagal++; errors.push(`Baris ${no}: kolom Username, Password, NIS, Nama, dan Kelas wajib diisi.`); return;
    }
    if (users.some(u => u.username === username)) {
      gagal++; errors.push(`Baris ${no}: username "${username}" sudah dipakai.`); return;
    }
    if (users.some(u => u.role === "siswa" && u.nis === nis)) {
      gagal++; errors.push(`Baris ${no}: NIS "${nis}" sudah dipakai.`); return;
    }
    const dataKelas = kelasMaster.find(k => (k.nama || "").toLowerCase() === kelas.toLowerCase());
    if (!dataKelas) {
      gagal++; errors.push(`Baris ${no}: kelas "${kelas}" tidak ada di menu Kelola Kelas.`); return;
    }
    const jurusanFinal = jurusanSheet || dataKelas.jurusan || "";
    if ((dataKelas.jurusan || "").toLowerCase() !== jurusanFinal.toLowerCase()) {
      gagal++; errors.push(`Baris ${no}: jurusan "${jurusanFinal}" tidak sesuai dengan kelas "${kelas}".`); return;
    }
    const wk = wkList.find(w => (w.nama || "").toLowerCase() === wkNama.toLowerCase());

    users.push({
      id: genId(), username, password, nama, role: "siswa",
      nis, jurusan: dataKelas.jurusan || jurusanFinal, kelas: dataKelas.nama,
      alamat, noHpOrtu: oHp, walikelasId: wk ? wk.id : null
    });
    berhasil++;

    if (oUser && !users.some(u => u.username === oUser)) {
      users.push({
        id: genId(), username: oUser, password: oPass || "ortu123",
        nama: oNama || ("Orang Tua " + nama), role: "ortu",
        anakNis: nis, noHp: oHp
      });
    }
  });

  saveUsers(users);
  const box = $("hasilImportSiswa");
  if (box) {
    box.innerHTML = `<div class="notice">✅ Berhasil import <b>${berhasil}</b> siswa` +
      (gagal ? `, <b>${gagal}</b> baris gagal:` : ".") +
      (gagal ? `<ul class="bk-notif-list">${errors.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "") +
      `</div>`;
  }
  toast(berhasil ? `Import selesai: ${berhasil} siswa ditambahkan${gagal ? `, ${gagal} gagal` : ""}.`
                 : "Tidak ada siswa yang berhasil diimport.", (gagal && !berhasil) ? "err" : "ok");
  loadSiswa();
}

/* ---------- 21. KELOLA AKUN (TATIB / WALI KELAS / BK) ---------- */
const AKUN_CONF = {
  tatib:     { form: "formTatib", user: "tUser", pass: "tPass", nama: "tNama",
               wrap: "tatibWrap", submit: "btnSubmitTatib", cancel: "btnCancelTatib",
               title: "formTatibTitle", labelTambah: "Tambah Anggota Tatib",
               labelEdit: "Edit Anggota Tatib", btnLabel: "Tambah" },
  walikelas: { form: "formWk", user: "wUser", pass: "wPass", nama: "wNama",
               wrap: "wkWrap", submit: "btnSubmitWk", cancel: "btnCancelWk",
               title: "formWkTitle", labelTambah: "Tambah Wali Kelas",
               labelEdit: "Edit Wali Kelas", btnLabel: "Tambah" },
  bk:        { form: "formBk", user: "bUser", pass: "bPass", nama: "bNama",
               wrap: "bkWrap", submit: "btnSubmitBk", cancel: "btnCancelBk",
               title: "formBkTitle", labelTambah: "Tambah Guru BK",
               labelEdit: "Edit Guru BK", btnLabel: "Tambah" },
};
const AKUN_ROLE_LABEL = { tatib: "Tim Tatib", walikelas: "Wali Kelas", bk: "Guru BK" };

let editAkunId = null;

function loadAkun(role) {
  if (role === "ortu") { loadOrtu(); return; }
  const c = AKUN_CONF[role];
  const users = getUsers().filter(u => u.role === role)
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $(c.wrap);
  if (!users.length) {
    wrap.innerHTML = `<div class="empty">${icon("users")}<p>Belum ada data ${AKUN_ROLE_LABEL[role]}. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Username</th><th>Nama Lengkap</th><th>Aksi</th>
    </tr></thead><tbody>
    ${users.map(u => `<tr>
      <td>${esc(u.username)}</td><td>${esc(u.nama)}</td>
      <td><button class="btn btn-sm" data-ea="${u.id}" data-role="${role}">Edit</button>
          <button class="btn btn-danger btn-sm" data-da="${u.id}" data-role="${role}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;
  wrap.querySelectorAll("[data-ea]").forEach(b =>
    b.addEventListener("click", () => startEditAkun(b.dataset.role, b.dataset.ea)));
  wrap.querySelectorAll("[data-da]").forEach(b =>
    b.addEventListener("click", () => deleteAkun(b.dataset.role, b.dataset.da)));
}

function submitAkun(e, role) {
  e.preventDefault();
  const c = AKUN_CONF[role];
  const username = $(c.user).value.trim();
  const password = $(c.pass).value.trim();
  const nama = $(c.nama).value.trim();
  if (!username || !nama) { toast("Username dan nama wajib diisi.", "err"); return; }
  if (!editAkunId && !password) { toast("Password wajib diisi untuk akun baru.", "err"); return; }

  const users = getUsers();
  if (users.some(u => u.username === username && u.id !== editAkunId)) {
    toast("Username sudah dipakai user lain!", "err"); return;
  }
  if (editAkunId) {
    const u = users.find(x => x.id === editAkunId);
    if (!u) { toast("Data tidak ditemukan.", "err"); return; }
    u.username = username; u.nama = nama;
    if (password) u.password = password;
    if (currentUser.id === u.id) currentUser = u;
    toast("Data akun diperbarui.");
  } else {
    users.push({ id: genId(), username, password, nama, role });
    toast("Akun baru ditambahkan.");
  }
  saveUsers(users);
  resetAkunForm(role);
  loadAkun(role);
}

function startEditAkun(role, id) {
  const c = AKUN_CONF[role];
  const u = getUsers().find(x => x.id === id);
  if (!u) return;
  editAkunId = id;
  $(c.user).value = u.username;
  $(c.pass).value = "";
  $(c.nama).value = u.nama || "";
  $(c.submit).textContent = "Simpan Perubahan";
  $(c.title).textContent = c.labelEdit;
  show($(c.cancel));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAkunForm(role) {
  const c = AKUN_CONF[role];
  editAkunId = null;
  $(c.form).reset();
  $(c.submit).textContent = c.btnLabel;
  $(c.title).textContent = c.labelTambah;
  hide($(c.cancel));
}

async function deleteAkun(role, id) {
  const users = getUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  const ok = await uiConfirm({
    title: `Hapus akun "${esc(u.nama)}" (${esc(u.username)})?`,
    html: `<p>Akun akan dihapus dan tidak bisa login lagi.</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveUsers(users.filter(x => x.id !== id));
  toast("Akun dihapus.");
  loadAkun(role);
}

/* ---------- 22. KELOLA ORANG TUA ---------- */
let editOrtuId = null;

function loadOrtu() {
  const users = getUsers().filter(u => u.role === "ortu")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $("ortuWrap");
  if (!users.length) {
    wrap.innerHTML = `<div class="empty">${icon("heart")}<p>Belum ada akun orang tua. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Username</th><th>Nama</th><th>NIS Anak</th><th>No. HP/WA</th><th>Aksi</th>
    </tr></thead><tbody>
    ${users.map(u => `<tr>
      <td>${esc(u.username)}</td><td>${esc(u.nama)}</td><td>${esc(u.anakNis || "-")}</td><td>${esc(u.noHp || "-")}</td>
      <td><button class="btn btn-sm" data-eo="${u.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-do="${u.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;
  wrap.querySelectorAll("[data-eo]").forEach(b =>
    b.addEventListener("click", () => startEditOrtu(b.dataset.eo)));
  wrap.querySelectorAll("[data-do]").forEach(b =>
    b.addEventListener("click", () => deleteOrtu(b.dataset.do)));
}

function submitOrtu(e) {
  e.preventDefault();
  const username = $("oUser").value.trim();
  const password = $("oPass").value.trim();
  const nama = $("oNama").value.trim();
  const anakNis = $("oAnakNis").value.trim();
  const noHp = $("oNoHp").value.trim();

  if (!username || !nama || !anakNis) {
    toast("Username, nama, dan NIS anak wajib diisi.", "err"); return;
  }
  const users = getUsers();
  if (users.some(u => u.username === username && u.id !== editOrtuId)) {
    toast("Username sudah dipakai user lain!", "err"); return;
  }
  if (!users.some(u => u.role === "siswa" && u.nis === anakNis)) {
    toast(`NIS anak "${anakNis}" tidak ditemukan di data siswa.`, "err"); return;
  }

  if (editOrtuId) {
    const u = users.find(x => x.id === editOrtuId);
    if (!u) { toast("Data tidak ditemukan.", "err"); return; }
    u.username = username; u.nama = nama; u.anakNis = anakNis; u.noHp = noHp;
    if (password) u.password = password;
    toast("Data orang tua diperbarui.");
  } else {
    users.push({ id: genId(), username, password: password || "ortu123",
                 nama, role: "ortu", anakNis, noHp });
    toast("Akun orang tua ditambahkan.");
  }
  saveUsers(users);
  resetOrtuForm();
  loadOrtu();
}

function startEditOrtu(id) {
  const u = getUsers().find(x => x.id === id);
  if (!u) return;
  editOrtuId = id;
  $("oUser").value = u.username;
  $("oPass").value = "";
  $("oNama").value = u.nama || "";
  $("oAnakNis").value = u.anakNis || "";
  $("oNoHp").value = u.noHp || "";
  $("btnSubmitOrtu").textContent = "Simpan Perubahan";
  $("formOrtuTitle").textContent = "Edit Akun Orang Tua";
  show($("btnCancelOrtu"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetOrtuForm() {
  editOrtuId = null;
  $("formOrtu").reset();
  $("btnSubmitOrtu").textContent = "Tambah";
  $("formOrtuTitle").textContent = "Tambah Akun Orang Tua";
  hide($("btnCancelOrtu"));
}

async function deleteOrtu(id) {
  const users = getUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  const ok = await uiConfirm({
    title: `Hapus akun orang tua "${esc(u.nama)}"?`,
    html: `<p>Akun akan dihapus dari daftar orang tua.</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveUsers(users.filter(x => x.id !== id));
  toast("Akun orang tua dihapus.");
  loadOrtu();
}

/* ---------- 23. NOTIFIKASI ---------- */
const notifBrowserSudah = new Set();

function pushBrowserNotif() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  notifUntukSaya().filter(n => !n.dibaca).slice(0, 3).forEach(n => {
    if (notifBrowserSudah.has(n.id)) return;
    notifBrowserSudah.add(n.id);
    try { new Notification(n.judul, { body: n.pesan }); } catch (_) { }
  });
}

function izinNotifikasi() {
  if (!("Notification" in window)) {
    toast("Browser ini tidak mendukung notifikasi.", "err"); return;
  }
  if (Notification.permission === "granted") {
    toast("Notifikasi browser sudah aktif."); return;
  }
  Notification.requestPermission().then(p => {
    if (p === "granted") {
      toast("🔔 Notifikasi browser diaktifkan.");
      pushBrowserNotif();
    } else {
      toast("Izin notifikasi ditolak browser.", "warn");
    }
  });
}

function loadNotifikasi() {
  const list = notifUntukSaya().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const wrap = $("notifWrap");
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `<div class="card"><div class="empty">${icon("bell")}<p>Belum ada notifikasi untuk Anda.</p></div></div>`;
    return;
  }
  /* Label penerima membuat pemisahan notifikasi terlihat jelas:
     ortu hanya punya notif untukOrtu, siswa hanya untukSiswa. */
  const labelPenerima = n =>
    n.untukOrtu  ? '<span class="notif-target target-ortu">Untuk Orang Tua</span>'
    : n.untukSiswa ? '<span class="notif-target target-siswa">Untuk Siswa yang Melanggar</span>'
    : n.untukBk   ? '<span class="notif-target target-bk">Untuk Guru BK</span>'
    : n.untukWk   ? '<span class="notif-target target-wk">Untuk Wali Kelas</span>'
    : "";

  wrap.innerHTML = list.map(n => `
    <div class="card notif-card ${n.dibaca ? "is-read" : ""}">
      <h3>${esc(n.judul)} ${labelPenerima(n)} ${n.dibaca ? "" : '<span class="notif-badge">Baru</span>'}</h3>
      <p class="muted notif-time">${fmtWaktu(n.ts)}</p>
      <p>${esc(n.pesan)}</p>
      ${n.dibaca ? "" : `<button class="btn btn-sm" data-read="${n.id}">${icon("check")} Tandai Dibaca</button>`}
    </div>`).join("");
  wrap.querySelectorAll("[data-read]").forEach(b =>
    b.addEventListener("click", () => {
      const notif = getNotifikasi();
      const item = notif.find(x => x.id === b.dataset.read);
      if (item) { item.dibaca = true; saveNotifikasi(notif); }
      loadNotifikasi();
      buildSidebar();
    }));
}

function tandaiSemuaDibaca() {
  const notif = getNotifikasi();
  const ids = new Set(notifUntukSaya().map(n => n.id));
  let ubah = false;
  notif.forEach(n => { if (ids.has(n.id) && !n.dibaca) { n.dibaca = true; ubah = true; } });
  if (ubah) { saveNotifikasi(notif); toast("Semua notifikasi ditandai dibaca."); }
  loadNotifikasi();
  buildSidebar();
}

/* ---------- 24. RIWAYAT (siswa & ortu) ---------- */
function loadRiwayat() {
  const isSiswa = currentUser.role === "siswa";
  $("riwayatTitle").textContent = isSiswa ? "Pelanggaran Saya" : "Pelanggaran Anak";

  const nisTarget = isSiswa ? currentUser.nis : currentUser.anakNis;
  const siswa = getUsers().find(u => u.role === "siswa" && u.nis === nisTarget);
  $("riwayatSub").textContent = siswa
    ? `Nama: ${siswa.nama} — NIS ${siswa.nis} — ${siswa.jurusan || "-"} / ${siswa.kelas || "-"}`
    : "Data siswa tidak ditemukan.";

  const semNow = semesterDariTanggal(new Date().toISOString().slice(0, 10));
  $("riwayatSem").textContent = "Semester berjalan: " + semNow;

  const semua = getPelanggaran()
    .filter(p => p.nis === nisTarget || p.siswaKey === nisTarget)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const semIni = semua.filter(p => (p.semester || semesterDariTanggal(p.tanggal)) === semNow);

  $("rwJumlah").textContent = semIni.length;
  $("rwTotal").textContent = semua.length;

  const card = $("rwStatusCard");
  if (semIni.length >= BATAS_PANGGILAN) {
    card.classList.remove("ok");
    $("rwStatus").textContent = "Panggilan BK";
  } else if (semIni.length >= 3) {
    card.classList.remove("ok");
    $("rwStatus").textContent = "Peringatan (" + semIni.length + "/" + BATAS_PANGGILAN + ")";
  } else {
    card.classList.add("ok");
    $("rwStatus").textContent = "Aman";
  }

  $("warningBox").innerHTML = semIni.length >= BATAS_PANGGILAN
    ? `<div class="alert"><b>⚠️ Perhatian:</b> Telah melakukan ${semIni.length}x pelanggaran pada semester ${semNow}. Orang tua &amp; siswa akan dipanggil oleh Guru BK.</div>`
    : "";

  const wrap = $("riwayatWrap");
  if (!semua.length) {
    wrap.innerHTML = `<div class="empty">${icon("check")}<p>Belum ada catatan pelanggaran. Pertahankan!</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Tanggal</th><th>Semester</th><th>Pelanggaran</th><th>Pencatat</th>
    </tr></thead><tbody>
    ${semua.map(p => `<tr>
      <td>${fmtTanggal(p.tanggal)}</td><td>${esc(p.semester || "-")}</td>
      <td><b>${esc(p.jenisKode)}</b> — ${esc(p.jenisNama)}${p.keterangan ? `<br><small class="muted">${esc(p.keterangan)}</small>` : ""}</td>
      <td>${esc(p.dicatatOleh || "-")}</td>
    </tr>`).join("")}
    </tbody></table>`;
}

/* ---------- 24b. DIALOG KONFIRMASI (pengganti confirm() bawaan) ---------- */
function uiConfirm({ title = "Konfirmasi", html = "", okText = "Hapus", danger = true }) {
  return new Promise(resolve => {
    const old = $("uiConfirmBox");
    if (old) old.remove();
    const box = document.createElement("div");
    box.id = "uiConfirmBox";
    box.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-icon ${danger ? "danger" : "primary"}">${icon(danger ? "alert" : "info")}</div>
        <h3>${title}</h3>
        <div class="modal-body">${html}</div>
        <div class="modal-actions">
          <button class="btn" data-cancel>Batal</button>
          <button class="btn ${danger ? "btn-danger-solid" : "btn-primary"}" data-ok>${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(box);
    const done = val => { document.removeEventListener("keydown", onKey); box.remove(); resolve(val); };
    const onKey = e => { if (e.key === "Escape") done(false); };
    document.addEventListener("keydown", onKey);
    box.querySelector("[data-cancel]").addEventListener("click", () => done(false));
    box.querySelector("[data-ok]").addEventListener("click", () => done(true));
    box.querySelector(".modal-backdrop").addEventListener("click", () => done(false));
  });
}

/* ---------- 25. ALAT ADMIN (EKSPOR / IMPOR / RESET) ---------- */
function eksporData() {
  const data = {
    users: getUsers(), jenis: getJenis(), jurusan: getJurusan(),
    kelas: getKelas(), pelanggaran: getPelanggaran(),
    panggilan: getPanggilan(), notifikasi: getNotifikasi(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "simtatib-data-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Data diekspor ke file JSON.");
}

function imporData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (d.users) saveUsers(d.users);
      if (d.jenis) saveJenis(d.jenis);
      if (d.jurusan) saveJurusan(d.jurusan);
      if (d.kelas) saveKelas(d.kelas);
      if (d.pelanggaran) savePelanggaran(d.pelanggaran);
      if (d.panggilan) savePanggilan(d.panggilan);
      if (d.notifikasi) saveNotifikasi(d.notifikasi);
      toast("Data berhasil diimpor. Halaman dimuat ulang…");
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      toast("File JSON tidak valid.", "err");
    }
  };
  reader.readAsText(file);
}

async function resetDataDemo() {
  const ok = await uiConfirm({
    title: "Reset data demo?",
    html: `<p>Semua data saat ini akan <b>dihapus permanen</b> dan kembali ke kondisi demo awal.</p>`,
    okText: "Reset Data",
  });
  if (!ok) return;
  Object.keys(localStorage).filter(k => k.startsWith(DB_PREFIX)).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem("simtatib_session");
  toast("Data direset. Halaman dimuat ulang…");
  setTimeout(() => location.reload(), 1200);
}

/* ---------- 26. EVENT BINDING & INISIALISASI ---------- */
function bindEvents() {
  $("btnLogin").addEventListener("click", doLogin);
  $("loginUser").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  $("loginPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  $("btnLogout").addEventListener("click", doLogout);

  $("formPelanggaran").addEventListener("submit", submitPelanggaran);
  $("mSiswa").addEventListener("change", isiDataSiswaPelanggaran);
  $("inTanggal").addEventListener("change", sinkronSemesterDariTanggal);
  $("inSemester").addEventListener("change", updateSemInfo);
  $("inTahun").addEventListener("change", updateSemInfo);
  $("cariPelanggaran").addEventListener("input", renderPelanggaran);

  $("formJenis").addEventListener("submit", submitJenis);
  $("btnCancelJenis").addEventListener("click", resetJenisForm);

  $("formJurusan").addEventListener("submit", submitJurusan);
  $("btnCancelJurusan").addEventListener("click", resetJurusanForm);

  $("formKelas").addEventListener("submit", submitKelas);
  $("kTingkat").addEventListener("change", updateKelasPreview);
  $("kJurusan").addEventListener("change", updateKelasPreview);
  $("kRombel").addEventListener("change", updateKelasPreview);
  $("btnCancelKelas").addEventListener("click", resetKelasForm);

  $("formSiswa").addEventListener("submit", submitSiswa);
  $("btnCancelSiswa").addEventListener("click", resetSiswaForm);
  $("sJurusan").addEventListener("change", () => isiDropdownKelasSiswa());

  $("formTatib").addEventListener("submit", e => submitAkun(e, "tatib"));
  $("btnCancelTatib").addEventListener("click", () => resetAkunForm("tatib"));
  $("formWk").addEventListener("submit", e => submitAkun(e, "walikelas"));
  $("btnCancelWk").addEventListener("click", () => resetAkunForm("walikelas"));
  $("formBk").addEventListener("submit", e => submitAkun(e, "bk"));
  $("btnCancelBk").addEventListener("click", () => resetAkunForm("bk"));

  $("formOrtu").addEventListener("submit", submitOrtu);
  $("btnCancelOrtu").addEventListener("click", resetOrtuForm);

  $("btnExport").addEventListener("click", eksporData);
  $("btnImport").addEventListener("click", () => $("fileImport").click());
  $("fileImport").addEventListener("change", e => {
    if (e.target.files[0]) imporData(e.target.files[0]);
    e.target.value = "";
  });
  $("btnResetData").addEventListener("click", resetDataDemo);

  $("btnTemplateSiswa").addEventListener("click", unduhTemplateSiswa);
  $("btnImportSiswa").addEventListener("click", () => $("fileImportSiswa").click());
  $("fileImportSiswa").addEventListener("change", e => {
    if (e.target.files[0]) importSiswaDariExcel(e.target.files[0]);
    e.target.value = "";
  });

  $("btnIzinNotif").addEventListener("click", izinNotifikasi);
  $("btnTandaiSemua").addEventListener("click", tandaiSemuaDibaca);

  $("btnMenu").addEventListener("click", toggleSidebarMobile);
  $("sbBackdrop").addEventListener("click", tutupSidebarMobile);
  $("btnLihatPass").addEventListener("click", () => {
    const p = $("loginPass");
    const sembunyi = p.type === "password";
    p.type = sembunyi ? "text" : "password";
    $("btnLihatPass").innerHTML = icon(sembunyi ? "eyeoff" : "eye");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  setupLogo();
  bindEvents();
  restoreSession();
});