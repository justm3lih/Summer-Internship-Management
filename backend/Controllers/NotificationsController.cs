using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;

        public NotificationsController(AppDbContext db)
        {
            _db = db;
        }

        // Aktif kullanıcıya ait bildirimleri döndür
        [HttpGet("my")]
        public async Task<IActionResult> GetMyNotifications(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var notifications = await _db.Notifications
                .AsNoTracking()
                .Where(notification => notification.UserId == currentUser.Id)
                .OrderByDescending(notification => notification.CreatedAt)
                .ToListAsync(cancellationToken);

            return Ok(notifications.Select(ToNotificationResponse));
        }

        // Tek bildirimi okundu yap
        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var notification = await _db.Notifications
                .FirstOrDefaultAsync(
                    item => item.Id == id && item.UserId == currentUser.Id,
                    cancellationToken);

            if (notification == null)
                return NotFound(new { message = "Notification not found." });

            notification.IsRead = true;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ToNotificationResponse(notification));
        }

        // Kullanıcının tüm bildirimlerini okundu yap
        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var notifications = await _db.Notifications
                .Where(notification => notification.UserId == currentUser.Id && !notification.IsRead)
                .ToListAsync(cancellationToken);

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "All notifications marked as read." });
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }

        private static object ToNotificationResponse(Notification notification)
        {
            return new
            {
                id = notification.Id,
                title = notification.Title,
                message = notification.Message,
                type = notification.Type,
                read = notification.IsRead,
                date = notification.CreatedAt,
                relatedEntityType = notification.RelatedEntityType,
                relatedEntityId = notification.RelatedEntityId
            };
        }
    }
}
