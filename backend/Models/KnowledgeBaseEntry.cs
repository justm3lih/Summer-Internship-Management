using System;
using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.Models
{
    public class KnowledgeBaseEntry
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = "General";

        public string? AuthorId { get; set; }
        public string? AuthorName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
