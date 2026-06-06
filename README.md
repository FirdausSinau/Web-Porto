# Dokumentasi Pembelajaran: Text Editor CLI v2 — Linked List

> Dokumen ini ditulis untuk memahami program dari nol. Dari konsep, struktur data, logika fungsi, sampai cara `main` mengatur alur.

---

## 1. Pendahuluan: Kenapa Pindah ke Linked List?

Di versi pertama, program pakai **Array 2D**. Seperti tabel Excel yang punya baris dan kolom tetap. Excel itu masalahnya:

- **Barisnya tetap**. Misal dibikin 100 baris. Kalau cuma nulis 3 baris, 97 baris lain tetap makan memori, meski kosong.
- **Susah sisip di tengah**. Kalau mau masukin baris baru di tengah, semua baris bawahnya harus digeser satu per satu. Lambat.
- **Susah hapus di tengah**. Kalau hapus baris tengah, harus geser juga.

**Linked List** seperti rantai kereta. Setiap baris adalah satu gerbong. Mau sisip atau hapus, tinggal putus/sambung rantainya. Tidak perlu geser semua.

---

## 2. Konsep Dasar: 1 Baris = 1 Node

### Analogi: Gerbong Kereta

Setiap baris teks adalah satu gerbong. Setiap gerbong punya:
- **Ruang duduk** (`text[]`) → untuk penumpang (huruf).
- **Penghitung** (`length`) → berapa penumpang di dalam.
- **Pintu belakang** (`next`) → untuk masuk ke gerbong selanjutnya.

Gerbang pertama disebut **lokomotif** → `head` di `TextBuffer`.

Kalau punya 3 baris, itu seperti 3 gerbong:

```
[head] → [Node 1] → [Node 2] → [Node 3] → NULL
  ↓         ↓          ↓          ↓
"Hello"   "World"    "Test"    (kosong)
```

---

## 3. Detail Tiap Field dalam Node

### `char text[MAX_COL];` — Ruang Duduk

`MAX_COL` = 200. Jadi setiap gerbong punya **200 kursi kosong**.
Tapi kursi kosong belum tentu ada penumpang. Maka dari itu ada `length`.

### `int length;` — Penghitung Penumpang

`length` bilang: *"Di gerbong ini, kursi nomor 0 sampai [length-1] sudah terisi."*

Contoh:
- Kalau `text` berisi `"Hello"`, maka `length` = 5.
- Huruf ke-0 = 'H', ke-1 = 'e', ke-2 = 'l', ke-3 = 'l', ke-4 = 'o'.
- Kursi ke-5 sampai ke-199 masih kosong.

Kenapa perlu `length`? Karena kalau tidak, kita tidak tahu di mana teks berakhir. `text` kan array 200 — kalau kita tidak tahu panjangnya, kita harus cek satu per satu huruf sampai ketemu akhir. `length` membuat operasi seperti **tambah teks di akhir** jadi cepat. Kita tinggal mulai dari `text[length]`, tidak perlu `strlen` berulang kali.

### `struct Node *next;` — Pintu ke Gerbong Berikutnya

Ini adalah **pointer**. Kalau gerbong ini ada gerbong setelahnya, `next` menunjuk ke gerbong itu. Kalau ini gerbong terakhir, `next` = `NULL` (tidak ke mana-mana).

```
[Gerbong 1]    [Gerbong 2]    [Gerbong 3]
 text:"Hi"      text:"Bye"      text:""
 len: 2         len: 3          len: 0
 next: ───────> next: ───────> next: NULL
```

---

## 4. TextBuffer = Stasiun Kereta

```c
typedef struct {
    Node *head;        /* Lokomotif / gerbong pertama */
    int totalLines;    /* Berapa total gerbong? */
    int currentRow;    /* Gerbong ke-berapa yang sedang aktif? (0-based) */
} TextBuffer;
```

- `head` = gerbong pertama. Kalau `head` = NULL, berarti tidak ada gerbong sama sekali.
- `totalLines` = berapa banyak gerbong yang terhubung.
- `currentRow` = gerbong mana yang sedang "dipilih" user. Ditampilkan dengan `>` di layar.

### Kenapa `currentRow` Mulai dari 0?

Karena programmer komputer biasa menghitung dari 0.

- `currentRow = 0` = gerbong pertama (yang ditunjuk `head`).
- `currentRow = 1` = gerbong kedua.
- dst.

User ketik `g 1` → program ubah jadi `currentRow = 0`. User ketik `g 3` → jadi `currentRow = 2`.

---

## 5. Snapshot & Stack = Fotokopi Rantai

### Kenapa Perlu Undo/Redo?

Sebelum ada sistem undo, kalau user hapus baris, hilang selamanya. Kalau salah tulis, tidak bisa kembali. Solusi: **Sebelum setiap perubahan, ambil fotokopi dulu.**

### Snapshot

`Snapshot` adalah **fotokopi dari kondisi `TextBuffer` pada satu waktu**.

```c
typedef struct {
    Node *head;         /* Fotokopi rantai pertama */
    int totalLines;     /* Fotokopi jumlah baris */
    int currentRow;     /* Fotokopi posisi kursor */
} Snapshot;
```

Snapshot harus menyimpan **kondisi lengkap** buku pada satu waktu:
- Isi teks semua baris
- Ada berapa baris
- Kursor sedang di baris mana

Tanpa `currentRow`, misalnya: kamu undo, tapi kursor tiba-tiba pindah ke baris lain. Itu aneh. Jadi snapshot harus catat semuanya.

### Deep Copy

Saat membuat snapshot, kita tidak boleh cuma salin `head`-nya saja:

```c
/* SALAH: cuma salin pointer */
snapshot.head = buf->head;   /* Ini tidak fotokopi! */
```

Kalau begini, `snapshot.head` dan `buf->head` **menunjuk ke node yang sama persis** di memori. Kalau user ngetik dan node asli berubah, fotokopi ikut berubah juga. Nggak ada gunanya!

Jadi harus **Deep Copy** (salin isi):
- Buat node baru
- Salin `text` dan `length` ke node baru
- Sambungkan node baru satu per satu
- Hasilnya: rantai baru yang persis sama, tapi terpisah di memori

Ini yang dilakukan oleh `stackPush`.

### Stack

`Stack` adalah tempat menyimpan snapshot-snapshot.

```c
typedef struct {
    Snapshot entries[20];  /* 20 laci arsip */
    int top;               /* Laci ke-berapa yang terisi */
} Stack;
```

Analogi:
- Kamu punya meja.
- Setiap kali mau mengubah buku, kamu **fotokopi buku**, lalu taruh fotokopi itu di **tumpukan** di atas meja.
- `top` bilang: *"Saat ini ada berapa fotokopi yang ditumpuk?"*

Prinsipnya **LIFO** — *Last In, First Out* (yang terakhir masuk, pertama keluar).

---

## 6. Penjelasan `head` Bukan Node, tapi Pointer

### 6.1. Alasan Logika (Bukan Hanya Teknis Memori)

Sebelumnya sudah dijelaskan soal memori. Sekarang kita bahas dari sisi **logika alur program**: kenapa `head` harus berupa alamat (pointer) supaya program bisa mengambil keputusan yang benar di fungsi-fungsi tertentu.

Bayangkan kalau `head` bukan pointer, tapi **objek Node yang melekat**. Artinya `TextBuffer` selalu punya satu gerbong di dalamnya. Masalahnya, banyak fungsi yang mengandalkan kondisi "ada" atau "tidak ada" gerbong pertama. Kalau tidak bisa di-null-kan, logika menjadi berantakan.

Berikut fungsi-fungsi yang logikanya langsung bergantung pada `head` sebagai pointer:

#### A. `fileClose()` — Mengosongkan Buffer

```c
void fileClose(TextBuffer *buf) {
    // ... loop hapus semua node ...
    buf->head = NULL;
    buf->totalLines = 0;
    buf->currentRow = 0;
}
```

**Logikanya:**
- Setelah semua gerbong dihapus, `buf->head` diset **NULL**.
- Ini artinya stasiun sekarang benar-benar kosong: **tidak punya gerbong mana pun**.
- Kalau `head` bukan pointer, kita tidak bisa tulis `NULL`. Kita harus tetap punya satu gerbong kosong yang "nganggur" di dalam `TextBuffer`. Padahal maksudnya kita mau benar-benar bersih.

#### B. `fileOpen()` — Membersihkan Buffer Lama

```c
int fileOpen(TextBuffer *buf, const char *filename) {
    // ...
    fileClose(buf);    // head jadi NULL
    bufferInit(buf);   // head baru diisi node kosong
    // ...
}
```

**Logikanya:**
- `fileClose` set `head = NULL`.
- `bufferInit` buat node baru dan arahkan `head` ke node baru.
- Kalau `head` tidak bisa di-null-kan, `fileClose` tidak bisa benar-benar bersih. Nanti `bufferInit` akan bingung: mau taruh node baru di mana? Mau timpa node lama? Atau mau buang node lama dulu? Logikanya jadi rumit dan tidak konsisten.

#### C. `bufferHapusBaris()` — Menghapus Baris Pertama

```c
if (buf->currentRow == 0) {
    Node *hapus  = buf->head;
    buf->head    = hapus->next;
    freeNode(hapus);
    buf->totalLines--;
    return;
}
```

**Logikanya:**
- Kalau baris yang dihapus adalah baris pertama (`currentRow == 0`), maka `head` harus dipindahkan ke gerbong kedua.
- `buf->head = hapus->next` artinya: **stasiun sekarang menunjuk ke gerbong kedua sebagai gerbong pertama**.
- Kalau `head` bukan pointer, kita tidak bisa "pindahkan" arahnya. Kita harus salin isi gerbong kedua ke gerbong pertama, lalu hapus gerbong kedua. Itu ribet dan tidak efisien.

