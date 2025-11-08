import React, { useEffect, useState } from "react";

export default function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [listening, setListening] = useState(false);
  const [image, setImage] = useState("Neutral.png");
  const [transcripts, setTranscripts] = useState<string[]>([]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received:", data);

      if (data.status === "listening") {
        setListening(true);
      } else if (data.status === "stopped") {
        setListening(false);
      } else {
        // Regular transcription update
        setTranscripts((prev) => [data.text, ...prev]);
        if (data.trigger_found && data.trigger_found.length > 0) {
          setImage("SwellSad.png");
        } else {
          setImage("Neutral.png");
        }
      }
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
      setListening(false);
    };

    return () => socket.close();
  }, []);

  const toggleListening = () => {
    if (!ws) return;
    if (listening) {
      ws.send("stop");
    } else {
      ws.send("start");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 40 }}>
      <img src={image} alt="Face" width={200} />
      <div>
        <button
          onClick={toggleListening}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            borderRadius: 8,
            backgroundColor: listening ? "#f44336" : "#4CAF50",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {listening ? "Stop Listening" : "Start Listening"}
        </button>
      </div>

      <div style={{ marginTop: 20, maxWidth: 400, marginInline: "auto" }}>
        <h3>Recent Transcriptions</h3>
        <ul>
          {transcripts.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
