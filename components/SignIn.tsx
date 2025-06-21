import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, ScaledSize, ImageBackground } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { BlurView } from 'expo-blur';

// Required for OAuth with Expo
WebBrowser.maybeCompleteAuthSession();

export const SignIn: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const { isSignedIn } = useAuth();
  
  // Use Clerk's useOAuth hook for Google
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  // Add event listener to update dimensions when window size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { createdSessionId, setActive } = await startOAuthFlow();
      
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      console.error("OAuth error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow]);

  // Calculate responsive dimensions based on window size
  const getResponsiveDimensions = (window: ScaledSize) => {
    const MAX_WIDTH = 360;
    const MAX_HEIGHT = 450;
    const ASPECT_RATIO = MAX_HEIGHT / MAX_WIDTH;
    
    // Get available space (accounting for some margin)
    const availableWidth = window.width * 0.85;
    const availableHeight = window.height * 0.85;
    
    // Calculate dimensions while maintaining aspect ratio
    let width = Math.min(availableWidth, MAX_WIDTH);
    let height = width * ASPECT_RATIO;
    
    // If height exceeds available height, recalculate
    if (height > availableHeight) {
      height = availableHeight;
      width = height / ASPECT_RATIO;
    }
    
    return { width, height };
  };

  const { width, height } = getResponsiveDimensions(windowDimensions);

  return (
    <ImageBackground 
      source={require('../assets/images/back.png')} 
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}
    >
      <BlurView intensity={20} tint="light" style={styles.blurContainer}>
        <View style={styles.overlay}>
          <View style={[styles.popupContainer, { width, height }]}>
            <View style={styles.popupContent}>
              <Text style={styles.title}>My Voice Assistant!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

              <TouchableOpacity style={styles.facebookButton}>
                <Text style={styles.facebookButtonText}>Sign in with Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.button}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Log in with Google</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.appleButton}>
                <Text style={styles.appleButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add a footer section */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Apple and Facebook authorization are currently in development.
            </Text>
          </View>
        </View>
      </BlurView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    width: '100%',
    height: '100%',
  },
  popupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#00c2ff',
  },
  popupContent: {
    flex: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPassword: {
    color: '#4285F4',
    fontSize: 14,
    marginBottom: 20,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  facebookButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#3b5998',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  facebookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});