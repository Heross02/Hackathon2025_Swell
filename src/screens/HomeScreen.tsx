import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Recording {
  recording: Audio.Recording | null;
  sound: Audio.Sound | null;
  isRecording: boolean;
}

export default function HomeScreen() {
  const [recordingState, setRecordingState] = useState<Recording>({
    recording: null,
    sound: null,
    isRecording: false
  });

  useEffect(() => {
    // Request permissions when component mounts
    const getPermission = async () => {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert(
            "Permission required",
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

      setRecordingState(prev => ({
        ...prev,
        recording,
        isRecording: true
      }));
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingState.recording) return;

    try {
      await recordingState.recording.stopAndUnloadAsync();
      const uri = recordingState.recording.getURI();
      
      if (uri) {
        // Here you would typically send the audio file to your backend
        // For now, we'll just save it locally
        const info = await FileSystem.getInfoAsync(uri);
        console.log('Recording saved at:', uri);
        console.log('File info:', info);

        // Save reference to the recording
        await AsyncStorage.setItem('lastRecording', uri);
      }

      setRecordingState(prev => ({
        ...prev,
        recording: null,
        isRecording: false
      }));
    } catch (err) {
      console.error('Failed to stop recording:', err);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const toggleRecording = () => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speech Therapy Assistant</Text>
      
      <TouchableOpacity 
        style={[
          styles.recordButton,
          recordingState.isRecording ? styles.recording : null
        ]}
        onPress={toggleRecording}
      >
        <Text style={styles.buttonText}>
          {recordingState.isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {recordingState.isRecording && (
        <Text style={styles.recordingText}>Recording in progress...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 50,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingText: {
    marginTop: 20,
    color: '#f44336',
    fontSize: 16,
  },
});