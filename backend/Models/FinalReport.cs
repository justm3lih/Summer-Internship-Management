using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class FinalReport
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public DateTime? SubmittedDate { get; set; }
        public string? FileUrl { get; set; }

        [Required]
        public string Status { get; set; } = "not_submitted"; // "not_submitted", "pending", "approved", "rejected"

        public string? CoordinatorFeedback { get; set; }
        public string? CompanyFeedback { get; set; }

        // Foreign Key
        [Required]
        public string StudentId { get; set; } = string.Empty; // Refers to User.Id

        [ForeignKey("StudentId")]
        public User? Student { get; set; } // One to One mapping
    }
}
