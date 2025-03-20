import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';

const INITIAL_REGION = {
  latitude: 40.8919,
  longitude: 9.7322,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  restaurant: '🍽️',
  port: '🚢',
  landmark: '👑',
};

export default function MapScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(
    new Set(['beach', 'mountain', 'restaurant', 'port', 'landmark'])
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPOIs();
  }, []);

  const fetchPOIs = async () => {
    try {
      const { data, error } = await supabase
        .from('pois')
        .select('*');
      
      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error('Error fetching POIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: POICategory) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
      >
        {pois
          .filter(poi => selectedCategories.has(poi.category))
          .map(poi => (
            <Marker
              key={poi.id}
              coordinate={{
                latitude: poi.latitude,
                longitude: poi.longitude,
              }}
              title={poi.name}
              description={poi.description}
            >
              <Text style={styles.markerText}>
                {CATEGORY_ICONS[poi.category]}
              </Text>
            </Marker>
          ))}
      </MapView>
      
      <View style={styles.categoryFilters}>
        {Object.entries(CATEGORY_ICONS).map(([category, icon]) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategories.has(category as POICategory) && styles.categoryButtonActive
            ]}
            onPress={() => toggleCategory(category as POICategory)}
          >
            <Text>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  categoryFilters: {
    position: 'absolute',
    top: 20,
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 10,
  },
  categoryButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#e0e0e0',
  },
  markerText: {
    fontSize: 24,
  },
});