#### D. `stackPop()` — Undo/Redo Mengembalikan Snapshot

```c
s->top--;
buf->head = s->entries[s->top].head;
buf->totalLines = s->entries[s->top].totalLines;
buf->currentRow = s->entries[s->top].currentRow;
```

**Logikanya:**
- Saat undo, buffer lama dihapus total. Lalu `buf->head` diset ke alamat snapshot yang tersimpan di stack.
- Ini seperti **ganti papan petunjuk**: stasiun sekarang menunjuk ke rantai gerbong yang sama persis dengan kondisi masa lalu.
- Kalau `head` bukan pointer, kita tidak bisa "ganti" gerbong pertama dengan snapshot. Harus salin satu per satu isi snapshot ke gerbong melekat. Itu sama sekali tidak masuk akal untuk mekanisme undo.

#### E. `getNode()` — Menjalanjahi dari Titik Awal

```c
Node *getNode(TextBuffer *buf, int n) {
    Node *pointer = buf->head;
    // ...
    if (pointer == NULL) return NULL;
}
```

**Logikanya:**
- `getNode` selalu mulai dari `buf->head`.
- **Safety check**: `if (pointer == NULL) return NULL`. Kalau stasiun belum punya gerbong (masih kosong), langsung return NULL.
- Kalau `head` tidak pernah NULL (karena melekat), fungsi ini akan jalan terus meski seharusnya buffer kosong. Bisa crash karena `pointer->next` mengakses sampah.

#### F. `displayBuffer()` — Menampilkan Isi

```c
cur = buf->head;
while(cur != NULL){
    // ...
    cur = cur->next;
}
```

**Logikanya:**
- `cur = buf->head`: mulai dari gerbong pertama.
- `while(cur != NULL)`: ulangi sampai tidak ada gerbong lagi.
- Kalau `head` bukan pointer, `cur` tidak akan pernah NULL. Loop bisa jadi infinite atau crash karena tidak tahu di mana berhenti.

---

### 6.2. Ringkasan Alasan Logika

| Situasi | Kalau `head` Pointer | Kalau `head` Melekat (Bukan Pointer) |
|---|---|---|
| Buffer kosong | `head = NULL` → jelas | Selalu ada node kosong, tidak ada konsep "kosong" |
| Buka file baru | Tutup buffer, `head` jadi NULL, lalu bikin baru | Harus timpa node lama, ribet |
| Hapus baris pertama | `head = head->next` → simpel | Harus salin isi node kedua ke node pertama |
| Undo/Redo | `head = snapshot.head` → ganti arah | Harus salin snapshot ke node melekat, tidak masuk akal |
| Traversal | `while(head != NULL)` → jelas | Tidak ada tanda berhenti, loop bisa ngawur |

**Kesimpulan:** `head` harus pointer bukan hanya karena hemat memori, tapi karena **logika alur program** membutuhkan kemampuan untuk: kosong, ganti arah, timpa, dan berhenti.

---

## 7. Fungsi-fungsi Dasar

Pertanyaan yang sering muncul: "`head` kan bertipe `Node`, dia punya `text`, `length`, `next`. Apakah ini digunakan?"

Jawaban: **Tidak.** `head` itu **pointer**, bukan node. Dia cuma menyimpan **alamat** dari node pertama.

### Bedanya `Node head` vs `Node *head`

**Cara 1: `Node head;` (BUKAN pointer)**
Stasiun langsung punya satu gerbong melekat di dalamnya. Gerbong itu tidak bisa lepas, tidak bisa diangkut, selalu ada di dalam stasiun.

Masalahnya:
- Kalau stasiun baru dibangun, sudah ada gerbong kosong di dalamnya. Kita tidak bisa bilang "stasiun ini belum punya gerbong."
- Kalau kita mau hapus semua gerbong dan mulai dari nol, gerbong di dalam stasiun tetap ada. Susah untuk "kosongkan stasiun."

**Cara 2: `Node *head;` (POINTER)**
Stasiun cuma menyimpan **alamat rumah** gerbong pertama. Bukan gerbongnya sendiri.

Kelebihannya:
- Kalau stasiun baru dibangun, belum ada gerbong. Stasiun cuma catat: `head = NULL` (tidak punya alamat). Ini artinya **kosong**.
- Kalau kita buat gerbong baru di luar (pakai `malloc`), kita kasih alamatnya ke stasiun: `head = alamat_gerbong_baru`.
- Kalau mau hapus semua gerbong, stasiun tinggal hapus catatan alamatnya: `head = NULL`. Stasiun bisa kosong lagi.

### Analogi Lebih Sederhana

| `Node head` (non-pointer) | `Node *head` (pointer) |
|---|---|
| Stasiun punya gerbong permanen di dalam gedung. | Stasiun punya **papan nama jalan** yang nunjuk ke gerbong. |
| Gerbong selalu ada, meski kosong. | Kalau belum ada gerbong, papan ditulis "KOSONG / NULL". |
| Susah diganti, dihapus, atau dikosongkan. | Mudah ganti alamat, hapus, atau bikin baru. |

### Ilustrasi Visual

**Kalau `Node *head` (Pointer — Benar)**

```
TextBuffer (Stasiun)
┌─────────────────┐
│ head ───────────────> [Node 1] → [Node 2] → [Node 3] → NULL
│ totalLines: 3   │      "Hi"      "Bye"      ""
│ currentRow: 0   │
└─────────────────┘
```

`head` cuma panah (alamat). Panah bisa dihapus (jadi NULL), bisa dipindahkan ke node lain.

**Kalau `Node head` (Non-Pointer — Salah untuk Linked List)**

```
TextBuffer (Stasiun)
┌──────────────────────────────┐
│ head: [Node — melekat di sini]    [Node 2] di luar? Susah nyambung!
│       "Hi"
│ totalLines: 3                │
│ currentRow: 0                │
└──────────────────────────────┘
```

Gerbong pertama sudah melekat di dalam stasiun. Kita tetap bisa bikin node luar, tapi susah menjadikan node luar sebagai "gerbong pertama yang sebenarnya." `head` selalu ada dan selalu di dalam stasiun.

### Kenapa `head` Harus Pointer?

1. **Linked List Bisa Kosong**
   Di `fileClose()`, kita mau buffer jadi kosong total. Kalau `head` bukan pointer, kita tidak bisa tulis `NULL`. `head` selalu ada, selalu megang satu `Node` kosong.

2. **Node Dibuat di Luar (Heap)**
   Node-node kita dibuat pakai `malloc`:
   ```c
   Node *baru = malloc(sizeof(Node));   /* Gerbong dibangun di luar stasiun */
   buf->head = baru;                      /* Stasiun catat alamatnya */
   ```
   `malloc` bikin node di memori "luar". Pointer `head` tugasnya cuma **menyimpan alamat** node itu.

3. **Semua Node Harus Terhubung**
   Gerbong 1 punya `next` yang menunjuk ke gerbong 2. `head` harus sejenis: pointer juga. Karena `head` pada dasarnya adalah "pointer ke gerbong pertama" — sama seperti `next` yang menunjuk ke gerbong berikutnya.

---

## 7. Fungsi-fungsi Dasar

### 7.1. `Faiq.c` — `bufferInit()`

Tujuan: Membuat **buffer yang masih kosong tapi siap dipakai**. Jadi stasiun kereta sudah berdiri, tapi belum ada gerbong. Fungsi ini membuat **gerbong pertama yang kosong** supaya stasiun punya tempat untuk nulis.

```c
void bufferInit(TextBuffer *buf) {
    Node *awal = (Node *)malloc(sizeof(Node));
```

**Langkah 1: Minta memori untuk satu gerbong baru**
- `malloc` itu seperti memesan satu gerbong baru dari pabrik.
- `sizeof(Node)` berarti: "Saya mau gerbong dengan ukuran standar Node (200 kursi + penghitung + pintu)."

```c
    if (awal == NULL){
        printf("ERROR! Gagal Alokasi. Program tidak bisa dilanjutkan.");
        buf->head = NULL;
        buf->totalLines = 0;
        buf->currentRow = 0;
        return;
    }
```

**Langkah 2: Cek apakah pesanan gerbong berhasil**
- Kalau `awal == NULL`, artinya pabrik kehabisan bahan baku (memori penuh).
- **Logika if**: Kalau memori penuh, kita set semua jadi nol: `head = NULL`, `totalLines = 0`, `currentRow = 0`. Lalu berhenti (`return`).
- Ini adalah **safety check**. Kalau tidak ada ini, program bisa crash tanpa pesan.

```c
    awal->text[0] = '\0';
    awal->length = 0;
    awal->next = NULL;
```

**Langkah 3: Siapkan gerbong baru**
- `text[0] = '\0'`: Kursi pertama diisi tanda kosong (string kosong). Ini artinya gerbong belum ada penumpang.
- `length = 0`: Penghitung ditulis 0. Belum ada isi.
- `next = NULL`: Pintu belakang gerbong ditutup. Tidak ada gerbong setelahnya.

```c
    buf->head = awal;
    buf->totalLines = 1;
    buf->currentRow = 0;
}
```

**Langkah 4: Catat di stasiun**
- `head = awal`: Stasiun mencatat alamat gerbong pertama. Sekarang stasiun punya satu gerbong.
- `totalLines = 1`: Total gerbong ada 1 (meski kosong).
- `currentRow = 0`: Kursor sedang di gerbong ke-0 (gerbong pertama, karena programmer hitung dari 0).

**Kenapa `totalLines` mulai dari 1, bukan 0?**
Karena program ini tidak pernah benar-benar kosong. Minimal ada 1 baris kosong. Jadi user bisa langsung ngetik tanpa bikin baris dulu.

---

### 7.2. `Firdaus.c` — `getNode()`

Ini adalah fungsi **paling sering dipakai**. Tugasnya: **cari dan ambil alamat gerbong ke-n**.

