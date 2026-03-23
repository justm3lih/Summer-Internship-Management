using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class Application
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Status { get; set; } = "pending"; // "not_applied", "pending", "approved", "rejected", "ongoing", "completed"

        public DateTime AppliedDate { get; set; } = DateTime.UtcNow;

        // Document URLs
        public string? CvUrl { get; set; }
        public string? MotivationLetterUrl { get; set; }
        public string? TranscriptUrl { get; set; }

        public string? CoordinatorComments { get; set; }
        public string? CompanyComments { get; set; }

        // Foreign Keys
        [Required]
        public string StudentId { get; set; } = string.Empty; // Refers to User.Id
        [ForeignKey("StudentId")]
        public User? Student { get; set; }

        [Required]
        public string CompanyId { get; set; } = string.Empty;
        [ForeignKey("CompanyId")]
        public Company? Company { get; set; }
    }
}
