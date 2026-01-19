import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def get_code_files(directory, excluded_files=None, excluded_dirs=None):
    """Fetch all JS/JSX project files excluding sensitive configuration files."""
    if excluded_files is None:
        # Excluded files - including all .env variants and lock files
        excluded_files = {
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            ".DS_Store",
            "Thumbs.db",
            "Desktop.ini",
            # All .env files
            ".env",
            ".env.development",
            ".env.production",
            ".env.local",
            ".env.staging",
            ".env.test",
            ".env.example",
            # Sensitive JS files
            "generate-cookie-secret.js",
        }

    if excluded_dirs is None:
        excluded_dirs = {
            "node_modules",
            ".git",
            "__pycache__",
            "build",
            "dist",
            ".next",
            "coverage",
            ".nyc_output",
            "logs",
            "uploads",  # Contains user-uploaded files
            "images",  # Contains image assets
            "HackStack",  # Excluded as per structure
            "public",  # Contains only static assets
        }

    backend_files = {}
    frontend_files = {}

    # Define JS/JSX file extensions we want to include
    js_extensions = {".js", ".jsx"}

    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs]

        # Skip if current directory is an excluded directory
        if any(excluded_dir in root.split(os.sep) for excluded_dir in excluded_dirs):
            continue

        for file in files:
            # Skip excluded files
            if file in excluded_files:
                continue

            # Additional check for any file containing .env pattern
            if ".env" in file:
                continue

            file_path = os.path.join(root, file)

            # Get file extension
            _, ext = os.path.splitext(file)

            # Only include JS/JSX files
            if ext.lower() in js_extensions:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.readlines()

                        # Categorize as backend or frontend
                        if "backend" + os.sep in file_path:
                            backend_files[file_path] = content
                        else:
                            frontend_files[file_path] = content

                except Exception as e:
                    print(f"❌ Error reading {file_path}: {e}")
                    if "backend" + os.sep in file_path:
                        backend_files[file_path] = [f"[Error reading file: {str(e)}]"]
                    else:
                        frontend_files[file_path] = [f"[Error reading file: {str(e)}]"]

    return backend_files, frontend_files


def create_pdf(code_data, output_pdf="Code_Export.pdf", pdf_type="Backend"):
    c = canvas.Canvas(output_pdf, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    line_height = 10
    y = height - margin

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, f"📁 Project - {pdf_type} Code Export")
    y -= 2 * line_height
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, f"📁 {pdf_type} JavaScript/JSX Files:")
    y -= 2 * line_height

    file_paths = sorted(list(code_data.keys()))

    # 1. File list with structure
    c.setFont("Courier", 8)

    for path in file_paths:
        if y < margin:
            c.showPage()
            c.setFont("Courier", 8)
            y = height - margin

        display_path = os.path.relpath(path)
        file_type = "[JSX]" if path.endswith(".jsx") else "[JS]"
        c.drawString(margin, y, f"  {file_type} {display_path}")
        y -= line_height

    # Add page break before code content
    c.showPage()
    y = height - margin

    # 2. File contents
    for file_path in file_paths:
        lines = code_data[file_path]
        print(f"📄 Adding: {file_path}")

        if y < margin + 3 * line_height:
            c.showPage()
            y = height - margin

        # File header
        rel_path = os.path.relpath(file_path)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, y, f"📄 File: {rel_path}")
        y -= line_height

        # Add separator line
        c.setFont("Courier", 8)
        c.drawString(margin, y, "=" * 80)
        y -= line_height

        # File content with line numbers
        for line_num, line in enumerate(lines, 1):
            if y < margin:
                c.showPage()
                c.setFont("Courier", 8)
                y = height - margin

            # Clean and truncate line
            line = line.strip("\n").encode("latin-1", "replace").decode("latin-1")

            # Add line numbers for all files
            display_line = f"{line_num:3d}: {line[:280]}"

            c.drawString(margin, y, display_line)
            y -= line_height

        # Add spacing between files
        y -= line_height
        if y > margin:
            c.setFont("Courier", 8)
            c.drawString(margin, y, "-" * 80)
            y -= 2 * line_height

    c.save()
    print(f"✅ PDF successfully created: {output_pdf}")
    print(f"📊 Total files processed: {len(code_data)}")

    # Print file type breakdown
    js_count = sum(1 for f in code_data.keys() if f.endswith(".js"))
    jsx_count = sum(1 for f in code_data.keys() if f.endswith(".jsx"))

    print(f"   - JavaScript files: {js_count}")
    print(f"   - JSX files: {jsx_count}")


def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))

    # Excluded files
    excluded_files = {
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        ".DS_Store",
        "Thumbs.db",
        "Desktop.ini",
        # All .env files
        ".env",
        ".env.development",
        ".env.production",
        ".env.local",
        ".env.staging",
        ".env.test",
        ".env.example",
        # Sensitive JS files
        "generate-cookie-secret.js",
    }

    # Directories to exclude
    excluded_dirs = {
        "node_modules",
        ".git",
        "__pycache__",
        "build",
        "dist",
        ".next",
        "coverage",
        ".nyc_output",
        "logs",
        "uploads",
        "images",
        "HackStack",
        "public",
    }

    print("🔍 Scanning for JS/JSX files...")
    print("🔒 Excluded: .env files, logs, uploads, images, public assets")
    print("=" * 60)

    backend_files, frontend_files = get_code_files(
        root_dir, excluded_files, excluded_dirs
    )

    if not backend_files and not frontend_files:
        print("❌ No JS/JSX files found to process!")
        return

    print(
        f"\n📁 Found {len(backend_files)} backend files and {len(frontend_files)} frontend files"
    )

    # Show backend files
    if backend_files:
        print("\n📋 Backend Files to be included:")
        for file_path in sorted(backend_files.keys()):
            print(f"   📄 {os.path.relpath(file_path)}")

    # Show frontend files
    if frontend_files:
        print("\n📋 Frontend Files to be included:")
        for file_path in sorted(frontend_files.keys()):
            print(f"   📄 {os.path.relpath(file_path)}")

    print("\n" + "=" * 60)

    # Create Backend PDF
    if backend_files:
        print("\n📝 Generating Backend PDF...")
        create_pdf(backend_files, "Backend_Code_Export.pdf", "Backend")
        print()

    # Create Frontend PDF
    if frontend_files:
        print("📝 Generating Frontend PDF...")
        create_pdf(frontend_files, "Frontend_Code_Export.pdf", "Frontend")

    print("\n" + "=" * 60)
    print("✅ All PDFs generated successfully!")
    print(f"   📄 Backend_Code_Export.pdf ({len(backend_files)} files)")
    print(f"   📄 Frontend_Code_Export.pdf ({len(frontend_files)} files)")


if __name__ == "__main__":
    main()
