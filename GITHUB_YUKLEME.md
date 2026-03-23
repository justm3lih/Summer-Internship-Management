# GitHub'a yükleme – ne yapacaksın

## 1. Git kur (yoksa)

- https://git-scm.com/download/win → indir, kur.
- Kurarken "Git from the command line" seçili kalsın.
- Kurduktan sonra terminali kapat, tekrar aç.

---

## 2. GitHub'da repo aç

- github.com → giriş yap.
- Sağ üst **+** → **New repository**.
- İsim ver (örn. `staj-yonetim`). **Add README** işaretleme.
- **Create repository** tıkla.
- Sayfadaki **HTTPS** linkini kopyala (şöyle bir şey: `https://github.com/seninkullaniciadin/repo-adi.git`).

---

## 3. Bilgisayarda projeyi bağla ve at

**Git Bash** aç (veya CMD), şunları **sırayla** yaz:

```bash
cd "c:\Users\kitap\Desktop\Capston 26\Bitirme projesi"
```

```bash
git init
```

```bash
git add .
```

Eğer **"adding embedded git repository: frontend"** uyarısı çıkarsa:

```bash
git rm --cached frontend
```

Sonra `frontend` klasörünün içindeki `.git` klasörünü sil (klasörü aç → `.git` → sağ tık → Sil). Tekrar:

```bash
git add frontend
```

Devam:

```bash
git status
```
(Bir sürü dosya görünmeli.)

```bash
git commit -m "Ilk commit"
```

```bash
git branch -M main
```

```bash
git remote add origin BURAYA_GITHUB_LINKINI_YAPIŞTIR
```
(Örn: `git remote add origin https://github.com/kitap/staj-yonetim.git`)

```bash
git push -u origin main
```

Kullanıcı adı / şifre sorarsa: GitHub artık şifre kabul etmiyor. Şifre yerine **Personal Access Token** kullan. GitHub → Sağ üst profil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. İsim ver, **repo** kutusunu işaretle, oluştur, çıkan token'ı kopyala. Şifre istenen yere bu token'ı yapıştır.

---

Bitti. Repo GitHub'da görünür. `.env.local` zaten gönderilmez (.gitignore'da).
