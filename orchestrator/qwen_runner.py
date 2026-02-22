"""
Qwen CLI runner — executes the Qwen coder model via subprocess.
Supports both synchronous (blocking) and streaming (async generator) modes.

Prompts are piped via stdin to avoid Windows command-line length limits (~8192 chars).
"""

import asyncio
import os
import subprocess
import tempfile

from dotenv import load_dotenv

load_dotenv()

_QWEN_COMMAND = os.getenv("QWEN_COMMAND", "qwen")
_TIMEOUT_SECONDS = 600  # 10-minute timeout for code generation


def run_qwen(prompt: str, cwd: str = None) -> str:
    """
    Invoke Qwen CLI in YOLO (auto-approve) mode and return its stdout output.
    Writes the prompt to a temp file and pipes it via stdin to avoid
    Windows command-line length limits.

    Raises RuntimeError on subprocess failure or timeout.
    """
    # Write prompt to a temp file to avoid shell arg length limits
    prompt_file = None
    try:
        prompt_file = tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        )
        prompt_file.write(prompt)
        prompt_file.close()

        # Use: type prompt.txt | qwen --yolo
        # This pipes the prompt content via stdin
        cmd = f'type "{prompt_file.name}" | "{_QWEN_COMMAND}" --yolo'

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=_TIMEOUT_SECONDS,
            shell=True,
            cwd=cwd,
        )

        if result.returncode != 0:
            error_detail = result.stderr.strip() or "No stderr output"
            # If Qwen produced output despite non-zero exit, use it
            # (Qwen often exits with 1 due to warnings while still completing work)
            if result.stdout.strip():
                print(f"   ⚠️ Qwen exited with code {result.returncode} but produced output, continuing...")
                if error_detail and error_detail != "No stderr output":
                    print(f"   ⚠️ Qwen stderr: {error_detail[:300]}")
                return result.stdout.strip()
            raise RuntimeError(
                f"Qwen CLI exited with code {result.returncode}: {error_detail}"
            )

        output = result.stdout.strip()
        if not output:
            raise RuntimeError("Qwen CLI returned empty output")

        return output

    except FileNotFoundError:
        raise RuntimeError(
            f"Qwen CLI command '{_QWEN_COMMAND}' not found. "
            f"Ensure it is installed and QWEN_COMMAND is set correctly in .env"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"Qwen CLI timed out after {_TIMEOUT_SECONDS} seconds"
        )
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Qwen CLI execution failed: {exc}") from exc
    finally:
        # Clean up temp file
        if prompt_file and os.path.exists(prompt_file.name):
            try:
                os.unlink(prompt_file.name)
            except OSError:
                pass


async def stream_qwen(prompt: str, cwd: str = None):
    """
    Async generator — runs Qwen CLI and yields each line of output in real time.
    Yields dicts: {"type": "stdout"|"stderr"|"done"|"error", "data": "..."}
    """
    # Write prompt to temp file to avoid shell arg length limits
    prompt_file = tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    )
    prompt_file.write(prompt)
    prompt_file.close()

    cmd = f'type "{prompt_file.name}" | "{_QWEN_COMMAND}" --yolo'

    try:
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )

        async def read_stream(stream, stream_type):
            while True:
                line = await stream.readline()
                if not line:
                    break
                yield {"type": stream_type, "data": line.decode("utf-8", errors="replace").rstrip()}

        # Read stdout and stderr concurrently
        async for item in read_stream(process.stdout, "stdout"):
            yield item

        # After stdout finishes, drain stderr
        stderr_data = await process.stderr.read()
        if stderr_data:
            for line in stderr_data.decode("utf-8", errors="replace").strip().split("\n"):
                yield {"type": "stderr", "data": line}

        exit_code = await process.wait()
        yield {"type": "done", "data": f"Qwen exited with code {exit_code}"}

    except Exception as exc:
        yield {"type": "error", "data": str(exc)}
    finally:
        try:
            os.unlink(prompt_file.name)
        except OSError:
            pass
