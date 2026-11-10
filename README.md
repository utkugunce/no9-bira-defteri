# no:9 — Bira Defteri

Türkçe, koyu amber temalı ev birası üretim ve stok takip PWA’sı.

- 14 gün varsayılan mayalama ve en az 14 gün şişede olgunlaşma
- Şişeleme ve içim zamanı için uygulama içi hatırlatma
- Şişe adedi, hacim, ayarlanabilir gram/litre şeker hesabı
- Ortak stok ve atomik stoktan düşme
- JSON dışa aktarma, mobil arayüz, ana ekrana yükleme
- Supabase e-posta/şifre hesabı ve sunucuda atölye üyeliği kontrolü

## Çalıştırma ve doğrulama

Node.js 22 veya üstü. Harici npm bağımlılığı yoktur.

```sh
npm run build
npm test
```

`public/` derlemede oluşur. Vercel, `vercel.json` ile statik PWA’yı ve `api/index.js` API’sini yayınlar. Sadece statik dosyaları açmak API’yi çalıştırmaz.

## Supabase kurulumu

1. Bir Supabase projesinde `supabase/migrations/202611100001_brewery.sql` dosyasını migration olarak uygula.
2. Authentication bölümünde Email/Password girişini aç. E-posta doğrulamasını açık tut. Uygulamanın Vercel adresini Site URL ve izin verilen yönlendirme adreslerine ekle.
3. Kullanıcılar uygulamada hesap oluşturup e-postalarını doğrulasın. Hesap oluşturmak ortak atölye erişimi vermez.
4. Atölye yöneticisi, erişim vereceği her kullanıcıyı Supabase SQL Editor üzerinden aşağıdaki gibi eklesin:

```sql
insert into public.brewery_members(user_id)
select id from auth.users where email = 'KULLANICININ_EPOSTASI'
on conflict do nothing;
```

Üyelik listesini istemciden değiştirme izni verilmez. RLS üyelik kontrolünü doğrudan Supabase erişiminde de uygular. Bu sürüm tek bir ortak no:9 atölyesi içindir.

## Vercel kurulumu

Bu GitHub deposunu Vercel projesi olarak içe aktar. Framework: **Other**. Build: `npm run build`, Output: `public` (dosyada tanımlı).

Vercel ortam değişkenleri:

| Değişken | Değer |
| --- | --- |
| `SUPABASE_URL` | Supabase proje URL’si |
| `SUPABASE_PUBLISHABLE_KEY` | Projenin publishable veya eski anon anahtarı |

Service-role/secret anahtarı kullanma. Publishable anahtar tarayıcıya verilir; veri erişimi JWT ve PostgreSQL RLS ile korunur. Gerçek anahtarları depoya ekleme. `.env.example` yalnızca değişken adlarını gösterir.

## Dosyalar

- `worker/app.html`: ortak Türkçe arayüz kaynağı
- `worker/auth.js`: Supabase oturum, kayıt ve giriş arayüzü
- `build-vercel.mjs`: Vercel için arayüz ve PWA dosyalarını üretir
- `api/index.js`: Supabase kullanıcı oturumunu ve üyeliği kontrol eden Vercel API’si
- `supabase/migrations/`: PostgreSQL şeması, RLS, stok RPC’si
- `worker/api.js`: önceki Sites/D1 sürümünün API referansı ve doğrulama testleri
- `legacy-sites/`: önceki sürümün build ve D1 migration referansları; Vercel derlemesinde kullanılmaz

## Veri taşıma ve sınırlar

Önceki Sites sürümünün D1 verileri bu depoya otomatik aktarılmaz. Eski uygulamanın Ayarlar bölümünden JSON dışa aktarılabilir; canlı veritabanında kayıt varsa ayrı aktarım gerekir. Yeni Supabase kurulumu boş başlar.

Uygulama kabuğu çevrimdışı açılabilir; kayıt okuma ve değiştirme internet gerektirir. Uygulama kapalıyken bildirim göndermez. Şeker oranı kitin talimatına göre ayarlanmalıdır; gün sayısı fermantasyonun tamamlandığını tek başına göstermez.

Gerçek Supabase/Vercel bağlantılarının tamamlanması gerekir. Yerel derleme ve otomatik API testleri canlı veritabanı veya tarayıcı testinin yerini tutmaz.
