using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<LogbookEntry> LogbookEntries { get; set; }
        public DbSet<LogbookWeeklyApproval> LogbookWeeklyApprovals { get; set; }
        public DbSet<FinalReport> FinalReports { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<KnowledgeBaseEntry> KnowledgeBaseEntries { get; set; }
        public DbSet<AppSetting> AppSettings { get; set; }
        public DbSet<UploadedFile> UploadedFiles { get; set; }
        public DbSet<StaffRoleDefinition> StaffRoleDefinitions { get; set; }
        public DbSet<SummerTrainingApplicationLetter> SummerTrainingApplicationLetters { get; set; }
        public DbSet<TrainingReport> TrainingReports { get; set; }
        public DbSet<TrainingReportFigure> TrainingReportFigures { get; set; }
        public DbSet<TrainingReportSubmissionSnapshot> TrainingReportSubmissionSnapshots { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure One-to-One relationship for User and FinalReport
            modelBuilder.Entity<User>()
                .HasOne(u => u.FinalReport)
                .WithOne(fr => fr.Student)
                .HasForeignKey<FinalReport>(fr => fr.StudentId)
                .IsRequired(false);

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

            modelBuilder.Entity<Application>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.CompanySupervisorUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<User>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(u => u.ManagedByCompanyUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.AdvisorUser)
                .WithMany()
                .HasForeignKey(u => u.AdvisorUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<SummerTrainingApplicationLetter>()
                .HasOne(l => l.Student)
                .WithMany()
                .HasForeignKey(l => l.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SummerTrainingApplicationLetter>()
                .HasIndex(l => new { l.StudentId, l.AcademicPeriodKey })
                .IsUnique();

            modelBuilder.Entity<TrainingReport>()
                .HasOne(tr => tr.Application)
                .WithOne(a => a.TrainingReport)
                .HasForeignKey<TrainingReport>(tr => tr.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TrainingReport>()
                .HasIndex(tr => tr.ApplicationId)
                .IsUnique();

            modelBuilder.Entity<TrainingReportFigure>()
                .HasOne(f => f.TrainingReport)
                .WithMany(tr => tr.Figures)
                .HasForeignKey(f => f.TrainingReportId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TrainingReportSubmissionSnapshot>()
                .HasOne(s => s.TrainingReport)
                .WithMany(tr => tr.SubmissionSnapshots)
                .HasForeignKey(s => s.TrainingReportId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure One-to-Many relationship for User and LogbookEntries
            modelBuilder.Entity<LogbookEntry>()
                .HasOne(l => l.Student)
                .WithMany(u => u.LogbookEntries)
                .HasForeignKey(l => l.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LogbookEntry>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(l => l.SupervisorApprovedByUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<LogbookWeeklyApproval>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LogbookWeeklyApproval>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<LogbookWeeklyApproval>()
                .HasIndex(a => new { a.StudentId, a.WeekStartUtc })
                .IsUnique();

            // Configure One-to-Many relationship for User and Notifications
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StaffRoleDefinition>()
                .HasIndex(r => r.Key)
                .IsUnique();
        }
    }
}
