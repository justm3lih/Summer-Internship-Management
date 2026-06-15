using System.Text.Json;
using InternshipManagement.API.Data;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Configuration
{
    /// <summary>student.departments app ayarı: JSON dizi, kayıt ve güncelleme doğrulaması.</summary>
    public static class StudentDepartmentOptions
    {
        public const string Key = "student.departments";

        public const string DefaultJson =
            """["Computer Science","Software Engineering","Data Science and Engineering","Electrical and Electronics Engineering","Electrical Engineering","Mechanical Engineering","Civil Engineering","Chemical Engineering","Industrial Engineering","Business","Mathematics","Physics"]""";

        public static List<string> ParseList(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                var arr = JsonSerializer.Deserialize<List<string>>(json);
                if (arr == null) return new List<string>();
                return arr
                    .Select(s => s?.Trim() ?? "")
                    .Where(s => s.Length > 0)
                    .Distinct()
                    .ToList();
            }
            catch
            {
                return new List<string>();
            }
        }

        public static bool IsInAllowedList(string? department, IReadOnlyList<string> allowed) =>
            Canonicalize(department, allowed) != null;

        /// <summary>Veritabanında saklanan tam yazımı (listedeki) döndürür.</summary>
        public static string? Canonicalize(string? department, IReadOnlyList<string> allowed)
        {
            if (string.IsNullOrWhiteSpace(department) || allowed.Count == 0) return null;
            var t = department.Trim();
            return allowed.FirstOrDefault(a => string.Equals(a, t, StringComparison.OrdinalIgnoreCase));
        }

        public static async Task<List<string>> GetAllowedAsync(
            AppDbContext db,
            CancellationToken cancellationToken = default)
        {
            var row = await db.AppSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == Key, cancellationToken);
            var raw = string.IsNullOrWhiteSpace(row?.Value) ? DefaultJson : row!.Value;
            return ParseList(raw);
        }
    }
}
