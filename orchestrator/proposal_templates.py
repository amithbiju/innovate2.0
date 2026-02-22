"""
Prompt templates for Gemini LLM interactions.
Each function returns a fully-formatted prompt string ready to send to the model.
"""


def get_proposal_prompt(transcript: str, chats: str) -> str:
    """Generate the initial project-proposal prompt."""
    return f"""You are a senior technical product architect.

Using the following meeting transcript and chat logs:

<TRANSCRIPT>
{transcript}
</TRANSCRIPT>

<CHATS>
{chats}
</CHATS>

Generate:
1. Project Overview
2. Core Features
3. Technical Architecture
4. MVP Scope
5. Risks
6. Future Expansion Modules

Be structured and technical."""


def get_refinement_prompt(proposal: str, review: str) -> str:
    """Refine an existing proposal using user review feedback."""
    return f"""Here is the original proposal:

<PROPOSAL>
{proposal}
</PROPOSAL>

Here is user review feedback:

<REVIEW>
{review}
</REVIEW>

Refine and improve the proposal.
Return final structured proposal."""


def get_mvp_split_prompt(final_proposal: str) -> str:
    """Split a final proposal into frontend and backend MVP coding prompts."""
    return f"""Using this final proposal:

<FINAL_PROPOSAL>
{final_proposal}
</FINAL_PROPOSAL>

Generate two separate prompts:

1. Frontend MVP Prompt (clear implementation instructions)
2. Backend MVP Prompt (clear implementation instructions)

These prompts will be given to a coding model (Qwen Coder).
Be explicit about folder structure, files, and stack.

IMPORTANT RULES:
- Each prompt MUST be under 1500 characters. Be concise but specific.
- Do NOT use markdown formatting (no *, **, #, ```) inside the prompt values.
- Return ONLY raw JSON, no markdown code fences, no extra text before or after.
- Use \\n for newlines inside the JSON string values.

Return this exact JSON structure:

{{
  "frontend_prompt": "concise frontend implementation instructions here",
  "backend_prompt": "concise backend implementation instructions here"
}}"""

