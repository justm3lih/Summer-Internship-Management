using System;
using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.Models
{
    // Yüklenen dosyaların metadata'sı. Gerçek dosyalar diskte uploads/ altında tutulur.
    public class UploadedFile
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string OwnerId { get; set; } = string.Empty; // Yükleyen kullanıcı

        [Required]
        public string OriginalName { get; set; } = string.Empty;

        [Required]
        public string StoredFileName { get; set; } = string.Empty; // disk'teki gerçek isim ({guid}{ext})

        [Required]
        public string ContentType { get; set; } = "application/octet-stream";

        public long SizeBytes { get; set; }

        // Kategori: "cv", "motivation_letter", "transcript", "logbook", "report", "other"
        [Required]
        public string Category { get; set; } = "other";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
