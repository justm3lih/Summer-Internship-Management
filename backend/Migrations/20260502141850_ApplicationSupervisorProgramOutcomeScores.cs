using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationSupervisorProgramOutcomeScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo1",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo10",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo11",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo2",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo3",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo4",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo5",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo6",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo7",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo8",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupervisorEvalPo9",
                table: "Applications",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo1",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo10",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo11",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo2",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo3",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo4",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo5",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo6",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo7",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo8",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvalPo9",
                table: "Applications");
        }
    }
}
