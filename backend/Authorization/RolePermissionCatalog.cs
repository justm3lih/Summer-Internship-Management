using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;

namespace InternshipManagement.API.Authorization
{
    /// <summary>Rol için atanabilecek izin anahtarlarının üst kümesini döner.</summary>
    public static class RolePermissionCatalog
    {
        public static async Task<string[]> GetAllowedPermissionKeysAsync(
            string role,
            AppDbContext db,
            CancellationToken cancellationToken = default)
        {
            if (role == "admin")
                return System.Array.Empty<string>();
            if (role == "coordinator")
                return Permissions.CoordinatorAll;
            if (role == "company")
                return Permissions.CompanyAll;
            if (role == "advisor")
                return System.Array.Empty<string>();
            if (await db.StaffRoleDefinitions.AsNoTracking()
                    .AnyAsync(r => r.Key == role, cancellationToken))
                return Permissions.CoordinatorAll;
            return System.Array.Empty<string>();
        }
    }
}
