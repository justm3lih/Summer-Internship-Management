# Projeyi Localhost'ta Çalıştırma

## Gereksinimler
- **.NET 10 SDK** (backend için)
- **Node.js 18+** (frontend için)

## Hızlı Başlangıç

### 1. Backend (API)
```powershell
cd "Bitirme projesi\backend"
dotnet run --launch-profile http
```
- **URL:** http://localhost:5004
- **Health check:** http://localhost:5004/api/health

### 2. Frontend (Next.js)
Yeni bir terminal açın:
```powershell
cd "Bitirme projesi\frontend"
npm install   # İlk seferde
npm run dev
```
- **URL:** http://localhost:3000

## Giriş Bilgileri (Demo)
| Rol | Email | Şifre |
|-----|-------|-------|
| Öğrenci | student@university.edu | student123 |
| Koordinatör | coordinator@university.edu | coordinator123 |
| Şirket | company@tech.com | company123 |
| Admin | admin@university.edu | admin123 |

## Veritabanı
- **Geliştirme:** Varsayılan olarak In-Memory veritabanı kullanılır (PostgreSQL gerekmez)
- **PostgreSQL:** `appsettings.Development.json` içinde `UseInMemoryDatabase: false` yapın ve PostgreSQL'in çalıştığından emin olun
