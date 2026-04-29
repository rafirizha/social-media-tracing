# Social Media Tracing untuk Bantu Scrapping Usaha Medsos

MVP lokal untuk menjalankan scraper `TikTok`, `Instagram`, dan `Facebook Marketplace` dari satu web app.

## Arsitektur

- `web/`: Next.js untuk form, histori run, dan tabel hasil.
- `api/`: FastAPI untuk men-trigger scraper Python existing dan menyimpan hasil ke SQLite.
- Scraper platform tetap reuse code yang ada di folder `C:\Users\ASUS\Tracing`.


## Jalankan backend

1. Siapkan Python environment untuk API.
2. Install dependency:

```powershell
python -m pip install -r C:\Users\ASUS\Tracing\social-media-tracing\api\requirements.txt
```

3. Jalankan API:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Catatan:
- Kalau mesin ini belum punya Python global, gunakan interpreter Python yang tersedia dari environment lain atau buat venv baru dari interpreter yang ada.
- Scraper platform sendiri memakai interpreter `.venv` milik masing-masing project existing.

## Jalankan frontend

```powershell
cd C:\Users\ASUS\Tracing\social-media-tracing\web
npm.cmd install
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm.cmd run dev
```

Frontend akan tersedia di `http://localhost:3000`.

## Catatan operasional

- `Instagram` dan `Facebook Marketplace` masih mengandalkan langkah manual di browser Playwright.
- Untuk flow dari web, gunakan field `manual wait` agar scraper memberi waktu login / set filter sebelum lanjut otomatis.
- Hasil run dan database SQLite disimpan di `api/data/`.
