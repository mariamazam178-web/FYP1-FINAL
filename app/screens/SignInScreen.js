import React, { useState, useEffect, useRef } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator, 
} from "react-native";

import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { LinearGradient } from "expo-linear-gradient";
import 'react-native-url-polyfill/auto' 
import * as Linking from 'expo-linking'; 
import { Ionicons } from '@expo/vector-icons'; 

import AskendLogo from "../../assets/images/logo.png"; 
import { supabase } from '../../supabaseClient'; 
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config'; 

const LOGIN_API_ENDPOINT = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

const SignInScreen = ({ navigation }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false); 
    const [isVerifyingLink, setIsVerifyingLink] = useState(false); 
    const [isCheckingDeepLink, setIsCheckingDeepLink] = useState(true); 
    const [isManualLoading, setIsManualLoading] = useState(false);
    
    const isMounted = useRef(true);

    // Deep Link Verification - OPTIMIZED
    useEffect(() => {
        isMounted.current = true;
        
        const handleDeepLinkVerification = async () => {
            try {
                // ✅ NO DELAY - Check immediately
                if (!isMounted.current) return;
                
                const initialUrl = await Linking.getInitialURL();
                
                if (!initialUrl) {
                    // ✅ No deep link - IMMEDIATELY show login
                    if (isMounted.current) {
                        setIsVerifyingLink(false);
                        setIsCheckingDeepLink(false);
                    }
                    return;
                }

                console.log("Deep link detected:", initialUrl);
                
                // ✅ Only set to true if we actually have a link
                if (isMounted.current) {
                    setIsVerifyingLink(true);
                }
                
                const url = new URL(initialUrl);
                const accessToken = url.searchParams.get('access_token');
                const refreshToken = url.searchParams.get('refresh_token');
                const type = url.searchParams.get('type'); 

                if (accessToken && (type === 'signup' || type === 'recovery')) { 
                    try {
                        console.log("Processing link type:", type);
                        
                        // ONLY FOR PASSWORD RESET
                        if (type === 'recovery') {
                            console.log("Password reset link detected");
                            if (isMounted.current) {
                                Alert.alert(
                                    "Password Reset", 
                                    "Please set your new password now."
                                );
                                setIsVerifyingLink(false);
                                setIsCheckingDeepLink(false);
                                navigation.replace('PasswordUpdateScreen', {
                                    accessToken: accessToken, 
                                    refreshToken: refreshToken,
                                });
                            }
                            return;
                        }
                        
                        // FOR SIGNUP VERIFICATION
                        if (type === 'signup') {
                            console.log("Email verification successful");
                            if (isMounted.current) {
                                Alert.alert(
                                    "Email Verified!", 
                                    "Your email has been successfully verified. Please log in to continue.",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {
                                                setIsVerifyingLink(false);
                                                setIsCheckingDeepLink(false);
                                            }
                                        }
                                    ]
                                );
                            }
                            return;
                        }
                        
                    } catch (error) {
                        console.error("Deep Link Error:", error);
                        if (isMounted.current) {
                            Alert.alert("Error", "Failed to process the link.");
                            setIsVerifyingLink(false);
                            setIsCheckingDeepLink(false);
                        }
                    }
                } else {
                    // Not a verification link
                    console.log("Not a verification link or missing token");
                    if (isMounted.current) {
                        setIsVerifyingLink(false);
                        setIsCheckingDeepLink(false);
                    }
                }
            } catch (error) {
                console.error("Deep Link Check Error:", error);
                if (isMounted.current) {
                    setIsVerifyingLink(false);
                    setIsCheckingDeepLink(false);
                }
            }
        };
        
        const subscription = Linking.addEventListener('url', ({ url }) => {
            if (url && isMounted.current) {
                console.log("URL event received:", url);
                handleDeepLinkVerification();
            }
        });

        handleDeepLinkVerification();
        
        return () => {
            isMounted.current = false;
            subscription.remove();
        };

    }, [navigation]); 

    // Manual Login
    async function signInWithEmail() {
        if (!email.trim() || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setIsManualLoading(true);
        
        try {
            const response = await fetch(LOGIN_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ 
                    email: email.trim(), 
                    password: password.trim()
                }),
            });

            const result = await response.json(); 

            if (result.error_description || !response.ok) {
                let errorMessage = result.error_description || 'Login failed. Please check your credentials.';
                Alert.alert("Login Failed", errorMessage);
                
            } else {
                const user = result.user; 
                
                if (user) {
                    const sessionObject = {
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                        expires_in: result.expires_in,
                        expires_at: result.expires_at,
                        user: result.user,
                    };
                    await AsyncStorage.setItem('@supabase_session', JSON.stringify(sessionObject)); 
                    
                    const { error: setSessionError, data: sessionData } = await supabase.auth.setSession({
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                    });
                    
                    if (setSessionError) {
                        console.error("Set Session Failed:", setSessionError.message);
                        Alert.alert("Session Error", "Could not synchronize session data.");
                        setIsManualLoading(false);
                        return;
                    } else if (sessionData && sessionData.session) {
                        await AsyncStorage.setItem('@supabase_session', JSON.stringify(sessionData.session));
                    }

                    const userRole = user.user_metadata?.user_role; 
                    
                    if (userRole) {
                        await AsyncStorage.setItem('userRole', userRole);
                        navigation.replace(
                            userRole === 'creator' ? 'CreatorDashboard' : 'FillerDashboard'
                        ); 
                    } else {
                        navigation.replace('ProfileCompletionScreen');
                    }
                } else {
                    Alert.alert("Login Failed", "Could not retrieve user session after signing in.");
                }
            }
        } catch (error) {
            console.error("Sign In Network Error:", error);
            Alert.alert('Sign In Failed', 'Could not connect to the server. Please check your internet connection.');
        }

        setIsManualLoading(false);
    }

    const isLoading = isManualLoading; // Only manual loading affects inputs

    // Show "Verifying..." ONLY if we're actually verifying a link
    if (isVerifyingLink) {
        return (
            <View style={[styles.container, styles.loadingOverlay]}>
                <ActivityIndicator size="large" color="#FF8C00" />
                <Text style={styles.loadingText}>Verifying secure link...</Text>
            </View>
        );
    }

    // Show brief splash ONLY during initial check (0.1 second max)
    if (isCheckingDeepLink) {
        return (
            <View style={[styles.container, styles.loadingOverlay]}>
                <ActivityIndicator size="large" color="#FF8C00" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return(
        <View style={styles.container}>
            <View style={styles.topShape1} />
            <View style={styles.topShape2} />
            <View style={styles.bottomShape1} />
            <View style={styles.bottomShape2} />

            <View style={styles.content}>
                
                <View style={styles.logoContainer}>
                    <Image
                        source={AskendLogo}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.logoWelcome}>Welcome</Text>
                </View>

                <Text style={styles.instructions}>
                    Please Enter your account details
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    selectTextOnFocus={true}
                    autoFocus={false}
                />

                <View style={styles.passwordWrapper}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        selectTextOnFocus={true}
                    />
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Ionicons 
                            name={showPassword ? "eye" : "eye-off"} 
                            size={24} 
                            color="#999" 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.row}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('ForgotPasswordScreen')} 
                    >
                        <Text style={styles.forgotPassword}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={signInWithEmail}
                    disabled={isLoading}
                    style={styles.buttonWrapper}
                >
                    <LinearGradient
                        colors={["#FF7E1D", "#FFD464"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.buttonText}>
                            {isLoading ? "Signing In..." : "Sign In"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don't have an account?</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("RoleSelection")}
                    >
                        <Text style={styles.signupLink}> Sign up</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
container: { 
    flex: 1, 
    backgroundColor: "#fff" 
},
loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
},
loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
},
topShape1: {
    position: "absolute",
    width: 170,
    height:170,
    borderRadius: 90,
    backgroundColor: "#FF7E1D", 
    top: -80,
    left: -50,
    opacity: 0.25,
    zIndex: 1,
},
topShape2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#E2BE09", 
    top: -180,
    right: -130,
    opacity: 0.25,
    zIndex: 1,
},
bottomShape1: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 110,
    backgroundColor: "#FF7E1D", 
    bottom: -150,
    right: -100,
    opacity: 0.25,
    zIndex: 1,
},
bottomShape2: {
    position: "absolute",
    width: 320,
    height: 265,
    borderRadius: 150,
    backgroundColor: "#E2BE09", 
    bottom: -170,
    left: -170,
    opacity: 0.25,
    zIndex: 1,
},
content: {
    flex: 1,
    paddingHorizontal: 35,
    justifyContent: "center",
    marginTop: 0, 
    zIndex: 5,
},
logoContainer: { 
    alignItems: "center", 
    marginBottom: -15 
},
logoImage: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: -15, 
},
logoWelcome: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#333",
    marginTop: -25,
    marginBottom: 0,
},
instructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
},
passwordWrapper: {
    marginBottom: 10, 
    position: 'relative',
    justifyContent: 'center',
},
passwordInput: {
    marginBottom: 0, 
    paddingRight: 50, 
},
eyeIcon: {
    position: 'absolute',
    right: 15,
    padding: 10,
    zIndex: 10,
},
input: {
    height: 50,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
},
row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 15, 
},
forgotPassword: { 
    fontSize: 14, 
    color: "#FF8C00", 
    fontWeight: "600" 
},
buttonWrapper: { 
    borderRadius: 10, 
    marginBottom: 20,
    elevation: 3 
},
gradientButton: { 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
},
buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold" 
},
signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
},
signupText: { 
    fontSize: 14, 
    color: "#666" 
},
signupLink: { 
    fontSize: 14, 
    color: "#FF8C00", 
    fontWeight: "bold" 
},
});

export default SignInScreen;