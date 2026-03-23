using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.DTOs
{
    // POST api/auth/login isteğinin gövdesi
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
