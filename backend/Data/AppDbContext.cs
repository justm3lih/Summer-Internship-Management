using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<LogbookEntry> LogbookEntries { get; set; }
        public DbSet<FinalReport> FinalReports { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure One-to-One relationship for User and FinalReport
            modelBuilder.Entity<User>()
                .HasOne(u => u.FinalReport)
                .WithOne(fr => fr.Student)
                .HasForeignKey<FinalReport>(fr => fr.StudentId)
                .IsRequired(false);

            // Configure One-to-Many relationship for User and Courses
            modelBuilder.Entity<Course>()
                .HasOne(c => c.Student)
                .WithMany(u => u.Courses)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure One-to-Many relationship for User and Applications
            modelBuilder.Entity<Application>()
                .HasOne(a => a.Student)
                .WithMany(u => u.Applications)
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure One-to-Many relationship for Company and Applications
            modelBuilder.Entity<Application>()
                .HasOne(a => a.Company)
                .WithMany(c => c.Applications)
                .HasForeignKey(a => a.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Configure One-to-Many relationship for User and LogbookEntries
            modelBuilder.Entity<LogbookEntry>()
                .HasOne(l => l.Student)
                .WithMany(u => u.LogbookEntries)
                .HasForeignKey(l => l.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
