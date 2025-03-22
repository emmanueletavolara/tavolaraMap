import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';
import {
  LocationFilter,
  INITIAL_REGION,
  LOCATION_TRACKING_OPTIONS,
  MAP_OPTIONS,
  ROUTE_STYLE,
} from '../utils/LocationFilter';

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  restaurant: '🍽️',
  port: '🚢',
  landmark: '👑',
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(
    new Set(['beach', 'mountain', 'restaurant', 'port', 'landmark'])
  );
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([]);
  const [locationFilter] = useState(() => new LocationFilter());

  useEffect(() => {
    fetchPOIs();
    setupLocation();
  }, []);

  const setupLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Errore', 'È necessario concedere i permessi GPS');
      return;
    }

    // Ritardiamo la visualizzazione della posizione di 8 secondi
    setTimeout(() => {
      setShowUserLocation(true);
    }, 8000);

    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1
      },
      (location) => {
        const filteredLocation = locationFilter.addLocation(location.coords);
        setUserLocation(filteredLocation);
      }
    );
  };

  const fetchPOIs = async () => {
    try {
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .order('category');
      
      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error('Error fetching POIs:', error);
    }
  };

  const getDirections = (destination: POI) => {
    if (!userLocation) return;

    setSelectedPOI(destination);
    setRouteCoordinates([
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ]);
  };

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showUserLocation}
        showsCompass={true}
        showsUserLocationAccuracyCircle={false}
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

      <View style={styles.categoryFilters}>
        {Object.entries(CATEGORY_ICONS).map(([category, icon]) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              selectedCategories.has(category as POICategory) && styles.filterButtonActive
            ]}
            onPress={() => toggleCategory(category as POICategory)}
          >
            <Text style={[
              styles.filterText,
              selectedCategories.has(category as POICategory) && styles.filterTextActive
            ]}>{icon}</Text>
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
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#0066cc',
  },
  filterText: {
    color: '#666',
    fontSize: 24,
  },
  filterTextActive: {
    color: 'white',
  },
  markerText: {
    fontSize: 24,
  }
});
