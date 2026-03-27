using UglyToad.PdfPig;
using System.Text;

namespace InternshipManagement.API.Services.Transcript;

public class TranscriptPdfParser
{
    public string ExtractText(string pdfPath)
    {
        var text = new StringBuilder();

        using (var document = PdfDocument.Open(pdfPath))
        {
            foreach (var page in document.GetPages())
            {
                text.AppendLine(page.Text);
            }
        }

        return text.ToString();
    }
}