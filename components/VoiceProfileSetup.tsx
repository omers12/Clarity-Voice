import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform, Animated, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

// Helper function to safely trigger haptic feedback only on supported platforms
const triggerHapticFeedback = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(type);
    } catch (error) {
      console.log('Haptic feedback not available', error);
    }
  }
};

// Helper function to safely store profile data based on platform
const saveProfileData = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Use localStorage for web platform
      localStorage.setItem(key, value);
    } else {
      // Use SecureStore for native platforms
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error('Storage error:', error);
    throw error;
  }
};

// Helper function to safely retrieve profile data based on platform
const getProfileData = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      // Use localStorage for web platform
      return localStorage.getItem(key);
    } else {
      // Use SecureStore for native platforms
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error('Storage retrieval error:', error);
    return null;
  }
};

// Helper function to safely delete profile data based on platform
const deleteProfileData = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Use localStorage for web platform
      localStorage.removeItem(key);
    } else {
      // Use SecureStore for native platforms
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error('Storage deletion error:', error);
    throw error;
  }
};

// Sample texts for voice calibration
const CALIBRATION_PHRASES = [
  "My voice is unique and I'm creating my profile",
  "This system will learn to recognize my voice pattern",
  "I'm speaking at my normal volume and pace",
  "Voice recognition helps improve my experience"
];

interface VoiceProfileSetupProps {
  isVisible: boolean;
  onComplete: (success: boolean) => void;
}

