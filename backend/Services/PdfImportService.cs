using System.Text;
using UglyToad.PdfPig;

namespace InternshipManagement.API.Services;

// PDF dosyalarından metin çıkarıp KB için uygun parçalara ayırır
public class PdfImportService
{
    // Hedef parça boyutu (karakter cinsinden) - Gemini context'ine kolay sığsın
    private const int TargetChunkSize = 1500;
    // Bir parça en fazla bu kadar büyüyebilir (paragraf bütünlüğü korunsun diye esnek)
    private const int MaxChunkSize = 2200;

    public List<PdfChunk> ExtractChunks(Stream pdfStream)
    {
        if (pdfStream == null) throw new ArgumentNullException(nameof(pdfStream));

        var pageTexts = new List<string>();
        using (var document = PdfDocument.Open(pdfStream))
        {
            foreach (var page in document.GetPages())
            {
                var rawText = page.Text ?? string.Empty;
                pageTexts.Add(NormalizeWhitespace(rawText));
            }
        }

        var fullText = string.Join("\n\n", pageTexts.Where(t => !string.IsNullOrWhiteSpace(t)));
        return ChunkText(fullText);
    }

    private static List<PdfChunk> ChunkText(string text)
    {
        var chunks = new List<PdfChunk>();
        if (string.IsNullOrWhiteSpace(text)) return chunks;

        // Paragrafları çift newline'a göre ayır
        var paragraphs = text.Split(new[] { "\n\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToList();

        var currentBuilder = new StringBuilder();

        foreach (var paragraph in paragraphs)
        {
            // Paragrafın kendisi çok büyükse cümlelere böl
            var pieces = paragraph.Length > MaxChunkSize
                ? SplitIntoSentences(paragraph)
                : new List<string> { paragraph };

            foreach (var piece in pieces)
            {
                if (currentBuilder.Length == 0)
                {
                    currentBuilder.Append(piece);
                    continue;
                }

                var prospectiveLength = currentBuilder.Length + 2 + piece.Length;
                if (prospectiveLength <= MaxChunkSize &&
                    (currentBuilder.Length < TargetChunkSize || prospectiveLength <= TargetChunkSize))
                {
                    currentBuilder.Append("\n\n").Append(piece);
                }
                else
                {
                    chunks.Add(BuildChunk(currentBuilder.ToString(), chunks.Count + 1));
                    currentBuilder.Clear();
                    currentBuilder.Append(piece);
                }
            }
        }

        if (currentBuilder.Length > 0)
        {
            chunks.Add(BuildChunk(currentBuilder.ToString(), chunks.Count + 1));
        }

        return chunks;
    }

    private static PdfChunk BuildChunk(string content, int partNumber)
    {
        var trimmed = content.Trim();
        var headline = ExtractHeadline(trimmed);
        return new PdfChunk
        {
            PartNumber = partNumber,
            Headline = headline,
            Content = trimmed
        };
    }

    // Parçanın ilk satırını başlık adayı olarak alır (kısa ve anlamlıysa)
    private static string? ExtractHeadline(string content)
    {
        var firstLine = content
            .Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault()
            ?.Trim();

        if (string.IsNullOrWhiteSpace(firstLine)) return null;
        if (firstLine.Length > 80) return null;
        if (firstLine.Length < 4) return null;

        return firstLine;
    }

    private static List<string> SplitIntoSentences(string paragraph)
    {
        var sentences = new List<string>();
        var current = new StringBuilder();

        foreach (var ch in paragraph)
        {
            current.Append(ch);
            if ((ch == '.' || ch == '!' || ch == '?') && current.Length >= TargetChunkSize / 2)
            {
                sentences.Add(current.ToString().Trim());
                current.Clear();
            }
        }

        if (current.Length > 0)
        {
            sentences.Add(current.ToString().Trim());
        }

        return sentences.Where(s => s.Length > 0).ToList();
    }

    private static string NormalizeWhitespace(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        // Tek newline'lar boşluğa, çift newline'lar paragraf ayracına dönüşsün
        var normalized = System.Text.RegularExpressions.Regex.Replace(input, "\r\n?", "\n");
        normalized = System.Text.RegularExpressions.Regex.Replace(normalized, "(?<!\n)\n(?!\n)", " ");
        normalized = System.Text.RegularExpressions.Regex.Replace(normalized, "[ \t]+", " ");
        normalized = System.Text.RegularExpressions.Regex.Replace(normalized, "\n{3,}", "\n\n");
        return normalized.Trim();
    }
}

public class PdfChunk
{
    public int PartNumber { get; set; }
    public string? Headline { get; set; }
    public string Content { get; set; } = string.Empty;
}
