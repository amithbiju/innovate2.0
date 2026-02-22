"""
AI Orchestrator — FastAPI server.

Endpoints:
  POST /ingest   — Accept meeting data, generate proposal via Gemini
  POST /review   — Accept review feedback, refine, split, scaffold via Qwen
  GET  /stream   — SSE stream of Qwen CLI logs for a project
"""

import asyncio
import json
import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

# ── App setup ────────────────────────────────────────────────
app = FastAPI(
    title="AI Orchestrator",
    description="Accepts meeting data → generates proposals → scaffolds projects",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store ──────────────────────────────────────────
memory_store: dict = {}

# ── Ensure generated_projects dir exists ─────────────────────
# Place generated_projects OUTSIDE orchestrator/ so uvicorn's reloader doesn't watch it
_GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_projects")
os.makedirs(_GENERATED_DIR, exist_ok=True)


# ── Request models ───────────────────────────────────────────
class IngestRequest(BaseModel):
    projectName: str
    transcription: str
    chats: str
    isnew: bool = True


class ReviewRequest(BaseModel):
    projectName: str
    reviewFeedback: str


# ── Health check ─────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "ok", "message": "AI Orchestrator is running"}


# ── POST /ingest ─────────────────────────────────────────────
@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Accept meeting data (transcript + chats), generate a proposal via Gemini,
    store everything in memory, and return the proposal.
    """
    try:
        from llm_service import generate_proposal
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM service init failed: {exc}")

    if not req.projectName.strip():
        raise HTTPException(status_code=400, detail="projectName cannot be empty")

    if not req.transcription.strip() and not req.chats.strip():
        raise HTTPException(
            status_code=400,
            detail="At least one of transcription or chats must be provided",
        )

    # Store meeting data
    memory_store[req.projectName] = {
        "transcription": req.transcription,
        "chats": req.chats,
        "proposal": None,
        "review": None,
    }

    # Generate proposal via Gemini
    try:
        proposal = generate_proposal(req.transcription, req.chats)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Gemini proposal generation failed: {exc}",
        )

    memory_store[req.projectName]["proposal"] = proposal

    return {
        "status": "Proposal Generated",
        "projectName": req.projectName,
        "proposal": proposal,
    }


# ── POST /review ─────────────────────────────────────────────
@app.post("/review")
def review(req: ReviewRequest):
    """
    Accept user feedback, refine proposal via Gemini, split into
    frontend/backend MVP prompts, invoke Qwen CLI, and scaffold the project.
    """
    try:
        from llm_service import refine_proposal, split_mvp_prompts
        from project_builder import build_project
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Service init failed: {exc}")

    if req.projectName not in memory_store:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{req.projectName}' not found. Run /ingest first.",
        )

    project_data = memory_store[req.projectName]

    if not project_data.get("proposal"):
        raise HTTPException(
            status_code=400,
            detail="No proposal found for this project. Run /ingest first.",
        )

    if not req.reviewFeedback.strip():
        raise HTTPException(status_code=400, detail="reviewFeedback cannot be empty")

    # Save review
    project_data["review"] = req.reviewFeedback

    # Step 1: Refine proposal
    try:
        refined = refine_proposal(project_data["proposal"], req.reviewFeedback)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Gemini proposal refinement failed: {exc}",
        )

    project_data["proposal"] = refined

    # Step 2: Split into MVP prompts
    try:
        mvp = split_mvp_prompts(refined)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Gemini MVP split failed: {exc}",
        )

    project_data["mvp_prompts"] = mvp

    # Step 3: Scaffold project via Qwen
    try:
        project_path = build_project(
            req.projectName,
            mvp["frontend_prompt"],
            mvp["backend_prompt"],
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Qwen project scaffolding failed: {exc}",
        )

    return {
        "status": "Project Generated",
        "project_path": f"../generated_projects/{req.projectName}",
        "absolute_path": project_path,
        "refined_proposal": refined,
        "mvp_prompts": mvp,
    }


# ── GET /stream — SSE endpoint for real-time Qwen logs ──────
@app.get("/stream")
async def stream_qwen_logs(
    projectName: str = Query(..., description="Project name to stream logs for"),
    target: str = Query("frontend", description="frontend or backend"),
):
    """
    Server-Sent Events (SSE) endpoint that runs Qwen CLI and streams
    each line of output in real time to the frontend.
    """
    if projectName not in memory_store:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{projectName}' not found. Run /ingest first.",
        )

    project_data = memory_store[projectName]
    mvp = project_data.get("mvp_prompts")

    if not mvp:
        raise HTTPException(
            status_code=400,
            detail="No MVP prompts found. Run /review first.",
        )

    prompt = mvp.get(f"{target}_prompt")
    if not prompt:
        raise HTTPException(
            status_code=400,
            detail=f"No {target}_prompt found in MVP prompts.",
        )

    async def event_generator():
        from qwen_runner import stream_qwen

        async for item in stream_qwen(prompt):
            event_data = json.dumps(item)
            yield f"data: {event_data}\n\n"

        yield f"data: {json.dumps({'type': 'complete', 'data': 'Stream finished'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        reload_excludes=["generated_projects/*"],
    )
