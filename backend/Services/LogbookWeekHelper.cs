namespace InternshipManagement.API.Services;

/// <summary>Logbook haftalık onayı için Pazartesi (UTC) başlangıcı.</summary>
public static class LogbookWeekHelper
{
    /// <summary>Verilen tarihin içinde bulunduğu haftanın Pazartesi gününü UTC gece yarısı olarak döner.</summary>
    public static DateTime GetUtcWeekStartMonday(DateTime date)
    {
        var utcDate = date.Kind switch
        {
            DateTimeKind.Utc => date.Date,
            DateTimeKind.Local => date.ToUniversalTime().Date,
            _ => DateTime.SpecifyKind(date.Date, DateTimeKind.Utc)
        };

        var dow = (int)utcDate.DayOfWeek;
        var mondayOffset = (dow - (int)DayOfWeek.Monday + 7) % 7;
        var monday = utcDate.AddDays(-mondayOffset);
        return DateTime.SpecifyKind(monday, DateTimeKind.Utc);
    }
}
