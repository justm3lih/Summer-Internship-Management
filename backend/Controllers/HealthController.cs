using Microsoft.AspNetCore.Mvc;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { status = "ok", message = "API is running" });
        }
    }
}
