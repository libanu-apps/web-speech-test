// Initialize Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;

class SpeechRecognitionManager {
  constructor() {
    this.recognition = new SpeechRecognition();
    this.isListening = false;
    this.recognitionResults = [];
    this.currentLanguage = 'en-US';
    this.initializeRecognition();
  }

  initializeRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUI();
      uiManager.updateRecognitionStatus(`Listening in ${this.getLanguageName(this.currentLanguage)}...`, 'info');
    };

    this.recognition.onresult = (event) => {
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
      this.currentLanguage = document.getElementById('recognition-language').value;
      this.recognition.lang = this.currentLanguage;
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

      if (isFinal) {
        this.recognitionResults.push({
          transcript: transcript,
          confidence: (confidence * 100).toFixed(2),
          isFinal: true
        });
      } else {
        interimTranscript += transcript + ' ';
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

  getLanguageName(lang) {
    const langNames = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'ja-JP': 'Japanese',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ko-KR': 'Korean',
      'pt-BR': 'Portuguese (Brazil)',
      'ru-RU': 'Russian',
      'ar-SA': 'Arabic',
      'en-IN': 'English (Indian)',
      'hi-IN': 'Hindi',
      'ml-IN': 'Malayalam',
      'ta-IN': 'Tamil'
    };
    return langNames[lang] || lang;
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
    this.currentLanguage = 'en-US';
    this.currentVolume = 1.0;
    this.currentPitch = 1.0;
    this.currentRate = 1.0;
    this.availableVoices = [];
    this.currentVoice = null;
    this.voiceSelectionStrategy = 'language'; // 'language', 'name', or 'custom'
    this.initializeVoices();
  }

  initializeVoices() {
    // Load voices when available
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => {
        this.availableVoices = this.synthesis.getVoices();
        this.selectVoiceByLanguage(this.currentLanguage);
        console.log(`Loaded ${this.availableVoices.length} voices`);
      };
    }
    
    // Get voices immediately (if already loaded)
    this.availableVoices = this.synthesis.getVoices();
    if (this.availableVoices.length > 0) {
      this.selectVoiceByLanguage(this.currentLanguage);
    }
  }

  setVoiceSelectionStrategy(strategy, criteria = null) {
    this.voiceSelectionStrategy = strategy;
    
    if (strategy === 'language') {
      this.selectVoiceByLanguage(this.currentLanguage);
    } else if (strategy === 'name' && criteria) {
      this.selectVoiceByName(criteria);
    } else if (strategy === 'custom' && criteria) {
      this.currentVoice = criteria(this.availableVoices);
    }
  }

  selectVoiceByLanguage(lang) {
    // Try exact match first, then fallback to language prefix
    this.currentVoice = this.availableVoices.find(v => v.lang === lang) ||
                        this.availableVoices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
                        this.availableVoices[0];
  }

  selectVoiceByName(voiceName) {
    this.currentVoice = this.availableVoices.find(v => v.name === voiceName);
    if (!this.currentVoice) {
      console.warn(`Voice "${voiceName}" not found. Using default.`);
      this.currentVoice = this.availableVoices[0];
    }
  }

  getAvailableVoicesByLanguage(lang) {
    return this.availableVoices.filter(v => v.lang.startsWith(lang.split('-')[0]));
  }

  getAllVoiceNames() {
    return this.availableVoices.map(v => ({ name: v.name, lang: v.lang }));
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    this.selectVoiceByLanguage(lang);
  }

  setVolume(volume) {
    this.currentVolume = volume / 100; // Convert from 0-100 to 0-1
  }

  setPitch(pitch) {
    this.currentPitch = parseFloat(pitch);
  }

  setRate(rate) {
    this.currentRate = parseFloat(rate);
  }

  speak(text) {
    if (!text.trim()) {
      uiManager.updateSynthesisStatus('Please enter some text', 'error');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = this.currentRate;
    this.currentUtterance.pitch = this.currentPitch;
    this.currentUtterance.volume = this.currentVolume;
    this.currentUtterance.lang = this.currentLanguage;
    
    // Set voice if available
    if (this.currentVoice) {
      this.currentUtterance.voice = this.currentVoice;
    }

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
    this.setupSliderControls();
  }

  setupEventListeners() {
    // Speech Recognition Events
    document.getElementById('start-recognition').addEventListener('click', () => {
      recognitionManager.startListening();
    });

    document.getElementById('stop-recognition').addEventListener('click', () => {
      recognitionManager.stopListening();
    });

    // Recognition Language Change
    document.getElementById('recognition-language').addEventListener('change', (e) => {
      recognitionManager.currentLanguage = e.target.value;
    });

    // Speech Synthesis Events
    document.getElementById('speak-text').addEventListener('click', () => {
      const text = document.getElementById('text-input').value;
      synthesisManager.speak(text);
    });

    document.getElementById('stop-speech').addEventListener('click', () => {
      synthesisManager.stop();
    });

    // Synthesis Language Change
    document.getElementById('synthesis-language').addEventListener('change', (e) => {
      synthesisManager.setLanguage(e.target.value);
      this.updateVoiceSelector();
    });

    // Voice Selector Change
    document.getElementById('voice-selector').addEventListener('change', (e) => {
      if (e.target.value) {
        synthesisManager.selectVoiceByName(e.target.value);
      }
    });
  }

  setupSliderControls() {
    // Volume Slider
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    volumeSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      volumeValue.textContent = value;
      synthesisManager.setVolume(value);
    });

    // Pitch Slider
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchValue = document.getElementById('pitch-value');
    pitchSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value).toFixed(1);
      pitchValue.textContent = value;
      synthesisManager.setPitch(value);
    });

    // Rate Slider
    const rateSlider = document.getElementById('rate-slider');
    const rateValue = document.getElementById('rate-value');
    rateSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value).toFixed(1);
      rateValue.textContent = value;
      synthesisManager.setRate(value);
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

  updateVoiceSelector() {
    const voiceSelector = document.getElementById('voice-selector');
    const currentLang = document.getElementById('synthesis-language').value;
    
    // Get voices for the current language
    const voicesForLang = synthesisManager.getAvailableVoicesByLanguage(currentLang);
    
    // Clear existing options except the first one
    voiceSelector.innerHTML = '<option value="">Default Voice</option>';
    
    // Add voices for the selected language
    voicesForLang.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = voice.name;
      voiceSelector.appendChild(option);
    });
  }
}

// Initialize managers
const recognitionManager = new SpeechRecognitionManager();
const synthesisManager = new SpeechSynthesisManager();
const uiManager = new UIManager();

// Initialize UI
recognitionManager.updateUI();
synthesisManager.updateUI();
uiManager.updateVoiceSelector();