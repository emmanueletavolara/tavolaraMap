import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';
import { LocationFilter } from '../utils/LocationFilter';

const SPALMATORE_REGION = {
  latitude: 40.8985,    // Coordinate precise di Spalmatore di Terra
  longitude: 9.7225,    // a Tavolara
  latitudeDelta: 0.015, // Zoom regolato per vedere bene la spiaggia
  longitudeDelta: 0.015 // e un po' dell'isola
};

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  restaurant: '🍽️',
  port: '🚢',
  landmark: '👑',
};

// Aggiungi questa costante per un zoom più preciso
const DETAILED_ZOOM = {
  latitudeDelta: 0.0005,  // Zoom molto più stretto
  longitudeDelta: 0.0005
};

// Aggiungi una funzione per gestire la qualità del segnale GPS
const handleLocationAccuracy = (accuracy: number) => {
  if (accuracy > 100) {
    Alert.alert(
      "Segnale GPS debole",
      "Per migliorare la precisione:\n" +
      "• Spostati all'aperto\n" +
      "• Allontanati da edifici alti\n" +
      "• Muovi il dispositivo a forma di '8' per calibrare la bussola"
    );
    return false;
  }
  return true;
};

export default function MapScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(
    new Set(['beach', 'mountain', 'restaurant', 'port', 'landmark'])
  );
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([]);
  const mapRef = React.useRef<MapView>(null);
  const locationFilter = React.useRef(new LocationFilter()).current;

  useEffect(() => {
    fetchPOIs();
    
    let locationSubscription: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      // Inizia il monitoraggio continuo della posizione
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1
        },
        (location) => {
          const filteredLocation = locationFilter.addLocation(location.coords);
          setUserLocation(filteredLocation);
          setShowUserLocation(true);
        }
      );
    })();

    // Cleanup
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
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
        initialRegion={SPALMATORE_REGION}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
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

      {showUserLocation && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              if (userLocation && mapRef.current) {
                if (handleLocationAccuracy(userLocation.accuracy)) {
                  mapRef.current.animateToRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    ...DETAILED_ZOOM
                  }, 1000);
                }
              }
            }}
          >
            <MaterialIcons 
              name="my-location" 
              size={24} 
              color={userLocation?.accuracy && userLocation.accuracy <= 20 ? "#00ff00" : 
                    userLocation?.accuracy && userLocation.accuracy <= 50 ? "#ffcc00" : "#ff0000"} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Filtri categorie */}
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
    fontSize: 24, // manteniamo la dimensione più grande per le emoji nella mappa
  },
  filterTextActive: {
    color: 'white',
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  }
});