```c
Node *getNode(TextBuffer *buf, int n) {
    Node *pointer = buf->head;
    int i;

    for (i = 0; i < n; i++) {
        if (pointer == NULL) return NULL;
        pointer = pointer->next;
    }

    return pointer;
}
```

**Langkah 1: Mulai dari gerbong pertama**
- `pointer` diset sama dengan `buf->head`. Jadi kita mulai dari gerbong pertama.

**Langkah 2: Jalan ke depan sebanyak n kali**
- `for (i = 0; i < n; i++)`: Ulangi sebanyak n kali.
- Setiap ulangan: `pointer = pointer->next`. Artinya: "Masuk ke gerbong berikutnya lewat pintu belakang."
- **Logika if di dalam loop**: `if (pointer == NULL) return NULL`. Ini adalah safety. Kalau gerbong habis sebelum sampai ke n, berhenti dan kasih tahu "tidak ketemu."

**Contoh:**
- Kalau `n = 0`, loop tidak jalan. Langsung return gerbong pertama.
- Kalau `n = 2`, loop jalan 2 kali: gerbong 1 → gerbong 2 → gerbong 3. Return gerbong ke-3.

**Langkah 3: Kasih alamat gerbong yang dituju**
- Kalau sampai, return `pointer` yang sekarang menunjuk ke gerbong ke-n.

---

### 7.3. `Firdaus.c` — `bufferGoto()`

Ini fungsi **pindah kursor**. User ketik `g 3`, maka kursor pindah ke baris 3.

```c
void bufferGoto(TextBuffer *buf, int nomor) {
    if (nomor < 1) nomor = 1;
```

**Langkah 1: Cek kalau nomor terlalu kecil**
- `if (nomor < 1)`: Kalau user ketik `g 0` atau `g -5`, anggap saja `1`.
- Ini **clamp** (batas bawah). Tidak ada baris 0 atau negatif bagi user.

```c
    if (nomor > buf->totalLines) nomor = buf->totalLines;
```

**Langkah 2: Cek kalau nomor terlalu besar**
- `if (nomor > totalLines)`: Kalau user ketik `g 999` tapi cuma ada 3 baris, anggap saja baris terakhir (3).
- Ini **clamp** (batas atas).

```c
    buf->currentRow = nomor - 1;
}
```

**Langkah 3: Simpan posisi**
- `nomor - 1`: User hitung dari 1, tapi program hitung dari 0. Jadi baris 3 bagi user = index 2 bagi program.

---

### 7.4. `Firdaus.c` — `bufferInsert()`

Fungsi ini dipakai saat user ketik `i <teks>`. Tujuannya: **tambahkan teks di akhir baris yang sedang aktif**.

```c
void bufferInsert(TextBuffer *buf, char *teks) {
    Node *node = getNode(buf, buf->currentRow);
```

**Langkah 1: Temukan baris aktif**
- `getNode(buf, buf->currentRow)`: Cari gerbong ke-n sesuai posisi kursor sekarang.

```c
    int len = (int)strlen(teks);
    int i;
```

**Langkah 2: Hitung panjang teks yang mau dimasukkan**
- `strlen(teks)`: Berapa huruf yang mau ditulis.

```c
    if (node == NULL) return;
```

**Langkah 3: Safety check**
- Kalau `getNode` tadi return NULL (misalnya karena buffer rusak atau `currentRow` aneh), langsung berhenti. Tidak usah lanjut.

```c
    for (i = 0; i < len; i++) {
        if (node->length >= MAX_COL - 1) break;
        node->text[node->length] = teks[i];
        node->length++;
    }
```

**Langkah 4: Salin huruf satu per satu**
- Loop dari huruf pertama sampai huruf terakhir.
- **Logika if di dalam loop**: `if (node->length >= MAX_COL - 1) break;`. Kalau gerbong sudah penuh (199 karakter), berhenti. Tidak boleh overfill.
- `node->text[node->length] = teks[i]`: Tulis huruf ke posisi kosong pertama. `node->length` disini jadi index, karena kalau panjang = 5, berarti posisi 0-4 sudah terisi, jadi tulis di 5.
- `node->length++`: Tambah penghitung. Sekarang gerbong punya 1 huruf lagi.

```c
    node->text[node->length] = '\0';
}
```

**Langkah 5: Tutup string**
- `text[node->length] = '\0'`: Pastikan di ujung ada tanda akhir string. Ini wajib di C.

---

### 7.5. `Firdaus.c` — `bufferBackspace()`

Fungsi ini dipakai saat user ketik `d [n]`. Tujuannya: **hapus n karakter terakhir dari baris aktif**.

```c
void bufferBackspace(TextBuffer *buf, int n) {
    Node *node = getNode(buf, buf->currentRow);
    int i;

    if (node == NULL) return;
```

**Langkah 1-3**: Sama seperti `bufferInsert`. Cari baris aktif, cek NULL.

```c
    for (i = 0; i < n; i++) {
        if (node->length == 0) break;
        node->length--;
        node->text[node->length] = '\0';
    }
```

**Langkah 4: Hapus n karakter**
- Loop sebanyak n kali.
- **Logika if**: `if (node->length == 0) break;`. Kalau gerbong sudah kosong, berhenti. Tidak boleh panjang jadi negatif.
- `node->length--`: Kurangi penghitung. Kalau tadi 5, jadi 4.
- `node->text[node->length] = '\0'`: Timpa posisi terakhir dengan tanda kosong. Kalau tadi `Halo` (length 4), jadi `Hal` (length 3), lalu `text[3] = '\0'`.

---

### 7.6. `Anand.c` — `allocNode()`

Ini adalah fungsi **bantuan** untuk membuat gerbong baru. Dipakai oleh `bufferInsertBaris` dan `bufferInit`.

```c
Node *allocNode(void) {
    Node *node = malloc(sizeof(Node));
```

**Langkah 1: Minta memori**
- `malloc(sizeof(Node))`: Pesan satu gerbong kosong.

```c
    if (node == NULL) {
        printf("[ERROR] Memori penuh.\n");
        return NULL;
    }
```

**Langkah 2: Cek kegagalan**
- Kalau `NULL`, berarti pabrik kehabisan bahan. Kasih pesan error, lalu return NULL.

```c
    node->text[0] = '\0';
    node->length = 0;
    node->next = NULL;
    return node;
}
```

**Langkah 3: Siapkan gerbong**
- Sama seperti `bufferInit`: string kosong, length 0, tidak ada next.
- Return gerbong yang sudah siap.

---

### 7.7. `Anand.c` — `freeNode()`

Fungsi bantuan untuk **bebaskan satu gerbong**.

```c
void freeNode(Node *node) {
    if (node == NULL) return;
    free(node);
}
```

- **Langkah 1**: Kalau `node == NULL`, tidak perlu bebaskan apa-apa. Langsung return.
- **Langkah 2**: Kalau ada, `free(node)` kembalikan memori ke sistem.

---

### 7.8. `Anand.c` — `bufferInsertBaris()`

Ini fungsi untuk **bikin baris baru di bawah baris aktif**. Dipakai saat user ketik `ia <teks>`.

```c
void bufferInsertBaris(TextBuffer *buf, char *teks) {
    Node *baru = allocNode();
    if (baru == NULL) return;
```

**Langkah 1: Bikin gerbong baru**
- `allocNode()` pesan gerbong kosong.
- **Logika if**: Kalau gagal (NULL), berhenti. Tidak ada yang bisa ditambahkan.

```c
    strncpy(baru->text, teks, MAX_COL - 1);
    baru->text[MAX_COL - 1] = '\0';
    baru->length = strlen(baru->text);
```

**Langkah 2: Isi gerbong baru dengan teks**
- `strncpy(..., MAX_COL - 1)`: Salin teks dari user, tapi maksimal 199 karakter.
- `text[MAX_COL - 1] = '\0'`: Pastikan ujung string selalu ada tanda akhir.
- `length = strlen(baru->text)`: Hitung panjang teks yang sudah tersimpan.

```c
    Node *current = getNode(buf, buf->currentRow);
```

**Langkah 3: Temukan baris aktif**
- `getNode` cari gerbong ke-`currentRow`. Ini adalah baris di mana user sedang berada.

```c
    baru->next    = current->next;
    current->next = baru;
```

**Langkah 4: Sisipkan gerbong baru di tengah rantai**
- `baru->next = current->next`: Gerbong baru menunjuk ke gerbong yang tadinya ada di belakang `current`.
- `current->next = baru`: Gerbong aktif sekarang menunjuk ke gerbong baru.

**Ilustrasi:**
```
Sebelum:  [current] → [X] → [Y]
Sesudah:  [current] → [baru] → [X] → [Y]
```

Gerbong baru diselipkan persis di belakang `current`.

```c
    buf->currentRow++;
    buf->totalLines++;
}
```

**Langkah 5: Perbarui catatan stasiun**
- `currentRow++`: Kursor pindah ke gerbong baru (yang baru dibuat).
- `totalLines++`: Total gerbong bertambah 1.

---

### 7.9. `Anand.c` — `bufferHapusBaris()`

Ini fungsi untuk **hapus baris aktif**. Dipakai saat user ketik `dl`. Ini yang paling banyak logika karena ada banyak kondisi:

```c
void bufferHapusBaris(TextBuffer *buf) {
    if (buf->totalLines == 1) {
        Node *satu = buf->head;
        satu->text[0] = '\0';
        satu->length  = 0;
        return;
    }
```

**Langkah 1: Cek kalau cuma ada 1 baris**
- **Logika if**: `totalLines == 1`. Kalau cuma ada 1 gerbong, kita tidak boleh hapus gerbongnya (nanti stasiun jadi kehilangan head).
- Solusi: kosongkan isinya saja. `text[0] = '\0'`, `length = 0`. Jadi baris jadi kosong, tapi gerbong tetap ada.

