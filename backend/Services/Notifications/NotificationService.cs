using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.API.Services.Notifications;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Notification> CreateNotificationAsync(
        string userId,
        string title,
        string message,
        string type,
        string? relatedEntityType = null,
        string? relatedEntityId = null,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(cancellationToken);

        return notification;
    }

    public async Task CreateNotificationsForRoleAsync(
        string role,
        string title,
        string message,
        string type,
        string? relatedEntityType = null,
        string? relatedEntityId = null,
        CancellationToken cancellationToken = default)
    {
        List<string> userIds;
        if (role == "coordinator")
        {
            // Koordinatör portalı: coordinator + admin tanımlı özel personel rolleri (advisor vb.)
            var customPortalKeys = await _db.StaffRoleDefinitions.AsNoTracking()
                .Select(r => r.Key)
                .ToListAsync(cancellationToken);

            userIds = await _db.Users.AsNoTracking()
                .Where(u => u.Role == "coordinator" || customPortalKeys.Contains(u.Role))
                .Select(u => u.Id)
                .Distinct()
                .ToListAsync(cancellationToken);
        }
        else
        {
            userIds = await _db.Users.AsNoTracking()
                .Where(user => user.Role == role)
                .Select(user => user.Id)
                .ToListAsync(cancellationToken);
        }

        if (userIds.Count == 0)
            return;

        var notifications = userIds.Select(userId => new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            CreatedAt = DateTime.UtcNow
        });

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
