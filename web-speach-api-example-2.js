// Initialize Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;

class SpeechRecognitionManager {
  constructor() {
    this.recognition = new SpeechRecognition();
    this.isListening = false;
    this.recognitionResults = [];
    this.initializeRecognition();
  }

  initializeRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    // this.recognition.lang = 'ml-IN';
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUI();
      uiManager.updateRecognitionStatus('Listening...', 'info');
    };

    this.recognition.onresult = (event) => {

      //interimResults test
      // let transcript = "";
      // for (let i = event.resultIndex; i < event.results.length; i++) {
      //     transcript += event.results[i][0].transcript;
      // }
      // console.log(transcript);

      this.handleResults(event);
    };

    this.recognition.onerror = (event) => {
      this.handleError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateUI();
      uiManager.updateRecognitionStatus('Listening stopped', 'success');
    };
  }

  startListening() {
    try {
      this.recognitionResults = [];
      this.recognition.lang = 'en-US';
      this.recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      uiManager.updateRecognitionStatus('Error: Could not start listening', 'error');
    }
  }

  stopListening() {
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  handleResults(event) {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;
      const isFinal = event.results[i].isFinal;
      // console.log("transcript: " + transcript, "confidence: " + confidence, "isFinal: " + isFinal);

      if (isFinal) {
        this.recognitionResults.push({
          transcript: transcript,
          confidence: (confidence * 100).toFixed(2),
          isFinal: true
        });
      } else {
        //interimResults test
        interimTranscript += transcript + ' ';
        // console.log('Interim Transcript:', interimTranscript);
      }
    }

    this.displayResults();
  }

  handleError(event) {
    const errorMessage = this.getErrorMessage(event.error);
    uiManager.updateRecognitionStatus(`Error: ${errorMessage}`, 'error');
  }

  getErrorMessage(error) {
    const errors = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Ensure audio input is available.',
      'network': 'Network error. Please check your connection.',
      'not-allowed': 'Microphone access was denied.',
      'service-not-allowed': 'Speech Recognition service is not allowed.'
    };
    return errors[error] || `An error occurred: ${error}`;
  }

  displayResults() {
    const resultsDiv = document.getElementById('recognition-results');
    resultsDiv.innerHTML = '';

    this.recognitionResults.forEach((result, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item final';
      resultItem.innerHTML = `
        <div class="transcript">${index + 1}. ${result.transcript}</div>
        <div class="confidence">Confidence: ${result.confidence}%</div>
      `;
      resultsDiv.appendChild(resultItem);
    });
  }

  updateUI() {
    const startBtn = document.getElementById('start-recognition');
    const stopBtn = document.getElementById('stop-recognition');

    if (this.isListening) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }
}

class SpeechSynthesisManager {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
  }

  speak(text) {
    if (!text.trim()) {
      uiManager.updateSynthesisStatus('Please enter some text', 'error');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = 1; // Speed - 0.5 to 2.0 (default is 1.0)
    this.currentUtterance.pitch = 1; // Pitch - 0.0 to 2.0 (default is 1.0)
    this.currentUtterance.volume = 1; // Volume - 0.0 to 1.0 (default is 1.0)
    // this.currentUtterance.lang = 'ml-IN'; // Set language to Malayalam
    this.currentUtterance.lang = 'en-US'; // Set language to Malayalam

    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      this.updateUI();
      uiManager.updateSynthesisStatus('Playing...', 'info');
    };

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.updateUI();
      uiManager.updateSynthesisStatus('Speech completed', 'success');
    };

    this.currentUtterance.onerror = (event) => {
      this.isPlaying = false;
      this.updateUI();
      uiManager.updateSynthesisStatus(`Error: ${event.error}`, 'error');
    };

    this.synthesis.speak(this.currentUtterance);
  }

  stop() {
    this.synthesis.cancel();
    this.isPlaying = false;
    this.updateUI();
    uiManager.updateSynthesisStatus('Speech stopped', 'success');
  }

  updateUI() {
    const speakBtn = document.getElementById('speak-text');
    const stopBtn = document.getElementById('stop-speech');

    if (this.isPlaying) {
      speakBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      speakBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }
}

class UIManager {
  constructor() {
    this.setupEventListeners();
    this.checkBrowserSupport();
  }

  setupEventListeners() {
    // Speech Recognition Events
    document.getElementById('start-recognition').addEventListener('click', () => {
      recognitionManager.startListening();
    });

    document.getElementById('stop-recognition').addEventListener('click', () => {
      recognitionManager.stopListening();
    });

    // Speech Synthesis Events
    document.getElementById('speak-text').addEventListener('click', () => {
      const text = document.getElementById('text-input').value;
      synthesisManager.speak(text);
    });

    document.getElementById('stop-speech').addEventListener('click', () => {
      synthesisManager.stop();
    });
  }

  updateRecognitionStatus(message, type) {
    const statusDiv = document.getElementById('recognition-status');
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
  }

  updateSynthesisStatus(message, type) {
    const statusDiv = document.getElementById('synthesis-status');
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
  }

  checkBrowserSupport() {
    if (!SpeechRecognition) {
      this.updateRecognitionStatus('Speech Recognition not supported in this browser', 'error');
      document.getElementById('start-recognition').disabled = true;
    }

    if (!window.speechSynthesis) {
      this.updateSynthesisStatus('Speech Synthesis not supported in this browser', 'error');
      document.getElementById('speak-text').disabled = true;
    }
  }
}

// Initialize managers
const recognitionManager = new SpeechRecognitionManager();
const synthesisManager = new SpeechSynthesisManager();
const uiManager = new UIManager();

// Initialize UI
recognitionManager.updateUI();
synthesisManager.updateUI();