```c
    if (buf->currentRow == 0) {
        Node *hapus  = buf->head;
        buf->head    = hapus->next;
        freeNode(hapus);
        buf->totalLines--;
        return;
    }
```

**Langkah 2: Cek kalau baris yang dihapus adalah baris pertama**
- **Logika if**: `currentRow == 0`. Artinya kita mau hapus `head`.
- `hapus = buf->head`: Catat alamat gerbong pertama yang akan dihapus.
- `buf->head = hapus->next`: Stasiun menunjuk ke gerbong kedua sebagai head baru.
- `freeNode(hapus)`: Bebaskan gerbong lama.
- `totalLines--`: Kurangi total.
- `return`: Selesai.

```c
    Node *prev  = getNode(buf, buf->currentRow - 1);
    Node *hapus = prev->next;
```

**Langkah 3: Cari tetangga**
- Kalau baris yang dihapus bukan baris pertama, kita perlu cari gerbong **sebelumnya** (`prev`).
- `getNode(buf, currentRow - 1)`: Jalan ke gerbong sebelum baris aktif.
- `prev->next`: Gerbong yang akan dihapus.

```c
    prev->next = hapus->next;
```

**Langkah 4: Putuskan gerbong dari rantai**
- `prev->next = hapus->next`: Gerbong sebelumnya sekarang menunjuk ke gerbong setelahnya, melewati gerbong yang dihapus.

**Ilustrasi:**
```
Sebelum:  [prev] → [hapus] → [X]
Sesudah:  [prev] → [X]
```

```c
    if (hapus->next == NULL) {
        buf->currentRow--;
    }
```

**Langkah 5: Cek kalau yang dihapus adalah baris terakhir**
- **Logika if**: `hapus->next == NULL`. Kalau gerbong yang dihapus tidak punya gerbong setelahnya, berarti dia baris terakhir.
- Kalau dia baris terakhir, kita mesti turunkan `currentRow`. Karena kalau tidak, `currentRow` akan menunjuk ke index yang tidak ada (melebihi totalLines).

**Contoh:**
- Ada 3 baris, kita di baris 3 (`currentRow = 2`). Hapus baris 3. Sekarang cuma ada 2 baris. Kalau `currentRow` tetap 2, itu artinya index 2, tapi sekarang index cuma 0 dan 1. Jadi `currentRow` harus jadi 1.

```c
    freeNode(hapus);
    buf->totalLines--;
}
```

**Langkah 6: Bebaskan memori dan perbarui catatan**
- `freeNode(hapus)`: Hancurkan gerbong yang dihapus.
- `totalLines--`: Total berkurang.

---

### 7.10. Ringkasan Logika `bufferHapusBaris`

| Kondisi | Yang Terjadi |
|---|---|
| `totalLines == 1` | Hanya kosongkan isi, tidak hapus gerbong |
| `currentRow == 0` | Hapus `head`, geser `head` ke gerbong kedua |
| `hapus->next == NULL` | Hapus baris terakhir, turunkan `currentRow` |
| Selain di atas | Hapus baris tengah, sambungkan tetangga |

---

### 7.11. `Faiq.c` — `stackInit()`

Sekarang kita masuk ke undo/redo. Ini adalah inisialisasi meja arsip.

```c
void stackInit(Stack *s){
    int i;

    for (i = 0; i < HISTORY_SIZE; i++){
        s->entries[i].head = NULL;
        s->entries[i].totalLines = 0;
        s->entries[i].currentRow = 0;
    }

    s->top = 0;
}
```

**Logika:**
- Loop 20 kali (sesuai `HISTORY_SIZE`).
- Setiap lemari arsip dikosongkan: `head = NULL`, `totalLines = 0`, `currentRow = 0`.
- `top = 0`: Belum ada snapshot yang tersimpan.

---

### 7.12. `Faiq.c` — `stackPush()`

Ini fungsi untuk **simpan snapshot** (fotokopi buffer) ke stack.

```c
void stackPush(Stack *s, TextBuffer *buf) {
```

**Langkah 1: Cek apakah meja penuh**

```c
    if (s->top >= HISTORY_SIZE) {
        Node *del = s->entries[0].head;
        while (del != NULL) {
            Node *tmp = del->next;
            free(del);
            del = tmp;
        }
        for (j = 0; j < HISTORY_SIZE - 1; j++) {
            s->entries[j] = s->entries[j + 1];
        }
        s->top = HISTORY_SIZE - 1;
    }
```

- **Logika if**: `top >= HISTORY_SIZE`. Kalau sudah 20 snapshot, meja penuh.
- **Langkah 2**: Hapus snapshot paling lama (index 0).
- **Langkah 3**: Geser semua snapshot ke kiri (1 jadi 0, 2 jadi 1, dst).
- `top = HISTORY_SIZE - 1`: Sekarang top di 19 (slot terakhir).

**Langkah 4: Deep copy linked list**

```c
    cur = buf->head;

    while (cur != NULL) {
        newNode = (Node *)malloc(sizeof(Node));
        for (j = 0; j <= cur->length; j++) {
            newNode->text[j] = cur->text[j];
        }
        newNode->length = cur->length;
        newNode->next = NULL;
```

- Loop seluruh gerbong di buffer asli.
- Untuk setiap gerbong, **buat gerbong baru** di snapshot.
- `for (j = 0; j <= cur->length; j++)`: Salin semua karakter, termasuk `'\0'` di akhir.
- `newNode->next = NULL`: Sementara tutup pintu.

```c
        if (snapHead == NULL) {
            snapHead = newNode;
            snapTail = newNode;
        } else {
            snapTail->next = newNode;
            snapTail = newNode;
        }
        cur = cur->next;
    }
```

- **Logika if**: Kalau ini gerbong pertama di snapshot, jadikan `head`.
- **Else**: Sambungkan ke gerbong sebelumnya. `snapTail` selalu menunjuk ke gerbong terakhir.

```c
    s->entries[s->top].head = snapHead;
    s->entries[s->top].totalLines = buf->totalLines;
    s->entries[s->top].currentRow = buf->currentRow;
    s->top++;
}
```

**Langkah 5: Simpan ke meja**
- Simpan `head` snapshot, `totalLines`, dan `currentRow`.
- `top++`: Meja sekarang punya 1 snapshot lagi.

---

### 7.13. `Faiq.c` — `stackPop()`

Ini fungsi untuk **mengembalikan kondisi** dari snapshot.

```c
int stackPop(Stack *s, TextBuffer *buf){
    if(s->top == 0){
        return 0;
    }
```

**Langkah 1: Cek apakah meja kosong**
- **Logika if**: `top == 0`. Kalau tidak ada snapshot, tidak bisa undo. Return 0 (gagal).

```c
    del = buf->head;
    while(del != NULL){
        temp = del->next;
        free(del);
        del = temp;
    }
```

**Langkah 2: Hancurkan buffer sekarang**
- Hapus semua gerbong yang sedang ada di buffer. Karena akan diganti dengan snapshot.

```c
    s->top--;
    buf->head = s->entries[s->top].head;
    buf->totalLines = s->entries[s->top].totalLines;
    buf->currentRow = s->entries[s->top].currentRow;
```

**Langkah 3: Ambil snapshot terakhir**
- `top--`: Turunkan top (ambil snapshot paling atas).
- Copy semua field dari snapshot ke buffer.

```c
    s->entries[s->top].head = NULL;
    s->entries[s->top].totalLines = 0;
    s->entries[s->top].currentRow = 0;
    return 1;
}
```

**Langkah 4: Kosongkan slot yang sudah diambil**
- Set snapshot yang sudah dipakai jadi kosong.
- Return 1 (berhasil).

---

### 7.14. `Faiq.c` — `bufferPushUndo()`, `bufferUndo()`, `bufferRedo()`

Ini **fungsi utama** yang dipanggil dari `main.c`.

#### `bufferPushUndo()`
```c
void bufferPushUndo(Stack *undo, Stack *redo, TextBuffer *buf){
    stackPush(undo, buf);

    while (redo->top > 0) {
        // ... free semua snapshot di redo
    }
}
```

**Logika:**
- **Langkah 1**: Simpan kondisi sekarang ke `undoStack`.
- **Langkah 2**: Bersihkan `redoStack`. Kalau user sudah buat perubahan baru, jalur redo lama dihapus.

#### `bufferUndo()`
```c
int bufferUndo(Stack *undo, Stack *redo, TextBuffer *buf){
    if (undo->top == 0) return 0;
    stackPush(redo, buf);
    return stackPop(undo, buf);
}
```

**Logika:**
- **Langkah 1**: Kalau `undoStack` kosong, gagal.
- **Langkah 2**: Simpan kondisi sekarang ke `redoStack` (supaya bisa redo nanti).
- **Langkah 3**: Pop dari `undoStack` dan terapkan ke buffer.

#### `bufferRedo()`
```c
int bufferRedo(Stack *undo, Stack *redo, TextBuffer *buf){
    if (redo->top == 0) return 0;
    stackPush(undo, buf);
    return stackPop(redo, buf);
}
```

**Logika:**
- **Langkah 1**: Kalau `redoStack` kosong, gagal.
- **Langkah 2**: Simpan kondisi sekarang ke `undoStack`.
- **Langkah 3**: Pop dari `redoStack` dan terapkan.

---

## 8. `file.c` — Operasi File

### 8.1. `fileOpen()` — Baca File ke Buffer

Tujuan: **Baca file dari komputer, lalu masukkan isinya ke dalam buffer**.

```c
int fileOpen(TextBuffer *buf, const char *filename) {
    FILE *fp;
    char  barisTemp[MAX_COL + 4];
    int firstLine = 1;
    int   len;
```

**Langkah 1: Siapkan peralatan**
- `fp`: pointer ke file yang akan dibuka.
- `barisTemp[MAX_COL + 4]`: tempat sementara untuk menyimpan satu baris file. `+4` untuk jaga-jaga kalau ada `\r\n` (Windows) atau newline.
- `firstLine = 1`: penanda. Kita bedakan baris pertama dengan baris selanjutnya, karena cara masuknya ke buffer beda.

