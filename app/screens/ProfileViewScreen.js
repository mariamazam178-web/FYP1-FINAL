import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabaseClient";
import * as Location from 'expo-location';

const SUPABASE_URL = "https://oyavjqycsjfcnzlshdsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YXZqcXljc2pmY256bHNoZHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTgwMjcsImV4cCI6MjA3NTczNDAyN30.22cwyIWSBmhLefCvobdbH42cPSTnw_NmSwbwaYvyLy4";
const USER_PROFILES_URL = `${SUPABASE_URL}/rest/v1/user_profiles`;

const InfoRow = ({ label, value }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "Not provided"}</Text>
    </View>
  );
};

const EditableInfoRow = ({ 
  label, 
  value, 
  canEdit, 
  onEdit,
  nextEditDate,
  editFrequency = 12
}) => {
  const handlePress = () => {
    if (!canEdit && nextEditDate) {
      Alert.alert(
        'Editing Locked',
        `You can edit ${label.toLowerCase()} only once every ${editFrequency} months.\n\nYou can edit again on:\n${nextEditDate}`,
        [{ text: 'OK' }]
      );
    } else {
      onEdit();
    }
  };

  return (
    <View style={styles.editableInfoRow}>
      <View style={styles.editableInfoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || "Not provided"}</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.editButton,
          !canEdit && styles.editButtonDisabled
        ]}
        onPress={handlePress}
      >
        <LinearGradient
          colors={canEdit ? ['#FF7E1D', '#FFD464'] : ['#cccccc', '#dddddd']}
          style={styles.editButtonGradient}
        >
          <MaterialIcons 
            name={canEdit ? "edit" : "lock"} 
            size={16} 
            color={canEdit ? "#fff" : "#999"} 
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const EditableInfoRowForLocation = ({ 
  label, 
  value, 
  canEdit, 
  onEdit,
  nextEditDate,
  editFrequency = 12
}) => {
  const handlePress = () => {
    if (!canEdit && nextEditDate) {
      Alert.alert(
        'Editing Locked',
        `You can edit ${label.toLowerCase()} only once every ${editFrequency} months.\n\nYou can edit again on:\n${nextEditDate}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Update Location',
        'Your current location will be detected automatically. Do you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Detect Location', onPress: onEdit }
        ]
      );
    }
  };

  return (
    <View style={styles.editableInfoRow}>
      <View style={styles.editableInfoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || "Not provided"}</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.editButton,
          !canEdit && styles.editButtonDisabled
        ]}
        onPress={handlePress}
      >
        <LinearGradient
          colors={canEdit ? ['#FF7E1D', '#FFD464'] : ['#cccccc', '#dddddd']}
          style={styles.editButtonGradient}
        >
          <MaterialIcons 
            name={canEdit ? "location-on" : "lock"} 
            size={16} 
            color={canEdit ? "#fff" : "#999"} 
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const SectionHeader = ({ 
  title, 
  iconName, 
  showEditButton, 
  onEdit, 
  canEdit, 
  nextEditDate, 
  editFrequency 
}) => {
  const handlePress = () => {
    if (!canEdit && nextEditDate) {
      Alert.alert(
        'Editing Locked',
        `You can edit ${title.toLowerCase()} only once every ${editFrequency} months.\n\nYou can edit again on:\n${nextEditDate}`,
        [{ text: 'OK' }]
      );
    } else {
      onEdit();
    }
  };

  return (
    <View style={styles.sectionHeaderWithEdit}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={iconName} size={20} color="#FF7E1D" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      
      {showEditButton && (
        <TouchableOpacity
          style={[
            styles.sectionEditButton,
            !canEdit && styles.sectionEditButtonDisabled
          ]}
          onPress={handlePress}
        >
          <LinearGradient
            colors={canEdit ? ['#FF7E1D', '#FFD464'] : ['#cccccc', '#dddddd']}
            style={styles.sectionEditButtonGradient}
          >
            <MaterialIcons 
              name={canEdit ? "edit" : "lock"} 
              size={14} 
              color={canEdit ? "#fff" : "#999"} 
            />
            <Text style={[
              styles.sectionEditButtonText,
              !canEdit && styles.sectionEditButtonTextDisabled
            ]}>
              {canEdit ? 'Edit' : 'Locked'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const TabItem = ({ iconName, label, isCurrent, onPress }) => (
  <TouchableOpacity
    style={styles.tabItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons
      name={iconName}
      size={24}
      color={isCurrent ? "#fff" : "rgba(255, 255, 255, 0.6)"}
    />
    <Text
      style={[
        styles.tabLabel,
        { color: isCurrent ? "#fff" : "rgba(255, 255, 255, 0.6)" },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const getUserInitials = (fullName) => {
  if (!fullName) return "U";
  const names = fullName.split(" ");
  if (names.length >= 2)
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  return names[0].charAt(0).toUpperCase();
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

const isFieldEditable = (lastUpdated, profileCreatedAt, months = 0) => {
  // If never edited, check against profile creation date
  if (!lastUpdated) {
    if (!profileCreatedAt) return true; // No profile creation date, allow editing
    
    const profileCreationDate = new Date(profileCreatedAt);
    const today = new Date();
    
    // Calculate months since profile was created
    const diffMonths = (today.getFullYear() - profileCreationDate.getFullYear()) * 12 
      + (today.getMonth() - profileCreationDate.getMonth());
    
    return diffMonths >= months;
  }
  
  // If edited before, check against last edit date
  const lastUpdateDate = new Date(lastUpdated);
  const today = new Date();
  
  // Calculate months difference
  const diffMonths = (today.getFullYear() - lastUpdateDate.getFullYear()) * 12 
    + (today.getMonth() - lastUpdateDate.getMonth());
  
  return diffMonths >= months;
};

const getNextEditDate = (lastUpdated, profileCreatedAt, monthsRequired) => {
  const referenceDate = lastUpdated ? new Date(lastUpdated) : new Date(profileCreatedAt);
  
  if (!referenceDate || isNaN(referenceDate.getTime())) {
    return null;
  }
  
  const nextUpdateDate = new Date(referenceDate);
  nextUpdateDate.setMonth(nextUpdateDate.getMonth() + monthsRequired);
  
  const now = new Date();
  
  if (now >= nextUpdateDate) {
    return null;
  }
  
  return nextUpdateDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const ProfileViewScreen = ({ navigation, route }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [switchedFrom, setSwitchedFrom] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
  // Edit permission states - ALL FIELDS now
  const [canEditProfession, setCanEditProfession] = useState(false);
  const [canEditEducation, setCanEditEducation] = useState(false);
  const [canEditHobbies, setCanEditHobbies] = useState(false);
  const [canEditMaritalStatus, setCanEditMaritalStatus] = useState(false);
  const [canEditLocation, setCanEditLocation] = useState(false);
  const [canEditMobileNumber, setCanEditMobileNumber] = useState(false);
  const [canEditMonthlyIncome, setCanEditMonthlyIncome] = useState(false);
  
  const [professionNextEditDate, setProfessionNextEditDate] = useState("");
  const [educationNextEditDate, setEducationNextEditDate] = useState("");
  const [hobbiesNextEditDate, setHobbiesNextEditDate] = useState("");
  const [maritalStatusNextEditDate, setMaritalStatusNextEditDate] = useState("");
  const [locationNextEditDate, setLocationNextEditDate] = useState("");
  const [mobileNumberNextEditDate, setMobileNumberNextEditDate] = useState("");
  const [monthlyIncomeNextEditDate, setMonthlyIncomeNextEditDate] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (route.params?.refreshedProfile) {
      fetchProfileData();
      navigation.setParams({ refreshedProfile: undefined });
    }
  }, [route.params]);

  useEffect(() => {
    if (profileData) {
      const profileCreatedAt = profileData.profile_completed_at;
      
      // Check profession (can edit every 12 months)
      const profEditable = isFieldEditable(
        profileData.profession_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditProfession(profEditable);
      setProfessionNextEditDate(getNextEditDate(
        profileData.profession_last_updated, 
        profileCreatedAt,
        12
      ));
      
      // Check education (can edit every 12 months)
      const eduEditable = isFieldEditable(
        profileData.education_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditEducation(eduEditable);
      setEducationNextEditDate(getNextEditDate(
        profileData.education_last_updated, 
        profileCreatedAt,
        12
      ));
      
      // Check hobbies (can edit every 6 months)
      const hobbiesEditable = isFieldEditable(
        profileData.hobbies_last_updated, 
        profileCreatedAt,
        6
      );
      setCanEditHobbies(hobbiesEditable);
      setHobbiesNextEditDate(getNextEditDate(
        profileData.hobbies_last_updated, 
        profileCreatedAt,
        6
      ));
      
      // Check marital status (can edit every 12 months)
      const maritalEditable = isFieldEditable(
        profileData.marital_status_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditMaritalStatus(maritalEditable);
      setMaritalStatusNextEditDate(getNextEditDate(
        profileData.marital_status_last_updated, 
        profileCreatedAt,
        12
      ));
      
      // Check location (can edit every 12 months)
      const locationEditable = isFieldEditable(
        profileData.location_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditLocation(locationEditable);
      setLocationNextEditDate(getNextEditDate(
        profileData.location_last_updated, 
        profileCreatedAt,
        12
      ));
      
      // Check mobile number (can edit every 12 months)
      const mobileEditable = isFieldEditable(
        profileData.mobile_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditMobileNumber(mobileEditable);
      setMobileNumberNextEditDate(getNextEditDate(
        profileData.mobile_last_updated, 
        profileCreatedAt,
        12
      ));
      
      // Check monthly income (can edit every 12 months)
      const incomeEditable = isFieldEditable(
        profileData.income_last_updated, 
        profileCreatedAt,
        12
      );
      setCanEditMonthlyIncome(incomeEditable);
      setMonthlyIncomeNextEditDate(getNextEditDate(
        profileData.income_last_updated, 
        profileCreatedAt,
        12
      ));
    }
  }, [profileData]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        Alert.alert("Session Expired", "Please sign in again.");
        navigation.navigate("SignIn");
        return;
      }

      setUserEmail(session.user.email || "");

      const response = await fetch(
        `${USER_PROFILES_URL}?user_id=eq.${session.user.id}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const profile = data[0];
          setProfileData(profile);
          
          // Get wallet balance
          if (profile.wallet_balance !== undefined) {
            setWalletBalance(profile.wallet_balance);
          }

          if (profile.full_name)
            setUserInitials(getUserInitials(profile.full_name));

          const userResponse = await supabase.auth.getUser();
          if (userResponse.data?.user?.user_metadata?.user_role) {
            setUserRole(userResponse.data.user.user_metadata.user_role);
          } else if (profile.user_role) {
            setUserRole(profile.user_role);
          } else {
            setUserRole("filler");
          }
          
        } else {
          Alert.alert(
            "Profile Not Found",
            "Please complete your profile first."
          );
          navigation.navigate("ProfileCompletionScreen", {
            userRole: userRole,
            comingFrom: 'profile_view'
          });
        }
      } else {
        Alert.alert("Error", "Failed to fetch profile data.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "An error occurred while loading profile.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatIncome = (income) => {
    if (income === null || income === undefined || income === 0) return "Not provided";
    return `PKR ${income.toLocaleString()}`;
  };

  const formatLocation = (location) => {
    if (!location) return "Not provided";
    return location;
  };

  const formatHobbies = (hobbiesData) => {
    if (!hobbiesData || typeof hobbiesData !== "object") return "Not provided";
    let result = [];
    Object.entries(hobbiesData).forEach(([category, subcategories]) => {
      if (Array.isArray(subcategories))
        result.push(`${category}: ${subcategories.join(", ")}`);
    });
    return result.length > 0 ? result.join("\n") : "Not provided";
  };

  const handleChangePassword = () => navigation.navigate("ChangePassword");

  const handleNavigateToSurveys = () => {
    if (userRole === "filler") {
      navigation.reset({
        index: 0,
        routes: [{ 
          name: "FillerDashboard"
        }],
      });
    } else if (userRole === "creator") {
      navigation.reset({
        index: 0,
        routes: [{ 
          name: "CreatorDashboard"
        }],
      });
    } else {
      navigation.navigate("FillerDashboard");
    }
  };

  const handleNavigateToWallet = () => {
    navigation.navigate("WalletScreen", { walletBalance });
  };

  const handleNavigateToProfile = () => {};

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: "SignIn" }] });
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const toggleRoleDropdown = () => setShowRoleDropdown(!showRoleDropdown);

  const switchUserRole = async () => {
    setSwitchingRole(true);
    try {
      const newRole = userRole === "filler" ? "creator" : "filler";
      const {
        data: { user },
        error,
      } = await supabase.auth.updateUser({ data: { user_role: newRole } });

      if (error) {
        Alert.alert("Error", "Failed to switch role. Please try again.");
        return;
      }

      const oldRole = userRole;
      setUserRole(newRole);
      setShowRoleDropdown(false);
      
      setSwitchedFrom(oldRole);
      setShowRoleSwitchModal(true);
      
    } catch (error) {
      console.error("Error switching role:", error);
      Alert.alert("Error", "Failed to switch role. Please try again.");
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleRoleSwitchModalClose = () => {
    setShowRoleSwitchModal(false);
    
    if (userRole === "filler") {
      navigation.reset({
        index: 0,
        routes: [{ 
          name: "FillerDashboard",
          params: { 
            switchedFromCreator: switchedFrom === 'creator',
            refreshKey: Date.now()
          }
        }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ 
          name: "CreatorDashboard",
          params: { 
            refreshKey: Date.now()
          }
        }],
      });
    }
  };

  const getRoleDisplayName = () =>
    userRole === "creator" ? "Creator Account" : "Filler Account";
  const getOppositeRoleDisplayName = () =>
    userRole === "creator"
      ? "Switch to Filler Account"
      : "Switch to Creator Account";

  // Edit functions
  const handleEditProfession = () => {
    navigation.navigate("EditProfileScreen", {
      field: 'profession',
      currentValue: profileData.profession,
      lastUpdated: profileData.profession_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id
    });
  };

  const handleEditEducation = () => {
    navigation.navigate("EditProfileScreen", {
      field: 'education',
      currentValue: profileData.education,
      lastUpdated: profileData.education_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id
    });
  };

  const handleEditHobbies = () => {
    navigation.navigate("InterestAndHobbies", {
      editMode: true,
      currentHobbies: profileData.hobbies_data,
      lastUpdated: profileData.hobbies_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id,
      comingFrom: 'profile_view'
    });
  };

  const handleEditMaritalStatus = () => {
    navigation.navigate("EditProfileScreen", {
      field: 'marital_status',
      currentValue: profileData.marital_status,
      lastUpdated: profileData.marital_status_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id
    });
  };

  const handleEditMobileNumber = () => {
    navigation.navigate("EditProfileScreen", {
      field: 'mobile_number',
      currentValue: profileData.mobile_number,
      lastUpdated: profileData.mobile_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id
    });
  };

  const handleEditMonthlyIncome = () => {
    navigation.navigate("EditProfileScreen", {
      field: 'monthly_income',
      currentValue: profileData.monthly_income ? profileData.monthly_income.toString() : '',
      lastUpdated: profileData.income_last_updated,
      profileCreatedAt: profileData.profile_completed_at,
      userId: profileData.user_id
    });
  };

  const handleEditLocation = async () => {
    if (!canEditLocation) {
      Alert.alert(
        'Editing Locked',
        `You can edit location only once every 12 months.\n\nYou can edit again on:\n${locationNextEditDate}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setUpdatingLocation(true);
    
    try {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to update your location.',
          [{ text: 'OK' }]
        );
        setUpdatingLocation(false);
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      let address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let locationString = '';
      if (address.length > 0) {
        const addr = address[0];
        locationString = `${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`.trim();
      } else {
        locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      // Ask for confirmation
      Alert.alert(
        'Update Location',
        `Your detected location is: ${locationString}\n\nDo you want to update your profile with this location?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Update',
            onPress: async () => {
              try {
                const {
                  data: { session },
                  error: sessionError,
                } = await supabase.auth.getSession();
                
                if (sessionError || !session) {
                  Alert.alert("Session Expired", "Please sign in again.");
                  navigation.navigate("SignIn");
                  return;
                }

                const updateData = {
                  location_coords: locationString,
                  location_last_updated: new Date().toISOString(),
                };

                const response = await fetch(
                  `${USER_PROFILES_URL}?user_id=eq.${profileData.user_id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                      'apikey': SUPABASE_ANON_KEY,
                      'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(updateData),
                  }
                );

                if (response.ok) {
                  Alert.alert('Success', 'Location updated successfully!', [
                    {
                      text: 'OK',
                      onPress: () => {
                        fetchProfileData();
                      }
                    }
                  ]);
                } else {
                  const errorText = await response.text();
                  console.error('Location update failed:', errorText);
                  Alert.alert('Error', 'Failed to update location. Please try again.');
                }
              } catch (error) {
                console.error('Error updating location:', error);
                Alert.alert('Error', 'An unexpected error occurred.');
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert('Error', 'Failed to detect your location. Please try again.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  if (loading && !refreshing)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7E1D" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );

  if (!profileData)
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={50} color="#FF7E1D" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfileData}>
          <LinearGradient
            colors={["#FF7E1D", "#FFD464"]}
            style={styles.retryButtonGradient}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, { marginTop: 15 }]} 
          onPress={() => navigation.navigate("ProfileCompletionScreen")}
        >
          <LinearGradient
            colors={["#FF7E1D", "#FFD464"]}
            style={styles.retryButtonGradient}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Create Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#FF7E1D", "#FFD464"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (userRole === "filler") {
                navigation.navigate("FillerDashboard");
              } else {
                navigation.navigate("CreatorDashboard");
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.logoutButtonHeader}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonHeaderText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerUserInfo}>
          <LinearGradient
            colors={["#FF7E1D", "#FFD464", "#8A2BE2"]}
            locations={[0, 1, 0.7]}
            style={styles.userInitialsCircle}
          >
            <Text style={styles.userInitialsText}>{userInitials}</Text>
          </LinearGradient>
          <View style={styles.userTextContainer}>
            <Text style={styles.usernameText}>
              {profileData.full_name || "User Name"}
            </Text>
            <Text style={styles.userEmailText}>{userEmail}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF7E1D']}
            tintColor="#FF7E1D"
          />
        }
      >
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderContainer}>
            <SectionHeader
              title="Personal Information"
              iconName="person-outline"
            />
          </View>
          <InfoRow label="Full Name" value={profileData.full_name} />
          <InfoRow label="Gender" value={profileData.gender} />
          <InfoRow
            label="Date of Birth"
            value={formatDate(profileData.date_of_birth)}
          />
          
          <EditableInfoRow
            label="Marital Status"
            value={profileData.marital_status}
            canEdit={canEditMaritalStatus}
            onEdit={handleEditMaritalStatus}
            nextEditDate={maritalStatusNextEditDate}
            editFrequency={12}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderContainer}>
            <SectionHeader
              title="Contact Information"
              iconName="contact-phone"
            />
          </View>
          
          <EditableInfoRow
            label="Mobile Number"
            value={profileData.mobile_number}
            canEdit={canEditMobileNumber}
            onEdit={handleEditMobileNumber}
            nextEditDate={mobileNumberNextEditDate}
            editFrequency={12}
          />
          
          <InfoRow label="CNIC" value={profileData.cnic_number} />
          
          <EditableInfoRowForLocation
            label="Location"
            value={formatLocation(profileData.location_coords)}
            canEdit={canEditLocation}
            onEdit={handleEditLocation}
            nextEditDate={locationNextEditDate}
            editFrequency={12}
          />
          {updatingLocation && (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color="#FF7E1D" />
              <Text style={styles.locationLoadingText}>Detecting your location...</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderContainer}>
            <SectionHeader
              title="Professional Information"
              iconName="work-outline"
            />
          </View>
          
          <EditableInfoRow
            label="Profession"
            value={profileData.profession}
            canEdit={canEditProfession}
            onEdit={handleEditProfession}
            nextEditDate={professionNextEditDate}
            editFrequency={12}
          />
          
          <EditableInfoRow
            label="Education"
            value={profileData.education}
            canEdit={canEditEducation}
            onEdit={handleEditEducation}
            nextEditDate={educationNextEditDate}
            editFrequency={12}
          />
          
          <InfoRow label="Major" value={profileData.major} />
          
          <EditableInfoRow
            label="Monthly Income"
            value={formatIncome(profileData.monthly_income)}
            canEdit={canEditMonthlyIncome}
            onEdit={handleEditMonthlyIncome}
            nextEditDate={monthlyIncomeNextEditDate}
            editFrequency={12}
          />
        </View>

        {profileData.hobbies_data &&
          Object.keys(profileData.hobbies_data).length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderContainer}>
                <SectionHeader
                  title="Interests & Hobbies"
                  iconName="favorite"
                  showEditButton={true}
                  onEdit={handleEditHobbies}
                  canEdit={canEditHobbies}
                  nextEditDate={hobbiesNextEditDate}
                  editFrequency={6}
                />
              </View>
              <Text style={styles.hobbiesText}>
                {formatHobbies(profileData.hobbies_data)}
              </Text>
            </View>
          )}

        {/* Account Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderContainer}>
            <SectionHeader
              title="Account Information"
              iconName="account-circle"
            />
          </View>
          <View style={styles.roleRow}>
            <View style={styles.roleInfo}>
              <Text style={styles.roleLabel}>Account Type</Text>
              <View style={styles.roleValueContainer}>
                <LinearGradient
                  colors={["#FF7E1D", "#FFD464"]}
                  style={styles.roleBadge}
                >
                  <Text style={styles.roleBadgeText}>
                    {getRoleDisplayName()}
                  </Text>
                </LinearGradient>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editRoleButton}
              onPress={toggleRoleDropdown}
              disabled={switchingRole}
            >
              {switchingRole ? (
                <ActivityIndicator size="small" color="#FF7E1D" />
              ): (
                <LinearGradient
                  colors={["#FF7E1D", "#FFD464"]}
                  style={styles.editRoleButtonGradient}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={20}
                    color="#fff"
                  />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.roleInfoContainer}>
            <MaterialIcons name="info" size={16} color="#FF7E1D" />
            <Text style={styles.roleInfoText}>
              {userRole === "creator"
                ? "You can create and manage surveys. Your profile data will be used for survey targeting."
                : "You can participate in surveys and earn rewards. Available surveys are filtered based on your profile."}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={handleChangePassword}
        >
          <LinearGradient
            colors={["#FF7E1D", "#FFD464"]}
            style={styles.changePasswordButtonGradient}
          >
            <MaterialIcons name="lock" size={20} color="#fff" />
            <Text style={styles.changePasswordButtonText}>Change Password</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        transparent={true}
        visible={showRoleDropdown}
        animationType="fade"
        onRequestClose={() => setShowRoleDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Switch Account Type</Text>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={switchUserRole}
              disabled={switchingRole}
            >
              <LinearGradient
                colors={["#FF7E1D", "#FFD464"]}
                style={styles.dropdownIconContainer}
              >
                <MaterialCommunityIcons
                  name={
                    userRole === "creator"
                      ? "account-outline"
                      : "clipboard-edit-outline"
                  }
                  size={24}
                  color="#fff"
                />
              </LinearGradient>
              <View style={styles.dropdownOptionText}>
                <Text style={styles.dropdownOptionTitle}>
                  {getOppositeRoleDisplayName()}
                </Text>
                <Text style={styles.dropdownOptionDescription}>
                  {userRole === "creator"
                    ? "Fill surveys and earn rewards"
                    : "Create and manage surveys"}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownCancel}
              onPress={() => setShowRoleDropdown(false)}
            >
              <Text style={styles.dropdownCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      <RoleSwitchWelcomeModal
        visible={showRoleSwitchModal}
        onClose={handleRoleSwitchModalClose}
        fromRole={switchedFrom}
        toRole={userRole}
      />

      <LinearGradient
        colors={["#FF7E1D", "#FFD464"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomNav}
      >
        <TabItem
          iconName="clipboard-list"
          label="Surveys"
          isCurrent={false}
          onPress={handleNavigateToSurveys}
        />
        <TabItem
          iconName="wallet"
          label="Wallet"
          isCurrent={false}
          onPress={handleNavigateToWallet}
        />
        <TabItem
          iconName="account"
          label="Profile"
          isCurrent={true}
          onPress={handleNavigateToProfile}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: -25,
  },
  backButton: { padding: 8 },
  logoutButtonHeader: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  logoutButtonHeaderText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  headerUserInfo: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  userInitialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  userInitialsText: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF" },
  userTextContainer: { alignItems: "center", marginBottom: 10 },
  usernameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmailText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { marginTop: 15, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  errorText: { fontSize: 18, color: "#333", marginTop: 15, marginBottom: 25 },
  retryButton: { width: 200 },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    paddingHorizontal: 20,
  },
  retryButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold",
    marginLeft: 10,
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 100, 
    paddingTop: 20,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 126, 29, 0.3)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeaderContainer: {
    backgroundColor: "rgba(255, 212, 100, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center" },
  sectionHeaderWithEdit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  sectionEditButton: {
    padding: 5,
  },
  sectionEditButtonDisabled: {
    opacity: 0.7,
  },
  sectionEditButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    justifyContent: 'center',
    minWidth: 60,
  },
  sectionEditButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionEditButtonTextDisabled: {
    color: '#999',
  },
  editableInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  editableInfoContent: {
    flex: 1,
  },
  editButton: {
    marginLeft: 10,
  },
  editButtonDisabled: {
    opacity: 0.7,
  },
  editButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 5,
  },
  locationLoadingText: {
    fontSize: 12,
    color: '#FF7E1D',
    marginLeft: 8,
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    marginBottom: 8,
  },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 14, color: "#666", marginBottom: 5 },
  roleValueContainer: { flexDirection: "row", alignItems: "center" },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  roleBadgeText: { fontSize: 14, fontWeight: "bold", color: "#fff" },
  editRoleButton: { padding: 5, marginLeft: 10 },
  editRoleButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#FF7E1D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  roleInfoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 212, 100, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  roleInfoText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  label: { fontSize: 14, color: "#666", flex: 1 },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    paddingLeft: 10,
  },
  hobbiesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginTop: 10,
    padding: 5,
  },
  changePasswordButton: { marginTop: 10, marginBottom: 25 },
  changePasswordButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
  },
  changePasswordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  bottomPadding: { height: 70 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "80%",
    elevation: 10,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 126, 29, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  dropdownIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  dropdownOptionText: { flex: 1, marginLeft: 15 },
  dropdownOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  dropdownOptionDescription: { fontSize: 13, color: "#666", lineHeight: 18 },
  dropdownCancel: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 5,
  },
  dropdownCancelText: { fontSize: 16, color: "#FF7E1D", fontWeight: "600" },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 70,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  tabItem: {
    alignItems: "center",
    padding: 5,
    flex: 1,
    justifyContent: "center",
  },
  tabLabel: { fontSize: 12, marginTop: 4, fontWeight: "bold" },
});

const roleSwitchStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
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

export default ProfileViewScreen;