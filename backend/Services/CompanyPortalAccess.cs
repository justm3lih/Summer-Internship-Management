using InternshipManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Services;

/// <summary>
/// Şirket ana hesabı (primary) ve alt kullanıcılar (staff) için veri erişim kuralları.
/// </summary>
public static class CompanyPortalAccess
{
    public const string TierPrimary = "primary";
    public const string TierStaff = "staff";

    public static bool IsCompanyUser(User u) => u.Role == "company";

    public static bool IsCompanyPrimary(User u) =>
        IsCompanyUser(u) &&
        (string.IsNullOrEmpty(u.CompanyMembershipTier) ||
         string.Equals(u.CompanyMembershipTier, TierPrimary, StringComparison.OrdinalIgnoreCase));

    public static bool IsCompanyStaff(User u) =>
        IsCompanyUser(u) &&
        string.Equals(u.CompanyMembershipTier, TierStaff, StringComparison.OrdinalIgnoreCase);

    public static IQueryable<Application> FilterApplicationsForCompanyUser(
        IQueryable<Application> query,
        User u)
    {
        if (!IsCompanyUser(u) || string.IsNullOrEmpty(u.CompanyId))
            return query.Where(_ => false);

        query = query.Where(a => a.CompanyId == u.CompanyId);
        if (IsCompanyPrimary(u))
            return query;

        return query.Where(a => a.CompanySupervisorUserId == u.Id);
    }

    public static bool CompanyUserCanAccessApplication(User u, Application app)
    {
        if (!IsCompanyUser(u) || string.IsNullOrEmpty(u.CompanyId) || app.CompanyId != u.CompanyId)
            return false;
        if (IsCompanyPrimary(u))
            return true;

        return app.CompanySupervisorUserId == u.Id;
    }
}