```c
    fp = fopen(filename, "r");
    if (!fp) return 0;
```

**Langkah 2: Buka file**
- `fopen(filename, "r")`: Minta sistem operasi buka file untuk dibaca.
- **Logika if**: `!fp` artinya file tidak ketemu atau tidak bisa dibaca. Langsung return 0 (gagal).

```c
    fileClose(buf);
    bufferInit(buf);
```

**Langkah 3: Bersihkan buffer lama**
- Sebelum isi file baru dimasukkan, buffer yang lama harus dikosongkan dulu.
- `fileClose(buf)`: Hancurkan semua gerbong yang sudah ada.
- `bufferInit(buf)`: Buat buffer baru (kosong, 1 baris).

**Kenapa harus ini?** Kalau tidak, buffer akan jadi campuran: sebagian isi file lama, sebagian isi file baru. Jadi kita reset total.

```c
    while (fgets(barisTemp, (int)sizeof(barisTemp), fp)) {
```

**Langkah 4: Baca file baris per baris**
- `fgets` baca satu baris dari file, simpan ke `barisTemp`.
- `while` berarti: ulangi terus sampai tidak ada baris lagi di file.

```c
        len = (int)strlen(barisTemp);
        if (len > 0 && barisTemp[len - 1] == '\n') barisTemp[--len] = '\0';
        if (len > 0 && barisTemp[len - 1] == '\r') barisTemp[--len] = '\0';
```

**Langkah 5: Hilangkan newline**
- File teks di Windows biasanya diakhiri `\r\n`. Di Linux cuma `\n`. `fgets` ikut baca karakter newline ini.
- Baris pertama: `if (barisTemp[len - 1] == '\n')`, hapus `\n`. `len` dikurangi 1.
- Baris kedua: `if (barisTemp[len - 1] == '\r')`, hapus `\r` juga. Ini untuk handle Windows.

**Contoh:** File berisi `"Hello\n"`. Setelah `fgets`, `barisTemp` berisi `"Hello\n"`. Setelah 2x `if`, jadi `"Hello"` (tanpa newline).

```c
        if (len > MAX_COL - 1) {
            len = MAX_COL - 1;
            barisTemp[len] = '\0';
        }
```

**Langkah 6: Potong kalau kepanjangan**
- **Logika if**: Kalau baris file lebih panjang dari 199 karakter, dipotong ke 199.
- `barisTemp[len] = '\0'`: Pastikan ujung tetap ada tanda akhir.

```c
        if (firstLine) {
            bufferInsert(buf, barisTemp);
            firstLine = 0;
        } else {
            bufferInsertBaris(buf, barisTemp);
        }
```

**Langkah 7: Masukkan ke buffer**
- **Logika if**: `firstLine == 1`.
  - Kalau baris pertama: pakai `bufferInsert`. Ini nulis ke baris aktif (yang sudah ada dari `bufferInit`).
  - Setelah itu, `firstLine = 0`. Jadi sekarang jadi false.
- **Else** (baris selanjutnya): pakai `bufferInsertBaris`. Ini bikin baris baru di bawah.

**Kenapa beda?** Karena `bufferInsert` menulis ke baris yang ada. Sedangkan `bufferInsertBaris` bikin baris baru. Kalau semua pakai `bufferInsertBaris`, baris pertama akan kosong, dan baris baru mulai dari baris kedua.

```c
    bufferGoto(buf, 1);
    fclose(fp);
    return 1;
}
```

**Langkah 8: Selesai**
- `bufferGoto(buf, 1)`: Setelah semua baris masuk, kursor pindah ke baris 1.
- `fclose(fp)`: Tutup file. Penting, kalau tidak file akan "terkunci" oleh program.
- Return 1 (berhasil).

---

### 8.2. `fileSave()` — Tulis Buffer ke File

Tujuan: **Tulis isi buffer ke dalam file di komputer**.

```c
int fileSave(const TextBuffer *buf, const char *filename) {
    FILE *fp;
    Node *node;
```

**Langkah 1: Siapkan**
- `fp`: pointer file.
- `node`: untuk jalan-jalan di linked list.

```c
    fp = fopen(filename, "w");
    if (!fp) return 0;
```

**Langkah 2: Buka file untuk tulis**
- `fopen(..., "w")`: Mode write. Kalau file sudah ada, isi lama dihapus. Kalau belum ada, dibikin baru.
- **Logika if**: Kalau gagal (misal folder tidak ada), return 0.

```c
    node = buf->head;
    while (node != NULL) {
        fputs(node->text, fp);
        if (node->next != NULL) fputc('\n', fp);
        node = node->next;
    }
```

**Langkah 3: Tulis baris per baris**
- `node = buf->head`: Mulai dari gerbong pertama.
- `while (node != NULL)`: Ulangi sampai gerbong habis.
- `fputs(node->text, fp)`: Tulis isi gerbong ke file.
- **Logika if**: `node->next != NULL`. Kalau ini bukan gerbong terakhir, tambahkan `\n` (newline). Ini supaya setiap baris di file terpisah.
- `node = node->next`: Pindah ke gerbong berikutnya.

**Contoh:** Buffer isinya 3 baris: `"Hello"`, `"World"`, `"Test"`.
- Tulis `"Hello"`, tambah `\n`.
- Tulis `"World"`, tambah `\n`.
- Tulis `"Test"`, tidak tambah `\n` (karena terakhir).

Hasil di file:
```
Hello
World
Test
```

```c
    fclose(fp);
    return 1;
}
```

**Langkah 4: Tutup dan selesai**
- `fclose(fp)`: Tutup file, pastikan semua tersimpan ke disk.
- Return 1 (berhasil).

---

### 8.3. `fileClose()` — Kosongkan Buffer Total

Tujuan: **Kosongkan total buffer. Hancurkan semua gerbong, jadikan buffer kosong total**.

```c
void fileClose(TextBuffer *buf) {
    Node *cur = buf->head;
    Node *next;
```

**Langkah 1: Mulai dari gerbong pertama**
- `cur = buf->head`: Siapkan penunjuk ke gerbong yang akan dihapus.

```c
    while (cur != NULL) {
        next = cur->next;
        free(cur);
        cur = next;
    }
```

**Langkah 2: Hancurkan gerbong satu per satu**
- `while (cur != NULL)`: Selama masih ada gerbong.
- `next = cur->next`: Catat alamat gerbong berikutnya SEBELUM gerbong ini dihapus.
- `free(cur)`: Hancurkan gerbong sekarang.
- `cur = next`: Pindah ke gerbong berikutnya.

**Kenapa harus catat `next` dulu?** Kalau tidak, setelah `free(cur)`, kita tidak bisa lagi akses `cur->next` (karena sudah dihapus). Jadi `next` harus disimpan sebelum `free`.

**Ilustrasi:**
```
[1] → [2] → [3] → NULL
 ^cur

Langkah 1: next = 2, free(1)
Langkah 2: cur = 2, next = 3, free(2)
Langkah 3: cur = 3, next = NULL, free(3)
Langkah 4: cur = NULL, berhenti
```

```c
    buf->head = NULL;
    buf->totalLines = 0;
    buf->currentRow = 0;
}
```

**Langkah 3: Catat di stasiun bahwa semua sudah kosong**
- `head = NULL`: Stasiun tidak punya gerbong.
- `totalLines = 0`: Tidak ada baris.
- `currentRow = 0`: Default.

**Perbedaan `fileClose` dan `bufferInit`:**

| `fileClose` | `bufferInit` |
|---|---|
| Hancurkan semua gerbong lama | Buat 1 gerbong baru |
| Buffer jadi benar-benar kosong | Buffer jadi punya 1 baris kosong |
| Dipakai saat mau bersihkan total | Dipakai saat mulai baru / setelah tutup |

---

## 9. `replace.c` — `replaceText()`

Tujuan: **Cari semua kemunculan suatu kata dalam seluruh dokumen, lalu ganti dengan kata lain**.

Ini adalah fungsi yang paling rumit secara logika, tapi konsepnya sederhana: **baca satu baris, salin ke tempat baru sambil mengganti yang cocok, lalu tempelkan kembali**.

```c
int replaceText(TextBuffer *buf, char *cari, char *ganti) {
    int cariLen  = (int)strlen(cari);
    int gantiLen = (int)strlen(ganti);
    int count    = 0;
    Node *node;
```

**Langkah 1: Siapkan**
- `cariLen`: panjang kata yang dicari.
- `gantiLen`: panjang kata pengganti.
- `count`: berapa kali penggantian berhasil (untuk return value).
- `node`: untuk jalan-jalan di linked list.

```c
    if (cariLen == 0) return 0;
```

**Langkah 2: Safety**
- Kalau kata yang dicari kosong, tidak ada yang bisa diganti. Return 0.

```c
    node = buf->head;
    while (node != NULL) {
```

**Langkah 3: Loop tiap baris**
- Mulai dari `head`, jalan satu per satu sampai akhir.

```c
        char temp[MAX_COL];
        int  tempLen = 0;
        int  i = 0;
        int  rowLen = node->length;
        int  replaced = 0;
```

**Langkah 4: Siapkan tempat sementara**
- `temp[MAX_COL]`: tempat baru untuk menyimpan hasil baris ini setelah diganti.
- `tempLen`: berapa karakter yang sudah masuk ke `temp`.
- `i`: index posisi yang sedang dibaca di `node->text`.
- `rowLen`: panjang baris asli (supaya tidak baca lebih dari isi).
- `replaced`: penanda apakah baris ini mengalami perubahan (supaya tahu apakah perlu copy balik).

```c
        while (i < rowLen) {
            if (i <= rowLen - cariLen &&
                memcmp(node->text + i, cari, (size_t)cariLen) == 0) {
```

