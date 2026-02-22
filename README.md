# Context-Aware Meeting System

A browser-based meeting platform with real-time video, chat, and live transcription — powered by Agora Web SDK.

## Features

- **Video Meetings** — Agora RTC with local + remote video grid
- **Real-time Chat** — Agora RTM-based in-meeting messaging
- **Live Transcription** — Web Speech API (Chromium browsers)
- **Project Management** — Create/select projects, stored in localStorage
- **Meeting Data Capture** — Transcript + chat sent to backend on meeting end
- **Dark SaaS Theme** — Modern, responsive UI with animations

## Prerequisites

- Node.js 18+
- An [Agora](https://console.agora.io/) account with App ID and App Certificate

## Setup

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Agora Credentials

**Server** — Create `server/.env`:
```env
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
PORT=5000
```

**Client** — Create `client/.env`:
```env
VITE_AGORA_APP_ID=your_agora_app_id
VITE_SERVER_URL=http://localhost:5000
```

### 3. Run

```bash
# Terminal 1 — Start backend
cd server
npm start

# Terminal 2 — Start frontend
cd client
npm run dev
```

Open **http://localhost:5173** in Chrome.

## Usage

1. **Create a project** — Enter a name and click "Create"
2. **Join meeting** — Select the project and click "Join Meeting"
3. **In the meeting** — Use video, chat, and live transcription
4. **End meeting** — Click "Leave" to save transcript + chat to the backend

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate-token` | Generate Agora RTC token |
| POST | `/api/meeting-capture` | Save meeting data |
| GET | `/api/meetings` | List stored meetings |

## Architecture

```
/agora
  /client          ← React (Vite) frontend
    /src
      App.jsx              ← Router
      /components
        ProjectSelector.jsx ← Landing page
        MeetingRoom.jsx     ← Video + chat + transcript
      styles.css           ← Dark SaaS theme
  /server          ← Express backend
    server.js      ← Token + meeting endpoints
```
