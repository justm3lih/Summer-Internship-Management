using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.Models
{
    /// <summary>
    /// Admin tarafından tanımlanan ek personel rolleri (ör. öğrenci danışmanı).
    /// Bu kullanıcılar koordinatör portalını kullanır; yetkiler Coordinator ile aynı anahtar kümesinden seçilir.
    /// </summary>
    public class StaffRoleDefinition
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        /// <summary>Kullanıcı kaydında User.Role olarak saklanan benzersiz anahtar (örn. advisor).</summary>
        [Required]
        [MaxLength(64)]
        public string Key { get; set; } = string.Empty;

        /// <summary>Yönetim arayüzünde gösterilen ad.</summary>
        [Required]
        [MaxLength(128)]
        public string Label { get; set; } = string.Empty;
    }
}
