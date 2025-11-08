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

const API_URL = 'http://192.168.1.79:8001'; // Replace XXX with your computer's IP address

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
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

const stopRecording = async () => {
  if (!recording) return;

  try {
    await recording.stopAndUnloadAsync();
    setIsRecording(false);
    setIsProcessing(true);

    const uri = recording.getURI();
    if (!uri) throw new Error("No recording URI available");

    const timestamp = new Date().getTime();
    const localFilename = `recording_${timestamp}.wav`;
    const newUri = `${FileSystem.documentDirectory}${localFilename}`;

    // Move the tmp recording to a persistent path we can upload
    await FileSystem.moveAsync({ from: uri, to: newUri });

    // Prepare form data
    const formData = new FormData();
    // For React Native, when using axios, we need file object with name/type/uri
    formData.append("file", {
      uri: newUri,
      name: localFilename,
      type: "audio/wav",
    } as any);

    // POST to backend
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      const data = response.data as TranscriptionResult;

      // Prepend the real transcription
      setTranscriptions((prev) => [data, ...prev]);
    } catch (err) {
      console.error("Upload/transcription error:", err);
      Alert.alert("Upload error", "Failed to upload and transcribe recording.");
      // Optionally keep the mock or show an error entry
      setTranscriptions((prev) => [
        {
          text: "Transcription failed.",
          triggers: null,
          confidence: 1,
          engine: "error",
          metadata: {},
        },
        ...prev,
      ]);
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
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording ? styles.recording : null,
          isProcessing ? styles.processing : null,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
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