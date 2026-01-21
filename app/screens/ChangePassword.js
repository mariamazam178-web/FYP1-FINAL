import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';

// Password Criteria Component (SignUpScreen jaisa hi)
const PasswordCriteria = ({ meetsRequirement, label }) => {
    const color = meetsRequirement ? "#00A86B" : "#A9A9A9";
    const icon = meetsRequirement ? "✓" : "•";
    
    return (
        <View style={styles.criteriaItem}>
            <Text style={[styles.criteriaIcon, { color }]}>{icon}</Text>
            <Text style={[styles.criteriaLabel, { color }]}>{label}</Text>
        </View>
    );
};

// Custom TextInput component for better styling
const CustomTextInput = ({ placeholder, value, onChangeText, secureTextEntry = false, label, onTogglePassword }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.passwordInputContainer}>
            <TextInput
                style={styles.textInput}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={onTogglePassword}>
                <MaterialIcons 
                    name={secureTextEntry ? "visibility-off" : "visibility"} 
                    size={24} 
                    color="#999" 
                />
            </TouchableOpacity>
        </View>
        <View style={styles.divider} />
    </View>
);

// Change Password Screen
const ChangePasswordScreen = ({ navigation }) => {
    // State variables according to the UI
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password criteria state
    const [criteria, setCriteria] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false,
    });

    // 🛡️ BLACKLIST for EXTREMELY WEAK PASSWORDS ONLY
    // Only include passwords that are TOO COMMON AND WEAK
    const EXTREMELY_WEAK_PASSWORDS = [
        "password",
        "12345678",
        "123456789",
        "1234567890",
        "qwerty",
        "abc123",
        "password1",
        "admin123",
        "letmein",
        "welcome",
        "monkey",
        "dragon",
        "baseball",
        "football",
        "superman",
        "harley",
        "michael",
        "shadow",
        "master",
        "jennifer",
        "jordan",
        "trustno1",
        "sunshine",
        "iloveyou",
        "starwars",
        "computer",
        "whatever",
        "hello",
        "zaq1zaq1",
        "password123",
        "admin",
        "12345",
        "1234",
    ];

    // 🔑 PASSWORD VALIDATION FUNCTION - UPDATED LOGIC
    const validatePassword = (password) => {
        const MAX_LENGTH = 128; 
        const trimmedPassword = password.trim();

        // 1. Required Field
        if (!trimmedPassword) {
            return "Password is required.";
        }

        // 2. Maximum Length Check
        if (trimmedPassword.length > MAX_LENGTH) {
            return `Password cannot exceed ${MAX_LENGTH} characters.`;
        }

        // 3. Check if password is EXACTLY one of the extremely weak passwords
        // (not just contains, but is exactly the weak password)
        const lowerPassword = trimmedPassword.toLowerCase();
        const isExtremelyWeak = EXTREMELY_WEAK_PASSWORDS.some(
            weakPass => lowerPassword === weakPass.toLowerCase()
        );
        
        if (isExtremelyWeak) {
            return "This password is too common and weak. Please choose a stronger one.";
        }

        // 4. Check if password is too short
        if (trimmedPassword.length < 13) {
            return "Password must be at least 13 characters long.";
        }

        return ""; // No error
    };

    // Validate new password criteria (SignUpScreen jaisa hi)
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
    }, [newPassword]);

    const isPasswordStrong = Object.values(criteria).every(val => val === true);

    // Function to verify current password by re-authenticating user
    const verifyCurrentPassword = async (password) => {
        try {
            // Get current user's email
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Unable to retrieve user information');
            }

            // Re-authenticate user with current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password,
            });

            if (signInError) {
                // Check if error is due to invalid credentials
                if (signInError.message.includes('Invalid login credentials') || 
                    signInError.message.includes('Invalid email or password')) {
                    return { success: false, error: 'Current password is incorrect' };
                }
                throw signInError;
            }

            return { success: true };
        } catch (error) {
            console.error('Password verification error:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to verify current password' 
            };
        }
    };

    const handlePasswordChange = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all the password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New password and confirmation password do not match.');
            return;
        }

        // Check if current and new passwords are different
        if (currentPassword === newPassword) {
            Alert.alert('Error', 'New password must be different from current password.');
            return;
        }

        // Check if password meets all criteria - SHOW SPECIFIC ERROR
        if (!isPasswordStrong) {
            // Find which criteria are missing
            const missingCriteria = [];
            if (!criteria.length) missingCriteria.push("• At least 13 characters");
            if (!criteria.uppercase) missingCriteria.push("• At least one uppercase letter (A-Z)");
            if (!criteria.lowercase) missingCriteria.push("• At least one lowercase letter (a-z)");
            if (!criteria.number) missingCriteria.push("• At least one number (0-9)");
            if (!criteria.symbol) missingCriteria.push("• At least one symbol (!@#$%^&*)");
            
            Alert.alert(
                'Password Requirements Not Met', 
                `Please ensure your password meets all the following requirements:\n\n${missingCriteria.join('\n')}`
            );
            return;
        }

        // Additional validation - ONLY for extremely weak passwords
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            Alert.alert('Error', passwordError);
            return;
        }

        setLoading(true);
        try {
            // Step 1: Verify current password
            const verification = await verifyCurrentPassword(currentPassword);
            
            if (!verification.success) {
                Alert.alert('Authentication Failed', verification.error || 'Current password is incorrect.');
                setLoading(false);
                return;
            }

            // Step 2: Update password if current password is verified
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                Alert.alert('Update Failed', `Could not update password. Error: ${error.message}`);
            } else {
                Alert.alert(
                    'Success', 
                    'Your password has been changed successfully.',
                    [{ 
                        text: 'OK', 
                        onPress: () => {
                            // Clear all password fields
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            navigation.goBack();
                        }
                    }]
                );
            }
        } catch (error) {
            console.error('Password change error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    
                    <LinearGradient
                        colors={['#FFD464', '#FF7E1D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.lockCircle}
                    >
                        <MaterialIcons name="lock-open" size={40} color="#FFFFFF" />
                    </LinearGradient>
                    
                    <Text style={styles.mainTitle}>Change Password</Text>
                    <Text style={styles.subText}>
                        Your security matters. Please set a strong new password.
                    </Text>
                </View>

                {/* Password Input Fields */}
                <View style={styles.formContainer}>
                    <CustomTextInput
                        label="Current Password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
                    />

                    <CustomTextInput
                        label="New Password"
                        placeholder="Enter a strong new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                    />
                    
                    {/* Password Strength Indicators (SignUpScreen jaisa) */}
                    {newPassword.length > 0 && (
                        <View style={styles.criteriaContainer}>
                            <View style={styles.criteriaRow}>
                                <PasswordCriteria meetsRequirement={criteria.length} label="Min 13 Characters" />
                                <PasswordCriteria meetsRequirement={criteria.uppercase} label="Uppercase Letter" />
                            </View>
                            <View style={styles.criteriaRow}>
                                <PasswordCriteria meetsRequirement={criteria.lowercase} label="Lowercase Letter" />
                                <PasswordCriteria meetsRequirement={criteria.symbol} label="One Symbol (!@#$.)" /> 
                            </View>
                            <View style={styles.criteriaRow}>
                                <PasswordCriteria meetsRequirement={criteria.number} label="One Number (0-9)" />
                                <View style={styles.criteriaItem} /> 
                            </View>
                        </View>
                    )}
                    
                    <CustomTextInput
                        label="Confirm New Password"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                </View>

                {/* Save Changes Button */}
                <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handlePasswordChange}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#FF7E1D', '#FFD464']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButtonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

// ----------------------------------------------------
// 🎨 STYLES
// ----------------------------------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 40,
        paddingBottom: 40,
        alignItems: 'center',
    },
    // Top Header UI
    header: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        padding: 10,
    },
    lockCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        opacity: 0.8,
        elevation: 5,
        shadowColor: '#FF7E1D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    // Form Styles
    formContainer: {
        width: '100%',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F4EB',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 60,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    eyeIcon: {
        padding: 5,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginTop: 5,
    },
    // Password Criteria Styles (SignUpScreen jaisa)
    criteriaContainer: {
        marginBottom: 20,
        paddingLeft: 5,
    },
    criteriaRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    criteriaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        marginBottom: 5,
    },
    criteriaIcon: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
    },
    criteriaLabel: {
        fontSize: 13,
    },
    // Save Button
    saveButton: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    saveButtonGradient: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Cancel Button
    cancelButton: {
        paddingVertical: 10,
    },
    cancelButtonText: {
        color: '#888',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ChangePasswordScreen;