import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { POI } from '../types/poi';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visitedPOIs, setVisitedPOIs] = useState<POI[]>([]);
  const [preferences, setPreferences] = useState({
    pets: false,
    family: false,
    accessibility: false,
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchVisitHistory();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('travel_preferences')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data?.travel_preferences) {
        setPreferences(data.travel_preferences);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          poi_id,
          pois (*)
        `)
        .eq('user_id', user?.id)
        .eq('type', 'visit')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setVisitedPOIs(data?.map(item => item.pois) || []);
    } catch (error) {
      console.error('Error fetching visit history:', error);
    }
  };

  const updatePreference = async (key: keyof typeof preferences) => {
    try {
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };

      await supabase
        .from('user_profiles')
        .update({ travel_preferences: newPreferences })
        .eq('id', user?.id);

      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.userInfo}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel Preferences</Text>
        <View style={styles.preference}>
          <Text>Traveling with Pets</Text>
          <Switch
            value={preferences.pets}
            onValueChange={() => updatePreference('pets')}
          />
        </View>
        <View style={styles.preference}>
          <Text>Family-Friendly Places</Text>
          <Switch
            value={preferences.family}
            onValueChange={() => updatePreference('family')}
          />
        </View>
        <View style={styles.preference}>
          <Text>Accessibility Needs</Text>
          <Switch
            value={preferences.accessibility}
            onValueChange={() => updatePreference('accessibility')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visit History</Text>
        {visitedPOIs.map((poi) => (
          <View key={poi.id} style={styles.visitItem}>
            <Text style={styles.poiName}>{poi.name}</Text>
            <Text style={styles.poiCategory}>{poi.category}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  userInfo: {
    fontSize: 16,
    color: '#666',
  },
  preference: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  visitItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  poiName: {
    fontSize: 16,
    fontWeight: '500',
  },
  poiCategory: {
    color: '#666',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});