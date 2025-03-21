import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';
import { LocationFilter } from '../utils/LocationFilter';

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
  
  // Add these new state variables
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([]);
  const mapRef = React.useRef<MapView>(null);

  // Move toggleCategory inside the component
  const toggleCategory = (category: POICategory) => {
    setSelectedCategories(prev => {
      const newCategories = new Set(prev);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      return newCategories;
    });
  };

  useEffect(() => {
    fetchPOIs();
  }, []);

  const fetchPOIs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .order('category');
      
      if (error) {
        console.error('Error fetching POIs:', error);
        return;
      }

      console.log('Fetched POIs:', data?.length);
      setPois(data || []);
    } catch (error) {
      console.error('Error in fetchPOIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMarker = (poi: POI) => (
    <Marker
      key={poi.id}
      coordinate={{
        latitude: Number(poi.latitude),
        longitude: Number(poi.longitude),
      }}
      title={poi.name}
      description={poi.description}
    >
      <Text style={styles.markerText}>
        {CATEGORY_ICONS[poi.category] || '📍'}
      </Text>
    </Marker>
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
  }, []);

  const getDirections = async (destination) => {
    if (!userLocation) {
      Alert.alert('Error', 'Your location is not available');
      return;
    }

    setSelectedPOI(destination);
    // Here you would typically call a directions API
    // For now, we'll just draw a straight line
    setRouteCoordinates([
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ]);
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {pois
          .filter(poi => selectedCategories.has(poi.category))
          .map(poi => (
            <Marker
              key={poi.id}
              coordinate={{
                latitude: Number(poi.latitude),
                longitude: Number(poi.longitude),
              }}
              title={poi.name}
              description={poi.description}
              onPress={() => getDirections(poi)}
            >
              <Text style={styles.markerText}>
                {CATEGORY_ICONS[poi.category] || '📍'}
              </Text>
            </Marker>
          ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0066cc"
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Location and Reset buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => {
            if (userLocation) {
              mapRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          }}
        >
          <MaterialIcons name="my-location" size={24} color="#0066cc" />
        </TouchableOpacity>

        {routeCoordinates.length > 0 && (
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              setRouteCoordinates([]);
              setSelectedPOI(null);
            }}
          >
            <MaterialIcons name="close" size={24} color="#0066cc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Existing category filters */}
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

// Update styles
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
  
  buttonContainer: {
    position: 'absolute',
    right: 16,
    top: 100,
    gap: 10,
  },
  circleButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});