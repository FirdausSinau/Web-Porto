# Dokumentasi Pembelajaran: Text Editor CLI — Linked List

> Dokumen ini menjelaskan program dari nol. Untuk setiap fungsi, kita mulai dari **latar belakang** (kenapa fungsi ini ada), **alur logika** (langkah-langkahnya secara konsep), lalu **implementasi** (kode dan penjelasan baris per baris).

---

## 1. Pendahuluan: Kenapa Linked List?

### 1.1. Masalah dengan Array 2D

Di versi pertama, teks disimpan di **array 2D** (tabel dengan baris dan kolom tetap). Masalahnya:

- **Baris tetap**: Kalau dibuat 100 baris, tapi cuma pakai 3 baris, 97 baris lain tetap makan memori meski kosong.
- **Sisip di tengah lambat**: Kalau mau masukin baris baru di tengah, semua baris bawah harus digeser satu per satu.
- **Hapus di tengah ribet**: Kalau hapus baris tengah, juga harus geser semua baris bawahnya.

### 1.2. Solusi: Linked List

**Linked List** seperti rantai kereta. Setiap baris teks adalah satu gerbong. Mau sisip atau hapus, tinggal putus/sambung rantainya. Tidak perlu geser semua baris.

**Analogi:**

- **Array 2D** = Gedung apartemen dengan 100 kamar. Kalau mau bikin kamar baru di lantai 2, harus pindahin semua isi lantai 3-100 ke bawah. Ribet.
- **Linked List** = Rantai gerbong kereta. Mau sisip gerbong baru di tengah, tinggal putus rantai dan sambungkan lagi. Cepat.

---

## 2. Struktur Data

### 2.1. Node = Satu Gerbong

```c
typedef struct Node {
    char text[MAX_COL];      /* 200 kursi kosong */
    int  length;             /* Berapa penumpang di dalam */
    struct Node *next;       /* Pintu ke gerbong berikutnya */
} Node;
```

| Field | Penjelasan |
|-------|------------|
| `text[MAX_COL]` | `MAX_COL = 200`. Array karakter untuk menyimpan teks satu baris. |
| `length` | Berapa banyak karakter yang sudah terisi. `length = 5` artinya index 0-4 sudah terisi. |
| `next` | Pointer ke `Node` berikutnya. Kalau ini gerbong terakhir, `next = NULL`. |

**Kenapa perlu `length`?**

Karena `text` kan array 200. Kalau tidak ada `length`, kita tidak tahu di mana teks berakhir. `length` membuat operasi seperti **tambah teks di akhir** jadi cepat. Kita tinggal mulai dari `text[length]`, tidak perlu `strlen` berulang kali.

### 2.2. TextBuffer = Stasiun Kereta

```c
typedef struct {
    Node *head;        /* Alamat gerbong pertama */
    int totalLines;    /* Berapa total gerbong? */
    int currentRow;    /* Gerbong ke-berapa yang sedang aktif? (0-based) */
} TextBuffer;
```

| Field | Penjelasan |
|-------|------------|
| `head` | Pointer ke gerbong pertama. Kalau `head = NULL`, stasiun kosong. |
| `totalLines` | Jumlah gerbong yang terhubung. |
| `currentRow` | Index gerbong aktif (ditampilkan dengan `>` di layar). |

**Kenapa `currentRow` mulai dari 0?**

Karena programmer komputer biasa menghitung dari 0. User ketik `g 1` → program ubah jadi `currentRow = 0`. User ketik `g 3` → jadi `currentRow = 2`.

### 2.3. Snapshot = Fotokopi Rantai

```c
typedef struct {
    Node *head;
    int totalLines;
    int currentRow;
} Snapshot;
```

Snapshot menyimpan **kondisi lengkap** buffer pada satu waktu. Ini dipakai untuk **undo/redo**.

**Kenapa harus deep copy?**

Kalau cuma salin pointer (`snapshot.head = buf->head`), snapshot dan buffer asli akan menunjuk ke node yang sama. Kalau buffer asli berubah, snapshot ikut berubah. Jadi harus **deep copy**: buat node baru, salin isi teks satu per satu, hasilkan rantai terpisah di memori.

### 2.4. Stack = Tumpukan Snapshot

```c
typedef struct {
    Snapshot entries[HISTORY_SIZE];  /* 20 laci arsip */
    int top;                         /* Laci ke-berapa yang terisi */
} Stack;
```

Prinsipnya **LIFO** — *Last In, First Out*. Snapshot terakhir yang masuk, pertama yang keluar.

---

## 3. Konsep Global, Lokal, dan Argumen

Sebelum masuk ke fungsi, mari bedah tiga sumber data:

| Sumber | Contoh | Karakteristik |
|--------|--------|---------------|
| **Global** | `buf`, `undoStack`, `redoStack`, `namaFile`, `modified` | Dideklarasikan di luar semua fungsi (di `main.c`). Semua fungsi bisa baca/tulis. |
| **Parameter / Argumen** | `TextBuffer *buf`, `int nomor`, `char *teks` | Dikirim dari fungsi pemanggil. Hanya ada di fungsi ini. |
| **Variabel Lokal** | `Node *node`, `int len`, `int i` | Dibuat di dalam fungsi. Hidup dan mati di dalam fungsi. Tidak bisa diakses dari luar. |

**Kenapa `TextBuffer *buf` pakai pointer?**

Kalau fungsi mau **mengubah** `totalLines`, `currentRow`, atau `head` dari `TextBuffer`, maka harus pakai pointer. Analoginya: pointer = kirim alamat rumah, langsung ke rumah asli dan ubah. Kalau tidak pakai pointer, yang dikirim cuma fotokopi, yang diubah cuma fotokopi, aslinya tetap.

---

## 4. Fungsi-fungsi Inti

### 4.1. `Faiq.c` — `bufferInit()`

#### Background

Sebelum user bisa nulis, stasiun harus punya minimal satu gerbong kosong. `bufferInit` tugasnya: buat gerbong pertama yang kosong, lalu catat alamatnya di `head`.

#### Logic Flow

1. Minta memori untuk satu gerbong baru dari sistem.
2. Kalau minta gagal (memori penuh), stasiun di-set kosong dan berhenti.
3. Kalau berhasil, isi gerbong dengan string kosong dan `next = NULL`.
4. Catat alamat gerbong baru di `head`, totalLines = 1, currentRow = 0.

#### Implementation

