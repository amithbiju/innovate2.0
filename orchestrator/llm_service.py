"""
Gemini LLM service — wraps google-generativeai SDK calls.
"""

import json
import os
import re

import google.generativeai as genai
from dotenv import load_dotenv

from proposal_templates import (
    get_mvp_split_prompt,
    get_proposal_prompt,
    get_refinement_prompt,
)

load_dotenv()

# ── Configure Gemini ─────────────────────────────────────────
_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise EnvironmentError("GEMINI_API_KEY is not set in the environment.")

genai.configure(api_key=_api_key)

_model = genai.GenerativeModel("gemini-2.5-flash")


# ── Helper ───────────────────────────────────────────────────
def _call_gemini(prompt: str) -> str:
    """Send a single prompt to Gemini and return the text response."""
    try:
        response = _model.generate_content(prompt)
        return response.text
    except Exception as exc:
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc


# ── Public API ───────────────────────────────────────────────
def generate_proposal(transcript: str, chats: str) -> str:
    """Generate an initial project proposal from meeting data."""
    prompt = get_proposal_prompt(transcript, chats)
    return _call_gemini(prompt)


def refine_proposal(proposal: str, review: str) -> str:
    """Refine an existing proposal with user review feedback."""
    prompt = get_refinement_prompt(proposal, review)
    return _call_gemini(prompt)


def _extract_json_object(text: str) -> dict | None:
    """
    Robustly extract a JSON object from text that may be wrapped in
    markdown fences or surrounded by other content.
    """
    # Step 1: Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
    cleaned = cleaned.rstrip("`").strip()

    # Step 2: Try parsing cleaned text directly
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # Step 3: Slice from first { to last } and try parsing
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Step 4: Same approach on original text (in case fence-stripping broke it)
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    return None


def split_mvp_prompts(final_proposal: str) -> dict:
    """
    Split the final proposal into frontend and backend MVP prompts.
    Returns {"frontend_prompt": "...", "backend_prompt": "..."}.
    Retries up to 3 times if Gemini returns invalid JSON.
    """
    prompt = get_mvp_split_prompt(final_proposal)
    last_error = None

    for attempt in range(3):
        try:
            raw = _call_gemini(prompt)
            result = _extract_json_object(raw)

            if result and "frontend_prompt" in result and "backend_prompt" in result:
                return result

            last_error = (
                f"Attempt {attempt + 1}: Gemini did not return valid JSON. "
                f"Raw (first 300 chars): {raw[:300]}"
            )
            print(f"⚠️ {last_error}")

        except RuntimeError as exc:
            last_error = str(exc)
            print(f"⚠️ Attempt {attempt + 1} failed: {last_error}")

    raise ValueError(
        f"Failed to get valid MVP split JSON after 3 attempts. Last error: {last_error}"
    )
