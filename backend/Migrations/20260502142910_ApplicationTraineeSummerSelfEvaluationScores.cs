using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationTraineeSummerSelfEvaluationScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval1",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval10",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval11",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval12",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval2",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval3",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval4",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval5",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval6",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval7",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval8",
                table: "Applications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TraineeSummerSelfEval9",
                table: "Applications",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval1",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval10",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval11",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval12",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval2",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval3",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval4",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval5",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval6",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval7",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval8",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeSummerSelfEval9",
                table: "Applications");
        }
    }
}
