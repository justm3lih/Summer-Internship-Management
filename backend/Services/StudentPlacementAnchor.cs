using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// Öğrenci başvuru listesi için yerleşim “ankoru” ve SWEN300 rapor eşiği — Dashboard ve TrainingReports aynı kuralları kullanır.
/// </summary>
public static class StudentPlacementAnchor
{
    public static string Norm(string? s) => (s ?? string.Empty).Trim();

    public static bool IsActivePlacementStatus(string? status)
    {
        var n = Norm(status);
        return string.Equals(n, "approved", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(n, "ongoing", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(n, "completed", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsCompletedPlacementStatus(Application a) =>
        string.Equals(Norm(a?.Status), "completed", StringComparison.OrdinalIgnoreCase) ||
        (a != null && a.LogbookVerifiedByCoordinatorAt.HasValue);

    /// <summary>Başvurular <see cref="Application.AppliedDate"/> azalan sırada olmalı.</summary>
    public static Application? ResolvePlacementAnchor(IReadOnlyList<Application> applicationsDescendingDate)
    {
        if (applicationsDescendingDate.Count == 0)
            return null;
        var latestActive = applicationsDescendingDate.FirstOrDefault(a => IsActivePlacementStatus(a.Status));
        return latestActive ?? applicationsDescendingDate[0];
    }

    public static Application? ResolveCompletedApplicationForTrainingReport(
        IReadOnlyList<Application> applicationsDescendingDate)
    {
        var anchor = applicationsDescendingDate.FirstOrDefault(a => IsActivePlacementStatus(a.Status));
        if (anchor != null && IsCompletedPlacementStatus(anchor))
            return anchor;
        return applicationsDescendingDate.FirstOrDefault(a => IsCompletedPlacementStatus(a));
    }

    /// <summary>Öğrenci arayüzündeki status alanları için bilinen değerleri küçük harfe indirger.</summary>
    public static string CanonicalApplicationStatus(string? raw)
    {
        var n = Norm(raw);
        if (n.Length == 0)
            return "not_applied";
        if (string.Equals(n, "not_applied", StringComparison.OrdinalIgnoreCase))
            return "not_applied";
        if (string.Equals(n, "pending", StringComparison.OrdinalIgnoreCase))
            return "pending";
        if (string.Equals(n, "approved", StringComparison.OrdinalIgnoreCase))
            return "approved";
        if (string.Equals(n, "rejected", StringComparison.OrdinalIgnoreCase))
            return "rejected";
        if (string.Equals(n, "ongoing", StringComparison.OrdinalIgnoreCase))
            return "ongoing";
        if (string.Equals(n, "completed", StringComparison.OrdinalIgnoreCase))
            return "completed";
        return n.ToLowerInvariant();
    }
}
