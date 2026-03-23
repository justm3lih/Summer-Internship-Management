using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class Course
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        public int Semester { get; set; }
        public bool Passed { get; set; }
        public string? Grade { get; set; }

        // Foreign Key
        [Required]
        public string UserId { get; set; } = string.Empty; // References the Student
        
        [ForeignKey("UserId")]
        public User? Student { get; set; }
    }
}
