using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLogbookWorkflowTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LogbookSubmittedToSupervisorAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LogbookVerifiedByCoordinatorAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SupervisorEvaluationCompletedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogbookSubmittedToSupervisorAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "LogbookVerifiedByCoordinatorAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorEvaluationCompletedAt",
                table: "Applications");
        }
    }
}
