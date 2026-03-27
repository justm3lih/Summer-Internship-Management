using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTranscriptEligibilityToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EligibilityStatus",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PassedThirdYearCourses",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequiredThirdYearCourses",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TranscriptVerifiedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EligibilityStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PassedThirdYearCourses",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RequiredThirdYearCourses",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TranscriptVerifiedAt",
                table: "Users");
        }
    }
}