**Langkah 5: Cek apakah di posisi ini ada kata yang cocok**
- `i < rowLen`: selama belum sampai akhir baris.
- `i <= rowLen - cariLen`: pastikan masih ada cukup sisa huruf untuk mencocokkan. Kalau sisa cuma 2 huruf, tapi kata yang dicari panjangnya 5, ya percuma.
- `memcmp(node->text + i, cari, cariLen) == 0`: bandingkan huruf di posisi `i` dengan kata yang dicari. `memcmp` membandingkan byte per byte.

**Contoh:** Baris = `"Hello World"`, cari = `"lo"`.
- `i = 3`: `text[3] = 'l'`, `text[4] = 'o'`. Cocok! → ganti.

```c
                if (tempLen + gantiLen < MAX_COL - 1) {
                    memcpy(temp + tempLen, ganti, (size_t)gantiLen);
                    tempLen += gantiLen;
                }
                i += cariLen;
                count++;
                replaced = 1;
```

**Langkah 6: Kalau cocok, ganti dengan kata baru**
- `tempLen + gantiLen < MAX_COL - 1`: cek apakah masih muat di `temp`.
- `memcpy(temp + tempLen, ganti, gantiLen)`: salin kata pengganti ke `temp`.
- `tempLen += gantiLen`: tambah panjang `temp`.
- `i += cariLen`: loncat ke depan, melewati kata yang sudah diganti.
- `count++`: catat 1 penggantian.
- `replaced = 1`: tandai bahwa baris ini berubah.

```c
            } else {
                if (tempLen < MAX_COL - 1)
                    temp[tempLen++] = node->text[i];
                i++;
            }
```

**Langkah 7: Kalau tidak cocok, salin huruf asli**
- `temp[tempLen++] = node->text[i]`: salin huruf dari baris asli ke `temp`.
- `i++`: maju 1 huruf.

**Analogi:** Ini seperti kita fotokopi satu baris, tapi setiap kali ketemu kata yang dicari, kita tulis kata pengganti di fotokopi, bukan tulis kata asli.

```c
        if (replaced) {
            temp[tempLen] = '\0';
            memcpy(node->text, temp, (size_t)(tempLen + 1));
            node->length = tempLen;
        }
```

**Langkah 8: Kalau baris ini berubah, tempelkan hasil**
- **Logika if**: `replaced == 1`. Kalau baris tidak berubah, tidak perlu salin balik (hemat waktu).
- `temp[tempLen] = '\0'`: tutup string.
- `memcpy(node->text, temp, tempLen + 1)`: salin seluruh `temp` ke baris asli.
- `node->length = tempLen`: perbarui panjang.

```c
        node = node->next;
    }

    return count;
}
```

**Langkah 9: Pindah ke baris berikutnya**
- `node = node->next`: lanjut ke baris selanjutnya.
- `return count`: kasih tahu ke `main.c` berapa kali penggantian terjadi.

---

## 10. `display.c` — Menampilkan ke Layar

### 10.1. `displayBuffer()`

Tujuan: **Tampilkan seluruh isi buffer ke layar**, lengkap dengan penanda baris aktif (`>`), nama file, dan status modifikasi.

```c
void displayBuffer(TextBuffer *buf, char *namaFile, int modified){
    Node *cur;
    int i;
    char penanda;
    char *tampilNama;
    char *tampilModified = "";
```

**Langkah 1: Siapkan variabel**
- `cur`: untuk jalan-jalan di linked list.
- `i`: penghitung nomor baris (dimulai dari 0, tampilkan sebagai 1, 2, 3).
- `penanda`: akan diisi `'>'` atau `' '` (spasi).
- `tampilNama`: nama file yang akan ditulis di header.
- `tampilModified`: tanda `[*]` kalau ada perubahan belum disimpan.

```c
    if (namaFile[0] != '\0'){
        tampilNama = namaFile;
    } else {
        tampilNama = "(belum disimpan)";
    }
```

**Langkah 2: Cek nama file**
- **Logika if**: `namaFile[0] != '\0'`. Kalau ada nama file (tidak kosong), tampilkan nama file asli.
- **Else**: Kalau buffer belum pernah disimpan (namaFile kosong), tampilkan `"(belum disimpan)"`.

```c
    if (modified == 1){
        tampilModified = " [*]";
    } else if (modified == 0){
        tampilModified = "";
    }
```

**Langkah 3: Cek status modifikasi**
- **Logika if**: `modified == 1`. Kalau ada perubahan yang belum disimpan, tambahkan tanda `[*]`.
- **Else if**: `modified == 0`. Kalau sudah tersimpan atau belum ada perubahan, tidak ada tanda.

```c
    printf("\n=== File: %s%s  |  Baris: %d/%d ===\n",
           tampilNama, tampilModified, buf->currentRow + 1, buf->totalLines);
```

**Langkah 4: Cetak header**
- `buf->currentRow + 1`: user melihat baris mulai dari 1, tapi program menyimpan mulai dari 0. Jadi ditambah 1.
- `buf->totalLines`: total baris yang ada.

**Contoh output:**
```
=== File: catatan.txt [*]  |  Baris: 2/5 ===
```

```c
    cur = buf->head;
    i = 0;

    while(cur != NULL){
```

**Langkah 5: Mulai traversal linked list**
- `cur = buf->head`: mulai dari gerbong pertama.
- `i = 0`: penghitung baris dimulai dari 0.
- `while(cur != NULL)`: ulangi sampai gerbong habis.

```c
        if(i == buf->currentRow){
            penanda = '>';
        } else{
            penanda = ' ';
        }
```

**Langkah 6: Tentukan penanda baris**
- **Logika if**: `i == currentRow`. Kalau ini baris yang sedang aktif (kursor di sini), kasih tanda `'>'`.
- **Else**: Kalau bukan baris aktif, kasih spasi kosong.

```c
        printf("%c%3d : %s\n", penanda, i + 1, cur->text);
```

**Langkah 7: Cetak satu baris**
- `%c`: cetak penanda (`>` atau spasi).
- `%3d`: cetak nomor baris, lebar 3 digit, rata kanan. Jadi baris 1 jadi `  1`, baris 12 jadi ` 12`.
- `%s`: cetak isi teks baris ini.

**Contoh:**
```
>  1 : Halo dunia
   2 : Baris kedua
   3 : Baris ketiga
```

```c
        cur = cur->next;
        i++;
    }

    printf("===\n\n");
}
```

**Langkah 8: Lanjut ke gerbong berikutnya**
- `cur = cur->next`: pindah ke gerbong selanjutnya.
- `i++`: nomor baris naik 1.
- `printf("===\n\n")`: tutup tampilan dengan garis pembatas.

---

### 10.2. `displayBantuan()`

Tujuan: **Tampilkan daftar perintah yang tersedia**. Dipanggil saat user ketik `h`.

```c
void displayBantuan(void) {
    puts(
        "\n+-------------+------------------------------------------+\n"
        "| Perintah    | Keterangan                               |\n"
        ...
        "+--------------------------------------------------------+"
    );
    putchar('\n');
}
```

**Logika:**
- `puts(...)` mencetak string persis seperti yang ditulis. Semua tabel bantuan sudah di-hardcode dalam satu string panjang.
- `putchar('\n')`: tambah baris kosong di akhir.

**Kenapa pakai `puts` bukan `printf`?**
Karena `puts` otomatis tambah newline di akhir. Dan karena string ini tidak ada format (`%s`, `%d`), jadi tidak perlu `printf`.

---

## 11. `main.c` — Otak Program

File ini adalah **pusat kendali**. Semua variabel global dideklarasikan di sini, dan semua fungsi `cmd` dipanggil dari sini. Kita akan bahas dengan sangat detail.

---

### 11.1. Variabel Global

```c
TextBuffer buf;
Stack      undoStack;
Stack      redoStack;
char       namaFile[256];
int        modified;
```

Ini adalah **status program** yang tersimpan selama program berjalan:
- `buf`: buffer tempat teks disimpan.
- `undoStack` / `redoStack`: dua lemari arsip untuk undo/redo.
- `namaFile`: nama file yang sedang dibuka (kalau ada).
- `modified`: penanda apakah ada perubahan yang belum disimpan (`1` = ya, `0` = tidak).

---

### 11.2. Helper Functions

#### `tanyaKonfirmasi()`

```c
int tanyaKonfirmasi(char *pertanyaan) {
    char jawab[8];
    printf("%s (y/n): ", pertanyaan);
    fflush(stdout);
    if (!fgets(jawab, sizeof(jawab), stdin)) return 0;
    return (jawab[0] == 'y' || jawab[0] == 'Y');
}
```

**Logika:**
- Tampilkan pertanyaan, tunggu user ketik `y` atau `n`.
- `fflush(stdout)`: paksa cetak ke layar sebelum menunggu input.
- `!fgets(...)`: kalau gagal baca (misal user tekan Ctrl+D), anggap jawaban "tidak".
- **Return**: `1` (true) kalau jawaban diawali `y` atau `Y`, selainnya `0` (false).

#### `bersihkanNewline()`

```c
void bersihkanNewline(char *str) {
    int len = (int)strlen(str);
    if (len > 0 && str[len-1] == '\n') str[--len] = '\0';
    if (len > 0 && str[len-1] == '\r') str[--len] = '\0';
}
```

**Logika:**
- `fgets` menyimpan karakter enter (`\n`) ke dalam string. Fungsi ini menghapusnya.
- Cek ujung string: kalau ada `\n`, hapus. Kalau setelah itu ada `\r` (Windows), hapus juga.

---

### 11.3. Command Functions (Rincian Lengkap)

#### `cmdInsert()` — Perintah `i <teks>`

```c
void cmdInsert(char *teks) {
    int row;
    Node *node;

    if (teks[0] == '\0') {
        printf("[INFO] Ketik teks setelah perintah i. Contoh: i Halo\n");
        return;
    }
```

