import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';

const { width, height } = Dimensions.get('window');

// Password profanity blacklist
const PROFANITY_BLACKLIST = [
    "badword1", 
    "swearword2", 
    "idiot", 
    "stupid",
    "admin",
    "password", 
    "123456789",
    "qwerty",
    "111111111",
];

// Password Criteria Component
const PasswordCriteria = ({ meetsRequirement, label }) => {
    const color = meetsRequirement ? "#00A86B" : "#A9A9A9";
    const icon = meetsRequirement ? "✓" : "•";
    
    return (
        <View style={styles.criteriaItem}>
            <Text style={[styles.criteriaIcon, { color }]}>{icon}</Text>
            <Text style={[styles.criteriaLabel, { color }]} numberOfLines={1}>{label}</Text>
        </View>
    );
};

// Main Component
const PasswordUpdateScreen = ({ route, navigation }) => {
    const { accessToken, refreshToken } = route.params || {};

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordMatchError, setPasswordMatchError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [criteria, setCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false,
    });

    // Password validation function
    const validatePassword = (p) => {
        const MAX_LENGTH = 128; 
        const trimmedPassword = p.trim();

        if (!trimmedPassword) {
            return "Password is required.";
        }

        if (trimmedPassword.length > MAX_LENGTH) {
            return `Password cannot exceed ${MAX_LENGTH} characters.`;
        }

        const lowerPassword = trimmedPassword.toLowerCase();
        const isBlacklisted = PROFANITY_BLACKLIST.some(word => lowerPassword.includes(word));
        if (isBlacklisted) {
            return "Avoid very common or weak passwords.";
        }

        return ""; 
    };

    // Check password strength criteria
    useEffect(() => {
        const checkPasswordStrength = (p) => {
            const minLength = 13;
            setCriteria({
                length: p.length >= minLength,
                uppercase: /[A-Z]/.test(p),
                lowercase: /[a-z]/.test(p),
                number: /[0-9]/.test(p),
                symbol: /[!@#$%^&*\.]/.test(p), 
            });
        };
        
        checkPasswordStrength(newPassword);
        
        // Only validate password if it's not empty
        if (newPassword.length > 0) {
            setPasswordError(validatePassword(newPassword)); 
        } else {
            setPasswordError('');
        }
        
        // Check password match
        if (newPassword.length > 0 && confirmPassword.length > 0) {
            if (newPassword === confirmPassword) {
                setPasswordMatchError('');
            } else {
                setPasswordMatchError("Passwords do not match.");
            }
        } else if (confirmPassword.length === 0 && passwordMatchError) {
            setPasswordMatchError(''); 
        }
    }, [newPassword, confirmPassword]);

    // Check if password meets all criteria
    const isPasswordStrong = Object.values(criteria).every(val => val === true);

    // Final validation before submission
    const validatePasswords = () => {
        // Clear previous errors
        setPasswordError('');
        setPasswordMatchError('');
        
        let hasError = false;
        
        // Validate password
        const passwordValidation = validatePassword(newPassword);
        if (passwordValidation) {
            setPasswordError(passwordValidation);
            hasError = true;
        }
        
        // Check if password meets all criteria
        if (!isPasswordStrong && newPassword.length > 0) {
            Alert.alert(
                "Security Requirement", 
                "Please ensure your password meets all the listed security criteria.",
                [{ text: "OK" }]
            );
            return false;
        }
        
        // Check password match
        if (newPassword !== confirmPassword) {
            setPasswordMatchError("Passwords do not match.");
            hasError = true;
        }
        
        return !hasError;
    };

    // Handle password update
    const handlePasswordUpdate = async () => {
        if (!validatePasswords()) {
            return;
        }
        
        if (!accessToken || !refreshToken) {
            Alert.alert("Error", "Session data is missing. Please try the reset link again.");
            return;
        }

        setIsLoading(true);

        try {
            // Set session
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (sessionError) {
                console.error("Session Set Error:", sessionError);
                Alert.alert("Error", "Could not verify reset link. Please try again.");
                return;
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({ 
                password: newPassword 
            });

            if (updateError) {
                console.error("Password Update Error:", updateError);
                Alert.alert("Update Failed", updateError.message);
            } else {
                Alert.alert(
                    "Success!",
                    "Your password has been updated successfully. Please sign in with your new password.",
                    [{ text: "OK", onPress: () => navigation.replace('SignIn') }]
                );
            }

        } catch (e) {
            console.error('General Error during update:', e);
            Alert.alert("System Error", "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#FF7E1D', '#FFD464']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.backgroundGradient}
            >
                <KeyboardAvoidingView 
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
                >
                    <ScrollView 
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        <View style={styles.card}>
                            
                            <MaterialIcons name="lock" size={60} color="#FF8C00" style={styles.icon} />
                            
                            <Text style={styles.title}>Set New Password</Text>
                            
                            <Text style={styles.subtitle}>
                                Please enter and confirm your new password to regain access to your account.
                            </Text>

                            {/* New Password Input */}
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View style={[
                                styles.inputWrapper, 
                                (passwordError || passwordMatchError) && styles.inputErrorContainer
                            ]}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#a0a0a0"
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    editable={!isLoading}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                />
                                <TouchableOpacity 
                                    style={styles.eyeIcon} 
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    disabled={isLoading}
                                >
                                    <Ionicons 
                                        name={showNewPassword ? "eye" : "eye-off"}  
                                        size={22} 
                                        color="#666" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {passwordError ? (
                                <Text style={styles.errorText} numberOfLines={2}>
                                    {passwordError}
                                </Text>
                            ) : null}
                            
                            {/* Password Strength Indicators */}
                            {newPassword.length > 0 && (
                                <View style={styles.criteriaContainer}>
                                    <View style={styles.criteriaRow}>
                                        <PasswordCriteria 
                                            meetsRequirement={criteria.length} 
                                            label="Min 13 Chars" 
                                        />
                                        <PasswordCriteria 
                                            meetsRequirement={criteria.uppercase} 
                                            label="Uppercase" 
                                        />
                                    </View>
                                    <View style={styles.criteriaRow}>
                                        <PasswordCriteria 
                                            meetsRequirement={criteria.lowercase} 
                                            label="Lowercase" 
                                        />
                                        <PasswordCriteria 
                                            meetsRequirement={criteria.symbol} 
                                            label="Symbol (!@#$.)" 
                                        />
                                    </View>
                                    <View style={styles.criteriaRow}>
                                        <PasswordCriteria 
                                            meetsRequirement={criteria.number} 
                                            label="Number (0-9)" 
                                        />
                                        <View style={styles.flexItem} />
                                    </View>
                                </View>
                            )}
                            
                            {/* Confirm Password Input */}
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={[
                                styles.inputWrapper, 
                                passwordMatchError && styles.inputErrorContainer
                            ]}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#a0a0a0"
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    editable={!isLoading}
                                    returnKeyType="done"
                                    onSubmitEditing={handlePasswordUpdate}
                                />
                                <TouchableOpacity 
                                    style={styles.eyeIcon} 
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye" : "eye-off"}  
                                        size={22} 
                                        color="#666" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {passwordMatchError ? (
                                <Text style={styles.errorText} numberOfLines={2}>
                                    {passwordMatchError}
                                </Text>
                            ) : null}
                            
                            {/* Update Button */}
                            <TouchableOpacity 
                                onPress={handlePasswordUpdate} 
                                style={styles.updateButtonContainer}
                                disabled={isLoading || !isPasswordStrong || !newPassword || !confirmPassword}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#FFD464', '#FF7E1D']} 
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[
                                        styles.updateButtonGradient, 
                                        (isLoading || !isPasswordStrong || !newPassword || !confirmPassword) && 
                                        { opacity: 0.6 }
                                    ]}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.updateButtonText}>Update Password</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Go Back */}
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('SignIn')} 
                                style={styles.backButton}
                                disabled={isLoading}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.backButtonText}>Cancel and Go to Sign In</Text>
                            </TouchableOpacity>
                            
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
};

