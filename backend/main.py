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
    api_key="your-api-key-here"  # Replace with your OpenAI API key or use environment variable
)

# Add the parent directory to Python path to import SpeechTherapy
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Hackathon2025_Swell.SpeechTherapy import (
    setup_database,
    detect_triggers
)

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
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        temp_path = f"temp_{int(time.time())}.wav"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Transcribe using OpenAI
        with open(temp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        text = transcript.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
            
        # OpenAI Whisper typically has high accuracy
        confidence = 0.95
        
        # Detect triggers
        triggers = detect_triggers(text)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return TranscriptionResponse(
            text=text,
            triggers=triggers,
            confidence=confidence,
            engine=RECOGNITION_ENGINE,
            metadata=metadata
        )
    
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "engine": RECOGNITION_ENGINE}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)