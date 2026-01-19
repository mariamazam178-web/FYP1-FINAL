import React, { useState, useEffect, useCallback } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    Alert, 
    Modal, 
    Dimensions,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';

const { width } = Dimensions.get('window');

const SUPABASE_URL = 'https://oyavjqycsjfcnzlshdsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YXZqcXljc2pmY256bHNoZHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTgwMjcsImV4cCI6MjA3NTczNDAyN30.22cwyIWSBmhLefCvobdbH42cPSTnw_NmSwbwaYvyLy4';

const USER_PROFILES_URL = `${SUPABASE_URL}/rest/v1/user_profiles`;
const SURVEY_RESPONSES_URL = `${SUPABASE_URL}/rest/v1/survey_responses`;
const SURVEYS_URL = `${SUPABASE_URL}/rest/v1/surveys`;

const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    try {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    } catch (error) {
        console.error('Error calculating age:', error);
        return null;
    }
};

// ✅ FIXED: Check if survey matches user demographics
const checkDemographicFilters = (userProfile, surveyFilters) => {
    if (!surveyFilters || Object.keys(surveyFilters).length === 0) {
        return true;
    }

    try {
        // Gender filter check
        if (surveyFilters.gender && userProfile.gender) {
            const userGender = userProfile.gender?.toString().toLowerCase().trim();
            const filterGender = surveyFilters.gender?.toString().toLowerCase().trim();
            
            if (userGender !== filterGender) {
                return false;
            }
        }

        // Age filter check
        if (surveyFilters.age && userProfile.age !== null && userProfile.age !== undefined) {
            const userAge = userProfile.age;
            const filterAge = surveyFilters.age;
            
            // Parse age range like "25-34"
            if (filterAge.includes('-')) {
                const [minAge, maxAge] = filterAge.split('-').map(Number);
                if (userAge < minAge || userAge > maxAge) {
                    return false;
                }
            }
        }

        // Marital status filter
        if (surveyFilters.marital_status && userProfile.marital_status) {
            const userStatus = userProfile.marital_status?.toString().toLowerCase().trim();
            const filterStatus = surveyFilters.marital_status?.toString().toLowerCase().trim();
            
            if (userStatus !== filterStatus) {
                return false;
            }
        }

        // Location filter
        if (surveyFilters.location && userProfile.city) {
            const userCity = userProfile.city?.toString().toLowerCase().trim();
            const filterCity = surveyFilters.location?.toString().toLowerCase().trim();
            
            if (userCity !== filterCity) {
                return false;
            }
        }

        // Education filter
        if (surveyFilters.education && userProfile.education) {
            const userEdu = userProfile.education?.toString().toLowerCase().trim();
            const filterEdu = surveyFilters.education?.toString().toLowerCase().trim();
            
            if (userEdu !== filterEdu) {
                return false;
            }
        }

        // Profession filter
        if (surveyFilters.profession && userProfile.profession) {
            const userProf = userProfile.profession?.toString().toLowerCase().trim();
            const filterProf = surveyFilters.profession?.toString().toLowerCase().trim();
            
            if (userProf !== filterProf) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error checking demographic filters:', error);
        return true; // Default to true on error
    }
};

const SurveyUnlockModal = ({ visible, onClose }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={modalStyles.modalOverlay}>
                <View style={modalStyles.surveyModalContent}>
                    <View style={modalStyles.surveyIconCircle}>
                        <MaterialIcons name="description" size={35} color="#fff" />
                    </View>
                    <Text style={modalStyles.surveyModalMessage}>
                        Your completed profile has unlocked new{" "}
                        <Text style={modalStyles.surveyModalHighlightBold}>paid surveys</Text>.
                        {"\n"}
                        Complete them to{" "}
                        <Text style={modalStyles.surveyModalHighlight}>start earning more</Text>.
                    </Text>
                    <TouchableOpacity onPress={onClose} style={modalStyles.surveyModalButtonContainer}>
                        <LinearGradient
                            colors={['#FF7E1D', '#FFD464']}
                            style={modalStyles.surveyModalButtonGradient}
                        >
                            <Text style={modalStyles.surveyModalButtonText}>Got it!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const RoleSwitchWelcomeModal = ({ visible, onClose, fromRole, toRole }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={roleSwitchStyles.modalOverlay}>
                <View style={roleSwitchStyles.modalContent}>
                    <View style={roleSwitchStyles.iconCircle}>
                        <MaterialCommunityIcons 
                            name="swap-horizontal" 
                            size={40} 
                            color="#fff" 
                        />
                    </View>
                    
                    <Text style={roleSwitchStyles.modalTitle}>
                        Switched to {toRole === 'creator' ? 'Creator' : 'Filler'} Mode
                    </Text>
                    
                    <Text style={roleSwitchStyles.modalMessage}>
                        {toRole === 'creator' 
                            ? 'You can now create and manage surveys. Your profile data will be used for survey targeting.'
                            : 'You can now participate in surveys. Available surveys will be filtered based on your profile.'}
                    </Text>
                    
                    <TouchableOpacity onPress={onClose} style={roleSwitchStyles.okButton}>
                        <LinearGradient
                            colors={['#FF7E1D', '#FFD464']}
                            style={roleSwitchStyles.okButtonGradient}
                        >
                            <Text style={roleSwitchStyles.okButtonText}>Got it!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ✅ NEW: Payment Success Modal
const PaymentSuccessModal = ({ visible, onClose, amount }) => {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={paymentModalStyles.modalOverlay}>
                <View style={paymentModalStyles.modalContent}>
                    <View style={paymentModalStyles.iconCircle}>
                        <MaterialIcons name="account-balance-wallet" size={35} color="#fff" />
                    </View>
                    <Text style={paymentModalStyles.modalTitle}>Payment Received!</Text>
                    <Text style={paymentModalStyles.modalAmount}>PKR {amount.toFixed(2)}</Text>
                    <Text style={paymentModalStyles.modalMessage}>
                        Amount has been added to your wallet successfully.
                    </Text>
                    <TouchableOpacity onPress={onClose} style={paymentModalStyles.okButton}>
                        <LinearGradient
                            colors={['#FF7E1D', '#FFD464']}
                            style={paymentModalStyles.okButtonGradient}
                        >
                            <Text style={paymentModalStyles.okButtonText}>Great!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const GreenProfileCompletionCard = ({ 
    isProfileComplete, 
    showGreenCard,
    navigation 
}) => {
    if (!isProfileComplete || !showGreenCard) {
        return null;
    }

    return (
        <TouchableOpacity 
            style={[styles.card, styles.greenProfileCard]}
            onPress={() => navigation.navigate('ProfileViewScreen')}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <LinearGradient
                    colors={['#38C172', '#69e09d']}
                    style={styles.iconGradientContainer}
                >
                    <MaterialIcons name="lock" size={28} color="#fff" />
                </LinearGradient>
                
                <View style={styles.cardContent}>
                    <Text style={styles.greenCardTitle}>Profile Complete</Text>
                    <Text style={styles.greenCardDescription}>
                        Your profile is now locked and verified
                    </Text>
                </View>
                
                <MaterialIcons name="check-circle" size={24} color="#38C172" />
            </View>
        </TouchableOpacity>
    );
};

const RegularProfileCard = ({ isProfileComplete, navigation }) => {
    if (isProfileComplete) {
        return null;
    }

    return (
        <TouchableOpacity 
            style={[styles.card, styles.incompleteProfileCard]}
            onPress={() => navigation.navigate('ProfileCompletionScreen')}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <LinearGradient
                    colors={['#FF7E1D', '#FFD464']}
                    style={styles.iconGradientContainer}
                >
                    <MaterialIcons name="person" size={28} color="#fff" />
                </LinearGradient>
                
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Complete Your Profile</Text>
                    <Text style={styles.cardDescription}>
                        Complete your profile to unlock surveys and start earning.
                    </Text>
                </View>
                
                <LinearGradient colors={['#FF7E1D', '#FFD464']} style={styles.solidCardButton}>
                    <Text style={styles.cardButtonText}>+ PKR 50</Text>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};

const getCategoryColor = (category) => {
    const colors = {
        'Customer Feedback': '#FF6B6B',
        'Market Research': '#4ECDC4',
        'Employee Satisfaction': '#45B7D1',
        'Product Feedback': '#96CEB4',
        'Academic Research': '#FFEAA7',
        'Event Feedback': '#DDA0DD',
        'Healthcare Survey': '#98D8C8',
        'User Experience': '#F7DC6F',
        'Brand Awareness': '#BB8FCE',
        'Social Research': '#85C1E9'
    };
    return colors[category] || '#FF7E1D';
};

const parseJsonColumn = (value, fallback) => {
    if (!value && value !== 0) {
        return fallback;
    }

    if (Array.isArray(value) || typeof value === 'object') {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed ?? fallback;
        } catch (error) {
            console.warn('Failed to parse JSON column:', error);
            return fallback;
        }
    }

    return fallback;
};

const parseSurveyQuestions = (rawQuestions) => {
    const parsed = parseJsonColumn(rawQuestions, []);
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
    }
    return [];
};

const parseDemographicFilters = (rawFilters) => {
    const parsed = parseJsonColumn(rawFilters, {});
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
    }
    return {};
};

// ✅ UPDATED: Calculate payment for each survey
const calculateSurveyPayment = (survey) => {
    try {
        const totalPrice = Number(survey?.price) || 0;
        const totalResponsesNeeded = Number(survey?.totalResponses) || 100;
        
        if (totalResponsesNeeded > 0) {
            const paymentPerResponse = totalPrice / totalResponsesNeeded;
            return Math.round(paymentPerResponse * 100) / 100; // Round to 2 decimal places
        }
        
        return totalPrice; // Default fallback
    } catch (error) {
        console.error('Error calculating survey payment:', error);
        return 0;
    }
};

// ✅ SIMPLE Survey Card without extra badges and messages
// ✅ UPDATED: Simple Survey Card with only category badge and reward amount
// ✅ UPDATED: Two separate badges side-by-side
const AvailableSurveyCard = ({ 
    survey, 
    onPress, 
    completed, 
    allowViewing = false,
    userProfile 
}) => {
    // Check if survey matches user demographics
    const matchesDemographics = checkDemographicFilters(userProfile, survey.demographicFilters || {});
    
    const cardGradientColors = completed ? ['#38C172', '#69e09d'] : ['#FF7E1D', '#FFD464'];
    const cardIcon = completed ? 'check-circle' : 'description';
    
    const cardBorderColor = completed ? '#38C172' : matchesDemographics ? '#FF7E1D' : '#CCCCCC';
    const cardBackgroundColor = completed ? '#38C17224' : matchesDemographics ? '#F6B93B24' : '#F5F5F5';
    const cardDisabled = completed && !allowViewing;
    const isGrayedOut = !matchesDemographics && !completed;
    
    // ✅ Calculate payment for this survey
    const surveyPayment = calculateSurveyPayment(survey);
    
    let surveyDescription = survey.description || 'Complete this survey and earn rewards';
    if (completed) {
        surveyDescription = 'You have completed this survey. Thank you!';
    } else if (isGrayedOut) {
        surveyDescription = 'Survey not available';
    }
    
    const progressPercentage = survey.totalResponses > 0 
        ? (survey.responsesCollected / survey.totalResponses) * 100 
        : 0;
    
    return (
        <TouchableOpacity 
            style={[
                styles.surveyCard, 
                { 
                    backgroundColor: cardBackgroundColor, 
                    borderColor: cardBorderColor,
                    opacity: isGrayedOut ? 0.6 : 1
                }
            ]}
            onPress={cardDisabled || isGrayedOut ? undefined : onPress}
            disabled={cardDisabled || isGrayedOut}
            activeOpacity={cardDisabled || isGrayedOut ? 1 : 0.8}
        >
            <View style={styles.cardHeader}>
                <LinearGradient
                    colors={isGrayedOut ? ['#999999', '#CCCCCC'] : cardGradientColors}
                    style={styles.iconGradientContainer}
                >
                    <MaterialIcons 
                        name={isGrayedOut ? 'lock' : cardIcon} 
                        size={24} 
                        color="#fff" 
                    />
                </LinearGradient>
                
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, isGrayedOut && { color: '#999' }]} numberOfLines={1}>
                        {survey.title}
                    </Text>
                    
                    {/* ✅ TWO SEPARATE BADGES SIDE-BY-SIDE */}
                    <View style={styles.badgesRow}>
                        {/* Category Badge */}
                        <View style={[styles.categoryBadge, { 
                            backgroundColor: isGrayedOut ? '#CCCCCC' : getCategoryColor(survey.category) 
                        }]}>
                            <Text style={styles.categoryBadgeText}>
                                {survey.category || 'General'}
                            </Text>
                        </View>
                        
                        {/* Payment Badge - Show only if not completed and not grayed out */}
                        {!isGrayedOut && !completed && (
                            <View style={styles.paymentBadge}>
                                <MaterialIcons name="account-balance-wallet" size={10} color="#fff" />
                                <Text style={styles.paymentBadgeText}>PKR {surveyPayment.toFixed(2)}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            
            <Text style={[styles.cardDescription, isGrayedOut && { color: '#999' }]} numberOfLines={2}>
                {surveyDescription}
            </Text>
            
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View 
                        style={[
                            styles.progressFill,
                            { 
                                width: `${Math.min(progressPercentage, 100)}%`,
                                backgroundColor: progressPercentage >= 100 ? '#4CAF50' : isGrayedOut ? '#CCCCCC' : '#FF7E1D'
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, isGrayedOut && { color: '#999' }]}>
                    {survey.responsesCollected}/{survey.totalResponses} responses
                </Text>
            </View>
            
            <View style={styles.cardFooter}>
                <View style={styles.timeEstimate}>
                </View>
                
                {completed ? (
                    allowViewing ? (
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={onPress}
                        >
                            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.actionButtonGradient}>
                                <MaterialIcons name="visibility" size={16} color="#fff" />
                                <Text style={styles.actionButtonText}>View Answers</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.actionButton, {backgroundColor: '#38C172'}]}>
                            <MaterialIcons name="check" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Completed</Text>
                        </View>
                    )
                ) : isGrayedOut ? (
                    <View style={[styles.actionButton, {backgroundColor: '#CCCCCC'}]}>
                        <MaterialIcons name="lock" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Not Available</Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={onPress}
                    >
                        <LinearGradient colors={['#FF7E1D', '#FFD464']} style={styles.actionButtonGradient}>
                            <MaterialIcons name="play-arrow" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Start</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};
const TabItem = ({ iconName, label, isCurrent, onPress }) => (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
        <MaterialCommunityIcons 
            name={iconName} 
            size={26}
            color={isCurrent ? '#fff' : 'rgba(255, 255, 255, 0.6)'} 
        />
        <Text style={[styles.tabLabel, { color: isCurrent ? '#fff' : 'rgba(255, 255, 255, 0.6)' }]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const FillerDashboardScreen = ({ navigation, route }) => {
    const [walletBalance, setWalletBalance] = useState(0);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [isSurveyUnlockModalVisible, setIsSurveyUnlockModalVisible] = useState(false);
    const [availableSurveys, setAvailableSurveys] = useState([]);
    const [completedSurveyIds, setCompletedSurveyIds] = useState(new Set());
    const [completedResponsesMap, setCompletedResponsesMap] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userName, setUserName] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    
    const [showGreenProfileCard, setShowGreenProfileCard] = useState(false);
    const [hasShownGreenCard, setHasShownGreenCard] = useState(false);
    const [greenCardTimer, setGreenCardTimer] = useState(null);
    
    const [surveyTab, setSurveyTab] = useState('available');
    const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
    const [switchedFrom, setSwitchedFrom] = useState('');
    
    // ✅ NEW: Payment success modal state
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);

    useEffect(() => {
        checkGreenCardStatus();
        return () => {
            if (greenCardTimer) {
                clearTimeout(greenCardTimer);
            }
        };
    }, []);

    const checkGreenCardStatus = async () => {
        try {
            const shown = await AsyncStorage.getItem('@has_shown_green_card');
            if (shown === 'true') {
                setHasShownGreenCard(true);
            }
        } catch (error) {
            console.error('Error checking green card status:', error);
        }
    };

    const markGreenCardAsShown = async () => {
        try {
            await AsyncStorage.setItem('@has_shown_green_card', 'true');
            setHasShownGreenCard(true);
        } catch (error) {
            console.error('Error saving green card status:', error);
        }
    };

    const showTemporaryGreenCard = () => {
        if (hasShownGreenCard) {
            return;
        }

        setShowGreenProfileCard(true);
        markGreenCardAsShown();
        
        const timer = setTimeout(() => {
            setShowGreenProfileCard(false);
        }, 120000);
        
        setGreenCardTimer(timer);
    };

    const fetchUserProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                return null;
            }

            const response = await fetch(
                `${USER_PROFILES_URL}?user_id=eq.${session.user.id}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                const profile = data[0];
                
                // ✅ Get username
                if (profile.full_name && profile.full_name.trim() !== '') {
                    const firstName = profile.full_name.split(' ')[0];
                    setUserName(firstName);
                } else {
                    const authName = session.user.user_metadata?.full_name;
                    if (authName) {
                        const firstName = authName.split(' ')[0];
                        setUserName(firstName);
                    } else {
                        setUserName('User');
                    }
                }
                
                const age = calculateAge(profile.date_of_birth);
                
                // Check profile completion for FILLER
                const requiredFieldsForFiller = [
                    'full_name', 'gender', 'date_of_birth', 'marital_status', 
                    'mobile_number', 'cnic_number', 'education', 'profession'
                ];
                
                const filledFields = requiredFieldsForFiller.filter(field => 
                    profile[field] && profile[field].toString().trim() !== ''
                );
                
                const isProfileComplete = filledFields.length === requiredFieldsForFiller.length;
                setIsProfileComplete(isProfileComplete);
                
                if (isProfileComplete && !profile.has_received_completion_bonus) {
                    showTemporaryGreenCard();
                }
                
                // Prepare user profile data for filtering
                const userProfileData = {
                    gender: profile.gender,
                    age: age,
                    education: profile.education,
                    profession: profile.profession,
                    marital_status: profile.marital_status,
                    city: profile.city,
                    monthly_income: profile.monthly_income,
                };
                
                setUserProfile(userProfileData);
                return userProfileData;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error fetching user profile:', error);
            return null;
        }
    }, []);

    const fetchCompletedSurveys = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { ids: new Set(), responses: new Map(), totalReward: 0 };

            const response = await fetch(
                `${SURVEY_RESPONSES_URL}?user_id=eq.${session.user.id}&select=survey_id,response_data,reward_amount`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const completedIds = new Set();
                const responsesMap = new Map();
                let totalReward = 0;

                data.forEach(item => {
                    const surveyId = item?.survey_id ? item.survey_id.toString() : null;
                    if (surveyId) {
                        completedIds.add(surveyId);
                        const parsedResponse = parseJsonColumn(item?.response_data, []);
                        responsesMap.set(surveyId, parsedResponse);
                    }

                    const rewardAmount = Number(item?.reward_amount) || 0;
                    totalReward += rewardAmount;
                });

                return { ids: completedIds, responses: responsesMap, totalReward };
            } else {
                return { ids: new Set(), responses: new Map(), totalReward: 0 };
            }
        } catch (error) {
            console.error('❌ Error fetching completed surveys:', error);
            return { ids: new Set(), responses: new Map(), totalReward: 0 };
        }
    }, []);

    const fetchAvailableSurveys = useCallback(async (userProfileData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            const token = session.access_token;
            
            const surveysResponse = await fetch(
                `${SURVEYS_URL}?select=id,title,description,category,price,responses_collected,total_responses,created_at,is_public_form,questions,demographic_filters,user_id,plan,plan_name&status=eq.published&order=created_at.desc`, 
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!surveysResponse.ok) {
                return [];
            }

            let surveys = await surveysResponse.json();
            
            // Filter surveys based on user profile
            let filteredSurveys = surveys.filter(survey => {
                const parsedFilters = parseDemographicFilters(survey.demographic_filters);
                const isPublic = survey.is_public_form === true;
                
                // Public surveys are accessible to everyone
                if (isPublic) {
                    return true;
                }
                
                // Private surveys need profile matching
                if (!userProfileData) {
                    return false;
                }
                
                // Check if user matches demographic filters
                const matches = checkDemographicFilters(userProfileData, parsedFilters);
                return matches;
            });
            
            // Transform survey data
            return filteredSurveys.map(survey => {
                const parsedQuestions = parseSurveyQuestions(survey.questions);
                const parsedFilters = parseDemographicFilters(survey.demographic_filters);
                
                return {
                    id: survey.id.toString(),
                    title: survey.title || "Untitled Survey",
                    description: survey.description || "No description provided",
                    category: survey.category || "General",
                    price: survey.price || 0,
                    responsesCollected: survey.responses_collected || 0,
                    totalResponses: survey.total_responses || 100,
                    createdAt: survey.created_at || new Date().toISOString(),
                    isPublicForm: survey.is_public_form || false,
                    status: 'published',
                    questions: parsedQuestions,
                    demographicFilters: parsedFilters,
                    user_id: survey.user_id,
                    plan: survey.plan || 'basic',
                    planName: survey.plan_name || 'Basic Plan'
                };
            });
            
        } catch (error) {
            console.error('❌ Error fetching available surveys:', error);
            return [];
        }
    }, []);

    const fetchWalletBalance = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return 0;

            const response = await fetch(
                `${USER_PROFILES_URL}?user_id=eq.${session.user.id}&select=wallet_balance`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    return data[0].wallet_balance || 0;
                }
            }
            return 0;
        } catch (error) {
            console.error('❌ Error fetching wallet balance:', error);
            return 0;
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    }, []);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            // Fetch wallet balance first
            const walletBal = await fetchWalletBalance();
            setWalletBalance(walletBal);

            const [userProfileData, completedSurveysResult] = await Promise.all([
                fetchUserProfile(),
                fetchCompletedSurveys()
            ]);
            
            if (userProfileData) {
                const availableSurveysData = await fetchAvailableSurveys(userProfileData);
                setAvailableSurveys(availableSurveysData);
            }
            
            if (completedSurveysResult) {
                setCompletedSurveyIds(completedSurveysResult.ids || new Set());
                setCompletedResponsesMap(completedSurveysResult.responses || new Map());
            }
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchUserProfile, fetchCompletedSurveys, fetchAvailableSurveys, fetchWalletBalance]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // ✅ Handle payment success
    const handlePaymentSuccess = (amount) => {
        setPaymentAmount(amount);
        setShowPaymentSuccessModal(true);
        // Refresh wallet balance
        fetchWalletBalance().then(balance => setWalletBalance(balance));
    };

    useEffect(() => {
        const { 
            awardedAmount, 
            isProfileComplete: profileCompleteStatus, 
            showSurveyUnlockPopup,
            showGreenProfileCard: showGreenCard,
            refreshKey,
            defaultSurveyTab,
            successSurveyTitle,
            switchedFromCreator,
            isProfileComplete,
            showPaymentSuccess // ✅ Check for payment success
        } = route.params || {};

        let needsParamClear = false;

        if (profileCompleteStatus !== undefined) {
            setIsProfileComplete(profileCompleteStatus);
        }

        if (awardedAmount > 0) {
            loadDashboardData();
            needsParamClear = true;
        }

        if (showSurveyUnlockPopup) {
            setIsSurveyUnlockModalVisible(true);
            needsParamClear = true;
        }

        if (showGreenCard && !hasShownGreenCard) {
            showTemporaryGreenCard();
            needsParamClear = true;
        }

        if (defaultSurveyTab) {
            setSurveyTab(defaultSurveyTab);
            needsParamClear = true;
        }

        if (refreshKey) {
            loadDashboardData();
            needsParamClear = true;
        }

        if (successSurveyTitle) {
            needsParamClear = true;
        }
        
        if (switchedFromCreator) {
            setSwitchedFrom('creator');
            setShowRoleSwitchModal(true);
            
            if (isProfileComplete) {
                Alert.alert(
                    "Welcome to Filler Mode!",
                    "Your profile is already complete. You can now participate in surveys matching your profile.",
                    [{ text: "OK" }]
                );
            }
            needsParamClear = true;
        }
        
        // ✅ Handle payment success
        if (showPaymentSuccess && awardedAmount > 0) {
            handlePaymentSuccess(awardedAmount);
            needsParamClear = true;
        }
        
        if (needsParamClear) {
            navigation.setParams({ 
                awardedAmount: undefined,
                showSurveyUnlockPopup: false,
                showGreenProfileCard: undefined,
                refreshKey: undefined,
                defaultSurveyTab: undefined,
                successSurveyTitle: undefined,
                switchedFromCreator: undefined,
                isProfileComplete: undefined,
                showPaymentSuccess: undefined
            });
        }
    }, [route.params, navigation, hasShownGreenCard, loadDashboardData]);

    const handleSurveyClick = (survey) => {
        if (completedSurveyIds.has(survey.id)) {
            Alert.alert('Already Completed', 'You have already completed this survey.');
            return;
        }
        
        navigation.navigate('ViewPublishedSurveyScreen', { 
            surveyId: survey.id,
            survey: survey,
            mode: 'fill'
        });
    };

    const handleViewSubmission = (survey) => {
        const savedResponses = completedResponsesMap.get(survey.id) || [];
        navigation.navigate('ViewPublishedSurveyScreen', {
            surveyId: survey.id,
            survey,
            mode: 'view-submission',
            readonlyResponses: savedResponses,
        });
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF7E1D" />
                    <Text style={styles.loadingText}>Loading dashboard...</Text>
                </View>
            );
        }

        const upcomingSurveys = availableSurveys.filter((survey) => !completedSurveyIds.has(survey.id));
        const filledSurveysList = availableSurveys.filter((survey) => completedSurveyIds.has(survey.id));
        const isAvailableTab = surveyTab === 'available';
        const listToRender = isAvailableTab ? upcomingSurveys : filledSurveysList;
        
        const sectionTitleText = isAvailableTab ? 'Available Surveys' : 'Filled Surveys';

        return (
        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    colors={['#FF7E1D']}
                    tintColor="#FF7E1D"
                />
            }
        >
            <GreenProfileCompletionCard
                isProfileComplete={isProfileComplete}
                showGreenCard={showGreenProfileCard}
                navigation={navigation}
            />

            <RegularProfileCard 
                isProfileComplete={isProfileComplete}
                navigation={navigation}
            />

            {isProfileComplete ? (
                <>
                    <View style={styles.tabSwitcher}>
                        <TouchableOpacity
                            style={[styles.tabChip, isAvailableTab && styles.tabChipActive]}
                            onPress={() => setSurveyTab('available')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabChipText, isAvailableTab && styles.tabChipTextActive]}>Available</Text>
                            <View style={[styles.tabChipCounter, isAvailableTab && styles.tabChipCounterActive]}>
                                <Text style={[styles.tabChipCounterText, isAvailableTab && styles.tabChipCounterTextActive]}>
                                    {upcomingSurveys.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabChip, !isAvailableTab && styles.tabChipActive]}
                            onPress={() => setSurveyTab('filled')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabChipText, !isAvailableTab && styles.tabChipTextActive]}>Filled</Text>
                            <View style={[styles.tabChipCounter, !isAvailableTab && styles.tabChipCounterActive]}>
                                <Text style={[styles.tabChipCounterText, !isAvailableTab && styles.tabChipCounterTextActive]}>
                                    {filledSurveysList.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ✅ FIXED: Removed wallet badge from section header */}
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#FF7E1D" />
                        <Text style={styles.sectionTitle}>{sectionTitleText}</Text>
                        {/* ❌ REMOVED: <View style={styles.walletBadge}>...</View> */}
                    </View>
                    
                    {listToRender.length > 0 ? (
                        <>
                            {listToRender.map((survey) => {
                                const isCompleted = completedSurveyIds.has(survey.id);
                                const allowViewing = !isAvailableTab && isCompleted;
                                const onPressHandler = allowViewing
                                    ? () => handleViewSubmission(survey)
                                    : () => handleSurveyClick(survey);

                                return (
                                    <AvailableSurveyCard
                                        key={survey.id}
                                        survey={survey}
                                        completed={isCompleted}
                                        allowViewing={allowViewing}
                                        onPress={onPressHandler}
                                        userProfile={userProfile}
                                    />
                                );
                            })}
                        </>
                    ) : (
                        <View style={styles.emptySurveysContainer}>
                            <MaterialIcons name={isAvailableTab ? 'search-off' : 'check-circle'} size={50} color="#ddd" />
                            <Text style={styles.emptySurveysText}>
                                {isAvailableTab ? 'No matching surveys found' : 'No filled surveys yet'}
                            </Text>
                            <Text style={styles.emptySurveysSubtext}>
                                {isAvailableTab
                                    ? 'No surveys available at the moment.'
                                    : 'Completed surveys will appear here once you submit responses.'}
                            </Text>
                            {isAvailableTab && (
                                <TouchableOpacity 
                                    style={styles.refreshButton}
                                    onPress={onRefresh}
                                >
                                    <MaterialIcons name="refresh" size={20} color="#FF7E1D" />
                                    <Text style={styles.refreshButtonText}>Refresh</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </>
            ) : (
                <View style={styles.surveysLockedContainer}>
                    <MaterialIcons name="lock" size={40} color="#FF7E1D" style={styles.lockIcon} />
                    <Text style={styles.surveysLockedTitle}>Surveys Locked</Text>
                    <Text style={styles.surveysLockedText}>
                        Complete your profile to unlock available surveys
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FF7E1D', '#FFD464']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.welcomeText}>
                        {userName ? `Welcome, ${userName}` : 'Welcome'}
                    </Text>
                    
                    <TouchableOpacity 
                        style={styles.walletButton}
                        onPress={() => navigation.navigate('WalletScreen')}
                    >
                        <MaterialIcons 
                            name="account-balance-wallet" 
                            size={20} 
                            color="#FF7E1D" 
                        />
                        <Text style={styles.walletText}>PKR {walletBalance.toFixed(2)}</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {renderContent()}

            <LinearGradient
                colors={['#FF7E1D', '#FFD464']}
                style={styles.bottomNav}
            >
                <TabItem 
                    iconName="clipboard-list-outline" 
                    label="Surveys" 
                    isCurrent={true} 
                    onPress={() => {}} 
                />
                <TabItem 
                    iconName="wallet-outline" 
                    label="Wallet" 
                    isCurrent={false}
                    onPress={() => navigation.navigate('WalletScreen')}
                />
                <TabItem 
                    iconName="account-circle-outline" 
                    label="Profile" 
                    isCurrent={false}
                    onPress={() => navigation.navigate('ProfileViewScreen')}
                />
            </LinearGradient>

            <SurveyUnlockModal
                visible={isSurveyUnlockModalVisible}
                onClose={() => setIsSurveyUnlockModalVisible(false)}
            />
            
            <RoleSwitchWelcomeModal
                visible={showRoleSwitchModal}
                onClose={() => setShowRoleSwitchModal(false)}
                fromRole={switchedFrom}
                toRole="filler"
            />
            
            {/* ✅ Payment Success Modal */}
            <PaymentSuccessModal
                visible={showPaymentSuccessModal}
                onClose={() => setShowPaymentSuccessModal(false)}
                amount={paymentAmount}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 15, 
        paddingBottom: 50, 
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        maxWidth: '60%',
    },
    walletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
    },
    walletText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF7E1D',
        marginLeft: 5,
    },
    loadingContainer: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20,
    },
    loadingText: {
        marginTop: 10, 
        fontSize: 16, 
        color: '#666', 
        marginBottom: 20,
    },
    scrollContent: {
        paddingTop: 20,
        paddingHorizontal: 15, 
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
        
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
       
    },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5EC',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#FFE0BF',
    },
    walletBadgeText: {
        fontSize: 12,
        color: '#FF7E1D',
        fontWeight: '600',
        marginLeft: 4,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#FFF5EC',
        borderRadius: 16,
        padding: 6,
        borderWidth: 1,
        borderColor: '#FFE0BF',
        marginTop: 10,
        marginBottom: 10,
    },
    tabChip: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    tabChipActive: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FFD19B',
        shadowColor: '#FF7E1D',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    tabChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#AA5A16',
    },
    tabChipTextActive: {
        color: '#FF7E1D',
    },
    tabChipCounter: {
        minWidth: 32,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFE3C7',
        paddingHorizontal: 8,
    },
    tabChipCounterActive: {
        backgroundColor: '#FF7E1D',
    },
    tabChipCounterText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#C0762E',
    },
    tabChipCounterTextActive: {
        color: '#fff',
    },
    card: {
        borderWidth: 1.5, 
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        marginLeft: 5,
        marginRight: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    surveyCard: {
        borderWidth: 1.5, 
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        marginLeft: 5,
        marginRight: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    greenProfileCard: {
        backgroundColor: '#38C17224',
        borderColor: '#38C172',
    },
    greenCardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    greenCardDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        lineHeight: 20,
    },
    incompleteProfileCard: {
        backgroundColor: '#F6B93B24',
        borderColor: '#FF7E1D',
    },
    cardContent: {
        flex: 1,
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    cardDescription: {
        fontSize: 13,
        color: '#666',
        marginBottom: 10,
        lineHeight: 18,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
  badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 6, // Reduced from 8 to bring badges closer
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF7E1D',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    paymentBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 3,
    },

    iconGradientContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    progressContainer: {
        marginBottom: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#666',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeEstimate: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 5,
    },
    solidCardButton: {
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 15,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptySurveysContainer: { 
        alignItems: 'center', 
        paddingVertical: 40,
        backgroundColor: '#FFF9F0',
        borderRadius: 15,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FFE4CC',
    },
    emptySurveysText: {
        fontSize: 18, 
        fontWeight: '600', 
        color: '#FF7E1D',
        marginTop: 15,
    },
    emptySurveysSubtext: {
        fontSize: 14, 
        color: '#666', 
        marginTop: 5,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#FFD464',
        marginTop: 15,
    },
    refreshButtonText: {
        fontSize: 14,
        color: '#FF7E1D',
        fontWeight: '600',
        marginLeft: 8,
    },
    surveysLockedContainer: {
        alignItems: 'center', 
        paddingVertical: 40, 
        paddingHorizontal: 20,
        backgroundColor: '#FFF9F0', 
        borderRadius: 15, 
        marginTop: 10,
        borderWidth: 1, 
        borderColor: '#FFE4CC',
    },
    lockIcon: { 
        marginBottom: 15 
    },
    surveysLockedTitle: {
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#333', 
        marginBottom: 10,
    },
    surveysLockedText: {
        fontSize: 16, 
        color: '#FF7E1D',
        textAlign: 'center', 
        lineHeight: 24,
        fontStyle: 'italic',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabItem: {
        alignItems: 'center',
        padding: 10,
    },
    tabLabel: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
});

const modalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1, 
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center', 
        alignItems: 'center',
    },
    surveyModalContent: {
        width: width * 0.85, 
        backgroundColor: '#fff',
        borderRadius: 15, 
        padding: 30, 
        alignItems: 'center',
    },
    surveyIconCircle: {
        width: 70, 
        height: 70, 
        borderRadius: 35,
        backgroundColor: '#FF9933', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 25,
    },
    surveyModalMessage: {
        fontSize: 18, 
        color: '#1C2A39', 
        textAlign: 'center',
        marginBottom: 30, 
        lineHeight: 28, 
        fontWeight: '500',
    },
    surveyModalHighlightBold: { 
        fontWeight: 'bold', 
        color: '#1C2A39' 
    },
    surveyModalHighlight: { 
        fontWeight: 'bold', 
        color: '#FF7E1D' 
    },
    surveyModalButtonContainer: { 
        width: '100%' 
    },
    surveyModalButtonGradient: {
        paddingVertical: 15, 
        borderRadius: 10, 
        alignItems: 'center',
    },
    surveyModalButtonText: {
        color: '#fff', 
        fontSize: 18, 
        fontWeight: 'bold',
    },
});

const roleSwitchStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF7E1D',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    okButton: {
        width: '100%',
    },
    okButtonGradient: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    okButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// ✅ Payment Success Modal Styles
const paymentModalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    okButton: {
        width: '100%',
    },
    okButtonGradient: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    okButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default FillerDashboardScreen;