// STYLES
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FF7E1D',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    backgroundGradient: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: height,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        minWidth: Math.min(width * 0.9, 400),
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#555',
        alignSelf: 'flex-start',
        marginBottom: 8,
        marginTop: 16,
        width: '100%',
    },
    inputWrapper: {
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
        marginBottom: 4,
    },
    textInput: {
        width: '100%',
        height: 52,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingRight: 50,
        fontSize: 16,
        color: '#333',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
    },
    inputErrorContainer: {
        borderColor: '#FF3B30',
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        padding: 8,
    },
    errorText: {
        fontSize: 13,
        color: '#FF3B30',
        marginTop: 4,
        marginBottom: 8,
        fontWeight: '500',
        alignSelf: 'flex-start',
        width: '100%',
    },
    criteriaContainer: {
        marginBottom: 12,
        marginTop: 8,
        width: '100%',
    },
    criteriaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 6,
    },
    criteriaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        minHeight: 20,
    },
    flexItem: {
        width: '48%',
    },
    criteriaIcon: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 6,
        width: 20,
        textAlign: 'center',
    },
    criteriaLabel: {
        fontSize: 12,
        color: '#777',
        flex: 1,
    },
    updateButtonContainer: {
        marginTop: 24,
        width: '100%',
        borderRadius: 30,
        overflow: 'hidden',
    },
    updateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: '#FF7E1D',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    backButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    backButtonText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    }
});

export default PasswordUpdateScreen;