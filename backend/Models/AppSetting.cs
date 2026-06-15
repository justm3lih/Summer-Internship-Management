using System;
using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.Models
{
    // Admin tarafından düzenlenebilen sistem ayarlarını key/value olarak tutar
    public class AppSetting
    {
        [Key]
        public string Key { get; set; } = string.Empty;

        public string? Value { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
