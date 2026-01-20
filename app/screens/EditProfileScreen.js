import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';

const SUPABASE_URL = "https://oyavjqycsjfcnzlshdsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YXZqcXljc2pmY256bHNoZHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTgwMjcsImV4cCI6MjA3NTczNDAyN30.22cwyIWSBmhLefCvobdbH42cPSTnw_NmSwbwaYvyLy4";
const USER_PROFILES_URL = `${SUPABASE_URL}/rest/v1/user_profiles`;

const EditProfileScreen = ({ navigation, route }) => {
  const { field, currentValue, lastUpdated, profileCreatedAt, userId } = route.params;
  const [value, setValue] = useState(currentValue || '');
  const [loading, setLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [nextEditDate, setNextEditDate] = useState('');

  const fieldConfig = {
    profession: {
      label: 'Profession',
      placeholder: 'Enter your profession',
      monthsRequired: 12,
    },
    education: {
      label: 'Education',
      placeholder: 'Enter your education level',
      monthsRequired: 12,
    }
  };

  const config = fieldConfig[field] || fieldConfig.profession;

  useEffect(() => {
    checkEditPermission();
  }, []);

  const checkEditPermission = () => {
    const referenceDate = lastUpdated ? new Date(lastUpdated) : new Date(profileCreatedAt);
    
    if (!referenceDate || isNaN(referenceDate.getTime())) {
      setCanEdit(true);
      return;
    }

    const today = new Date();
    
    // Calculate months difference
    const diffMonths = (today.getFullYear() - referenceDate.getFullYear()) * 12 
      + (today.getMonth() - referenceDate.getMonth());
    
    const canEditNow = diffMonths >= config.monthsRequired;
    setCanEdit(canEditNow);

    if (!canEditNow) {
      const nextUpdateDate = new Date(referenceDate);
      nextUpdateDate.setMonth(nextUpdateDate.getMonth() + config.monthsRequired);
      
      // Format the date nicely
      const formattedDate = nextUpdateDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      setNextEditDate(formattedDate);
    }
  };

  const handleSave = async () => {
    if (!value.trim()) {
      Alert.alert('Error', `Please enter your ${config.label.toLowerCase()}`);
      return;
    }

    if (!canEdit) {
      Alert.alert(
        'Editing Locked',
        `You can edit ${config.label.toLowerCase()} only once every ${config.monthsRequired} months.\n\nYou can edit again on:\n${nextEditDate}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
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
        [field]: value,
        [`${field}_last_updated`]: new Date().toISOString(),
      };

      const response = await fetch(
        `${USER_PROFILES_URL}?user_id=eq.${userId || session.user.id}`,
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
        Alert.alert('Success', `${config.label} updated successfully!`, [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ProfileViewScreen', { 
                refreshedProfile: true,
                showSuccessMessage: `${config.label} updated!`
              });
            }
          }
        ]);
      } else {
        const errorText = await response.text();
        console.error('Update failed:', errorText);
        Alert.alert('Error', 'Failed to update. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getReferenceDate = () => {
    return lastUpdated || profileCreatedAt;
  };

  const getReferenceType = () => {
    if (lastUpdated) return 'Last Edited';
    if (profileCreatedAt) return 'Profile Created';
    return 'Never';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF7E1D', '#FFD464']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit {config.label}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MaterialIcons 
              name={canEdit ? 'lock-open' : 'lock'} 
              size={20} 
              color={canEdit ? '#4CAF50' : '#FF7E1D'} 
            />
            <Text style={styles.infoTitle}>
              {canEdit ? 'Editable Now' : 'Editing Locked'}
            </Text>
          </View>
          <Text style={styles.infoText}>
            You can edit your {config.label.toLowerCase()} only once every {config.monthsRequired} months.
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.detailValue}>
              {getReferenceType()}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(getReferenceDate())}
            </Text>
          </View>
          
          {!canEdit && nextEditDate && (
            <View style={styles.warningBox}>
              <MaterialIcons name="calendar-today" size={18} color="#FF7E1D" />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Next Edit Date:</Text>
                <Text style={styles.warningDate}>{nextEditDate}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>{config.label}</Text>
          <TextInput
            style={[
              styles.input,
              !canEdit && styles.inputDisabled
            ]}
            value={value}
            onChangeText={setValue}
            placeholder={config.placeholder}
            multiline={field === 'education'}
            numberOfLines={field === 'education' ? 3 : 1}
            editable={canEdit}
            placeholderTextColor="#999"
          />
          
          <Text style={styles.charCount}>
            {value.length} characters
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!canEdit || loading) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!canEdit || loading}
        >
          <LinearGradient
            colors={canEdit ? ['#FF7E1D', '#FFD464'] : ['#cccccc', '#dddddd']}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {canEdit ? 'Save Changes' : 'Cannot Edit Now'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FCF3E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 29, 0.2)',
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 126, 29, 0.08)',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 29, 0.2)',
  },
  warningTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  warningDate: {
    fontSize: 14,
    color: '#FF7E1D',
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 29, 0.2)',
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
    borderColor: '#eee',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EditProfileScreen;