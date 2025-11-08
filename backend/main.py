from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import sys
import os
import time
import json
import openai

# Initialize OpenAI client
from dotenv import load_dotenv
load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')  # Get API key from environment variable
)

# Add the parent directory to Python path to import SpeechTherapy
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Hackathon2025_Swell.SpeechTherapy import (
    setup_database,
    detect_triggers,
    db_name,
    transcribe_audio,
    save_to_database
)

import sqlite3

app = FastAPI(title="Speech Therapy API")

# Enable CORS for React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscriptionResponse(BaseModel):
    text: str
    triggers: Optional[str]
    confidence: float
    engine: str
    metadata: dict

@app.on_event("startup")
async def startup_event():
    setup_database()

@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def handle_transcribe(file: UploadFile = File(...)):
    try:
        print("\n=== Starting New Transcription ===")
        print("Thank you for sharing your thoughts!")
        
        # Create recordings directory if it doesn't exist
        recordings_dir = "recordings"
        if not os.path.exists(recordings_dir):
            os.makedirs(recordings_dir)
            print("Created recordings directory")
            
        # Save uploaded file with timestamp
        temp_path = os.path.join(recordings_dir, f"recording_{int(time.time())}.wav")
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        print(f"Saved recording to: {temp_path}")
        
        # Use SpeechTherapy's transcribe_audio function
        text = transcribe_audio(temp_path)
        if not text:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
            
        # OpenAI Whisper typically has high accuracy
        confidence = 0.95
        
        # Detect triggers using SpeechTherapy's function
        triggers = detect_triggers(text)
        
        # Save to database using SpeechTherapy's function
        save_to_database(text, triggers)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return TranscriptionResponse(
            text=text,
            triggers=triggers,
            confidence=confidence,
            engine="OpenAI Whisper",
            metadata={"timestamp": time.strftime("%Y-%m-%d %H:%M:%S")}
        )
    
    except Exception as e:
        print("\n=== Transcription Error ===")
        print("I apologize, but I couldn't understand that properly.")
        print(f"Error details: {str(e)}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print("Cleaned up temporary recording file")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transcriptions/latest")
async def get_latest_transcription():
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, text, trigger_found 
            FROM transcripts 
            ORDER BY timestamp DESC 
            LIMIT 1
        """)
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "timestamp": row[0],
                "text": row[1],
                "triggers": row[2] if row[2] != "None" else None,
                "confidence": 0.95,
                "engine": "OpenAI Whisper"
            }
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transcriptions")
async def get_all_transcriptions():
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, text, trigger_found 
            FROM transcripts 
            ORDER BY timestamp DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        return [{
            "timestamp": row[0],
            "text": row[1],
            "triggers": row[2] if row[2] != "None" else None,
            "confidence": 0.95,
            "engine": "OpenAI Whisper"
        } for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "engine": "OpenAI Whisper",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)