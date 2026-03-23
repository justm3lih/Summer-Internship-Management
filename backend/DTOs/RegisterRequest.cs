using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.DTOs
{
    // POST api/auth/register isteğinin gövdesi (öğrenci kaydı)
    public class RegisterRequest
    {
        [Required]
        [StringLength(50)]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]  // En az 6 karakter
        public string Password { get; set; } = string.Empty;
    }
}
