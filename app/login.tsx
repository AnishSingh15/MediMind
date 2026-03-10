import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../constants/theme';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../services/firebase';

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: '1060891957815-4hc0s7knrrep5podojj1cj6bvp5b93ap.apps.googleusercontent.com',
    offlineAccess: true,
});

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [loading, setLoading] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const signInResult = await GoogleSignin.signIn();
            const idToken = signInResult?.data?.idToken;

            if (!idToken) {
                throw new Error('No ID token received');
            }

            await signInWithGoogle(idToken);
            onLoginSuccess();
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // Already in progress
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Google Play Services Required', 'Please install or update Google Play Services.');
            } else {
                Alert.alert('Sign-in Failed', 'Could not sign in with Google. Please try again.');
                console.error('Google Sign-In error:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Missing Information', 'Please enter your email and password.');
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email.trim(), password);
            } else {
                await signInWithEmail(email.trim(), password);
            }
            onLoginSuccess();
        } catch (error: any) {
            let message = 'Something went wrong. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'This email is already registered. Try signing in instead.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Incorrect email or password.';
            } else if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email. Try signing up.';
            }
            Alert.alert(isSignUp ? 'Sign Up Failed' : 'Sign In Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Top decoration */}
            <View style={styles.topDecoration}>
                <View style={styles.circle1} />
                <View style={styles.circle2} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo & Branding */}
                <View style={styles.brandSection}>
                    <View style={styles.logoContainer}>
                        <MaterialCommunityIcons name="pill" size={56} color={Colors.primary} />
                    </View>
                    <Text style={styles.appName}>MediMind</Text>
                    <Text style={styles.tagline}>Your personal medicine{'\n'}reminder assistant</Text>
                </View>

                {!showEmailForm ? (
                    <>
                        {/* Features */}
                        <View style={styles.featuresSection}>
                            <FeatureItem icon="bell-ring" text="Never miss a medicine" />
                            <FeatureItem icon="wifi-off" text="Works without internet" />
                            <FeatureItem icon="shield-check" text="Simple & safe to use" />
                        </View>

                        {/* Sign In Buttons */}
                        <View style={styles.bottomSection}>
                            <TouchableOpacity
                                style={[styles.googleButton, loading && styles.buttonDisabled]}
                                onPress={handleGoogleSignIn}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <View style={styles.googleIconWrapper}>
                                    <AntDesign name="google" size={20} color="#EA4335" />
                                </View>
                                <Text style={styles.googleButtonText}>
                                    {loading ? 'Signing in…' : 'Continue with Google'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.emailButton}
                                onPress={() => setShowEmailForm(true)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="email-outline" size={22} color="#FFFFFF" />
                                <Text style={styles.emailButtonText}>Continue with Email</Text>
                            </TouchableOpacity>

                            <Text style={styles.disclaimer}>
                                Your data is securely stored and{'\n'}synced across devices
                            </Text>
                        </View>
                    </>
                ) : (
                    /* Email/Password Form */
                    <View style={styles.emailFormSection}>
                        <Text style={styles.formTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

                        <TextInput
                            mode="outlined"
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            style={styles.input}
                            contentStyle={styles.inputContent}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                            outlineStyle={{ borderRadius: BorderRadius.md }}
                            left={<TextInput.Icon icon="email-outline" />}
                        />

                        <TextInput
                            mode="outlined"
                            label="Password"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            style={styles.input}
                            contentStyle={styles.inputContent}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                            outlineStyle={{ borderRadius: BorderRadius.md }}
                            left={<TextInput.Icon icon="lock-outline" />}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? 'eye-off' : 'eye'}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            }
                        />

                        {isSignUp && (
                            <TextInput
                                mode="outlined"
                                label="Confirm Password"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                style={styles.input}
                                contentStyle={styles.inputContent}
                                outlineColor={Colors.border}
                                activeOutlineColor={Colors.primary}
                                outlineStyle={{ borderRadius: BorderRadius.md }}
                                left={<TextInput.Icon icon="lock-check-outline" />}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.buttonDisabled]}
                            onPress={handleEmailAuth}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.submitButtonText}>
                                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchAuthMode}
                            onPress={() => setIsSignUp(!isSignUp)}
                        >
                            <Text style={styles.switchAuthText}>
                                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                                <Text style={styles.switchAuthLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                setShowEmailForm(false);
                                setEmail('');
                                setPassword('');
                                setConfirmPassword('');
                            }}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
                            <Text style={styles.backButtonText}>Back to sign-in options</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureIconBg}>
                <MaterialCommunityIcons name={icon as any} size={22} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.screenPadding,
    },
    topDecoration: {
        position: 'absolute',
        top: -80,
        right: -60,
    },
    circle1: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: Colors.primaryContainer,
        opacity: 0.6,
    },
    circle2: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#000000',
        opacity: 0.05,
        position: 'absolute',
        top: 100,
        left: -40,
    },
    brandSection: {
        alignItems: 'center',
        marginTop: 100,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        ...Elevation.medium,
    },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: '#000000',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
    },
    tagline: {
        fontSize: 17,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    featuresSection: {
        marginTop: 40,
        gap: Spacing.lg,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    featureIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 17,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    bottomSection: {
        marginTop: 'auto',
        paddingBottom: 48,
        paddingTop: 32,
        alignItems: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#DADCE0',
        borderRadius: BorderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
        justifyContent: 'center',
        gap: Spacing.md,
        minHeight: TouchTarget.minSize,
        ...Elevation.low,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    googleIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8EAED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#3C4043',
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        borderRadius: BorderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
        gap: Spacing.sm,
        marginTop: Spacing.md,
        minHeight: TouchTarget.minSize,
        ...Elevation.medium,
    },
    emailButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    disclaimer: {
        fontSize: 13,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.lg,
        lineHeight: 20,
    },
    // Email form
    emailFormSection: {
        marginTop: 32,
        paddingBottom: 40,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xl,
    },
    input: {
        backgroundColor: Colors.surface,
        fontSize: 17,
        marginBottom: Spacing.md,
    },
    inputContent: {
        fontSize: 17,
    },
    submitButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        marginTop: Spacing.md,
        minHeight: TouchTarget.minSize,
        ...Elevation.medium,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textOnPrimary,
    },
    switchAuthMode: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    switchAuthText: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
    switchAuthLink: {
        color: Colors.primary,
        fontWeight: '700',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xl,
        gap: Spacing.sm,
    },
    backButtonText: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
});
