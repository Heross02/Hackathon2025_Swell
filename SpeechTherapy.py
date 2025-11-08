import openai
import sounddevice as sd
import wavio
import sqlite3
import re
import time
import os

# ---------------- SETTINGS ----------------
active = 1  # Set to 1 to enable listening mode
duration = 5  # seconds to record each clip
samplerate = 44100
filename = "temp_audio.wav"
trigger_words = ["upset", "stop", "hectic", "overwhelming", "stressful"]
db_name = "transcripts.db"


client = openai.OpenAI(


)
# ------------------------------------------



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


def save_to_database(text, trigger_found):
    """Save the transcribed text and trigger detection result."""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO transcripts (timestamp, text, trigger_found) VALUES (?, ?, ?)",
                   (time.strftime("%Y-%m-%d %H:%M:%S"), text, trigger_found))
    conn.commit()
    conn.close()


def detect_triggers(text):
    """Return any trigger words found in the text."""
    found = [word for word in trigger_words if re.search(rf"\b{word}\b", text, re.IGNORECASE)]
    return ", ".join(found) if found else None


def record_audio():
    """Record audio from the microphone and save it to a WAV file."""
    print(f" Recording {duration} seconds of audio...")
    audio_data = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype='int16')
    sd.wait()
    wavio.write(filename, audio_data, samplerate, sampwidth=2)
    print(" Audio recorded.")


def transcribe_audio(file_path):
    """Send the recorded audio file to OpenAI for transcription."""
    print(" Transcribing with OpenAI Whisper...")
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )
    text = transcript.text.strip()
    print(f" Transcription: {text}")
    return text


def main():
    setup_database()

    if active == 1:
        print("Voice recognition active. Speak when ready.")
        while True:
            record_audio()
            text = transcribe_audio(filename)
            trigger_found = detect_triggers(text)
            if trigger_found:
                print(f" Trigger detected: {trigger_found}")
            save_to_database(text, trigger_found or "None")
            os.remove(filename)
            print("\nSay something again or press Ctrl+C to exit.\n")
    else:
        print("Voice recognition is disabled (set active = 1 to enable).")


if __name__ == "__main__":
    main()