export const VoiceProfileSetup: React.FC<VoiceProfileSetupProps> = ({ isVisible, onComplete }) => {
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [audioData, setAudioData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [recordingResult, setRecordingResult] = useState<'success' | 'failure' | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation for pulsing recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      resetState();
    }
    return () => {
      stopRecording();
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [isVisible]);

  const resetState = () => {
    setStep(0);
    setRecording(null);
    setIsRecording(false);
    setCountdown(3);
    setCurrentPhrase(0);
    setAudioData([]);
    setProcessing(false);
    setVerificationStep(false);
    setRecordingResult(null);
  };

  // Handle countdown for recording
  useEffect(() => {
    if (step === 1 && countdown > 0) {
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current!);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [step, countdown]);

  // Request audio permissions
  const checkPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  // Start recording process
  const prepareRecording = async () => {
    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        alert('Please grant microphone permissions to continue');
        return;
      }

      // Reset countdown and move to recording preparation step
      setCountdown(3);
      setStep(1);
    } catch (error) {
      console.error('Error preparing to record:', error);
      alert('Failed to prepare recording. Please try again.');
    }
  };

  // Start the actual recording
  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      triggerHapticFeedback(Haptics.NotificationFeedbackType.Success);
      
      setRecording(recording);
      setIsRecording(true);
      setStep(2);
      
      // Removed automatic 5-second timer for stopping recording
      // Now user can manually stop recording when they finish speaking
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  // Stop the current recording
  const finishCurrentRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      triggerHapticFeedback(Haptics.NotificationFeedbackType.Success);
      
      if (uri) {
        // Simulate verification for this demo
        // In a real app, you would analyze the recording to determine if it's good quality
        const isSuccessful = Math.random() > 0.3; // 70% success rate for demo purposes
        
        setRecordingResult(isSuccessful ? 'success' : 'failure');
        setVerificationStep(true);
        setIsRecording(false);
        
        if (isSuccessful) {
          // Store the successful recording
          setAudioData([...audioData, {
            uri,
            phrase: CALIBRATION_PHRASES[currentPhrase]
          }]);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setRecording(null);
      setVerificationStep(true);
      setRecordingResult('failure');
    }
  };

  // Retry current phrase recording
  const retryRecording = () => {
    setVerificationStep(false);
    setRecordingResult(null);
    setRecording(null);
    setCountdown(3);
    setStep(1);
  };

  // Move to next phrase
  const continueToNextPhrase = () => {
    if (currentPhrase < CALIBRATION_PHRASES.length - 1) {
      setCurrentPhrase(currentPhrase + 1);
      setVerificationStep(false);
      setRecordingResult(null);
      setRecording(null);
      setCountdown(3);
      setStep(1);
    } else {
      // We've recorded all phrases
      processAndSaveProfile(audioData);
    }
  };

  // Force stop any ongoing recording
  const stopRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
    setIsRecording(false);
    setRecording(null);
  };

  // Process all recordings and create a voice profile
  const processAndSaveProfile = async (recordings: any[]) => {
    setProcessing(true);
    
    try {
      // In a real implementation, we would analyze the audio files to extract 
      // frequency patterns, tonal qualities, etc. 
      // Here we'll just save the URIs as a simple demonstration
      
      // Simple simulated "processing" delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save the profile data to secure storage
      const profileData = {
        created: new Date().toISOString(),
        sampleCount: recordings.length,
        // In a real implementation, this would contain frequency distribution data,
        // amplitude patterns, etc. derived from analysis of the recordings
        voiceSignature: "sample-voice-signature",
      };
      
      // Use our platform-safe storage function instead of SecureStore directly
      await saveProfileData('voice_profile', JSON.stringify(profileData));
      
      // Complete the setup
      setStep(3);
      setProcessing(false);
    } catch (error) {
      console.error('Error processing voice profile:', error);
      setProcessing(false);
      alert('Failed to create voice profile. Please try again.');
    }
  };

  // Handle profile reset
  const handleResetProfile = () => {
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      // For web, use window.confirm 
      const confirmed = window.confirm('Are you sure you want to reset your voice profile? This action cannot be undone.');
      if (confirmed) {
        resetVoiceProfile();
      }
    } else {
      // For native platforms, use Alert
      Alert.alert(
        'Reset Voice Profile',
        'Are you sure you want to reset your voice profile? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reset', 
            style: 'destructive',
            onPress: resetVoiceProfile 
          }
        ]
      );
    }
  };

  // Reset the voice profile data
  const resetVoiceProfile = async () => {
    try {
      setProcessing(true);
      
      // Delete the voice profile data
      await deleteProfileData('voice_profile');
      
      // Add a small delay to show processing feedback
      setTimeout(() => {
        setProcessing(false);
        // Reset the setup process
        resetState();
        // Show confirmation message
        alert('Voice profile has been reset successfully.');
      }, 1000);
    } catch (error) {
      console.error('Error resetting voice profile:', error);
      setProcessing(false);
      alert('Failed to reset voice profile. Please try again.');
    }
  };

  // Cancel the setup
  const handleCancel = () => {
    stopRecording();
    onComplete(false);
  };

  // Finish the setup
  const handleFinish = () => {
    onComplete(true);
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Profile Setup</Text>
            {step < 3 && (
              <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Step 0: Introduction */}
          {step === 0 && (
            <View style={styles.contentContainer}>
              <Ionicons name="mic-outline" size={60} color="#4285F4" style={styles.icon} />
              <Text style={styles.description}>
                Let's set up your voice profile to improve voice recognition.
                I'll ask you to read 4 short phrases in your normal speaking voice.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={prepareRecording}>
                <Text style={styles.buttonText}>Start Setup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleResetProfile}>
                <Text style={styles.secondaryButtonText}>Reset Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 1: Countdown before recording */}
          {step === 1 && (
            <View style={styles.contentContainer}>
              <Text style={styles.phraseTitle}>Phrase {currentPhrase + 1}/{CALIBRATION_PHRASES.length}</Text>
              <Text style={styles.phraseText}>{CALIBRATION_PHRASES[currentPhrase]}</Text>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdown}>{countdown}</Text>
                <Text style={styles.countdownLabel}>Get ready to speak...</Text>
              </View>
            </View>
          )}

          {/* Step 2: Recording in progress */}
          {step === 2 && !verificationStep && (
            <View style={styles.contentContainer}>
              <Text style={styles.phraseTitle}>Phrase {currentPhrase + 1}/{CALIBRATION_PHRASES.length}</Text>
              <Text style={styles.phraseText}>{CALIBRATION_PHRASES[currentPhrase]}</Text>
              <View style={styles.recordingContainer}>
                <Animated.View 
                  style={[
                    styles.pulsingDot,
                    { transform: [{ scale: pulseAnim }] }
                  ]} 
                />
                <Text style={styles.recordingText}>Recording in progress...</Text>
                <Text style={styles.recordingHint}>Please read the phrase above</Text>
                
                <TouchableOpacity 
                  style={styles.stopRecordingButton} 
                  onPress={finishCurrentRecording}
                >
                  <Text style={styles.stopButtonText}>I'm Done Speaking</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Verification Step: Check recording quality */}
          {verificationStep && (
            <View style={styles.contentContainer}>
              <Text style={styles.phraseTitle}>Phrase {currentPhrase + 1}/{CALIBRATION_PHRASES.length}</Text>
              
              {recordingResult === 'success' ? (
                <>
                  <Ionicons name="checkmark-circle" size={50} color="#10b981" style={styles.icon} />
                  <Text style={styles.successRecordingText}>Recording Successful!</Text>
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={continueToNextPhrase}
                  >
                    <Text style={styles.buttonText}>
                      {currentPhrase < CALIBRATION_PHRASES.length - 1 ? 'Continue to Next Phrase' : 'Finish'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={50} color="#ef4444" style={styles.icon} />
                  <Text style={styles.failureRecordingText}>Recording Failed</Text>
                  <Text style={styles.recordingHint}>
                    There might have been background noise or the speech wasn't clear.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={retryRecording}
                  >
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Step 3: Processing & Completion */}
          {step === 3 && (
            <View style={styles.contentContainer}>
              {processing ? (
                <>
                  <ActivityIndicator size="large" color="#4285F4" />
                  <Text style={styles.processingText}>Creating your voice profile...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={70} color="#10b981" style={styles.icon} />
                  <Text style={styles.successText}>Voice Profile Created!</Text>
                  <Text style={styles.description}>
                    Your voice profile has been created and saved.
                    The app will now recognize your voice more accurately.
                  </Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
                    <Text style={styles.buttonText}>Continue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleResetProfile}>
                    <Text style={styles.secondaryButtonText}>Reset Profile</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Progress indicator */}
          {step < 3 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Step {verificationStep ? currentPhrase + 1 : step + 1} of 3
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((verificationStep ? currentPhrase + 1 : step + 1) / 3) * 100}%` }]} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  icon: {
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  secondaryButton: {
    backgroundColor: '#94a3b8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  stopRecordingButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  progressContainer: {
    marginTop: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 3,
  },
  phraseTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 16,
  },
  phraseText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdown: {
    fontSize: 64,
    fontWeight: '700',
    color: '#4285F4',
  },
  countdownLabel: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  recordingContainer: {
    alignItems: 'center',
  },
  pulsingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    marginBottom: 16,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  recordingHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748b',
  },
  successText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 16,
  },
  successRecordingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 16,
  },
  failureRecordingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 16,
  },
});