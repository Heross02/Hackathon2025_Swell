import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

const API_URL = 'http://192.168.1.46:8000'; // Using local IP address for Expo to connect

interface TranscriptionResult {
  text: string;
  triggers: string | null;
  confidence: number;
  engine: string;
  metadata: any;
}

export default function TMTherapyScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(11);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const RECORDING_LIMIT = 11000; // 11 seconds in milliseconds

  useEffect(() => {
    // Request permissions when component mounts
    const getPermission = async () => {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "This app needs access to your microphone to work properly."
          );
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
      }
    };

    getPermission();

    // Cleanup timer on unmount
    return () => {
      if (recordingTimer) {
        clearTimeout(recordingTimer);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setTimeLeft(11);

      // Start countdown timer
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            // Clear the interval immediately
            clearInterval(timer);
            // Stop the recording
            setTimeout(() => {
              stopRecording();
            }, 0);
            return 0;
          }
          return newTime;
        });
      }, 1000);

      setTimerId(timer);

      // Show message that recording has started and clear previous transcriptions
      setTranscriptions([{
        text: "Recording started... I'm listening to your thoughts.",
        triggers: null,
        confidence: 1,
        engine: "System",
        metadata: { status: 'recording' }
      }]);

    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

const fetchLatestTranscription = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/transcriptions/latest`);
    if (response.data) {
      setTranscriptions(prev => [{
        text: response.data.text,
        triggers: response.data.triggers,
        confidence: response.data.confidence,
        engine: response.data.engine,
        metadata: { timestamp: response.data.timestamp }
      }, ...prev]);
    }
  } catch (err) {
    console.error('Error fetching transcription:', err);
  }
};

const stopRecording = async () => {
  if (!recording) return;

  try {
    // Clear the interval timer
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    setTimeLeft(0);

    await recording.stopAndUnloadAsync();
    setIsRecording(false);
    setIsProcessing(true);

    // Show processing message
    setTranscriptions([{
      text: "Processing your thoughts... analyzing what you said...",
      triggers: null,
      confidence: 1,
      engine: "System",
      metadata: { status: 'processing' }
    }]);

    const uri = recording.getURI();
    if (!uri) throw new Error("No recording URI available");

    const timestamp = new Date().getTime();
    const localFilename = `recording_${timestamp}.wav`;
    const newUri = `${FileSystem.documentDirectory}${localFilename}`;

    // Move the tmp recording to a persistent path we can upload
    await FileSystem.moveAsync({ from: uri, to: newUri });

    // Prepare form data
    const formData = new FormData();
    formData.append("file", {
      uri: newUri,
      name: localFilename,
      type: "audio/wav",
    } as any);

    try {
      // POST to backend and get the response directly
      const response = await axios.post(`${API_URL}/api/transcribe`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      // Use the response directly instead of fetching again
      setTranscriptions(prev => [{
        text: response.data.text,
        triggers: response.data.triggers,
        confidence: response.data.confidence,
        engine: response.data.engine,
        metadata: response.data.metadata
      }]);

    } catch (err) {
      console.error("Upload/transcription error:", err);
      Alert.alert("Upload error", "Failed to upload and transcribe recording.");
      setTranscriptions([{
        text: "Transcription failed. Please try again.",
        triggers: null,
        confidence: 1,
        engine: "error",
        metadata: { error: true }
      }]);
    }

    // cleanup the file after a short delay
    setTimeout(async () => {
      try {
        await FileSystem.deleteAsync(newUri);
      } catch (e) {
        console.warn("Failed to delete local file:", e);
      }
    }, 4000);
  } catch (err) {
    console.error("Error processing recording:", err);
    Alert.alert("Error", "Failed to process recording. Please try again.");
  } finally {
    setRecording(null);
    setIsProcessing(false);
  }
};


  const renderTranscription = (result: TranscriptionResult, index: number) => (
    <View key={index} style={styles.transcriptionCard}>
      <Text style={styles.transcriptionText}>{result.text}</Text>
      {result.triggers && (
        <Text style={styles.triggerText}>
          Triggers detected: {result.triggers}
        </Text>
      )}
      <Text style={styles.confidenceText}>
        Confidence: {(result.confidence * 100).toFixed(1)}%
      </Text>
      <Text style={styles.engineText}>Engine: {result.engine}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        {isRecording && (
          <Text style={[
            styles.timerText,
            timeLeft <= 3 && styles.timerWarning
          ]}>
            {timeLeft === 0 ? 'Time\'s up!' : `Recording ends in: ${timeLeft}s`}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording ? styles.recording : null,
          isProcessing ? styles.processing : null,
          isRecording && timeLeft <= 3 ? styles.finalCountdown : null,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <View>
            <Text style={styles.buttonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
            {isRecording && (
              <Text style={styles.buttonSubText}>
                Listening to your thoughts...
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.transcriptionList}>
        {transcriptions.map((result, index) => 
          renderTranscription(result, index)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  timerWarning: {
    fontSize: 24,
    color: '#ff0000',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonSubText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 50,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recording: {
    backgroundColor: '#f44336',
  },
  processing: {
    backgroundColor: '#FFA000',
  },
  finalCountdown: {
    backgroundColor: '#ff0000',
    transform: [{ scale: 1.05 }],
    shadowColor: '#ff0000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  transcriptionList: {
    width: '100%',
  },
  transcriptionCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  transcriptionText: {
    fontSize: 16,
    marginBottom: 8,
  },
  triggerText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 4,
  },
  confidenceText: {
    color: '#666',
    fontSize: 12,
  },
  engineText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});