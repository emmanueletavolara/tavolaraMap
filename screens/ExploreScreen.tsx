import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';
import { ScrollView } from 'react-native';

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',    // include spiagge, servizi balneari, chioschi
  mountain: '⛰️',  // include sentieri, punti panoramici, aree pic-nic
  restaurant: '🍽️', // include ristoranti, bar, aree ristoro
  port: '🚢',     // include approdi, pontili, servizi nautici
  landmark: '👑',  // include punti di interesse storico-culturali
};

const CATEGORY_NAMES: Record<POICategory, string> = {
  beach: 'Beaches',
  mountain: 'Mountains',
  restaurant: 'Restaurants',
  port: 'Ports',
  landmark: 'Landmarks',
};

export default function ExploreScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<POICategory>>(
    new Set(['beach', 'mountain', 'restaurant', 'port', 'landmark'])
  );

  useEffect(() => {
    fetchPOIs();
  }, []);

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

  const fetchPOIs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .order('name');

      if (error) throw error;
      setPois(data || []);
    } catch (error) {
      console.error('Error fetching POIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPOIItem = ({ item }: { item: POI }) => (
    <TouchableOpacity style={styles.poiCard}>
      {item.images_urls?.[0] && (
        <Image 
          source={{ uri: item.images_urls[0] }}
          style={styles.poiImage}
        />
      )}
      <View style={styles.poiContent}>
        <Text style={styles.poiTitle}>{item.name}</Text>
        <Text style={styles.poiCategory}>
          {CATEGORY_ICONS[item.category]} {CATEGORY_NAMES[item.category]}
        </Text>
        <Text style={styles.poiDescription}>{item.description}</Text>
        
        {item.opening_hours && (
          <Text style={styles.poiInfo}>⏰ {item.opening_hours}</Text>
        )}
        {item.price_info && (
          <Text style={styles.poiInfo}>💰 {item.price_info}</Text>
        )}
        {item.booking_required && (
          <Text style={styles.poiInfo}>📅 Prenotazione necessaria</Text>
        )}
        {item.contact_info && (
          <Text style={styles.poiInfo}>📞 {item.contact_info}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredPOIs = pois.filter(poi => selectedCategories.has(poi.category));

  return (
    <View style={styles.container}>
      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </ScrollView>
      </View>

      <FlatList
        data={filteredPOIs}
        renderItem={renderPOIItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchPOIs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoryFilter: {
    padding: 10,
    backgroundColor: 'white',
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
  },
  filterTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 10,
  },
  poiCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  poiContent: {
    padding: 15,
  },
  poiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  poiCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  poiDescription: {
    fontSize: 14,
    color: '#444',
  },
  poiImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  poiInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});