```c
void bufferInit(TextBuffer *buf) {
    Node *awal = (Node *)malloc(sizeof(Node));

    if (awal == NULL) {
        printf("ERROR! Gagal Alokasi. Program tidak bisa dilanjutkan.");
        buf->head = NULL;
        buf->totalLines = 0;
        buf->currentRow = 0;
        return;
    }

    awal->text[0] = '\0';
    awal->length = 0;
    awal->next = NULL;

    buf->head = awal;
    buf->totalLines = 1;
    buf->currentRow = 0;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer yang akan diinisialisasi. Diterima dari `main()` (saat mulai), `fileOpen()` (saat buka file), `cmdTutup()` (saat tutup buffer). |
| `awal` | Lokal | Variabel lokal | Menampung hasil `malloc`. Hidup sebentar, lalu disalin ke `buf->head`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `main()` | Saat program mulai | `&buf` (buffer global) |
| `fileOpen()` | Sebelum membaca file baru | `&buf` (buffer global) |
| `cmdTutup()` | Setelah menutup buffer lama | `&buf` (buffer global) |

**Penjelasan baris per baris:**

- `malloc(sizeof(Node))`: Minta memori untuk satu gerbong. `sizeof(Node)` = 200 byte (text) + 4 byte (length) + 4 byte (next) = sekitar 208 byte.
- `if (awal == NULL)`: Safety check. Kalau memori penuh, program tidak bisa lanjut. Kita set buffer jadi aman (`head = NULL`, `totalLines = 0`, `currentRow = 0`) lalu berhenti.
- `awal->text[0] = '\0'`: Kursi pertama diisi tanda kosong. Ini artinya gerbong belum ada penumpang.
- `awal->length = 0`: Penghitung ditulis 0.
- `awal->next = NULL`: Pintu belakang ditutup. Tidak ada gerbong setelahnya.
- `buf->head = awal`: Stasiun mencatat alamat gerbong pertama.
- `buf->totalLines = 1`: Total gerbong ada 1 (meski kosong).
- `buf->currentRow = 0`: Kursor di gerbong ke-0 (pertama).

**Kenapa `totalLines` mulai dari 1, bukan 0?**

Karena program ini tidak pernah benar-benar kosong. Minimal ada 1 baris kosong, supaya user bisa langsung ngetik tanpa bikin baris dulu.

---

### 4.2. `Faiq.c` — `stackInit()`

#### Background

Undo/redo membutuhkan tempat menyimpan snapshot. `stackInit` membersihkan semua slot stack supaya tidak ada sampah dari program sebelumnya.

#### Logic Flow

1. Ulangi untuk semua slot (20 slot).
2. Setiap slot dikosongkan: `head = NULL`, `totalLines = 0`, `currentRow = 0`.
3. `top` di-set ke 0 (belum ada snapshot yang tersimpan).

#### Implementation

```c
void stackInit(Stack *s) {
    int i;

    for (i = 0; i < HISTORY_SIZE; i++) {
        s->entries[i].head = NULL;
        s->entries[i].totalLines = 0;
        s->entries[i].currentRow = 0;
    }

    s->top = 0;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `s` | Argumen | Parameter | Pointer ke stack yang akan diinisialisasi. Diterima dari `main()`, `cmdBuka()`, `cmdTutup()`. |
| `i` | Lokal | Variabel lokal | Counter loop. Hidup cuma di dalam `for`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `main()` | Saat program mulai | `&undoStack`, `&redoStack` (stack global) |
| `cmdBuka()` | Setelah berhasil membuka file | `&undoStack`, `&redoStack` (stack global) |
| `cmdTutup()` | Setelah menutup buffer | `&undoStack`, `&redoStack` (stack global) |

**Penjelasan:**

- Loop `i < HISTORY_SIZE`: Membersihkan 20 slot. `i` tidak perlu diingat di luar fungsi.
- `s->top = 0`: Belum ada snapshot yang tersimpan.

---

### 4.3. `Faiq.c` — `stackPush()`

#### Background

Sebelum user mengubah teks, kita simpan kondisi buffer sekarang ke stack. Ini adalah mekanisme **fotokopi** (deep copy) dari seluruh rantai gerbong.

#### Logic Flow

1. Kalau stack sudah penuh (20 snapshot), hapus snapshot paling lama (index 0).
2. Geser semua snapshot ke kiri (1 jadi 0, 2 jadi 1, dst).
3. Deep copy: buat node baru untuk setiap gerbong di buffer asli, salin `text` dan `length`.
4. Sambungkan node-node baru menjadi rantai snapshot.
5. Simpan `head`, `totalLines`, `currentRow` ke slot `top`.
6. Naikkan `top`.

#### Implementation

```c
void stackPush(Stack *s, TextBuffer *buf) {
    int j;
    Node *cur;
    Node *newNode;
    Node *snapHead = NULL;
    Node *snapTail = NULL;

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

    cur = buf->head;

    while (cur != NULL) {
        newNode = (Node *)malloc(sizeof(Node));
        for (j = 0; j <= cur->length; j++) {
            newNode->text[j] = cur->text[j];
        }
        newNode->length = cur->length;
        newNode->next = NULL;

        if (snapHead == NULL) {
            snapHead = newNode;
            snapTail = newNode;
        } else {
            snapTail->next = newNode;
            snapTail = newNode;
        }

        cur = cur->next;
    }

    s->entries[s->top].head = snapHead;
    s->entries[s->top].totalLines = buf->totalLines;
    s->entries[s->top].currentRow = buf->currentRow;
    s->top++;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `s` | Argumen | Parameter | Pointer ke stack tujuan. Diterima dari `bufferPushUndo()` atau `bufferUndo()`/`bufferRedo()`. |
| `buf` | Argumen | Parameter | Pointer ke buffer yang akan difotokopi. Diterima dari fungsi pemanggil. |
| `j` | Lokal | Variabel lokal | Counter untuk salin teks per karakter. |
| `cur` | Lokal | Variabel lokal | Pointer yang mengikuti field `next` dari `buf->head` ke ujung rantai. |
| `newNode` | Lokal | Variabel lokal | Node baru untuk snapshot. |
| `snapHead` | Lokal | Variabel lokal | Penjaga awal rantai snapshot. |
| `snapTail` | Lokal | Variabel lokal | Penjaga akhir rantai snapshot. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `bufferPushUndo()` | Sebelum user mengubah teks | `&undoStack`, `&buf` (saat simpan undo) |
| `bufferUndo()` | Sebelum pop dari undo | `&redoStack`, `&buf` (simpan ke redo dulu) |
| `bufferRedo()` | Sebelum pop dari redo | `&undoStack`, `&buf` (simpan ke undo dulu) |

**Penjelasan baris per baris:**

- `if (s->top >= HISTORY_SIZE)`: Kalau sudah 20 snapshot, meja penuh. Hapus snapshot paling lama (index 0), geser semua ke kiri, lalu `top` di 19.
- `cur = buf->head`: Mulai dari gerbong pertama buffer asli.
- `while (cur != NULL)`: Ulangi sampai akhir rantai. `cur` bergerak dengan mengikuti field `next` dari node ke node berikutnya.
- `for (j = 0; j <= cur->length; j++)`: Salin semua karakter, termasuk `\0` di akhir.
- `if (snapHead == NULL)`: Kalau ini node pertama di snapshot, jadikan `head`.
- `else`: Sambungkan ke `snapTail`. `snapTail` selalu menunjuk ke gerbong terakhir.
- `s->entries[s->top].head = snapHead`: Simpan alamat gerbong pertama snapshot.
- `s->top++`: Meja sekarang punya 1 snapshot lagi.

---

### 4.4. `Faiq.c` — `stackPop()`

#### Background

Undo atau redo membutuhkan mekanisme untuk mengembalikan kondisi buffer dari snapshot terakhir. `stackPop` mengambil snapshot paling atas, menghapus buffer yang sedang aktif, lalu menggantinya dengan snapshot.

#### Logic Flow

1. Kalau stack kosong (`top == 0`), tidak bisa pop. Return gagal.
2. Hapus semua gerbong buffer yang sedang aktif.
3. Turunkan `top` (ambil snapshot paling atas).
4. Salin `head`, `totalLines`, `currentRow` dari snapshot ke buffer.
5. Kosongkan slot yang sudah diambil.
6. Return berhasil.

#### Implementation

```c
int stackPop(Stack *s, TextBuffer *buf) {
    Node *del;
    Node *temp;

    if (s->top == 0) {
        return 0;
    }

    del = buf->head;
    while (del != NULL) {
        temp = del->next;
        free(del);
        del = temp;
    }

    s->top--;
    buf->head = s->entries[s->top].head;
    buf->totalLines = s->entries[s->top].totalLines;
    buf->currentRow = s->entries[s->top].currentRow;

    s->entries[s->top].head = NULL;
    s->entries[s->top].totalLines = 0;
    s->entries[s->top].currentRow = 0;
    return 1;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `s` | Argumen | Parameter | Pointer ke stack sumber. Diterima dari `bufferUndo()` atau `bufferRedo()`. |
| `buf` | Argumen | Parameter | Pointer ke buffer yang akan ditimpa dengan snapshot. Diterima dari fungsi pemanggil. |
| `del` | Lokal | Variabel lokal | Pointer untuk menghapus buffer lama. Mengikuti field `next` dari node ke node berikutnya. |
| `temp` | Lokal | Variabel lokal | Menyimpan `del->next` sebelum `del` dihapus. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `bufferUndo()` | Saat user undo | `&undoStack`, `&buf` (ambil snapshot dari undo) |
| `bufferRedo()` | Saat user redo | `&redoStack`, `&buf` (ambil snapshot dari redo) |

**Penjelasan baris per baris:**

- `if (s->top == 0)`: Kalau tidak ada snapshot, return 0 (gagal).
- `del = buf->head`: Mulai dari gerbong pertama buffer yang sedang aktif.
- `while (del != NULL)`: Ulangi sampai semua gerbong dihapus. `del` bergerak dengan mengikuti field `next`. `temp` harus disimpan dulu sebelum `free(del)`, karena setelah `free`, `del->next` tidak bisa diakses lagi.
- `s->top--`: Turunkan top (ambil snapshot paling atas).
- `buf->head = s->entries[s->top].head`: Ganti buffer dengan snapshot.
- `s->entries[s->top].head = NULL`: Kosongkan slot yang sudah diambil.

---

### 4.5. `Faiq.c` — `bufferPushUndo()`, `bufferUndo()`, `bufferRedo()`

#### Background

Ini adalah fungsi-fungsi utama yang dipanggil dari `main.c`. Mereka mengatur alur undo dan redo dengan menggunakan stack.

#### Logic Flow

- `bufferPushUndo`: Simpan kondisi sekarang ke `undoStack`, lalu bersihkan `redoStack` (kalau user bikin perubahan baru, jalur redo lama dihapus).
- `bufferUndo`: Kalau `undoStack` kosong, gagal. Kalau tidak, simpan kondisi sekarang ke `redoStack`, lalu pop dari `undoStack`.
- `bufferRedo`: Kalau `redoStack` kosong, gagal. Kalau tidak, simpan kondisi sekarang ke `undoStack`, lalu pop dari `redoStack`.

#### Implementation

```c
void bufferPushUndo(Stack *undo, Stack *redo, TextBuffer *buf) {
    Node *del;
    Node *tmp;

    stackPush(undo, buf);

    while (redo->top > 0) {
        del = redo->entries[redo->top - 1].head;
        while (del != NULL) {
            tmp = del->next;
            free(del);
            del = tmp;
        }
        redo->entries[redo->top - 1].head = NULL;
        redo->entries[redo->top - 1].totalLines = 0;
        redo->entries[redo->top - 1].currentRow = 0;
        redo->top--;
    }
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `undo` | Argumen | Parameter | Pointer ke `undoStack`. |
| `redo` | Argumen | Parameter | Pointer ke `redoStack`. |
| `buf` | Argumen | Parameter | Pointer ke buffer yang akan disimpan. |
| `del` | Lokal | Variabel lokal | Pointer untuk menghapus snapshot redo. |
| `tmp` | Lokal | Variabel lokal | Menyimpan `del->next` sebelum `del` dihapus. |

**Dipanggil oleh `bufferPushUndo`:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdInsert()` | Sebelum menulis teks | `&undoStack`, `&redoStack`, `&buf` (semua global) |
| `cmdInsertBaris()` | Sebelum membuat baris baru | `&undoStack`, `&redoStack`, `&buf` (semua global) |
| `cmdHapusKarakter()` | Sebelum menghapus karakter | `&undoStack`, `&redoStack`, `&buf` (semua global) |
| `cmdHapusBaris()` | Sebelum menghapus baris | `&undoStack`, `&redoStack`, `&buf` (semua global) |
| `cmdReplace()` | Sebelum replace | `&undoStack`, `&redoStack`, `&buf` (semua global) |
| `cmdBuka()` | Setelah berhasil buka file | `&undoStack`, `&redoStack`, `&buf` (tapi setelah buka file, stack di-reset) |

**Dipanggil oleh `bufferUndo`:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdUndo()` | Saat user tekan `u` | `&undoStack`, `&redoStack`, `&buf` (semua global) |

**Dipanggil oleh `bufferRedo`:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdRedo()` | Saat user tekan `r` | `&undoStack`, `&redoStack`, `&buf` (semua global) |

```c
int bufferUndo(Stack *undo, Stack *redo, TextBuffer *buf) {
    if (undo->top == 0) return 0;
    stackPush(redo, buf);
    return stackPop(undo, buf);
}
```

```c
int bufferRedo(Stack *undo, Stack *redo, TextBuffer *buf) {
    if (redo->top == 0) return 0;
    stackPush(undo, buf);
    return stackPop(redo, buf);
}
```

**Penjelasan:**

- `bufferUndo`: Kalau `undo->top == 0`, return 0 (gagal). Kalau tidak, `stackPush(redo, buf)` simpan kondisi sekarang ke redo, lalu `stackPop(undo, buf)` kembalikan ke snapshot terakhir di undo.
- `bufferRedo`: Logikanya sama, cuma arahnya balik.

---

### 4.6. `Firdaus.c` — `getNode()`

#### Background

Ini adalah fungsi **paling sering dipakai**. Tugasnya: **cari dan ambil alamat gerbong ke-n**.

#### Logic Flow

1. Mulai dari gerbong pertama (`buf->head`).
2. Ulangi sebanyak `n` kali: pindah ke gerbong berikutnya dengan mengikuti field `next`.
3. Kalau rantai habis sebelum sampai ke `n`, return NULL.
4. Kalau sampai, return alamat gerbong ke-n.

#### Implementation

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

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. |
| `n` | Argumen | Parameter | Index gerbong yang dicari (0-based). Dikirim oleh fungsi lain yang memanggil `getNode`. |
| `pointer` | Lokal | Variabel lokal | Menyalin `buf->head`, lalu mengikuti field `next` ke depan. `buf->head` sendiri tidak berubah. |
| `i` | Lokal | Variabel lokal | Counter loop. |

**Dipanggil oleh `getNode`:**

| Pemanggil | Nilai `n` yang dikirim | Keterangan |
|-----------|------------------------|------------|
| `bufferInsert()` | `buf->currentRow` | Index baris aktif untuk menulis teks. |
| `bufferBackspace()` | `buf->currentRow` | Index baris aktif untuk menghapus karakter. |
| `bufferInsertBaris()` | `buf->currentRow` | Index baris aktif untuk disisipkan di belakangnya. |
| `bufferHapusBaris()` | `buf->currentRow` | Index baris aktif yang akan dihapus. |
| `bufferHapusBaris()` | `buf->currentRow - 1` | Index baris sebelumnya untuk mencari tetangga (`prev`). |

| Pemanggil | Nilai `n` yang dikirim | Keterangan |
|-----------|------------------------|------------|
| `bufferInsert()` | `buf->currentRow` | Index baris aktif untuk menulis teks. |
| `bufferBackspace()` | `buf->currentRow` | Index baris aktif untuk menghapus karakter. |
| `bufferInsertBaris()` | `buf->currentRow` | Index baris aktif untuk disisipkan di belakangnya. |
| `bufferHapusBaris()` | `buf->currentRow` | Index baris aktif yang akan dihapus. |
| `bufferHapusBaris()` | `buf->currentRow - 1` | Index baris sebelumnya untuk mencari tetangga (`prev`). |
| `bufferInit()` | — | Tidak memanggil `getNode`. |
| `cmdGoto()` (via `bufferGoto`) | — | `bufferGoto` tidak memanggil `getNode`, tapi mengubah `currentRow` yang nanti dipakai oleh fungsi lain di atas. |

**Penjelasan baris per baris:**

- `pointer = buf->head`: Mulai dari gerbong pertama. `pointer` adalah variabel baru yang menunjuk ke node yang sama dengan `buf->head`, tapi mereka dua variabel berbeda.
- `for (i = 0; i < n; i++)`: Ulangi sebanyak `n` kali.
- `pointer = pointer->next`: `pointer` pindah ke gerbong berikutnya dengan mengikuti field `next`. `buf->head` tetap di gerbong pertama.
- `if (pointer == NULL) return NULL`: Safety. Kalau rantai habis sebelum sampai ke `n`, return NULL.

**Contoh:**

- Kalau `n = 0`, loop tidak jalan. Langsung return gerbong pertama.
- Kalau `n = 2`, loop jalan 2 kali: gerbong 1 → gerbong 2 → gerbong 3. Return gerbong ke-3.

---

### 4.7. `Firdaus.c` — `bufferGoto()`

#### Background

Ini fungsi **pindah kursor**. User ketik `g 3`, maka kursor pindah ke baris 3.

#### Logic Flow

1. Kalau nomor terlalu kecil (kurang dari 1), anggap 1.
2. Kalau nomor terlalu besar (lebih dari total baris), anggap baris terakhir.
3. Simpan `nomor - 1` ke `currentRow` (user hitung dari 1, program hitung dari 0).

#### Implementation

```c
void bufferGoto(TextBuffer *buf, int nomor) {
    if (nomor < 1) nomor = 1;
    if (nomor > buf->totalLines) nomor = buf->totalLines;
    buf->currentRow = nomor - 1;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdGoto()`. |
| `nomor` | Argumen | Parameter | Nomor baris dari user (1-based). Diterima dari `cmdGoto()` (hasil `atoi(argumen)`). |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdGoto()` | Saat user tekan `g <nomor>` | `&buf` (global), `nomor` (hasil `atoi` dari input user) |
| `fileOpen()` | Setelah selesai membaca file | `&buf` (global), `1` (pindah ke baris pertama) |

**Penjelasan:**

- `nomor < 1`: Batas bawah. User tidak boleh punya baris 0 atau negatif.
- `nomor > buf->totalLines`: Batas atas. Kalau user ketik `g 999` tapi cuma ada 3 baris, anggap baris terakhir.
- `buf->currentRow = nomor - 1`: User hitung dari 1, program hitung dari 0. Jadi baris 3 bagi user = index 2 bagi program.

---

### 4.8. `Firdaus.c` — `bufferInsert()`

#### Background

Fungsi ini dipakai saat user ketik `i <teks>`. Tujuannya: **tambahkan teks di akhir baris yang sedang aktif**.

#### Logic Flow

1. Cari baris aktif dengan `getNode(buf, buf->currentRow)`.
2. Kalau baris tidak ketemu (`NULL`), berhenti.
3. Salin huruf satu per satu dari `teks` ke akhir baris aktif.
4. Kalau baris sudah penuh (199 karakter), berhenti.
5. Tutup string dengan `\0`.

#### Implementation

```c
void bufferInsert(TextBuffer *buf, char *teks) {
    Node *node = getNode(buf, buf->currentRow);
    int len = (int)strlen(teks);
    int i;

    if (node == NULL) return;

    for (i = 0; i < len; i++) {
        if (node->length >= MAX_COL - 1) break;
        node->text[node->length] = teks[i];
        node->length++;
    }

    node->text[node->length] = '\0';
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdInsert()` atau `fileOpen()`. |
| `teks` | Argumen | Parameter | String yang akan ditambahkan. Diterima dari `cmdInsert()` (argumen dari user) atau `fileOpen()` (baris dari file). |
| `node` | Lokal | Variabel lokal | Hasil dari `getNode`. Menunjuk ke baris aktif. |
| `len` | Lokal | Variabel lokal | Panjang teks dari `strlen(teks)`. |
| `i` | Lokal | Variabel lokal | Counter loop. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdInsert()` | Saat user tekan `i <teks>` | `&buf` (global), `teks` (argumen dari user) |
| `fileOpen()` | Saat membaca baris pertama file | `&buf` (global), `barisTemp` (baris dari file) |
| `cmdInsert()` | Saat menambah spasi pemisah | `&buf` (global), `" "` (string literal spasi) |

**Penjelasan baris per baris:**

- `node = getNode(buf, buf->currentRow)`: Cari gerbong ke-n sesuai posisi kursor sekarang.
- `if (node == NULL) return`: Safety. Kalau `getNode` gagal, tidak usah lanjut.
- `if (node->length >= MAX_COL - 1) break`: Batas penuh. Kalau gerbong sudah 199 karakter, berhenti. Tidak boleh overfill.
- `node->text[node->length] = teks[i]`: Tulis huruf ke posisi kosong pertama. `node->length` disini jadi index, karena kalau panjang = 5, berarti posisi 0-4 sudah terisi, jadi tulis di 5.
- `node->length++`: Tambah penghitung. Sekarang gerbong punya 1 huruf lagi.
- `node->text[node->length] = '\0'`: Pastikan di ujung ada tanda akhir string. Ini wajib di C.

---

### 4.9. `Firdaus.c` — `bufferBackspace()`

#### Background

Fungsi ini dipakai saat user ketik `d [n]`. Tujuannya: **hapus n karakter terakhir dari baris aktif**.

#### Logic Flow

1. Cari baris aktif dengan `getNode`.
2. Kalau baris tidak ketemu, berhenti.
3. Ulangi sebanyak `n` kali:
   - Kalau baris sudah kosong (`length == 0`), berhenti.
   - Turunkan `length`.
   - Timpa posisi terakhir dengan `\0`.

#### Implementation

```c
void bufferBackspace(TextBuffer *buf, int n) {
    Node *node = getNode(buf, buf->currentRow);
    int i;

    if (node == NULL) return;

    for (i = 0; i < n; i++) {
        if (node->length == 0) break;
        node->length--;
        node->text[node->length] = '\0';
    }
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdHapusKarakter()`. |
| `n` | Argumen | Parameter | Jumlah karakter yang dihapus. Diterima dari `cmdHapusKarakter()` (hasil `atoi(argumen)`, default 1). |
| `node` | Lokal | Variabel lokal | Hasil `getNode`. Menunjuk ke baris aktif. |
| `i` | Lokal | Variabel lokal | Counter loop. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdHapusKarakter()` | Saat user tekan `d [n]` | `&buf` (global), `jumlah` (hasil `atoi` dari argumen user) |

**Penjelasan:**

- `node->length == 0`: Kalau baris sudah kosong, berhenti. Jangan jadi negatif.
- `node->length--`: Turunkan penghitung. Kalau tadi 5, jadi 4.
- `node->text[node->length] = '\0'`: Timpa posisi terakhir dengan tanda kosong. Kalau tadi `Halo` (length 4), jadi `Hal` (length 3), lalu `text[3] = '\0'`.

---

### 4.10. `Anand.c` — `allocNode()`

#### Background

Ini adalah fungsi bantuan untuk membuat gerbong baru. Dipakai oleh `bufferInsertBaris` dan `bufferInit`.

#### Logic Flow

1. Minta memori untuk satu gerbong.
2. Kalau gagal, return NULL.
3. Kalau berhasil, isi dengan string kosong, `length = 0`, `next = NULL`.
4. Return gerbong yang sudah siap.

#### Implementation

```c
Node *allocNode(void) {
    Node *node = malloc(sizeof(Node));

    if (node == NULL) {
        printf("[ERROR] Memori penuh.\n");
        return NULL;
    }

    node->text[0] = '\0';
    node->length = 0;
    node->next = NULL;
    return node;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `node` | Lokal | Variabel lokal | Hasil `malloc`. Hidup sebentar, lalu return ke pemanggil. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Return value yang diterima |
|-----------|-----------------|---------------------------|
| `bufferInit()` | Saat membuat buffer baru | `Node *` (dijadikan `buf->head`) |
| `bufferInsertBaris()` | Saat membuat baris baru | `Node *` (disisipkan ke linked list) |

---

### 4.11. `Anand.c` — `freeNode()`

#### Background

Fungsi bantuan untuk **bebaskan satu gerbong**. Dipakai saat menghapus baris atau menutup buffer.

#### Logic Flow

1. Kalau node sudah NULL, tidak perlu bebaskan apa-apa.
2. Kalau ada, `free(node)` kembalikan memori ke sistem.

#### Implementation

```c
void freeNode(Node *node) {
    if (node == NULL) return;
    free(node);
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `node` | Argumen | Parameter | Pointer ke node yang akan dihapus. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `bufferHapusBaris()` | Saat menghapus baris aktif | `hapus` (node yang akan dihapus) |
| `fileClose()` | Saat menutup buffer | `cur` (node yang sedang dihapus dalam loop) |
| `stackPush()` | Saat stack penuh (hapus snapshot lama) | `del` (snapshot lama yang dihapus) |
| `stackPop()` | Saat mengganti buffer dengan snapshot | `del` (buffer lama yang dihapus) |
| `bufferPushUndo()` | Saat membersihkan redo stack | `del` (snapshot redo yang dihapus) |

---

### 4.12. `Anand.c` — `bufferInsertBaris()`

#### Background

Ini fungsi untuk **bikin baris baru di bawah baris aktif**. Dipakai saat user ketik `ia <teks>`.

#### Logic Flow

1. Bikin gerbong baru pakai `allocNode()`.
2. Kalau gagal, berhenti.
3. Isi gerbong baru dengan teks dari user.
4. Cari baris aktif dengan `getNode`.
5. Sisipkan gerbong baru di belakang baris aktif dengan memanipulasi pointer `next`.
6. Update `currentRow` dan `totalLines`.

#### Implementation

```c
void bufferInsertBaris(TextBuffer *buf, char *teks) {
    Node *baru = allocNode();
    if (baru == NULL) return;

    strncpy(baru->text, teks, MAX_COL - 1);
    baru->text[MAX_COL - 1] = '\0';
    baru->length = strlen(baru->text);

    Node *current = getNode(buf, buf->currentRow);

    baru->next    = current->next;
    current->next = baru;

    buf->currentRow++;
    buf->totalLines++;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdInsertBaris()` atau `fileOpen()`. |
| `teks` | Argumen | Parameter | String yang akan dimasukkan ke baris baru. Diterima dari `cmdInsertBaris()` (argumen dari user) atau `fileOpen()` (baris dari file). |
| `baru` | Lokal | Variabel lokal | Hasil `allocNode()`. Gerbong baru yang akan disisipkan. |
| `current` | Lokal | Variabel lokal | Hasil `getNode`. Gerbong tempat kita sisipkan di belakangnya. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdInsertBaris()` | Saat user tekan `ia <teks>` | `&buf` (global), `teks` (argumen dari user) |
| `fileOpen()` | Saat membaca baris kedua dan seterusnya dari file | `&buf` (global), `barisTemp` (baris dari file) |

**Penjelasan baris per baris:**

- `strncpy(baru->text, teks, MAX_COL - 1)`: Salin teks dari user, maksimal 199 karakter.
- `baru->text[MAX_COL - 1] = '\0'`: Pastikan ujung string selalu ada tanda akhir.
- `baru->length = strlen(baru->text)`: Hitung panjang teks yang sudah tersimpan.
- `baru->next = current->next`: Gerbong baru menunjuk ke gerbong yang tadinya ada di belakang `current`.
- `current->next = baru`: Gerbong aktif sekarang menunjuk ke gerbong baru.

**Ilustrasi:**

```
Sebelum:  [current] → [X] → [Y]
Sesudah:  [current] → [baru] → [X] → [Y]
```

Gerbong baru diselipkan persis di belakang `current`.

---

### 4.13. `Anand.c` — `bufferHapusBaris()`

#### Background

Ini fungsi untuk **hapus baris aktif**. Dipakai saat user ketik `dl`. Ini yang paling banyak logika karena ada banyak kondisi.

#### Logic Flow

1. Kalau cuma ada 1 baris total, jangan hapus gerbongnya. Cuma kosongkan isinya.
2. Kalau baris yang dihapus adalah baris pertama (`currentRow == 0`), geser `head` ke gerbong kedua, lalu hapus gerbong lama.
3. Kalau bukan baris pertama:
   - Cari gerbong sebelumnya (`prev`) dengan `getNode(buf, currentRow - 1)`.
   - Gerbong yang akan dihapus = `prev->next`.
   - Putuskan gerbong yang dihapus dari rantai: `prev->next = hapus->next`.
   - Kalau gerbong yang dihapus adalah gerbong terakhir (`hapus->next == NULL`), turunkan `currentRow` supaya tidak menunjuk ke tempat kosong.
   - Hapus gerbong dan kurangi `totalLines`.

#### Implementation

```c
void bufferHapusBaris(TextBuffer *buf) {
    if (buf->totalLines == 1) {
        Node *satu = buf->head;
        satu->text[0] = '\0';
        satu->length  = 0;
        return;
    }

    if (buf->currentRow == 0) {
        Node *hapus  = buf->head;
        buf->head    = hapus->next;
        freeNode(hapus);
        buf->totalLines--;
        return;
    }

    Node *prev  = getNode(buf, buf->currentRow - 1);
    Node *hapus = prev->next;

    prev->next = hapus->next;

    if (hapus->next == NULL) {
        buf->currentRow--;
    }

    freeNode(hapus);
    buf->totalLines--;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdHapusBaris()`. |
| `satu` | Lokal | Variabel lokal | Untuk kondisi `totalLines == 1`. |
| `hapus` | Lokal | Variabel lokal | Gerbong yang akan dihapus. |
| `prev` | Lokal | Variabel lokal | Gerbong sebelum gerbong yang dihapus. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdHapusBaris()` | Saat user tekan `dl` | `&buf` (global) |

**Penjelasan baris per baris:**

- `totalLines == 1`: Jangan hapus gerbong, cuma kosongkan isi. Supaya `head` tidak hilang.
- `currentRow == 0`: Hapus `head`. Geser `head` ke gerbong kedua (`buf->head = hapus->next`).
- `prev = getNode(buf, buf->currentRow - 1)`: Cari gerbong sebelum baris aktif. `prev` mengikuti field `next` dari `buf->head` sebanyak `currentRow - 1` kali.
- `prev->next = hapus->next`: Gerbong sebelumnya sekarang menunjuk ke gerbong setelahnya, melewati gerbong yang dihapus.
- `hapus->next == NULL`: Kalau gerbong yang dihapus tidak punya gerbong setelahnya, berarti dia baris terakhir. `currentRow` harus diturunkan supaya tidak menunjuk ke index yang tidak ada.

**Contoh:**

Ada 3 baris, kita di baris 3 (`currentRow = 2`). Hapus baris 3. Sekarang cuma ada 2 baris. Kalau `currentRow` tetap 2, itu artinya index 2, tapi sekarang index cuma 0 dan 1. Jadi `currentRow` harus jadi 1.

---

### 4.14. Ringkasan Logika `bufferHapusBaris`

| Kondisi | Yang Terjadi |
|---------|--------------|
| `totalLines == 1` | Hanya kosongkan isi, tidak hapus gerbong |
| `currentRow == 0` | Hapus `head`, geser `head` ke gerbong kedua |
| `hapus->next == NULL` | Hapus baris terakhir, turunkan `currentRow` |
| Selain di atas | Hapus baris tengah, sambungkan tetangga |

---

## 5. `file.c` — Operasi File

### 5.1. `fileOpen()` — Baca File ke Buffer

#### Background

Tujuan: **Baca file dari komputer, lalu masukkan isinya ke dalam buffer**. Sebelum isi file baru dimasukkan, buffer yang lama harus dikosongkan dulu supaya tidak jadi campuran.

#### Logic Flow

1. Buka file untuk dibaca.
2. Kalau gagal, return 0.
3. Tutup buffer lama (bebaskan memori), lalu inisialisasi buffer baru (kosong, 1 baris).
4. Baca file baris per baris pakai `fgets`.
5. Untuk setiap baris: hapus karakter newline (`\n` dan `\r`), potong kalau kepanjangan.
6. Baris pertama: tulis ke baris aktif pakai `bufferInsert`. Baris selanjutnya: buat baris baru pakai `bufferInsertBaris`.
7. Setelah selesai, pindah kursor ke baris 1.
8. Tutup file dan return berhasil.

#### Implementation

```c
int fileOpen(TextBuffer *buf, char *filename) {
    FILE *fp;
    char  barisTemp[MAX_COL + 4];
    int firstLine = 1;
    int   len;

    fp = fopen(filename, "r");
    if (!fp) return 0;

    fileClose(buf);
    bufferInit(buf);

    while (fgets(barisTemp, (int)sizeof(barisTemp), fp)) {
        len = (int)strlen(barisTemp);
        if (len > 0 && barisTemp[len - 1] == '\n') barisTemp[--len] = '\0';
        if (len > 0 && barisTemp[len - 1] == '\r') barisTemp[--len] = '\0';

        if (len > MAX_COL - 1) {
            len = MAX_COL - 1;
            barisTemp[len] = '\0';
        }

        if (firstLine) {
            bufferInsert(buf, barisTemp);
            firstLine = 0;
        } else {
            bufferInsertBaris(buf, barisTemp);
        }
    }

    bufferGoto(buf, 1);

    fclose(fp);
    return 1;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdBuka()` atau `main()`. |
| `filename` | Argumen | Parameter | Nama file yang akan dibuka. Diterima dari `cmdBuka()` (argumen dari user) atau `main()` (`argv[1]`). |
| `fp` | Lokal | Variabel lokal | Pointer ke file. Hidup sebentar, ditutup sebelum return. |
| `barisTemp` | Lokal | Variabel lokal | Tempat menampung satu baris dari file. `+4` untuk jaga-jaga `\r\n`. |
| `firstLine` | Lokal | Variabel lokal | Penanda. `1` = ini baris pertama, `0` = bukan. |
| `len` | Lokal | Variabel lokal | Panjang baris sementara. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdBuka()` | Saat user tekan `o <file>` | `&buf` (global), `argumen` (nama file dari user) |
| `main()` | Saat program dijalankan dengan argumen | `&buf` (global), `argv[1]` (nama file dari command line) |

**Penjelasan baris per baris:**

- `fopen(filename, "r")`: Buka file untuk dibaca.
- `fileClose(buf)`: Hancurkan semua gerbong lama. Ini mencegah memory leak.
- `bufferInit(buf)`: Buat buffer baru dengan 1 baris kosong.
- `fgets(barisTemp, sizeof(barisTemp), fp)`: Baca satu baris dari file. Ulangi sampai tidak ada baris lagi.
- `barisTemp[--len] = '\0'`: Hapus karakter newline. `fgets` menyertakan `\n` di akhir baris.
- `len > MAX_COL - 1`: Kalau baris file lebih panjang dari 199 karakter, dipotong.
- `if (firstLine)`: Baris pertama pakai `bufferInsert` (nulis ke baris yang sudah ada dari `bufferInit`). Baris selanjutnya pakai `bufferInsertBaris` (bikin baru).

**Kenapa beda antara baris pertama dan selanjutnya?**

Karena `bufferInsert` menulis ke baris yang ada. Sedangkan `bufferInsertBaris` bikin baris baru. Kalau semua pakai `bufferInsertBaris`, baris pertama akan kosong, dan baris baru mulai dari baris kedua.

---

### 5.2. `fileSave()` — Tulis Buffer ke File

#### Background

Tujuan: **Tulis isi buffer ke dalam file di komputer**. Setiap baris dipisahkan dengan newline (`\n`), kecuali baris terakhir.

#### Logic Flow

1. Buka file untuk ditulis (mode "w"). Kalau gagal, return 0.
2. Mulai dari gerbong pertama (`buf->head`).
3. Ulangi sampai gerbong habis:
   - Tulis isi gerbong ke file.
   - Kalau bukan gerbong terakhir, tambahkan `\n`.
   - Pindah ke gerbong berikutnya dengan mengikuti field `next`.
4. Tutup file dan return berhasil.

#### Implementation

```c
int fileSave(TextBuffer *buf, char *filename) {
    FILE *fp;
    Node *node;

    fp = fopen(filename, "w");
    if (!fp) return 0;

    node = buf->head;
    while (node != NULL) {
        fputs(node->text, fp);
        if (node->next != NULL) fputc('\n', fp);
        node = node->next;
    }

    fclose(fp);
    return 1;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdSimpan()`. |
| `filename` | Argumen | Parameter | Nama file tujuan. Diterima dari `cmdSimpan()` (nama file global). |
| `fp` | Lokal | Variabel lokal | Pointer ke file. |
| `node` | Lokal | Variabel lokal | Pointer yang mengikuti field `next` dari `buf->head` ke ujung rantai. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdSimpan()` | Saat user tekan `s [file]` | `&buf` (global), `namaFile` (global, array char) |

**Penjelasan:**

- `node = buf->head`: Mulai dari gerbong pertama.
- `while (node != NULL)`: Ulangi sampai gerbong habis. `node` bergerak dengan mengikuti field `next` dari node ke node berikutnya.
- `if (node->next != NULL)`: Kalau bukan gerbong terakhir, tambahkan `\n`. Ini supaya di file baris terpisah.

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

---

### 5.3. `fileClose()` — Kosongkan Buffer Total

#### Background

Tujuan: **Kosongkan total buffer. Hancurkan semua gerbong, jadikan buffer kosong total**. Ini dipakai saat menutup file atau sebelum membuka file baru.

#### Logic Flow

1. Mulai dari gerbong pertama.
2. Ulangi sampai gerbong habis:
   - Simpan alamat gerbong berikutnya SEBELUM gerbong ini dihapus.
   - Hapus gerbong sekarang.
   - Pindah ke gerbong berikutnya.
3. Set `head = NULL`, `totalLines = 0`, `currentRow = 0`.

#### Implementation

```c
void fileClose(TextBuffer *buf) {
    Node *cur = buf->head;
    Node *next;

    while (cur != NULL) {
        next = cur->next;
        free(cur);
        cur = next;
    }

    buf->head = NULL;
    buf->totalLines = 0;
    buf->currentRow = 0;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdTutup()` atau `fileOpen()`. |
| `cur` | Lokal | Variabel lokal | Gerbong yang sedang dihapus. |
| `next` | Lokal | Variabel lokal | Gerbong berikutnya yang harus disimpan sebelum `cur` dihapus. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdTutup()` | Saat user tekan `w` (tutup) | `&buf` (global) |
| `fileOpen()` | Saat akan membuka file baru (membersihkan buffer lama) | `&buf` (global) |

**Penjelasan:**

- `next = cur->next`: Catat alamat gerbong berikutnya. Kalau tidak, setelah `free(cur)`, kita tidak bisa lagi akses `cur->next` (karena sudah dihapus). Jadi `next` harus disimpan sebelum `free`.
- `buf->head = NULL`: Stasiun tidak punya gerbong.

**Perbedaan `fileClose` dan `bufferInit`:**

| `fileClose` | `bufferInit` |
|-------------|--------------|
| Hancurkan semua gerbong lama | Buat 1 gerbong baru |
| Buffer jadi benar-benar kosong | Buffer jadi punya 1 baris kosong |
| Dipakai saat mau bersihkan total | Dipakai saat mulai baru / setelah tutup |

---

## 6. `replace.c` — `replaceText()`

#### Background

Tujuan: **Cari semua kemunculan suatu kata dalam seluruh dokumen, lalu ganti dengan kata lain**. Ini adalah fungsi yang paling rumit secara logika, tapi konsepnya sederhana: **baca satu baris, salin ke tempat baru sambil mengganti yang cocok, lalu tempelkan kembali**.

#### Logic Flow

1. Hitung panjang `cari` dan `ganti`. Kalau `cari` kosong, return 0.
2. Loop tiap baris (node) di buffer:
   - Buat tempat sementara (`temp`) untuk hasil replace.
   - Baca baris asli dari index 0 sampai akhir.
   - Kalau di posisi `i` ada kata yang cocok dengan `cari`, salin `ganti` ke `temp`.
   - Kalau tidak cocok, salin huruf asli ke `temp`.
   - Kalau baris ini berubah, salin `temp` kembali ke baris asli.
3. Return berapa kali penggantian terjadi.

#### Implementation

```c
int replaceText(TextBuffer *buf, char *cari, char *ganti) {
    int cariLen  = (int)strlen(cari);
    int gantiLen = (int)strlen(ganti);
    int count    = 0;
    Node *node;

    if (cariLen == 0) return 0;

    node = buf->head;
    while (node != NULL) {
        char temp[MAX_COL];
        int  tempLen = 0;
        int  i = 0;
        int  rowLen = node->length;
        int  replaced = 0;

        while (i < rowLen) {
            if (i <= rowLen - cariLen &&
                memcmp(node->text + i, cari, (size_t)cariLen) == 0) {

                if (tempLen + gantiLen < MAX_COL - 1) {
                    memcpy(temp + tempLen, ganti, (size_t)gantiLen);
                    tempLen += gantiLen;
                }
                i += cariLen;
                count++;
                replaced = 1;
            } else {
                if (tempLen < MAX_COL - 1)
                    temp[tempLen++] = node->text[i];
                i++;
            }
        }

        if (replaced) {
            temp[tempLen] = '\0';
            memcpy(node->text, temp, (size_t)(tempLen + 1));
            node->length = tempLen;
        }

        node = node->next;
    }

    return count;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari `cmdReplace()`. |
| `cari` | Argumen | Parameter | String yang dicari. Diterima dari `cmdReplace()` (input dari user). |
| `ganti` | Argumen | Parameter | String pengganti. Diterima dari `cmdReplace()` (input dari user). |
| `cariLen` | Lokal | Variabel lokal | Panjang `cari`. |
| `gantiLen` | Lokal | Variabel lokal | Panjang `ganti`. |
| `count` | Lokal | Variabel lokal | Berapa kali ganti berhasil. Return value. |
| `node` | Lokal | Variabel lokal | Pointer yang mengikuti field `next` dari `buf->head` ke ujung rantai. |
| `temp` | Lokal | Variabel lokal | Tempat sementara hasil replace. |
| `tempLen` | Lokal | Variabel lokal | Panjang teks di `temp`. |
| `i` | Lokal | Variabel lokal | Index baca di `node->text`. |
| `rowLen` | Lokal | Variabel lokal | Panjang baris asli. |
| `replaced` | Lokal | Variabel lokal | Penanda apakah baris ini berubah. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdReplace()` | Saat user tekan `f` lalu isi cari & ganti | `&buf` (global), `cari` (input user), `ganti` (input user) |

**Penjelasan baris per baris:**

- `cariLen == 0`: Kalau kata yang dicari kosong, tidak ada yang bisa diganti. Return 0.
- `node = buf->head`: Mulai dari gerbong pertama. `node` bergerak dengan mengikuti field `next` dari node ke node berikutnya.
- `while (i < rowLen)`: Baca baris dari awal sampai akhir.
- `i <= rowLen - cariLen`: Pastikan masih ada cukup sisa huruf untuk mencocokkan. Kalau sisa cuma 2 huruf, tapi kata yang dicari panjangnya 5, ya percuma.
- `memcmp(node->text + i, cari, cariLen) == 0`: Bandingkan byte per byte. `memcmp` membandingkan memori langsung.
- `tempLen + gantiLen < MAX_COL - 1`: Cek apakah masih muat di `temp`.
- `memcpy(temp + tempLen, ganti, gantiLen)`: Salin kata pengganti ke `temp`.
- `i += cariLen`: Loncat ke depan, melewati kata yang sudah diganti.
- `replaced = 1`: Tandai bahwa baris ini berubah.
- `if (replaced)`: Kalau baris tidak berubah, tidak perlu salin balik (hemat waktu).
- `node = node->next`: Pindah ke baris berikutnya dengan mengikuti field `next`.

**Analogi:** Ini seperti kita fotokopi satu baris, tapi setiap kali ketemu kata yang dicari, kita tulis kata pengganti di fotokopi, bukan tulis kata asli.

---

## 7. `display.c` — Menampilkan ke Layar

### 7.1. `displayBuffer()`

#### Background

Tujuan: **Tampilkan seluruh isi buffer ke layar**, lengkap dengan penanda baris aktif (`>`), nama file, dan status modifikasi.

#### Logic Flow

1. Cek nama file: kalau kosong, tampilkan `"(belum disimpan)"`.
2. Cek status modifikasi: kalau ada perubahan, tambahkan tanda `[*]`.
3. Cetak header dengan nama file dan posisi kursor.
4. Mulai dari gerbong pertama. Ulangi sampai gerbong habis:
   - Kalau ini baris aktif, tampilkan `>`. Kalau tidak, spasi.
   - Cetak nomor baris (dimulai dari 1) dan isi teks.
   - Pindah ke gerbong berikutnya dengan mengikuti field `next`.
5. Cetak garis pembatas.

#### Implementation

```c
void displayBuffer(TextBuffer *buf, char *namaFile, int modified) {
    Node *cur;
    int i;
    char penanda;
    char *tampilNama;
    char *tampilModified = "";

    if (namaFile[0] != '\0') {
        tampilNama = namaFile;
    } else {
        tampilNama = "(belum disimpan)";
    }

    if (modified == 1) {
        tampilModified = " [*]";
    } else if (modified == 0) {
        tampilModified = "";
    }

    printf("\n=== File: %s%s  |  Baris: %d/%d ===\n",
           tampilNama, tampilModified, buf->currentRow + 1, buf->totalLines);

    cur = buf->head;
    i = 0;

    while (cur != NULL) {
        if (i == buf->currentRow) {
            penanda = '>';
        } else {
            penanda = ' ';
        }

        printf("%c%3d : %s\n", penanda, i + 1, cur->text);

        cur = cur->next;
        i++;
    }

    printf("===\n\n");
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `buf` | Argumen | Parameter | Pointer ke buffer. Diterima dari fungsi `cmd*` atau `main()`. |
| `namaFile` | Argumen | Parameter | Nama file yang ditampilkan. Diterima dari fungsi `cmd*` (global `namaFile`). |
| `modified` | Argumen | Parameter | Status modifikasi (0 atau 1). Diterima dari fungsi `cmd*` (global `modified`). |
| `cur` | Lokal | Variabel lokal | Pointer yang mengikuti field `next` dari `buf->head` ke ujung rantai. |
| `i` | Lokal | Variabel lokal | Counter nomor baris (0-based). |
| `penanda` | Lokal | Variabel lokal | `>` atau spasi. |
| `tampilNama` | Lokal | Variabel lokal | Pointer ke string yang ditampilkan. |
| `tampilModified` | Lokal | Variabel lokal | `" [*]"` atau `""`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdInsert()` | Setelah menulis teks | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdInsertBaris()` | Setelah membuat baris baru | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdHapusKarakter()` | Setelah menghapus karakter | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdHapusBaris()` | Setelah menghapus baris | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdGoto()` | Setelah pindah baris | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdReplace()` | Setelah replace | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdBuka()` | Setelah buka file | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdTutup()` | Setelah tutup buffer | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdUndo()` | Setelah undo | `&buf`, `namaFile`, `modified` (semua global) |
| `cmdRedo()` | Setelah redo | `&buf`, `namaFile`, `modified` (semua global) |
| `main()` | Saat program mulai atau setelah buka file argumen | `&buf`, `namaFile`, `modified` (semua global) |

**Penjelasan:**

- `namaFile[0] != '\0'`: Cek apakah string tidak kosong. `\0` di index 0 artinya string kosong.
- `i == buf->currentRow`: Kalau ini baris yang sedang aktif (kursor di sini), kasih tanda `>`.
- `%c%3d : %s`: `%c` = penanda, `%3d` = nomor baris (lebar 3 digit, rata kanan), `%s` = isi teks.
- `cur = cur->next`: Pindah ke gerbong berikutnya dengan mengikuti field `next`.

**Contoh output:**
```
=== File: catatan.txt [*]  |  Baris: 2/5 ===
>  1 : Halo dunia
    2 : Baris kedua
    3 : Baris ketiga
===
```

---

### 7.2. `displayBantuan()`

#### Background

Tujuan: **Tampilkan daftar perintah yang tersedia**. Dipanggil saat user ketik `h`.

#### Implementation

```c
void displayBantuan(void) {
    puts(
        "\n+-------------+------------------------------------------+\n"
        "| Perintah    | Keterangan                               |\n"
        "+-------------+------------------------------------------+\n"
        "| i <teks>    | Sisipkan teks di baris aktif             |\n"
        "| ia <teks>   | Bikin baris baru di bawah baris aktif    |\n"
        "| d [n]       | Hapus n karakter terakhir (default 1)    |\n"
        "| dl          | Hapus baris aktif                        |\n"
        "| g <nomor>   | Pindah ke baris nomor                    |\n"
        "| f           | Cari dan ganti teks                      |\n"
        "| o <file>    | Buka file                                |\n"
        "| s [file]    | Simpan ke file                           |\n"
        "| w           | Tutup buffer (kosongkan)                 |\n"
        "| del <file>  | Hapus file dari disk                     |\n"
        "| u           | Undo (batalkan perubahan)                |\n"
        "| r           | Redo (ulangi perubahan)                  |\n"
        "| h           | Tampilkan bantuan ini                   |\n"
        "| q           | Keluar program                           |\n"
        "+--------------------------------------------------------+"
    );
    putchar('\n');
}
```

**Kenapa pakai `puts` bukan `printf`?**

Karena `puts` otomatis tambah newline di akhir. Dan karena string ini tidak ada format (`%s`, `%d`), jadi tidak perlu `printf`.

---

## 8. `main.c` — Otak Program

File ini adalah **pusat kendali**. Semua variabel global dideklarasikan di sini, dan semua fungsi `cmd` dipanggil dari sini.

### 8.1. Variabel Global

```c
TextBuffer buf;
Stack      undoStack;
Stack      redoStack;
char       namaFile[256];
int        modified;
```

| Variabel | Jenis | Keterangan |
|----------|-------|------------|
| `buf` | Global | Buffer tempat teks disimpan. |
| `undoStack` | Global | Stack untuk undo. |
| `redoStack` | Global | Stack untuk redo. |
| `namaFile` | Global | Nama file yang sedang dibuka (kalau ada). |
| `modified` | Global | Penanda apakah ada perubahan yang belum disimpan (`1` = ya, `0` = tidak). |

---

### 8.2. Helper Functions

#### `tanyaKonfirmasi()`

#### Background

Fungsi bantuan untuk menanyakan konfirmasi yes/no kepada user. Dipakai saat ada perubahan belum disimpan dan user mau melakukan sesuatu yang berbahaya (buka file baru, tutup, keluar).

#### Implementation

```c
int tanyaKonfirmasi(char *pertanyaan) {
    char jawab[8];
    printf("%s (y/n): ", pertanyaan);
    fflush(stdout);
    if (!fgets(jawab, sizeof(jawab), stdin)) return 0;
    return (jawab[0] == 'y' || jawab[0] == 'Y');
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `pertanyaan` | Argumen | Parameter | String pertanyaan yang ditampilkan. Diterima dari `cmdBuka()`, `cmdTutup()`, `cmdKeluar()`, `cmdHapusFile()`. |
| `jawab` | Lokal | Variabel lokal | Tempat menampung jawaban user. Hanya 8 karakter, cukup untuk `y\n` atau `n\n`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdBuka()` | Saat ada perubahan belum disimpan, user mau buka file baru | String literal: `"[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"` |
| `cmdTutup()` | Saat ada perubahan belum disimpan, user mau tutup buffer | String literal: `"[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"` |
| `cmdKeluar()` | Saat ada perubahan belum disimpan, user mau keluar | String literal: `"[PERINGATAN] Ada perubahan belum disimpan. Keluar?"` |
| `cmdHapusFile()` | Saat user mau menghapus file | String literal: `"Yakin?"` |

**Logika:**

- `fflush(stdout)`: Paksa cetak ke layar sebelum menunggu input.
- `!fgets(...)`: Kalau gagal baca (misal user tekan Ctrl+D), anggap jawaban "tidak".
- Return `1` (true) kalau jawaban diawali `y` atau `Y`, selainnya `0` (false).

---

#### `bersihkanNewline()`

#### Background

Fungsi bantuan untuk menghapus karakter newline (`\n` dan `\r`) dari string. `fgets` menyimpan karakter enter ke dalam string, jadi fungsi ini membersihkannya.

#### Implementation

```c
void bersihkanNewline(char *str) {
    int len = (int)strlen(str);
    if (len > 0 && str[len-1] == '\n') str[--len] = '\0';
    if (len > 0 && str[len-1] == '\r') str[--len] = '\0';
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `str` | Argumen | Parameter | String yang akan dibersihkan. Harus pointer supaya bisa ubah isi. Diterima dari `cmdReplace()`. |
| `len` | Lokal | Variabel lokal | Panjang string. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `cmdReplace()` | Setelah user input "cari" dan "ganti" | `cari` (array lokal di `cmdReplace`) dan `ganti` (array lokal di `cmdReplace`) |

---

### 8.3. Command Functions

#### `cmdInsert()` — Perintah `i <teks>`

#### Background

User mengetik teks di baris aktif. Kalau baris sudah ada isi, teks baru ditambahkan di belakang dengan spasi pemisah.

#### Implementation

```c
void cmdInsert(char *teks) {
    int row;
    Node *node;

    if (teks[0] == '\0') {
        printf("[INFO] Ketik teks setelah perintah i. Contoh: i Halo\n");
        return;
    }

    row = buf.currentRow;
    bufferPushUndo(&undoStack, &redoStack, &buf);

    node = getNode(&buf, buf.currentRow);
    if (node != NULL && node->length > 0) {
        bufferInsert(&buf, " ");
    }
    bufferInsert(&buf, teks);

    modified = 1;
    printf("[OK] Baris %d diperbarui.\n", row + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `teks` | Argumen | Parameter | Teks dari user. Diterima dari `prosesPerintah()` (hasil parsing `sscanf`). |
| `row` | Lokal | Variabel lokal | Menyimpan `buf.currentRow` sebelum diubah (untuk pesan `[OK]`). |
| `node` | Lokal | Variabel lokal | Hasil `getNode`. Menunjuk ke baris aktif. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `i <teks>` | `argumen` (hasil `sscanf` dari input user) |

**Logika:**

- `teks[0] == '\0'`: Kalau user cuma ketik `i` tanpa teks, kasih pesan info.
- `bufferPushUndo`: Simpan kondisi sekarang ke undo stack. Ini dilakukan **sebelum** mengubah apa pun.
- `node != NULL && node->length > 0`: Kalau baris sudah ada isi, tambahkan spasi dulu supaya teks baru tidak menempel langsung.
- `modified = 1`: Tandai ada perubahan. Ini mengubah variabel global!

---

#### `cmdInsertBaris()` — Perintah `ia <teks>`

#### Implementation

```c
void cmdInsertBaris(char *teks) {
    bufferPushUndo(&undoStack, &redoStack, &buf);
    bufferInsertBaris(&buf, teks);
    modified = 1;
    printf("[OK] Baris baru dibuat di baris %d.\n", buf.currentRow + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

**Logika:** Simpan undo, lalu panggil `bufferInsertBaris`. Kursor otomatis pindah ke baris baru.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `ia <teks>` | `argumen` (hasil `sscanf` dari input user) |

---

#### `cmdHapusKarakter()` — Perintah `d [n]`

#### Implementation

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

    bufferPushUndo(&undoStack, &redoStack, &buf);
    bufferBackspace(&buf, jumlah);
    modified = 1;
    printf("[OK] %d karakter dihapus dari baris %d.\n",
           jumlah, buf.currentRow + 1);
    displayBuffer(&buf, namaFile, modified);
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `argumen` | Argumen | Parameter | String jumlah karakter dari user. Diterima dari `prosesPerintah()` (hasil parsing `sscanf`). |
| `jumlah` | Lokal | Variabel lokal | Hasil `atoi(argumen)`. Default 1. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `d [n]` | `argumen` (hasil `sscanf` dari input user) |

---

#### `cmdHapusBaris()` — Perintah `dl`

#### Implementation

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

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `baris_lama` | Lokal | Variabel lokal | Nomor baris yang dihapus, dicatat **sebelum** dihapus. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `dl` | Tidak ada argumen (dipanggil dengan `cmdHapusBaris()`) |

---

#### `cmdGoto()` — Perintah `g <nomor>`

#### Implementation

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

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `argumen` | Argumen | Parameter | String nomor baris dari user. Diterima dari `prosesPerintah()` (hasil parsing `sscanf`). |
| `nomor` | Lokal | Variabel lokal | Hasil `atoi(argumen)`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `g <nomor>` | `argumen` (hasil `sscanf` dari input user) |

**Logika:**

- `argumen[0] == '\0'`: Kalau tidak ada angka, error.
- `nomor < 1`: Kalau angka negatif atau nol, error.
- `bufferGoto(&buf, nomor)`: Kirim angka ke fungsi inti. `&buf` adalah global, `nomor` adalah lokal.

---

#### `cmdReplace()` — Perintah `f`

#### Implementation

```c
void cmdReplace(void) {
    char cari[CMD_MAX];
    char ganti[CMD_MAX];
    int  jumlah;

    printf("  Cari    : ");
    fflush(stdout);
    if (!fgets(cari, sizeof(cari), stdin)) return;
    bersihkanNewline(cari);

    if (cari[0] == '\0') {
        printf("[BATAL] Teks yang dicari tidak boleh kosong.\n");
        return;
    }

    printf("  Ganti   : ");
    fflush(stdout);
    if (!fgets(ganti, sizeof(ganti), stdin)) return;
    bersihkanNewline(ganti);

    bufferPushUndo(&undoStack, &redoStack, &buf);
    jumlah = replaceText(&buf, cari, ganti);

    if (jumlah > 0) {
        modified = 1;
        printf("[OK] %d kemunculan '%s' diganti menjadi '%s'.\n",
               jumlah, cari, ganti);
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[INFO] Teks '%s' tidak ditemukan.\n", cari);
    }
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `cari` | Lokal | Variabel lokal | String yang dicari. Dibaca dari `stdin` pakai `fgets` lalu dibersihkan `bersihkanNewline()`. |
| `ganti` | Lokal | Variabel lokal | String pengganti. Dibaca dari `stdin` pakai `fgets` lalu dibersihkan `bersihkanNewline()`. |
| `jumlah` | Lokal | Variabel lokal | Hasil `replaceText`. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `f` | Tidak ada argumen (fungsi baca input sendiri) |

---

#### `cmdBuka()` — Perintah `o <file>`

#### Implementation

```c
void cmdBuka(char *argumen) {
    if (argumen[0] == '\0') {
        printf("[ERROR] Masukkan nama file. Contoh: o catatan.txt\n");
        return;
    }

    if (modified) {
        if (!tanyaKonfirmasi("[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"))
        {
            printf("[BATAL] Buka file dibatalkan.\n");
            return;
        }
    }

    if (fileOpen(&buf, argumen)) {
        strncpy(namaFile, argumen, sizeof(namaFile) - 1);
        namaFile[sizeof(namaFile) - 1] = '\0';
        stackInit(&undoStack);
        stackInit(&redoStack);
        modified = 0;
        printf("[OK] File '%s' dibuka (%d baris).\n", namaFile, buf.totalLines);
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[ERROR] File '%s' tidak ditemukan atau tidak bisa dibuka.\n",
               argumen);
    }
}
```

**Logika:**

- Kalau `fileOpen` berhasil, simpan nama file, reset undo/redo, tandai `modified = 0` (baru dibuka, belum ada perubahan).
- Kalau gagal, pesan error.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `o <file>` | `argumen` (nama file dari input user) |
| `main()` | Saat program dijalankan dengan argumen | `argv[1]` (nama file dari command line) |

---

#### `cmdSimpan()` — Perintah `s [file]`

#### Implementation

```c
void cmdSimpan(char *argumen) {
    if (argumen[0] != '\0') {
        strncpy(namaFile, argumen, sizeof(namaFile) - 1);
        namaFile[sizeof(namaFile) - 1] = '\0';
    }

    if (namaFile[0] == '\0') {
        printf("[ERROR] Belum ada nama file. Gunakan: s <namafile>\n");
        return;
    }

    if (fileSave(&buf, namaFile)) {
        modified = 0;
        printf("[OK] Disimpan ke '%s'.\n", namaFile);
    } else {
        printf("[ERROR] Gagal menyimpan '%s'.\n", namaFile);
    }
}
```

**Logika:** Kalau user kasih nama file, simpan nama tersebut. Kalau `namaFile` masih kosong, error. Kalau simpan berhasil, `modified = 0`.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `s [file]` | `argumen` (nama file dari input user, bisa kosong) |

---

#### `cmdTutup()` — Perintah `w`

#### Implementation

```c
void cmdTutup(void) {
    if (modified) {
        if (!tanyaKonfirmasi("[PERINGATAN] Ada perubahan belum disimpan. Lanjut?"))
        {
            printf("[BATAL] Tutup file dibatalkan.\n");
            return;
        }
    }

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

**Logika:** Tutup buffer (bebaskan memori), inisialisasi ulang, kosongkan nama file, reset undo/redo, tampilkan buffer kosong.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `w` | Tidak ada argumen |

---

#### `cmdHapusFile()` — Perintah `del <file>`

#### Implementation

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

    if (remove(argumen) == 0) {
        printf("[OK] File '%s' dihapus dari disk.\n", argumen);

        if (strcmp(argumen, namaFile) == 0) {
            namaFile[0] = '\0';
            modified    = 0;
            printf("[INFO] Buffer masih ada di memori. Simpan dengan nama baru jika perlu.\n");
        }
    } else {
        printf("[ERROR] Gagal menghapus '%s'. File tidak ada atau tidak ada izin.\n",
               argumen);
    }
}
```

**Logika:** `remove(argumen) == 0` artinya berhasil. Kalau file yang dihapus sama dengan `namaFile` (file yang sedang dibuka), reset `namaFile` karena file aslinya sudah tidak ada.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `del <file>` | `argumen` (nama file dari input user) |

---

#### `cmdUndo()` dan `cmdRedo()`

#### Implementation

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

```c
void cmdRedo(void) {
    if (bufferRedo(&undoStack, &redoStack, &buf)) {
        modified = 1;
        printf("[OK] Redo berhasil.\n");
        displayBuffer(&buf, namaFile, modified);
    } else {
        printf("[INFO] Tidak ada yang bisa di-redo.\n");
    }
}
```

**Logika:** `bufferUndo` / `bufferRedo` return `1` kalau berhasil. Kalau `0`, tampilkan info. `modified = 1` karena undo/redo juga termasuk perubahan (buffer jadi beda dari file di disk).

**Dipanggil oleh `cmdUndo`:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `u` | Tidak ada argumen |

**Dipanggil oleh `cmdRedo`:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `r` | Tidak ada argumen |

---

#### `cmdKeluar()` — Perintah `q`

#### Implementation

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

**Logika:** Cek ada perubahan. Kalau ada, tanya. Kalau user yakin, `exit(0)` langsung hentikan program.

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `prosesPerintah()` | Saat user tekan `q` | Tidak ada argumen |

---

### 8.4. `prosesPerintah()` — Router / Dispatcher

#### Background

Ini adalah fungsi yang memecah input user menjadi perintah dan argumen, lalu memanggil fungsi `cmd` yang sesuai.

#### Implementation

```c
void prosesPerintah(char *input) {
    char perintah[16];
    char argumen[CMD_MAX];

    argumen[0]  = '\0';
    perintah[0] = '\0';

    sscanf(input, "%15s %511[^\n]", perintah, argumen);
    if (perintah[0] == '\0') return;

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

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `input` | Argumen | Parameter | Input user dari `main()`. Diterima dari `main()` (array `cmd` yang dibaca pakai `fgets`). |
| `perintah` | Lokal | Variabel lokal | Menampung perintah (misal `"i"`, `"ia"`, `"g"`). |
| `argumen` | Lokal | Variabel lokal | Menampung argumen (misal `"Halo dunia"`, `"3"`). |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| `main()` | Setiap kali user mengetik perintah | `cmd` (array lokal di `main`, hasil `fgets`) |

**Logika:**

- `sscanf(input, "%15s %511[^\n]", perintah, argumen)`:
  - `%15s`: Baca maksimal 15 karakter non-spasi sebagai perintah.
  - `%511[^\n]`: Baca sisanya (maksimal 511 karakter) sebagai argumen. `[^\n]` artinya: baca semua karakter kecuali enter.
- `strcmp(perintah, "i") == 0`: Bandingkan string. Kalau cocok, panggil `cmdInsert(argumen)`.
- `else`: Kalau tidak ada yang cocok, berarti perintah tidak dikenal.

---

### 8.5. `main()` — Fungsi Utama

#### Background

Ini adalah titik masuk program. Semua inisialisasi dilakukan di sini, lalu program masuk ke loop tak terbatas untuk menunggu input user.

#### Implementation

```c
int main(int argc, char *argv[]) {
    char cmd[CMD_MAX];
    int  len;

    bufferInit(&buf);
    stackInit(&undoStack);
    stackInit(&redoStack);
    namaFile[0] = '\0';
    modified    = 0;

    printf("\n=== Text Editor CLI  |  Linked List + Stack ===\n\n");
    displayBantuan();

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

    displayBuffer(&buf, namaFile, modified);

    while (1) {
        printf("[%s%s | brs %d/%d]> ",
               namaFile[0] ? namaFile : "baru",
               modified     ? "*"     : "",
               buf.currentRow + 1,
               buf.totalLines);
        fflush(stdout);

        if (!fgets(cmd, sizeof(cmd), stdin)) break;

        len = (int)strlen(cmd);
        if (len > 0 && cmd[len-1] == '\n') cmd[--len] = '\0';
        if (len > 0 && cmd[len-1] == '\r') cmd[--len] = '\0';

        if (len == 0) continue;

        prosesPerintah(cmd);
    }

    return 0;
}
```

| Variabel | Sumber | Jenis | Keterangan |
|----------|--------|-------|------------|
| `argc` | Argumen | Parameter | Jumlah argumen command line dari sistem operasi. Dari OS saat program dijalankan. |
| `argv` | Argumen | Parameter | Array of string. `argv[0]` = nama program, `argv[1]` = argumen pertama. Dari OS saat program dijalankan. |
| `cmd` | Lokal | Variabel lokal | Menampung input user dari `fgets`. |
| `len` | Lokal | Variabel lokal | Panjang input setelah dihapus newline. |

**Dipanggil oleh:**

| Pemanggil | Kapan dipanggil | Argumen yang dikirim |
|-----------|-----------------|---------------------|
| Sistem operasi | Saat program dijalankan | `argc` (jumlah argumen), `argv` (array argumen) |

**Logika:**

- `argc > 1`: Kalau user menjalankan program dengan argumen (misal `./editor catatan.txt`), langsung buka file.
- `argv[1]`: Argumen pertama. Di sini berisi nama file.
- `fgets(cmd, sizeof(cmd), stdin)`: Baca satu baris dari keyboard. Tunggu user tekan Enter.
- `!fgets(...)`: Kalau gagal (EOF, Ctrl+D), `break` keluar dari loop.
- `len == 0`: Kalau user cuma tekan Enter (kosong), `continue` (tidak proses, tampil prompt lagi).
- `prosesPerintah(cmd)`: Kirim ke router untuk diproses.

---

## 9. Alur Program Secara Visual

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

## 10. Ringkasan Semua Fungsi Command

| Fungsi | Perintah | Langkah Utama |
|--------|----------|---------------|
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

## 11. Kesimpulan

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