**Logika if**: Kalau user cuma ketik `i` tanpa teks, kasih pesan info lalu berhenti.

```c
    row = buf.currentRow;
    bufferPushUndo(&undoStack, &redoStack, &buf);
```

**Langkah 1**: Simpan kondisi sekarang ke undo stack. Ini dilakukan **sebelum** mengubah apa pun.

```c
    node = getNode(&buf, buf.currentRow);
    if (node != NULL && node->length > 0) {
        bufferInsert(&buf, " ");
    }
    bufferInsert(&buf, teks);
```

**Langkah 2**: Cek apakah baris aktif sudah ada isi. Kalau sudah, tambahkan spasi dulu (supaya teks baru tidak menempel langsung). Lalu masukkan teks.

**Logika if**: `node != NULL && node->length > 0`.
- `node != NULL`: Safety. Kalau buffer tidak valid, jangan tambah spasi.
- `node->length > 0`: Kalau baris sudah ada isi, berarti user pernah nulis sebelumnya. Jadi perlu spasi pemisah. Kalau baris masih kosong (`length == 0`), tidak perlu spasi.

```c
    modified = 1;
    printf("[OK] Baris %d diperbarui.\n", row + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

**Langkah 3**: Tandai bahwa ada perubahan (`modified = 1`), cetak pesan OK, lalu refresh tampilan.

---

#### `cmdInsertBaris()` — Perintah `ia <teks>`

```c
void cmdInsertBaris(char *teks) {
    bufferPushUndo(&undoStack, &redoStack, &buf);
    bufferInsertBaris(&buf, teks);
    modified = 1;
    printf("[OK] Baris baru dibuat di baris %d.\n", buf.currentRow + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

**Logika**: Simpan undo, lalu panggil `bufferInsertBaris` dari `Anand.c`. Kursor otomatis pindah ke baris baru.

---

#### `cmdHapusKarakter()` — Perintah `d [n]`

```c
void cmdHapusKarakter(char *argumen) {
    int jumlah = 1;

    if (argumen[0] != '\0') {
        jumlah = atoi(argumen);
        if (jumlah < 1) {
            printf("[INFO] Jumlah tidak valid, menggunakan default 1.\n");
            jumlah = 1;
        }
    }
```

**Logika:**
- Default `jumlah = 1`.
- **Logika if**: `argumen[0] != '\0'`. Kalau ada argumen, ubah ke angka pakai `atoi`.
- **Logika if bersarang**: `jumlah < 1`. Kalau angkanya negatif atau nol, pakai default 1.

```c
    bufferPushUndo(&undoStack, &redoStack, &buf);
    bufferBackspace(&buf, jumlah);
    modified = 1;
    printf("[OK] %d karakter dihapus dari baris %d.\n",
           jumlah, buf.currentRow + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

Lalu simpan undo, hapus karakter, tandai modified.

---

#### `cmdHapusBaris()` — Perintah `dl`

```c
void cmdHapusBaris(void) {
    int baris_lama = buf.currentRow + 1;
    bufferPushUndo(&undoStack, &redoStack, &buf);
    bufferHapusBaris(&buf);
    modified = 1;
    printf("[OK] Baris %d dihapus.\n", baris_lama);
    displayBuffer(&buf, namaFile, modified);
}
```

**Logika**: Catat nomor baris yang dihapus **sebelum** dihapus (untuk pesan). Lalu simpan undo, hapus baris, tampilkan.

---

#### `cmdGoto()` — Perintah `g <nomor>`

```c
void cmdGoto(char *argumen) {
    int nomor;

    if (argumen[0] == '\0') {
        printf("[ERROR] Masukkan nomor baris. Contoh: g 3\n");
        return;
    }

    nomor = atoi(argumen);
    if (nomor < 1) {
        printf("[ERROR] Nomor baris harus angka positif. Contoh: g 3\n");
        return;
    }

    bufferGoto(&buf, nomor);
    printf("[OK] Pindah ke baris %d.\n", buf.currentRow + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

**Logika:**
- **If 1**: `argumen[0] == '\0'`. Kalau tidak ada argumen, error.
- **If 2**: `nomor < 1`. Kalau angka negatif atau nol, error.
- Kalau lolos, panggil `bufferGoto`, lalu tampilkan.

---

#### `cmdReplace()` — Perintah `f`

```c
void cmdReplace(void) {
    char cari[CMD_MAX];
    char ganti[CMD_MAX];
    int  jumlah;

    printf("  Cari    : ");
    fflush(stdout);
    if (!fgets(cari, sizeof(cari), stdin)) return;
    bersihkanNewline(cari);
```

**Logika**: Minta input "cari apa" dari user. `fgets` baca, lalu `bersihkanNewline` hapus enter.

```c
    if (cari[0] == '\0') {
        printf("[BATAL] Teks yang dicari tidak boleh kosong.\n");
        return;
    }
```

**Logika if**: Kalau user enter kosong, batal.

```c
    printf("  Ganti   : ");
    fflush(stdout);
    if (!fgets(ganti, sizeof(ganti), stdin)) return;
    bersihkanNewline(ganti);
```

Mintai input "ganti jadi apa".

```c
    bufferPushUndo(&undoStack, &redoStack, &buf);
    jumlah = replaceText(&buf, cari, ganti);

    if (jumlah > 0) {
        modified = 1;
        printf("[OK] %d kemunculan ...\n", jumlah, cari, ganti);
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[INFO] Teks '%s' tidak ditemukan.\n", cari);
    }
}
```

Simpan undo, lalu panggil `replaceText`. Kalau hasil `> 0`, tandai modified dan tampilkan. Kalau 0, berarti tidak ketemu.

---

#### `cmdBuka()` — Perintah `o <file>`

```c
void cmdBuka(char *argumen) {
    if (argumen[0] == '\0') {
        printf("[ERROR] Masukkan nama file. Contoh: o catatan.txt\n");
        return;
    }
```

**Logika if**: Kalau tidak ada nama file, error.

```c
    if (modified) {
        if (!tanyaKonfirmasi("[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"))
        {
            printf("[BATAL] Buka file dibatalkan.\n");
            return;
        }
    }
```

**Logika if**: Kalau ada perubahan belum disimpan, tanya konfirmasi. Kalau user ketik `n`, batal.

```c
    if (fileOpen(&buf, argumen)) {
        strncpy(namaFile, argumen, sizeof(namaFile) - 1);
        namaFile[sizeof(namaFile) - 1] = '\0';
        stackInit(&undoStack);
        stackInit(&redoStack);
        modified = 0;
        printf("[OK] File '%s' dibuka (%d baris).\n", namaFile, buf.totalLines);
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[ERROR] File '%s' tidak ditemukan atau tidak bisa dibuka.\n", argumen);
    }
}
```

**Logika if**: Kalau `fileOpen` berhasil, simpan nama file, reset undo/redo, tandai `modified = 0` (baru dibuka, belum ada perubahan). Kalau gagal, pesan error.

---

#### `cmdSimpan()` — Perintah `s [file]`

```c
void cmdSimpan(char *argumen) {
    if (argumen[0] != '\0') {
        strncpy(namaFile, argumen, sizeof(namaFile) - 1);
        namaFile[sizeof(namaFile) - 1] = '\0';
    }
```

**Logika if**: Kalau user kasih nama file (misal `s catatan.txt`), simpan nama tersebut.

```c
    if (namaFile[0] == '\0') {
        printf("[ERROR] Belum ada nama file. Gunakan: s <namafile>\n");
        return;
    }
```

**Logika if**: Kalau setelah itu `namaFile` masih kosong (tidak pernah dikasih nama), error.

```c
    if (fileSave(&buf, namaFile)) {
        modified = 0;
        printf("[OK] Disimpan ke '%s'.\n", namaFile);
    } else {
        printf("[ERROR] Gagal menyimpan '%s'.\n", namaFile);
    }
}
```

Simpan file. Kalau berhasil, `modified = 0` (sudah tersimpan).

---

#### `cmdTutup()` — Perintah `w`

```c
void cmdTutup(void) {
    if (modified) {
        if (!tanyaKonfirmasi("[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"))
        {
            printf("[BATAL] Tutup file dibatalkan.\n");
            return;
        }
    }
```

**Logika**: Sama seperti `cmdBuka`, tapi ini untuk menutup. Kalau ada perubahan, tanya dulu.

```c
    fileClose(&buf);
    bufferInit(&buf);
    namaFile[0] = '\0';
    stackInit(&undoStack);
    stackInit(&redoStack);
    modified = 0;
    printf("[OK] Buffer dikosongkan.\n");
    displayBuffer(&buf, namaFile, modified);
}
```

**Langkah**: Tutup buffer (bebaskan memori), inisialisasi ulang, kosongkan nama file, reset undo/redo, tampilkan buffer kosong.

---

#### `cmdHapusFile()` — Perintah `del <file>`

```c
void cmdHapusFile(char *argumen) {
    if (argumen[0] == '\0') {
        printf("[ERROR] Masukkan nama file. Contoh: del catatan.txt\n");
        return;
    }

    printf("[PERINGATAN] '%s' akan dihapus PERMANEN dari disk.\n", argumen);
    if (!tanyaKonfirmasi("Yakin?")) {
        printf("[BATAL] Hapus file dibatalkan.\n");
        return;
    }
```

**Logika**: Cek ada argumen, lalu tanya konfirmasi lagi (double confirmation, karena ini menghapus file sungguhan).

```c
    if (remove(argumen) == 0) {
        printf("[OK] File '%s' dihapus dari disk.\n", argumen);

        if (strcmp(argumen, namaFile) == 0) {
            namaFile[0] = '\0';
            modified    = 0;
            printf("[INFO] Buffer masih ada di memori. Simpan dengan nama baru jika perlu.\n");
        }
    } else {
        printf("[ERROR] Gagal menghapus '%s'. File tidak ada atau tidak ada izin.\n", argumen);
    }
}
```

**Logika if**: `remove(argumen) == 0` artinya berhasil. Kalau file yang dihapus **sama dengan** `namaFile` (file yang sedang dibuka), reset `namaFile` karena file aslinya sudah tidak ada.

---

#### `cmdUndo()` dan `cmdRedo()`

```c
void cmdUndo(void) {
    if (bufferUndo(&undoStack, &redoStack, &buf)) {
        modified = 1;
        printf("[OK] Undo berhasil.\n");
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[INFO] Tidak ada yang bisa di-undo.\n");
    }
}
```

**Logika if**: `bufferUndo` return `1` kalau berhasil. Kalau `0`, tampilkan info. `modified = 1` karena undo itu juga termasuk perubahan (buffer jadi beda dari file di disk).

`cmdRedo()` logikanya **sama persis**, cuma panggil `bufferRedo`.

---

#### `cmdKeluar()` — Perintah `q`

```c
void cmdKeluar(void) {
    if (modified) {
        if (!tanyaKonfirmasi("[PERINGATAN] Ada perubahan belum disimpan. Keluar?"))
        {
            printf("[BATAL] Keluar dibatalkan.\n");
            return;
        }
    }
    printf("Sampai jumpa!\n");
    exit(0);
}
```

**Logika**: Cek ada perubahan. Kalau ada, tanya. Kalau user yakin, `exit(0)` langsung hentikan program.

---

### 11.4. `prosesPerintah()` — Router / Dispatcher

```c
void prosesPerintah(char *input) {
    char perintah[16];
    char argumen[CMD_MAX];

    argumen[0]  = '\0';
    perintah[0] = '\0';
```

**Langkah 1**: Siapkan tempat untuk menyimpan perintah dan argumen.

```c
    sscanf(input, "%15s %511[^\n]", perintah, argumen);
```

**Langkah 2**: Pecah input user.
- `%15s`: baca maksimal 15 karakter pertama sebagai perintah (`i`, `ia`, `o`, dll).
- `%511[^\n]`: baca sisanya (maksimal 511 karakter) sebagai argumen. `[^\n]` artinya: baca semua karakter kecuali enter.

**Contoh**: User ketik `i Halo dunia`.
- `perintah` = `"i"`
- `argumen` = `"Halo dunia"`

```c
    if (perintah[0] == '\0') return;
```

**Logika**: Kalau user cuma tekan enter, tidak ada perintah, langsung return.

```c
    if      (strcmp(perintah, "i")   == 0) cmdInsert(argumen);
    else if (strcmp(perintah, "ia")  == 0) cmdInsertBaris(argumen);
    else if (strcmp(perintah, "d")   == 0) cmdHapusKarakter(argumen);
    else if (strcmp(perintah, "dl")  == 0) cmdHapusBaris();
    else if (strcmp(perintah, "g")   == 0) cmdGoto(argumen);
    else if (strcmp(perintah, "f")   == 0) cmdReplace();
    else if (strcmp(perintah, "o")   == 0) cmdBuka(argumen);
    else if (strcmp(perintah, "s")   == 0) cmdSimpan(argumen);
    else if (strcmp(perintah, "w")   == 0) cmdTutup();
    else if (strcmp(perintah, "del") == 0) cmdHapusFile(argumen);
    else if (strcmp(perintah, "u")   == 0) cmdUndo();
    else if (strcmp(perintah, "r")   == 0) cmdRedo();
    else if (strcmp(perintah, "h")   == 0) displayBantuan();
    else if (strcmp(perintah, "q")   == 0) cmdKeluar();
    else {
        printf("[ERROR] Perintah '%s' tidak dikenal. Ketik h untuk bantuan.\n", perintah);
    }
}
```

**Langkah 3**: Cek perintah satu per satu pakai `strcmp`. Kalau cocok, panggil fungsi yang sesuai. Kalau tidak ada yang cocok, berarti perintah tidak dikenal.

---

### 11.5. `main()` — Fungsi Utama

```c
int main(int argc, char *argv[]) {
    char cmd[CMD_MAX];
    int  len;
```

**Langkah 1**: Siapkan tempat untuk menyimpan input user (`cmd`) dan panjangnya (`len`).

```c
    bufferInit(&buf);
    stackInit(&undoStack);
    stackInit(&redoStack);
    namaFile[0] = '\0';
    modified    = 0;
```

**Langkah 2**: Inisialisasi semua. Buffer dibikin kosong, stack dikosongkan, nama file kosong, tidak ada perubahan.

```c
    printf("\n=== Text Editor CLI  |  Linked List + Stack ===\n\n");
    displayBantuan();
```

**Langkah 3**: Tampilkan judul dan bantuan awal.

```c
    if (argc > 1) {
        if (fileOpen(&buf, argv[1])) {
            strncpy(namaFile, argv[1], sizeof(namaFile) - 1);
            namaFile[sizeof(namaFile) - 1] = '\0';
            printf("[OK] File '%s' dibuka (%d baris).\n",
                   namaFile, buf.totalLines);
        } else {
            strncpy(namaFile, argv[1], sizeof(namaFile) - 1);
            namaFile[sizeof(namaFile) - 1] = '\0';
            printf("[INFO] File '%s' belum ada, dimulai kosong.\n", argv[1]);
        }
    }
```

**Langkah 4**: Cek apakah program dijalankan dengan argumen (misal `./editor catatan.txt`).
- **If**: `argc > 1` artinya ada argumen.
- **If bersarang**: Kalau `fileOpen` berhasil, tampilkan pesan OK. Kalau gagal, anggap file baru (tampilkan info).

```c
    displayBuffer(&buf, namaFile, modified);
```

**Langkah 5**: Tampilkan buffer awal (kosong atau isi file yang dibuka).

```c
    while (1) {
        printf("[%s%s | brs %d/%d]> ",
               namaFile[0] ? namaFile : "baru",
               modified     ? "*"     : "",
               buf.currentRow + 1,
               buf.totalLines);
        fflush(stdout);
```

**Langkah 6**: Loop tak terbatas (`while(1)`). Tampilkan prompt:
- `namaFile[0] ? namaFile : "baru"`: kalau ada nama file, tampilkan. Kalau tidak, tampilkan `"baru"`.
- `modified ? "*" : ""`: kalau ada perubahan, tampilkan `*`.
- `buf.currentRow + 1` / `buf.totalLines`: posisi kursor dan total baris.

```c
        if (!fgets(cmd, sizeof(cmd), stdin)) break;
```

**Langkah 7**: Baca input dari user. `fgets` membaca satu baris (sampai user tekan Enter).
- **If**: `!fgets` artinya gagal baca (biasanya karena EOF, misal user tekan Ctrl+D atau Ctrl+Z). Kalau gagal, `break` keluar dari loop.

```c
        len = (int)strlen(cmd);
        if (len > 0 && cmd[len-1] == '\n') cmd[--len] = '\0';
        if (len > 0 && cmd[len-1] == '\r') cmd[--len] = '\0';
```

**Langkah 8**: Hapus karakter newline dari input, sama seperti `bersihkanNewline`.

```c
        if (len == 0) continue;
```

**Logika**: Kalau user cuma tekan Enter (kosong), lanjut ke iterasi berikutnya (tidak perlu proses).

```c
        prosesPerintah(cmd);
    }

    return 0;
}
```

**Langkah 9**: Kirim input ke `prosesPerintah` untuk diproses. Setelah selesai, loop ulang dan tampilkan prompt lagi.

---

## 12. Alur Program Secara Visual

```
Start
  ↓
Inisialisasi (bufferInit, stackInit)
  ↓
Tampilkan bantuan
  ↓
Buka file (kalau ada argumen)
  ↓
Tampilkan buffer
  ↓
Loop (while 1):
  ↓
Tampil prompt → Baca input → Hapus newline → Proses perintah
  ↓
Kalau user ketik 'q' dan konfirmasi → exit(0)
```

---

## 13. Ringkasan Semua Fungsi Command

| Fungsi | Perintah | Langkah Utama |
|---|---|---|
| `cmdInsert` | `i` | Cek teks kosong, push undo, insert teks |
| `cmdInsertBaris` | `ia` | Push undo, insert baris |
| `cmdHapusKarakter` | `d` | Parse argumen, push undo, backspace |
| `cmdHapusBaris` | `dl` | Push undo, hapus baris |
| `cmdGoto` | `g` | Parse argumen, cek valid, goto |
| `cmdReplace` | `f` | Input cari & ganti, push undo, replace |
| `cmdBuka` | `o` | Konfirmasi kalau modified, buka file |
| `cmdSimpan` | `s` | Set nama file, simpan |
| `cmdTutup` | `w` | Konfirmasi, tutup buffer |
| `cmdHapusFile` | `del` | Konfirmasi, hapus file |
| `cmdUndo` | `u` | Panggil bufferUndo |
| `cmdRedo` | `r` | Panggil bufferRedo |
| `cmdKeluar` | `q` | Konfirmasi, exit(0) |

---

## 14. Kesimpulan

Program ini bekerja dengan menggabungkan beberapa konsep:
1. **Linked List**: untuk menyimpan baris teks secara dinamis.
2. **Stack + Snapshot**: untuk mekanisme undo/redo.
3. **File I/O**: untuk membaca dan menulis ke disk.
4. **Command Loop**: untuk menerima dan menjalankan perintah user.

Setiap fungsi memiliki tanggung jawab yang jelas:
- `Faiq.c`: inisialisasi dan undo/redo.
- `Firdaus.c`: navigasi dan edit per karakter.
- `Anand.c`: alokasi node dan edit per baris.
- `file.c`: operasi file.
- `replace.c`: cari dan ganti.
- `display.c`: tampilan.
- `main.c`: kendali utama.
