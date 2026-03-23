using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Data
{
    // Uygulama ilk açıldığında veritabanına örnek kullanıcı eklemek için
    public static class SeedData
    {
        /// <summary>Veritabanında hiç kullanıcı yoksa 4 örnek kullanıcı (student, coordinator, company, admin) ekler.</summary>
        public static async Task EnsureSeedUsersAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            if (await db.Users.AnyAsync(cancellationToken))
                return;  // Zaten kullanıcı varsa ekleme

            // Test için kullanılacak sabit hesaplar
            var users = new[]
            {
                new User
                {
                    Email = "student@university.edu",
                    Name = "John Doe",
                    Role = "student",
                    Password = "student123",
                    StudentId = "2021001",
                    Department = "Computer Science",
                    CurrentSemester = 7
                },
                new User
                {
                    Email = "coordinator@university.edu",
                    Name = "Jane Coordinator",
                    Role = "coordinator",
                    Password = "coordinator123"
                },
                new User
                {
                    Email = "company@tech.com",
                    Name = "Tech Solutions Inc.",
                    Role = "company",
                    Password = "company123"
                },
                new User
                {
                    Email = "admin@university.edu",
                    Name = "Admin User",
                    Role = "admin",
                    Password = "admin123"
                }
            };

            db.Users.AddRange(users);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
