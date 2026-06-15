using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AcceptanceLetterLogbookGate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcceptanceLetterCoordinatorComments",
                table: "Applications",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptanceLetterSubmittedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AcceptanceLetterUrl",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptanceLetterVerifiedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptanceLetterCoordinatorComments",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "AcceptanceLetterSubmittedAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "AcceptanceLetterUrl",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "AcceptanceLetterVerifiedAt",
                table: "Applications");
        }
    }
}
