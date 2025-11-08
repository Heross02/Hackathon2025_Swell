import openai
import sounddevice as sd
import wavio
import sqlite3
import re
import time
import os
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tempfile import NamedTemporaryFile

# ---------------- SETTINGS ----------------
active = 1  # Set to 1 to enable listening mode
trigrespon = 0 # Booleon value for face
duration = 10  # seconds to record each clip
samplerate = 44100
filename = "temp_audio.wav"
trigger_words = ["upset", "stop", "hectic", "overwhelming", "stressful"]
db_name = "transcripts.db"

TRANSCRIBE_MODEL = "whisper-1"

# Load API key from environment — do NOT hardcode secrets in source code.
from dotenv import load_dotenv
load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
# ------------------------------------------

app = FastAPI()

# Allow CORS from your phone/dev IP (adjust origin as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def setup_database():
    """Create a SQLite database and table for storing transcriptions."""
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


def save_to_database(text: str, trigger_found: Optional[str]):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transcripts (timestamp, text, trigger_found) VALUES (?, ?, ?)",
        (time.strftime("%Y-%m-%d %H:%M:%S"), text, trigger_found or "None"),
    )
    conn.commit()
    conn.close()


def detect_triggers(text: str) -> Optional[str]:
    found = [w for w in trigger_words if re.search(rf"\b{re.escape(w)}\b", text, re.IGNORECASE)]
    return ", ".join(found) if found else None


def record_audio():
    """Record audio from the microphone and save it to a WAV file."""
    #print(f" Recording {duration} seconds of audio...")
    audio_data = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype='int16')
    sd.wait()
    wavio.write(filename, audio_data, samplerate, sampwidth=2)
    #print(" Audio recorded.")


def transcribe_audio(file_path):
    """Send the recorded audio file to OpenAI for transcription."""
    #print(" Transcribing with OpenAI Whisper...")
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )
    text = transcript.text.strip()
    #print(f" Transcription: {text}")
    return text


def Face(trigger_found: Optional[str]) -> str:
    if trigrespon == 0:
        imgfile = "SwellSmile.png"
    if trigrespon == 1:
        imgfile = "SwellSad.png"
    else:
        print("Whoops something went wrong")

    return



def choose_face(trigger_found: Optional[str]) -> str:
    """Simple mapping to image file name depending on whether triggers were found."""
    if trigger_found:
        return "SwellSad.png"
    return "SwellSmile.png"


def main():
    global active, trigrespon 
    setup_database()
    start_time = time.perf_counter()


    #print("Voice recognition active. Speak when ready.")


    while active == 1:
        # Check elapsed time
        elapsed = time.perf_counter() - start_time
        if elapsed >= 11:
            active = 0
            #print("11 seconds passed. Stopping voice recognition.")
            break

        record_audio()
        text = transcribe_audio(filename)
        trigger_found = detect_triggers(text)
        if trigger_found:
            trigrespon = 1
            #print(f" Trigger detected: {trigger_found}")
        save_to_database(text, trigger_found or "None")
        os.remove(filename)



class TranscriptionResponse(BaseModel):
    text: str
    triggers: Optional[str]
    engine: str
    filename: str
    face_image: str


# --- Startup ---
setup_database()


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Accept an uploaded audio file (wav/m4a) and transcribe it with OpenAI.
    Returns JSON with transcription, triggers, and recommended face image.
    """
    # save to a temporary file
    try:
        with NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp_name = tmp.name
            contents = await file.read()
            tmp.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    # call OpenAI transcription
    try:
        with open(tmp_name, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model=TRANSCRIBE_MODEL,
                file=audio_file
            )
        text = transcription.text.strip()
    except Exception as e:
        # cleanup and return error
        os.remove(tmp_name)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # detect triggers and persist
    trigger_found = detect_triggers(text)
    save_to_database(text, trigger_found)

    face_image = choose_face(trigger_found)

    # Optionally remove tmp file to save disk
    os.remove(tmp_name)

    return TranscriptionResponse(
        text=text,
        triggers=trigger_found,
        engine=TRANSCRIBE_MODEL,
        filename=file.filename,
        face_image=face_image,
    )





#if __name__ == "__main__":
    #main()
