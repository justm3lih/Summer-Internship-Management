using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationSupervisorLogbookClosingNarratives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SupervisorOverallPerformanceObservations",
                table: "Applications",
                type: "character varying(8000)",
                maxLength: 8000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorSuggestionsToUniversityAboutTrainee",
                table: "Applications",
                type: "character varying(8000)",
                maxLength: 8000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SupervisorOverallPerformanceObservations",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorSuggestionsToUniversityAboutTrainee",
                table: "Applications");
        }
    }
}
