"""
Project builder — scaffolds project folders and writes code files
extracted from Qwen CLI output.
"""

import os
import re

from qwen_runner import run_qwen

# Place generated_projects OUTSIDE orchestrator/ so uvicorn's reloader doesn't watch it
_BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_projects")


def extract_code_blocks(output: str) -> list[tuple[str, str]]:
    """
    Extract code blocks from Qwen output.

    Expected format:
        ```filename
        code here
        ```

    Returns a list of (filename, code_content) tuples.
    """
    pattern = r"```(\S+)\n([\s\S]*?)```"
    matches = re.findall(pattern, output)

    results = []
    for filename, content in matches:
        # Skip language-only labels that aren't filenames
        if filename in (
            "json", "python", "javascript", "typescript", "html", "css",
            "bash", "sh", "yaml", "yml", "xml", "sql", "markdown", "md",
            "jsx", "tsx", "text", "plaintext", "diff", "dockerfile",
        ):
            continue
        results.append((filename.strip(), content.strip()))

    return results


def _write_files(directory: str, code_blocks: list[tuple[str, str]]) -> list[str]:
    """Write extracted code blocks into the given directory. Returns list of created paths."""
    created = []
    for filename, content in code_blocks:
        filepath = os.path.join(directory, filename)
        # Create any subdirectories the filename may reference (e.g., src/App.jsx)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content + "\n")
        created.append(filepath)
    return created


def build_project(
    project_name: str,
    frontend_prompt: str,
    backend_prompt: str,
) -> str:
    """
    Scaffold a full project:
      1. Create generated_projects/<project_name>/frontend/ and backend/
      2. Run Qwen with frontend_prompt → write files to frontend/
      3. Run Qwen with backend_prompt  → write files to backend/

    Returns the absolute path to the project root.
    """
    project_dir = os.path.join(_BASE_DIR, project_name)
    frontend_dir = os.path.join(project_dir, "frontend")
    backend_dir = os.path.join(project_dir, "backend")

    os.makedirs(frontend_dir, exist_ok=True)
    os.makedirs(backend_dir, exist_ok=True)

    # ── Frontend ──────────────────────────────────────────────
    print(f"🤖 Running Qwen for frontend of '{project_name}'...")
    frontend_output = run_qwen(frontend_prompt, cwd=frontend_dir)
    frontend_blocks = extract_code_blocks(frontend_output)

    if frontend_blocks:
        _write_files(frontend_dir, frontend_blocks)
        print(f"   ✅ {len(frontend_blocks)} frontend file(s) written")
    else:
        # If no parseable code blocks, save raw output
        raw_path = os.path.join(frontend_dir, "qwen_output.txt")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(frontend_output)
        print("   ⚠️ No code blocks found — raw output saved to qwen_output.txt")

    # ── Backend ───────────────────────────────────────────────
    print(f"🤖 Running Qwen for backend of '{project_name}'...")
    backend_output = run_qwen(backend_prompt, cwd=backend_dir)
    backend_blocks = extract_code_blocks(backend_output)

    if backend_blocks:
        _write_files(backend_dir, backend_blocks)
        print(f"   ✅ {len(backend_blocks)} backend file(s) written")
    else:
        raw_path = os.path.join(backend_dir, "qwen_output.txt")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(backend_output)
        print("   ⚠️ No code blocks found — raw output saved to qwen_output.txt")

    return project_dir
