import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import GeminiBot from './GeminiBot';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

// ── Agora RTC Client ────────────────────────────────────────
const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

function MeetingRoom() {
  const { channelName } = useParams();
  const navigate = useNavigate();

  // Project info
  const [project, setProject] = useState({ id: '', name: '' });

  // Connection state
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  // Tracks
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);

  // Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [rtmClient, setRtmClient] = useState(null);
  const [rtmChannel, setRtmChannel] = useState(null);
  const chatEndRef = useRef(null);

  // Transcript
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const transcriptEndRef = useRef(null);

  // Cumulative data refs
  const chatMessagesRef = useRef('');
  const uidRef = useRef(Math.floor(Math.random() * 100000));

  // Join guard ref (synchronous — prevents StrictMode double-join)
  const joiningRef = useRef(false);
  // Track whether this component instance is mounted
  const isMountedRef = useRef(true);

  // ── Load project info ───────────────────────────────────
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('cam-active-project');
      if (stored) {
        setProject(JSON.parse(stored));
      }
    } catch {
      console.warn('No active project found');
    }
  }, []);

  // ── Auto-scroll chat ───────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Auto-scroll transcript ─────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ── Join Meeting ───────────────────────────────────────
  const joinMeeting = useCallback(async () => {
    // Synchronous ref guard — prevents React StrictMode double-call
    if (joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);
    setConnectionError('');

    try {
      // 1. Get token from backend
      const tokenRes = await fetch(`${SERVER_URL}/generate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, uid: uidRef.current }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || 'Failed to get token');
      }

      const { token, appId } = await tokenRes.json();
      const effectiveAppId = appId || APP_ID;

      if (!effectiveAppId) {
        throw new Error('No Agora App ID configured. Set VITE_AGORA_APP_ID in .env');
      }

      // 2. Leave if already connected (handles remount / hot-reload)
      if (rtcClient.connectionState === 'CONNECTED' || rtcClient.connectionState === 'CONNECTING') {
        await rtcClient.leave();
      }

      // 3. Join RTC channel
      await rtcClient.join(effectiveAppId, channelName, token, uidRef.current);

      // Abort if component unmounted during join (StrictMode)
      if (!isMountedRef.current) {
        await rtcClient.leave();
        joiningRef.current = false;
        return;
      }

      // 4. Create & publish local tracks
      let audioTrack = null;
      let videoTrack = null;

      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
      } catch (err) {
        console.warn('Mic permission denied:', err.message);
        setConnectionError('Microphone permission denied. You can still join without audio.');
      }

      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        setLocalVideoTrack(videoTrack);
      } catch (err) {
        console.warn('Camera permission denied:', err.message);
        setConnectionError((prev) =>
          prev ? prev + ' Camera permission also denied.' : 'Camera permission denied. You can still join without video.'
        );
      }

      // Only publish if still connected (prevents race with StrictMode cleanup)
      const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
      if (tracksToPublish.length > 0 && rtcClient.connectionState === 'CONNECTED') {
        await rtcClient.publish(tracksToPublish);
      }

      // 4. Set up RTM for chat
      try {
        const rtm = AgoraRTM.createInstance(effectiveAppId);
        await rtm.login({ uid: String(uidRef.current) });
        const channel = rtm.createChannel(channelName);
        await channel.join();

        channel.on('ChannelMessage', (message, memberId) => {
          const chatLine = `${memberId}: ${message.text}`;
          setChatMessages((prev) => [...prev, { sender: memberId, text: message.text, isLocal: false }]);
          chatMessagesRef.current += chatLine + '\n';
        });

        setRtmClient(rtm);
        setRtmChannel(channel);
      } catch (err) {
        console.warn('RTM setup failed:', err.message);
      }

      setJoined(true);
    } catch (err) {
      console.error('Join failed:', err);
      setConnectionError(err.message || 'Failed to join meeting');
      joiningRef.current = false;
    } finally {
      setJoining(false);
    }
  }, [channelName]);

  // ── Handle remote users ────────────────────────────────
  useEffect(() => {
    const handleUserPublished = async (user, mediaType) => {
      await rtcClient.subscribe(user, mediaType);
      if (mediaType === 'video') {
        setRemoteUsers((prev) => {
          const exists = prev.find((u) => u.uid === user.uid);
          if (exists) {
            return prev.map((u) => (u.uid === user.uid ? user : u));
          }
          return [...prev, user];
        });
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      if (mediaType === 'video') {
        setRemoteUsers((prev) => prev.map((u) => (u.uid === user.uid ? user : u)));
      }
    };

    const handleUserLeft = (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    rtcClient.on('user-published', handleUserPublished);
    rtcClient.on('user-unpublished', handleUserUnpublished);
    rtcClient.on('user-left', handleUserLeft);

    return () => {
      rtcClient.off('user-published', handleUserPublished);
      rtcClient.off('user-unpublished', handleUserUnpublished);
      rtcClient.off('user-left', handleUserLeft);
    };
  }, []);

  // ── Play local video ───────────────────────────────────
  useEffect(() => {
    if (localVideoTrack && !isCameraOff) {
      localVideoTrack.play('local-video');
    }
  }, [localVideoTrack, isCameraOff]);

  // ── Play remote videos ────────────────────────────────
  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        const el = document.getElementById(`remote-video-${user.uid}`);
        if (el) {
          user.videoTrack.play(el);
        }
      }
    });
  }, [remoteUsers]);

  // ── Auto-join on mount ────────────────────────────────
  useEffect(() => {
    joinMeeting();
  }, [joinMeeting]);

  // ── Speech Recognition ────────────────────────────────
  const startTranscription = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setConnectionError('Speech Recognition not supported in this browser. Use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript.trim();
          if (finalText) {
            const line = `Speaker (You): ${finalText}`;
            transcriptRef.current += line + '\n';
            setTranscript(transcriptRef.current);
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setConnectionError('Microphone access denied for transcription.');
      }
    };

    recognition.onend = () => {
      // Auto-restart if still transcribing
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsTranscribing(true);
  }, []);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  // ── Toggle controls ───────────────────────────────────
  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  };

  // ── Send chat message ─────────────────────────────────
  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !rtmChannel) return;

    try {
      await rtmChannel.sendMessage({ text });
      const chatLine = `You: ${text}`;
      setChatMessages((prev) => [...prev, { sender: 'You', text, isLocal: true }]);
      chatMessagesRef.current += chatLine + '\n';
      setChatInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // ── Leave Meeting ─────────────────────────────────────
  const leaveMeeting = async () => {
    // Stop transcription
    stopTranscription();

    // Send meeting data to backend
    try {
      const payload = {
        projectId: project.id || 'unknown',
        projectName: project.name || channelName,
        meetingTranscript: transcriptRef.current,
        chatMessages: chatMessagesRef.current,
        timestamp: new Date().toISOString(),
        meetingUrl: window.location.href,
      };

      await fetch(`${SERVER_URL}/api/meeting-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Meeting data sent successfully');
    } catch (err) {
      console.error('Failed to send meeting data:', err);
    }

    // Clean up RTC
    localAudioTrack?.close();
    localVideoTrack?.close();
    if (rtcClient.connectionState === 'CONNECTED') {
      await rtcClient.leave();
    }
    joiningRef.current = false;

    // Clean up RTM
    try {
      await rtmChannel?.leave();
      await rtmClient?.logout();
    } catch {
      // ignore
    }

    navigate('/');
  };

  // ── Mark unmounted + cleanup ──────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTranscription();
      localAudioTrack?.close();
      localVideoTrack?.close();
      // Only leave if not mid-join (let joinMeeting handle its own cleanup)
      if (!joiningRef.current) {
        if (rtcClient.connectionState === 'CONNECTED' || rtcClient.connectionState === 'CONNECTING') {
          rtcClient.leave().catch(() => {});
        }
      }
      rtmChannel?.leave().catch(() => {});
      rtmClient?.logout().catch(() => {});
    };
  }, [localAudioTrack, localVideoTrack, rtmChannel, rtmClient, stopTranscription]);

  // ── Compute video grid class ──────────────────────────
  const totalVideos = 1 + remoteUsers.length;
  const gridClass = totalVideos <= 1 ? 'one' : totalVideos <= 2 ? 'two' : totalVideos <= 4 ? 'four' : 'many';

  return (
    <div className="meeting-room">
      {/* ── Left: Transcript Panel ── */}
      {isTranscriptOpen && (
        <aside className="transcript-panel">
          <div className="panel-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Live Transcript
            </h3>
            <div className="panel-header-actions">
              {!isTranscribing ? (
                <button className="transcript-toggle-btn" onClick={startTranscription} title="Start transcription">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              ) : (
                <button className="transcript-toggle-btn transcript-toggle-btn--active" onClick={stopTranscription} title="Stop transcription">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                </button>
              )}
              <button className="panel-close-btn" onClick={() => setIsTranscriptOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="panel-body">
            {!transcript && !isTranscribing && (
              <div className="panel-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" opacity="0.3">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <p>Click play to start live transcription</p>
              </div>
            )}
            {isTranscribing && !transcript && (
              <div className="panel-empty">
                <div className="listening-indicator">
                  <span /><span /><span /><span /><span />
                </div>
                <p>Listening…</p>
              </div>
            )}
            {transcript && (
              <pre className="transcript-text">{transcript}</pre>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      )}

      {/* ── Center: Video Grid ── */}
      <main className="video-area">
        {/* Top bar */}
        <div className="meeting-topbar">
          <div className="meeting-info">
            <span className="meeting-channel">{channelName}</span>
            {project.name && <span className="meeting-project">{project.name}</span>}
          </div>
          <div className="meeting-topbar-actions">
            {!isTranscriptOpen && (
              <button className="topbar-btn" onClick={() => setIsTranscriptOpen(true)} title="Show transcript">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
            {!isChatOpen && (
              <button className="topbar-btn" onClick={() => setIsChatOpen(true)} title="Show chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Connection error banner */}
        {connectionError && (
          <div className="connection-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {connectionError}
          </div>
        )}

        {/* Video grid */}
        <div className={`video-grid video-grid--${gridClass}`}>
          {/* Local video */}
          <div className="video-tile video-tile--local">
            <div id="local-video" className="video-player" />
            {isCameraOff && (
              <div className="video-placeholder">
                <div className="video-avatar">You</div>
              </div>
            )}
            <div className="video-label">
              You {isMuted && <span className="muted-badge">🔇</span>}
            </div>
          </div>

          {/* Remote videos */}
          {remoteUsers.map((user) => (
            <div key={user.uid} className="video-tile">
              <div id={`remote-video-${user.uid}`} className="video-player" />
              <div className="video-label">User {user.uid}</div>
            </div>
          ))}
        </div>

        {/* Controls bar */}
        <div className="controls-bar">
          <button
            className={`control-btn ${isMuted ? 'control-btn--danger' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            className={`control-btn ${isCameraOff ? 'control-btn--danger' : ''}`}
            onClick={toggleCamera}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isCameraOff ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M16.5 9.4l5.5-3.4v12l-5.5-3.4" />
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M1 7.5A2.5 2.5 0 013.5 5h9A2.5 2.5 0 0115 7.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 011 16.5v-9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M15.6 11.6L22 7v10l-6.4-4.6" />
                <rect x="2" y="5" width="14" height="14" rx="2" ry="2" />
              </svg>
            )}
            <span>{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
          </button>

          <button className="control-btn control-btn--leave" onClick={leaveMeeting} title="Leave meeting">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M16.5 9.4l5.5-3.4v12l-5.5-3.4" />
              <line x1="22" y1="2" x2="2" y2="22" />
              <rect x="2" y="5" width="14" height="14" rx="2" ry="2" />
            </svg>
            <span>Leave</span>
          </button>

          <button
            className={`control-btn control-btn--bot ${isBotActive ? 'control-btn--bot-active' : ''}`}
            onClick={() => setIsBotActive(!isBotActive)}
            title={isBotActive ? 'Disconnect AI Bot' : 'Connect AI Bot'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span>{isBotActive ? 'Bot On' : 'AI Bot'}</span>
          </button>
        </div>
      </main>

      {/* ── Right: Chat Panel ── */}
      {isChatOpen && (
        <aside className="chat-panel">
          <div className="panel-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
              </svg>
              Chat
            </h3>
            <button className="panel-close-btn" onClick={() => setIsChatOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="panel-body chat-messages">
            {chatMessages.length === 0 && (
              <div className="panel-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36" opacity="0.3">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                </svg>
                <p>No messages yet</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.isLocal ? 'chat-msg--local' : 'chat-msg--remote'}`}>
                <span className="chat-msg-sender">{msg.sender}</span>
                <span className="chat-msg-text">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            />
            <button className="chat-send-btn" onClick={sendChatMessage} disabled={!chatInput.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* ── AI Bot Panel ── */}
      <GeminiBot
        isActive={isBotActive}
        onTranscript={(line) => {
          transcriptRef.current += line + '\n';
          setTranscript(transcriptRef.current);
        }}
      />
    </div>
  );
}

export default MeetingRoom;
