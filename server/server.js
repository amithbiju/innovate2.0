require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const { GoogleGenAI, Modality } = require("@google/genai");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { RtmTokenBuilder, RtmRole } = require("agora-access-token");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── In-memory store ─────────────────────────────────────────
const meetings = [];

// ── Health check ────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Context-Aware Meet Server is running" });
});

// ── 1. Generate Agora Token ─────────────────────────────────
app.post("/generate-token", (req, res) => {
  try {
    const { channelName, uid } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: "channelName is required" });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId) {
      return res.status(500).json({
        error: "Agora App ID not configured. Set AGORA_APP_ID in .env",
      });
    }

    const numericUid = uid ? Number(uid) : 0;
    let token = null;

    if (appCertificate) {
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        numericUid,
        role,
        privilegeExpiredTs
      );
      console.log(`✅ Token generated for channel: ${channelName}, uid: ${numericUid}`);
    } else {
      console.log(`⚡ Testing mode (no certificate) — channel: ${channelName}, uid: ${numericUid}`);
    }

    return res.json({ token, appId, channelName });
  } catch (err) {
    console.error("❌ Token generation failed:", err.message);
    return res.status(500).json({ error: "Token generation failed", details: err.message });
  }
});

// ── 1b. Generate RTM Token ──────────────────────────────────
app.post("/generate-rtm-token", (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({
        error: "Agora credentials not configured",
      });
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const rtmToken = RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      String(uid),
      RtmRole.Rtm_User,
      privilegeExpiredTs
    );

    console.log(`✅ RTM Token generated for uid: ${uid}`);
    return res.json({ rtmToken });
  } catch (err) {
    console.error("❌ RTM Token generation failed:", err.message);
    return res.status(500).json({ error: "RTM Token generation failed", details: err.message });
  }
});

// ── 2. Receive Meeting Data ─────────────────────────────────
app.post("/api/meeting-capture", (req, res) => {
  try {
    const { projectId, projectName, meetingTranscript, chatMessages, timestamp, meetingUrl } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: "projectName is required" });
    }

    const meetingData = {
      id: meetings.length + 1,
      projectId: projectId || "unknown",
      projectName,
      meetingTranscript: meetingTranscript || "",
      chatMessages: chatMessages || "",
      timestamp: timestamp || new Date().toISOString(),
      meetingUrl: meetingUrl || "",
      receivedAt: new Date().toISOString(),
    };

    meetings.push(meetingData);

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║     📋 MEETING DATA CAPTURED            ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log(`  Project : ${meetingData.projectName}`);
    console.log(`  ID      : ${meetingData.projectId}`);
    console.log(`  Time    : ${meetingData.timestamp}`);
    console.log(`  Chat    : ${meetingData.chatMessages.length} chars`);
    console.log(`  Transcript: ${meetingData.meetingTranscript.length} chars`);
    console.log("──────────────────────────────────────────\n");

    return res.json({ success: true, meetingId: meetingData.id });
  } catch (err) {
    console.error("❌ Meeting capture failed:", err.message);
    return res.status(500).json({ error: "Meeting capture failed", details: err.message });
  }
});

// ── 3. List stored meetings (debug) ─────────────────────────
app.get("/api/meetings", (_req, res) => {
  res.json({ count: meetings.length, meetings });
});

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Create HTTP + WebSocket server ──────────────────────────
const server = http.createServer(app);
const wssGemini = new WebSocketServer({ noServer: true });
const wssTranscribe = new WebSocketServer({ noServer: true });

// Route WebSocket connections by path
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === "/ws/gemini") {
    wssGemini.handleUpgrade(request, socket, head, (ws) => {
      wssGemini.emit("connection", ws, request);
    });
  } else if (pathname === "/ws/transcribe") {
    wssTranscribe.handleUpgrade(request, socket, head, (ws) => {
      wssTranscribe.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ── 4a. Transcription-Only WebSocket ────────────────────────
wssTranscribe.on("connection", async (clientWs) => {
  console.log("\n📝 Transcription WebSocket connected");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ type: "error", text: "GEMINI_API_KEY not configured" }));
    clientWs.close();
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  let session = null;
  let alive = true;

  try {
    session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.TEXT],
        inputAudioTranscription: {},
        systemInstruction: {
          parts: [{
            text: "You are a silent transcription assistant. Do NOT respond to anything the user says. Your only job is to listen. Do not generate any text responses.",
          }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("📝 Gemini transcription session established");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "connected" }));
          }
        },
        onmessage: (message) => {
          if (!alive || clientWs.readyState !== WebSocket.OPEN) return;

          const sc = message.serverContent;
          if (sc && sc.inputTranscription && sc.inputTranscription.text) {
            console.log(`📝 Transcript: "${sc.inputTranscription.text}"`);
            clientWs.send(JSON.stringify({
              type: "transcript",
              text: sc.inputTranscription.text,
            }));
          }
        },
        onerror: (e) => {
          console.error("📝 Transcription session error:", e.message || e);
          if (alive && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "error", text: String(e.message || e) }));
          }
        },
        onclose: () => {
          console.log("📝 Transcription session closed");
          alive = false;
        },
      },
    });

    clientWs.on("message", (data, isBinary) => {
      if (!session || !alive) return;
      if (isBinary) {
        session.sendRealtimeInput({
          audio: {
            data: Buffer.from(data).toString("base64"),
            mimeType: "audio/pcm;rate=16000",
          },
        });
      }
    });

    clientWs.on("close", () => {
      console.log("📝 Transcription client disconnected");
      alive = false;
      if (session) { session.close(); session = null; }
    });

    clientWs.on("error", (err) => {
      console.error("📝 Transcription client error:", err.message);
      alive = false;
    });

  } catch (err) {
    console.error("📝 Transcription session creation failed:", err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "error", text: `Session failed: ${err.message}` }));
      clientWs.close();
    }
  }
});

