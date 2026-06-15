using System.Net.Http.Json;
using System.Text.Json;

namespace InternshipManagement.API.Services.Ai;

public class GeminiOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-2.5-flash";
}

public class GeminiService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = new GeminiOptions();
        configuration.GetSection("Gemini").Bind(_options);
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.ApiKey);

    // Gemini'ye system instruction + kullanıcı sorusunu gönderir, metin yanıtını döner
    public async Task<string> GenerateAnswerAsync(
        string systemInstruction,
        string userMessage,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Gemini API key is not configured.");

        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        var payload = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = systemInstruction } }
            },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userMessage } }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                maxOutputTokens = 1024
            }
        };

        HttpResponseMessage response = null!;
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                break;
            }

            if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable || 
                (int)response.StatusCode == 429)
            {
                if (attempt < maxRetries)
                {
                    var delay = attempt * 1000;
                    _logger.LogWarning("Gemini API returned {StatusCode}. Retrying in {Delay}ms (Attempt {Attempt} of {MaxRetries})...", 
                        response.StatusCode, delay, attempt, maxRetries);
                    response.Dispose();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }
            }

            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Gemini API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"Gemini API error ({(int)response.StatusCode}).");
        }

        using (response)
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            if (!doc.RootElement.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
            {
                return string.Empty;
            }

            var firstCandidate = candidates[0];
            if (!firstCandidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
            {
                return string.Empty;
            }

            var resultBuilder = new System.Text.StringBuilder();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement) &&
                    textElement.ValueKind == JsonValueKind.String)
                {
                    resultBuilder.AppendLine(textElement.GetString());
                }
            }

            return resultBuilder.ToString().Trim();
        }
    }
}
