#import speech_recognition as sr
import sqlite3
import re
import time

# ---------------- SETTINGS ----------------
active = 1  # Set to 1 to enable listening mode, 0 to disable
trigger_words = ["upset", "stop", "hectic", "overwhelming", "stressful"]
db_name = "transcripts.db"
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


def listen_and_transcribe():
    """Continuously listen for audio and transcribe speech."""
    #recognizer = sr.Recognizer()
    #mic = sr.Microphone()

    print("🎙️  Listening... (say something)")
    # with mic as source:
    #     recognizer.adjust_for_ambient_noise(source)
    #     audio = recognizer.listen(source)
    #
    # try:
    #     text = recognizer.recognize_google(audio)
    #     print(f"🗣️  You said: {text}")
    #
    #     trigger_found = detect_triggers(text)
    #     if trigger_found:
    #         print(f"🚨 Trigger detected: {trigger_found}")
    #
    #     save_to_database(text, trigger_found or "None")
    #
    # except sr.UnknownValueError:
    #     print("❌ Could not understand audio.")
    # except sr.RequestError:
    #     print("⚠️ Could not reach speech recognition service.")


def main():
    setup_database()

    if active == 1:
        print("Voice recognition active. Speak when ready.")
        while True:
            listen_and_transcribe()
            print("\nSay something again or press Ctrl+C to exit.\n")
    else:
        print("Voice recognition is disabled (set active = 1 to enable).")


if __name__ == "__main__":
    main()
