using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services
{
    /// <summary>
    /// Koordinatör API ve Next koordinatör layout'una erişebilen rolleri belirler (coordinator + tanımlı özel roller).
    /// </summary>
    public interface ICoordinatorPortalRoleService
    {
        Task<bool> IsCoordinatorPortalRoleAsync(string role, CancellationToken cancellationToken = default);

        Task<bool> IsCoordinatorPortalUserAsync(User user, CancellationToken cancellationToken = default);
    }

    public class CoordinatorPortalRoleService : ICoordinatorPortalRoleService
    {
        private readonly AppDbContext _db;

        public CoordinatorPortalRoleService(AppDbContext db)
        {
            _db = db;
        }

        public Task<bool> IsCoordinatorPortalRoleAsync(string role, CancellationToken cancellationToken = default)
        {
            if (role == "coordinator")
                return Task.FromResult(true);
            if (role == "student" || role == "company" || role == "admin")
                return Task.FromResult(false);

            return _db.StaffRoleDefinitions.AsNoTracking()
                .AnyAsync(r => r.Key == role, cancellationToken);
        }

        public Task<bool> IsCoordinatorPortalUserAsync(User user, CancellationToken cancellationToken = default)
            => IsCoordinatorPortalRoleAsync(user.Role, cancellationToken);
    }
}
