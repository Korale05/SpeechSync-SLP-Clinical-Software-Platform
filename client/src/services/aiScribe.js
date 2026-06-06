// AI Scribe streaming service for SpeechSync
// Connects to /api/ai/generate-soap and parses the SSE stream from the backend server

export async function streamSOAPNote(sessionData, onChunk, onDone) {
  const token = localStorage.getItem('speechsync_token');
  
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiBase}/api/ai/generate-soap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        patient: sessionData?.patient,
        sessionType: sessionData?.sessionType || 'Individual Speech Therapy',
        duration: sessionData?.duration || 45,
        exercises: sessionData?.exercises || [],
        goals: sessionData?.goals || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Split buffer by newlines to extract complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last incomplete block in the buffer

      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('data: ')) {
          const dataContent = cleaned.slice(6);
          
          if (dataContent === '[DONE]') {
            onDone();
            return;
          }
          
          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.delta) {
              onChunk(parsed.delta);
            } else if (parsed.error) {
              console.error('AI Scribe Error from server:', parsed.error);
            }
          } catch (e) {
            // Silence parse errors for transient delimiters
          }
        }
      }
    }
    
    // Complete the final chunk if any
    onDone();
  } catch (error) {
    console.error('Failed to stream SOAP Note from server:', error);
    onDone();
  }
}

export async function translateSOAPNote(soapData, targetLanguage) {
  const token = localStorage.getItem('speechsync_token');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const response = await fetch(`${apiBase}/api/ai/translate-soap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      soap_data: soapData,
      target_language: targetLanguage
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.status === 'success') {
    return data.data; // This is the parsed JSON SOAP note
  } else {
    throw new Error(data.message || 'Failed to translate SOAP note');
  }
}