// ── 4b. Gemini Live API WebSocket Proxy ─────────────────────
wssGemini.on("connection", async (clientWs) => {
  console.log("\n🤖 Gemini bot WebSocket connected");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ type: "error", text: "GEMINI_API_KEY not configured in server .env" }));
    clientWs.close();
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  let session = null;
  let alive = true;

  try {
    // Connect to Gemini Live API with callback-based message handling
    session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
        systemInstruction: {
          parts: [{
            text: "You are a helpful AI meeting assistant. You are listening to a live meeting. When participants ask you a question or request your input, respond concisely and clearly. Keep your answers brief and relevant to the meeting context. Be professional and friendly.",
          }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("🤖 Gemini Live session established");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "connected" }));
          }
        },
        onmessage: (message) => {
          if (!alive || clientWs.readyState !== WebSocket.OPEN) return;

          // Log what we receive from Gemini
          if (message.setupComplete) {
            console.log("🤖 Gemini setup complete");
          }

          const serverContent = message.serverContent;
          if (serverContent) {
            // Forward audio chunks
            if (serverContent.modelTurn && serverContent.modelTurn.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  const audioBytes = Buffer.from(part.inlineData.data, "base64");
                  console.log(`🤖 Sending audio chunk: ${audioBytes.length} bytes`);
                  clientWs.send(audioBytes);
                }
                if (part.text) {
                  console.log(`🤖 Model text: ${part.text}`);
                }
              }
            }

            // Forward transcriptions
            if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
              console.log(`🤖 User transcript: "${serverContent.inputTranscription.text}"`);
              clientWs.send(JSON.stringify({
                type: "user_transcript",
                text: serverContent.inputTranscription.text,
              }));
            }

            if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
              console.log(`🤖 Bot transcript: "${serverContent.outputTranscription.text}"`);
              clientWs.send(JSON.stringify({
                type: "bot_transcript",
                text: serverContent.outputTranscription.text,
              }));
            }

            if (serverContent.turnComplete) {
              console.log("🤖 Turn complete");
              clientWs.send(JSON.stringify({ type: "turn_complete" }));
            }

            if (serverContent.interrupted) {
              console.log("🤖 Interrupted");
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          }
        },
        onerror: (e) => {
          console.error("🤖 Gemini session error:", e.message || e);
          if (alive && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: "error", text: String(e.message || e) }));
          }
        },
        onclose: (e) => {
          console.log("🤖 Gemini session closed — code:", e?.code, "reason:", e?.reason, "wasClean:", e?.wasClean);
          alive = false;
        },
      },
    });

    // Receive audio/text from client and forward to Gemini
    let audioChunkCount = 0;
    clientWs.on("message", (data, isBinary) => {
      if (!session || !alive) return;

      try {
        if (isBinary) {
          // Binary = PCM audio data from mic
          audioChunkCount++;
          if (audioChunkCount <= 5 || audioChunkCount % 100 === 0) {
            console.log(`🤖 Audio chunk #${audioChunkCount}: ${data.length} bytes`);
          }
          session.sendRealtimeInput({
            audio: {
              data: Buffer.from(data).toString("base64"),
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else {
          // Text message from client
          const text = data.toString();
          console.log("🤖 Client text:", text);
          try {
            const payload = JSON.parse(text);
            if (payload.type === "text") {
              session.sendClientContent({
                turns: [{ role: "user", parts: [{ text: payload.text }] }],
                turnComplete: true,
              });
            }
          } catch {
            // Plain text
            session.sendClientContent({
              turns: [{ role: "user", parts: [{ text }] }],
              turnComplete: true,
            });
          }
        }
      } catch (err) {
        console.error("🤖 Gemini send error:", err.message);
      }
    });

    clientWs.on("close", (code, reason) => {
      console.log("🤖 Client WebSocket closed — code:", code, "reason:", reason?.toString());
      alive = false;
      if (session) {
        session.close();
        session = null;
      }
    });

    clientWs.on("error", (err) => {
      console.error("🤖 Client WebSocket error:", err.message);
      alive = false;
    });

  } catch (err) {
    console.error("🤖 Gemini session creation failed:", err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "error", text: `Session failed: ${err.message}` }));
      clientWs.close();
    }
  }
});

// ── Start server ────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Context-Aware Meet Server running on http://localhost:${PORT}`);
  console.log(`   App ID configured: ${process.env.AGORA_APP_ID ? "✅" : "❌ (set AGORA_APP_ID in .env)"}`);
  console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? "✅" : "❌ (set GEMINI_API_KEY in .env)"}\n`);
});
