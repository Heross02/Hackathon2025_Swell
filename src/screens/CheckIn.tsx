// features/CheckInMessage.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Share } from 'react-native';

const TEMPLATES = [
  'Hey, thinking of you today. How are you holding up?',
  'Quick check‑in: anything I can support you with this week?',
  'Just wanted to say hi — how’s your day going?',
  'If you have a minute, I’d love to catch up. You on for a quick chat?',
];

export default function CheckInMessage() {
  const [message, setMessage] = useState(TEMPLATES[0]);

  function nextTemplate() {
    const i = TEMPLATES.indexOf(message);
    const next = (i + 1) % TEMPLATES.length;
    setMessage(TEMPLATES[next]);
  }

  async function send() {
    try {
      await Share.share({ message });
    } catch (e) {
      // Handle gracefully or show a toast
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Send a check‑in</Text>
      <Text style={styles.subtitle}>A quick note to let someone know you care.</Text>

      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="Type your message…"
        placeholderTextColor="#6b7280"
      />

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={nextTemplate}>
          <Text style={styles.secondaryText}>Shuffle template</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={send}>
          <Text style={styles.primaryText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tip}>Tip: Use Share to pick SMS, WhatsApp, or email.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101318',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#fff' },
  subtitle: { fontSize: 14, color: '#cfd8e3' },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0b0f14',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  secondaryButton: { backgroundColor: '#1f2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  secondaryText: { color: '#e5e7eb', fontWeight: '600' },
  primaryButton: { backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  tip: { color: '#9aa6b2', fontSize: 12 },
});
