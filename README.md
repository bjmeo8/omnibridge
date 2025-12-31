# 🌉 OmniBridge AI

**A Polymorphic Communication Interface for the Deaf and Hard of Hearing.**

OmniBridge acts as a real-time semantic bridge, listening to the world, understanding context (visual & auditory), and generating adaptive UI controls that allow a non-verbal user to respond instantly with a high-quality synthetic human voice.

Built for the **Google AI Partner Catalyst** Challenge.

## 🚀 Key Features

### 👂 The Live Ear (Speech-to-Text)
- **Robust Transcription:** Uses the Web Speech API with a custom "Fresh Instance" strategy to prevent browser engine crashes during long conversations.
- **Auto-Language Detection:** Automatically adjusts listening language based on the configured Interlocutor settings.

### 🧠 The Bridge (Gemini 3 Flash GenUI)
- **Real-time Reasoning:** Uses `gemini-3-flash-preview` to analyze the conversation history and visual context.
- **Polymorphic UI:** Generates 4 context-aware "Response Cards" in JSON format. The UI morphs its colors and shapes based on the predicted tone (e.g., Red/Sharp for Urgent, Green/Soft for Happy).
- **Translation Layer:** Automatically translates suggestions if the User and Interlocutor languages differ.

### 🗣️ The Voice (ElevenLabs TTS)
- **Ultra-Low Latency:** Integrated with **ElevenLabs Turbo v2.5** model via streaming API.
- **Emotional Alignment:** The voice stability and style are dynamically adjusted to match the context of the conversation.

### 👁️ The Eyes (Multimodal Context)
- **Snap Context:** Users can take a photo or upload an image.
- **Vision Analysis:** Gemini analyzes the image (e.g., a menu, a broken engine part) and injects this understanding into the conversation prompt to generate highly relevant replies.

### 📱 Progressive Web App (PWA)
- **Mobile First:** Designed with large touch targets for rapid communication.
- **Installable:** Includes `manifest.json` and Service Workers for native-like installation on iOS and Android.

---

## 🛠️ Tech Stack

### AI & Intelligence
*   **Orchestrator:** Google GenAI SDK (`@google/genai`)
*   **Models:** `gemini-3-flash-preview` (Logic & Vision)
*   **TTS:** ElevenLabs API (`eleven_turbo_v2_5`)

### Frontend
*   **Core:** React 19
*   **Language:** TypeScript / ESNext
*   **Styling:** Tailwind CSS (Glassmorphism Design System)
*   **Icons:** FontAwesome 6 + SVG Vectors

### Architecture
*   **No-Build:** Runs directly on ES Modules via `esm.sh`.
*   **State Management:** React Hooks (`useRef` heavily used for audio stream management).

---

## 🔑 Setup & Usage

1.  **API Keys:**
    *   The application expects `process.env.API_KEY` to be configured with a valid Google Gemini API Key.
    *   ElevenLabs key is configured internally (Demo key provided).

2.  **Browser Permissions:**
    *   Must allow **Microphone** access for the "Ear".
    *   Must allow **Camera** access for "Snap Context".

3.  **Installation (Mobile):**
    *   Open in Chrome (Android) or Safari (iOS).
    *   Select "Add to Home Screen" to install as a standalone app.

---

## 🏆 Hackathon Tracks

*   **Google Cloud:** Leveraging Vertex AI / Gemini for multimodal reasoning.
*   **ElevenLabs:** Creating a conversational app with human-quality voice synthesis.
