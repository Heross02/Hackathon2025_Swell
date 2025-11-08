import asyncio
import sounddevice as sd
import wavio
import sqlite3
import re
import time
import os
from fastapi import FastAPI, WebSocket
from openai import OpenAI
import uvicorn

# ---------------- SETTINGS ----------------
duration = 10  # seconds per recording
samplerate = 44100
filename = "temp_audio.wav"
trigger_words = ["upset", "stop", "hectic", "overwhelming", "stressful"]
db_name = "transcripts.db"
client = OpenAI(api_key="YOUR_OPENAI_API_KEY")
# ------------------------------------------

app = FastAPI()


def setup_database():
    """Create SQLite database for transcriptions."""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transcripts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            text TEXT,
            trigger_found TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_to_database(text, trigger_found):
    """Save transcription result to the database."""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transcripts (timestamp, text, trigger_found) VALUES (?, ?, ?)",
        (time.strftime("%Y-%m-%d %H:%M:%S"), text, trigger_found),
    )
    conn.commit()
    conn.close()


def detect_triggers(text):
    """Detect key trigger words in the transcription."""
    found = [word for word in trigger_words if re.search(rf"\b{word}\b", text, re.IGNORECASE)]
    return ", ".join(found) if found else None


def record_audio():
    """Record 10 seconds of audio and save it as WAV."""
    print(" Recording audio...")
    audio_data = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype="int16")
    sd.wait()
    wavio.write(filename, audio_data, samplerate, sampwidth=2)
    print(" Audio recorded.")


def transcribe_audio(file_path):
    """Transcribe audio file using OpenAI Whisper."""
    print(" Transcribing...")
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )
    return transcript.text.strip()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint with toggleable listening mode."""
    await websocket.accept()
    setup_database()

    listening = False
    print(" WebSocket connected")

    try:
        while True:
            # Check if any message was sent by frontend
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                if msg == "start":
                    listening = True
                    print("Listening started.")
                    await websocket.send_json({"status": "listening"})
                elif msg == "stop":
                    listening = False
                    print(" Listening stopped.")
                    await websocket.send_json({"status": "stopped"})
            except asyncio.TimeoutError:
                pass  # no message received this cycle

            if listening:
                # Record, transcribe, detect, send
                record_audio()
                text = transcribe_audio(filename)
                trigger_found = detect_triggers(text)
                save_to_database(text, trigger_found or "None")

                await websocket.send_json({
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "text": text,
                    "trigger_found": trigger_found or "",
                })

                os.remove(filename)
                await asyncio.sleep(1)  # short pause before next capture

    except Exception as e:
        print("WebSocket error:", e)
    finally:
        await websocket.close()
        print(" WebSocket closed.")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)