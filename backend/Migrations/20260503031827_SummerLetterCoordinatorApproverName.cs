using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class SummerLetterCoordinatorApproverName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoordinatorApproverName",
                table: "SummerTrainingApplicationLetters",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoordinatorApproverName",
                table: "SummerTrainingApplicationLetters");
        }
    }
}
