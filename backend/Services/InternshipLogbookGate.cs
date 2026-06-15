using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// Staj yerleşimi onaylandıktan sonra imzalı acceptance letter koordinatör tarafından doğrulanmadan logbook kullanılamaz.
/// Birden fazla aktif başvuru varsa öğrenci günlüğü için yeterlilik: herhangi birinde doğrulama (LogbookController / ExportController AnyAsync).
/// </summary>
public static class InternshipLogbookGate
{
    public static bool PlacementStatusAllowsLogbook(string status) =>
        status == "approved" || status == "ongoing" || status == "completed";

    /// <summary>
    /// Tek başvuru satırı için (eski çağrılar).
    /// </summary>
    public static bool StudentCanUseLogbook(Application a) =>
        PlacementStatusAllowsLogbook(a.Status) && a.AcceptanceLetterVerifiedAt.HasValue;
}
