import { useState, useEffect, useRef, useCallback } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

/**
 * GeminiBot — AI meeting assistant component
 * Captures mic audio → sends PCM to backend WebSocket → receives audio + transcriptions
 */
function GeminiBot({ isActive, onTranscript }) {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | speaking | error
  const [error, setError] = useState('');
  const [botTranscripts, setBotTranscripts] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const scheduledSourcesRef = useRef([]);
  const isRecordingRef = useRef(false);
  const panelEndRef = useRef(null);

  // Auto-scroll transcripts
  useEffect(() => {
    panelEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [botTranscripts]);

  // ── Audio utilities ──────────────────────────────────────
  const downsampleBuffer = useCallback((buffer, sampleRate, outSampleRate) => {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }, []);

  const convertFloat32ToInt16 = useCallback((buffer) => {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7fff;
    }
    return buf.buffer;
  }, []);

  const playAudioChunk = useCallback((arrayBuffer) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const pcmData = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    nextStartTimeRef.current = Math.max(now, nextStartTimeRef.current);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    scheduledSourcesRef.current.push(source);
    source.onended = () => {
      const idx = scheduledSourcesRef.current.indexOf(source);
      if (idx > -1) scheduledSourcesRef.current.splice(idx, 1);
    };
  }, []);

  const stopAudioPlayback = useCallback(() => {
    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    scheduledSourcesRef.current = [];
    if (audioContextRef.current) {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  }, []);

  // ── Start bot ────────────────────────────────────────────
  const startBot = useCallback(async () => {
    setStatus('connecting');
    setError('');

    try {
      // 1. Initialize AudioContext
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      await ctx.audioWorklet.addModule('/pcm-processor.js');

      // 2. Connect WebSocket to backend
      const wsProtocol = SERVER_URL.startsWith('https') ? 'wss' : 'ws';
      const wsHost = SERVER_URL.replace(/^https?:\/\//, '');
      const ws = new WebSocket(`${wsProtocol}://${wsHost}/ws/gemini`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('🤖 Bot WebSocket opened');
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary = audio response from Gemini
          setStatus('speaking');
          playAudioChunk(event.data);
        } else {
          // JSON event
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'connected':
                setStatus('connected');
                break;
              case 'user_transcript':
                setBotTranscripts((prev) => [...prev, { role: 'You', text: msg.text }]);
                onTranscript?.(`You: ${msg.text}`);
                break;
              case 'bot_transcript':
                setBotTranscripts((prev) => [...prev, { role: 'AI Bot', text: msg.text }]);
                onTranscript?.(`AI Bot: ${msg.text}`);
                break;
              case 'turn_complete':
                setStatus('connected');
                break;
              case 'interrupted':
                stopAudioPlayback();
                setStatus('connected');
                break;
              case 'error':
                setError(msg.text);
                setStatus('error');
                break;
              default:
                break;
            }
          } catch {}
        }
      };

      ws.onclose = () => {
        console.log('🤖 Bot WebSocket closed');
        isRecordingRef.current = false;
        setStatus('idle');
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setStatus('error');
      };

      // 3. Wait for WS to open, then start mic capture
      await new Promise((resolve, reject) => {
        const origOpen = ws.onopen;
        ws.onopen = (e) => {
          origOpen?.(e);
          resolve();
        };
        ws.onerror = (e) => {
          reject(new Error('WebSocket failed to connect'));
        };
        // Timeout after 10s
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
      });

      // 4. Start mic capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        if (isRecordingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const downsampled = downsampleBuffer(event.data, ctx.sampleRate, 16000);
          const pcm16 = convertFloat32ToInt16(downsampled);
          wsRef.current.send(pcm16);
        }
      };

      source.connect(workletNode);
      // Mute local feedback
      const muteGain = ctx.createGain();
      muteGain.gain.value = 0;
      workletNode.connect(muteGain);
      muteGain.connect(ctx.destination);

      isRecordingRef.current = true;
      setStatus('connected');

    } catch (err) {
      console.error('Bot start failed:', err);
      setError(err.message);
      setStatus('error');
    }
  }, [downsampleBuffer, convertFloat32ToInt16, playAudioChunk, stopAudioPlayback, onTranscript]);

  // ── Stop bot ─────────────────────────────────────────────
  const stopBot = useCallback(() => {
    isRecordingRef.current = false;
    stopAudioPlayback();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setStatus('idle');
  }, [stopAudioPlayback]);

  // ── React to isActive prop ───────────────────────────────
  useEffect(() => {
    if (isActive) {
      startBot();
    } else {
      stopBot();
    }
    return () => {
      stopBot();
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => stopBot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null;

  const statusLabels = {
    idle: 'Idle',
    connecting: 'Connecting…',
    connected: 'Listening',
    speaking: 'Speaking…',
    error: 'Error',
  };

  const statusClass = `bot-status bot-status--${status}`;

  return (
    <div className="gemini-bot-panel">
      <div className="panel-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          AI Bot
          <span className={statusClass}>{statusLabels[status]}</span>
        </h3>
        <button className="panel-close-btn" onClick={() => setIsPanelOpen(!isPanelOpen)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            {isPanelOpen ? (
              <polyline points="6 9 12 15 18 9" />
            ) : (
              <polyline points="18 15 12 9 6 15" />
            )}
          </svg>
        </button>
      </div>

      {isPanelOpen && (
        <div className="panel-body bot-transcripts">
          {error && (
            <div className="bot-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
          {botTranscripts.length === 0 && !error && (
            <div className="panel-empty">
              <div className={status === 'connected' || status === 'speaking' ? 'listening-indicator' : ''}>
                {(status === 'connected' || status === 'speaking') && <><span /><span /><span /><span /><span /></>}
              </div>
              <p>{status === 'connecting' ? 'Connecting to AI…' : 'AI Bot is listening…'}</p>
            </div>
          )}
          {botTranscripts.map((t, i) => (
            <div key={i} className={`bot-transcript-line ${t.role === 'AI Bot' ? 'bot-transcript-line--bot' : 'bot-transcript-line--user'}`}>
              <span className="bot-transcript-role">{t.role}:</span>
              <span className="bot-transcript-text">{t.text}</span>
            </div>
          ))}
          <div ref={panelEndRef} />
        </div>
      )}
    </div>
  );
}

export default GeminiBot;
