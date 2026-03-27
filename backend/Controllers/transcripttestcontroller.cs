using Microsoft.AspNetCore.Mvc;
using InternshipManagement.API.Services.Transcript;

namespace InternshipManagement.API.Controllers
{
    // Geçici test controller'ı: PDF'ten ham metin okumayı hızlıca denemek için
    [ApiController]
    [Route("api/[controller]")]
    public class TranscriptTestController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetTranscriptText()
        {
            // Şimdilik sabit PDF yolu ile deniyoruz
            var pdfPath = @"C:\Users\kitap\Downloads\Osman Melih Çınar.pdf";

            try
            {
                var parser = new TranscriptPdfParser();
                var text = parser.ExtractText(pdfPath);

                if (string.IsNullOrWhiteSpace(text))
                    return BadRequest("PDF okundu ama anlamlı bir metin çıkmadı. Dosya taranmış olabilir.");

                return Content(text, "text/plain; charset=utf-8");
            }
            catch (Exception ex)
            {
                return BadRequest($"PDF okunurken hata oluştu: {ex.Message}");
            }
        }
    }
}
