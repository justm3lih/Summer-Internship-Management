using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services.Ai;

namespace InternshipManagement.API.Controllers
{
    // Knowledge base destekli AI chat. Gemini'yi RAG (retrieval-augmented generation) ile besler.
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private const int MaxQuestionLength = 1000;
        private const int MaxKbEntriesInContext = 6;

        private readonly AppDbContext _db;
        private readonly GeminiService _gemini;
        private readonly ILogger<ChatController> _logger;

        public ChatController(AppDbContext db, GeminiService gemini, ILogger<ChatController> logger)
        {
            _db = db;
            _gemini = gemini;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Ask(
            [FromBody] ChatRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (request == null || string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { message = "Message is required." });

            if (request.Message.Length > MaxQuestionLength)
                return BadRequest(new { message = $"Message is too long (max {MaxQuestionLength} characters)." });

            if (!_gemini.IsConfigured)
            {
                return StatusCode(503, new
                {
                    message = "AI assistant is not configured. Please contact the administrator."
                });
            }

            var question = request.Message.Trim();

            // Basit retrieval: KB içinde anahtar kelimelerle eşleşen kayıtları puanla
            var relevantEntries = await FetchRelevantKnowledgeAsync(question, cancellationToken);

            Application? studentApp = null;
            int totalLogbookDays = 0;
            int approvedLogbookDays = 0;
            TrainingReport? report = null;

            if (currentUser.Role == "student")
            {
                studentApp = await _db.Applications
                    .Include(a => a.Company)
                    .FirstOrDefaultAsync(a => a.StudentId == currentUser.Id, cancellationToken);

                totalLogbookDays = await _db.LogbookEntries
                    .CountAsync(e => e.StudentId == currentUser.Id, cancellationToken);

                approvedLogbookDays = await _db.LogbookEntries
                    .CountAsync(e => e.StudentId == currentUser.Id && e.SupervisorApprovedAt != null, cancellationToken);

                if (studentApp != null)
                {
                    report = await _db.TrainingReports
                        .FirstOrDefaultAsync(r => r.ApplicationId == studentApp.Id, cancellationToken);
                }
            }

            var systemInstruction = BuildSystemInstruction(
                currentUser, 
                relevantEntries, 
                studentApp, 
                totalLogbookDays, 
                approvedLogbookDays, 
                report);

            try
            {
                var answer = await _gemini.GenerateAnswerAsync(systemInstruction, question, cancellationToken);

                if (string.IsNullOrWhiteSpace(answer))
                {
                    answer = "I could not generate an answer right now. Please try rephrasing your question.";
                }

                return Ok(new
                {
                    answer,
                    sources = relevantEntries.Select(entry => new
                    {
                        id = entry.Id,
                        title = entry.Title,
                        category = entry.Category
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini chat call failed");
                return StatusCode(502, new { message = "AI assistant is temporarily unavailable. Please try again." });
            }
        }

        private async Task<List<KnowledgeBaseEntry>> FetchRelevantKnowledgeAsync(
            string question,
            CancellationToken cancellationToken)
        {
            var allEntries = await _db.KnowledgeBaseEntries
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            if (allEntries.Count == 0) return new List<KnowledgeBaseEntry>();

            var keywords = ExtractKeywords(question);
            if (keywords.Count == 0)
            {
                // Hiçbir anahtar kelime yoksa en yeni birkaç kaydı bağlam olarak ver
                return allEntries
                    .OrderByDescending(entry => entry.UpdatedAt)
                    .Take(MaxKbEntriesInContext)
                    .ToList();
            }

            var scored = allEntries
                .Select(entry => new
                {
                    Entry = entry,
                    Score = ScoreEntry(entry, keywords)
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Entry.UpdatedAt)
                .Take(MaxKbEntriesInContext)
                .Select(x => x.Entry)
                .ToList();

            // Hiç eşleşme yoksa en azından son güncellenenleri ekle
            if (scored.Count == 0)
            {
                scored = allEntries
                    .OrderByDescending(entry => entry.UpdatedAt)
                    .Take(MaxKbEntriesInContext)
                    .ToList();
            }

            return scored;
        }

        private static List<string> ExtractKeywords(string question)
        {
            var lowered = question.ToLowerInvariant();
            var tokens = System.Text.RegularExpressions.Regex
                .Split(lowered, "[^\\p{L}0-9]+")
                .Where(token => token.Length >= 3)
                .Distinct()
                .ToList();

            // Çok yaygın kelimeleri ele
            var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "the", "and", "for", "with", "are", "you", "how", "what", "when", "where", "why",
                "can", "could", "should", "would", "this", "that", "these", "those", "from", "into",
                "have", "has", "had", "will", "was", "were", "but", "not", "who",
                "ben", "sen", "biz", "siz", "bir", "ile", "veya", "ama", "için", "nedir",
                "nasıl", "nerede", "ne", "neden", "kim", "kimi", "var", "yok", "olur",
                "olarak", "gibi", "kadar", "şey", "bu", "şu", "diğer", "tüm", "hangi"
            };

            return tokens.Where(token => !stopWords.Contains(token)).ToList();
        }

        private static int ScoreEntry(KnowledgeBaseEntry entry, IEnumerable<string> keywords)
        {
            var titleLower = entry.Title.ToLowerInvariant();
            var contentLower = entry.Content.ToLowerInvariant();
            var categoryLower = entry.Category.ToLowerInvariant();

            int score = 0;
            foreach (var keyword in keywords)
            {
                if (titleLower.Contains(keyword)) score += 5;
                if (categoryLower.Contains(keyword)) score += 2;
                if (contentLower.Contains(keyword)) score += 1;
            }
            return score;
        }

        private static string BuildSystemInstruction(
            User user, 
            List<KnowledgeBaseEntry> entries,
            Application? app,
            int totalLogbookDays,
            int approvedLogbookDays,
            TrainingReport? report)
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("You are a friendly AI assistant for the Internship Management System.");
            sb.AppendLine("Answer the user's question concisely and accurately.");
            sb.AppendLine("Use the knowledge base entries below as your primary source of truth.");
            sb.AppendLine("If the answer is not in the knowledge base, say so politely and give general guidance only when safe.");
            sb.AppendLine("CRITICAL: Reply in the same language the user used (Turkish or English). Never reply in Turkish if the user's question is in English, and vice versa.");
            sb.AppendLine();
            sb.AppendLine($"User role: {user.Role}");
            if (!string.IsNullOrWhiteSpace(user.Name))
                sb.AppendLine($"User name: {user.Name}");

            if (user.Role == "student")
            {
                sb.AppendLine();
                sb.AppendLine("---");
                sb.AppendLine("ACTIVE STUDENT INTERNSHIP DATABASE STATUS:");
                sb.AppendLine($"Student Name: {user.Name}");
                sb.AppendLine($"Student ID: {user.StudentId ?? user.Id}");
                sb.AppendLine($"Department: {user.Department ?? "N/A"}");
                sb.AppendLine($"Current Semester: {user.CurrentSemester?.ToString() ?? "N/A"}");
                sb.AppendLine($"Eligibility: {user.EligibilityStatus ?? "N/A"}");
                sb.AppendLine($"CGPA: {user.Cgpa?.ToString() ?? "N/A"}");

                if (app == null)
                {
                    sb.AppendLine("Internship Application: No active internship application registered in the database.");
                }
                else
                {
                    sb.AppendLine("Internship Application Details:");
                    sb.AppendLine($"- Application/Placement Status: {app.Status} (Options: not_applied, pending, approved, rejected, ongoing, completed)");
                    sb.AppendLine($"- Company: {app.Company?.Name ?? "N/A"}");
                    sb.AppendLine($"- Start Date: {app.InternshipStartDate?.ToString("yyyy-MM-dd") ?? "N/A"}");
                    sb.AppendLine($"- End Date: {app.InternshipEndDate?.ToString("yyyy-MM-dd") ?? "N/A"}");
                    sb.AppendLine($"- Acceptance Letter Uploaded: {(app.AcceptanceLetterSubmittedAt != null ? "Yes" : "No")}");
                    sb.AppendLine($"- Acceptance Letter Verified by Coordinator: {(app.AcceptanceLetterVerifiedAt != null ? "Yes" : "No")}");
                    sb.AppendLine($"- Logbook Verified by Coordinator: {(app.LogbookVerifiedByCoordinatorAt != null ? "Yes" : "No")}");
                    if (!string.IsNullOrWhiteSpace(app.AcceptanceLetterCoordinatorComments))
                    {
                        sb.AppendLine($"- Acceptance Letter Coordinator Comments: {app.AcceptanceLetterCoordinatorComments}");
                    }
                    if (!string.IsNullOrWhiteSpace(app.CoordinatorComments))
                    {
                        sb.AppendLine($"- General Coordinator Comments: {app.CoordinatorComments}");
                    }
                }

                sb.AppendLine("Daily Logbook Stats:");
                sb.AppendLine($"- Total Days Logged/Filled: {totalLogbookDays} days");
                sb.AppendLine($"- Days Approved by Company Supervisor: {approvedLogbookDays} days");
                sb.AppendLine($"- Days Remaining (out of 30 working days required): {Math.Max(0, 30 - totalLogbookDays)} days");

                if (report == null)
                {
                    sb.AppendLine("Training Report: No training report submitted/created yet.");
                }
                else
                {
                    sb.AppendLine("Training Report Details:");
                    sb.AppendLine($"- Report Status: {report.Status} (Options: draft, submitted, revision_requested, approved)");
                    sb.AppendLine($"- Submitted At: {report.SubmittedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"}");
                    sb.AppendLine($"- Approved At: {report.ApprovedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A"}");
                    if (!string.IsNullOrWhiteSpace(report.CoordinatorFeedback))
                    {
                        sb.AppendLine($"- Coordinator Feedback: {report.CoordinatorFeedback}");
                    }
                }
                sb.AppendLine("---");
                sb.AppendLine();
                sb.AppendLine("INSTRUCTIONS FOR ANSWERING PERSONAL QUESTIONS:");
                sb.AppendLine("1. Since you have access to the above student's live database record, you MUST answer personal questions using the exact data provided above (e.g., questions like 'stajım ne durumda?' / 'what is the status of my internship?', 'kaç günüm kaldı?' / 'how many days do I have left?', etc.).");
                sb.AppendLine("2. When answering these questions, explicitly let the student know their exact placement status, dates, how many days they have completed/approved, and how many working days remain out of the 30 required working days. Be warm, professional, and precise.");
                sb.AppendLine("3. CRITICAL: You must answer in the EXACT SAME language as the user's question. If the user asks in English, reply in English. If the user asks in Turkish, reply in Turkish. Do not translate the response to Turkish if the user asked in English.");
            }

            sb.AppendLine();
            sb.AppendLine("---");
            sb.AppendLine("KNOWLEDGE BASE");
            sb.AppendLine("---");

            if (entries.Count == 0)
            {
                sb.AppendLine("(no entries available)");
            }
            else
            {
                foreach (var entry in entries)
                {
                    sb.AppendLine($"### {entry.Title} [{entry.Category}]");
                    sb.AppendLine(entry.Content);
                    sb.AppendLine();
                }
            }

            return sb.ToString();
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
    }
}
