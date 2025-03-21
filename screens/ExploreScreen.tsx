import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { POI, POICategory } from '../types/poi';
import { ScrollView } from 'react-native';

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  restaurant: '🍽️',
  port: '🚢',
  landmark: '👑',
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
  const [selectedCategory, setSelectedCategory] = useState<POICategory | null>(null);

  useEffect(() => {
    fetchPOIs();
  }, []);

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
      <View style={styles.poiContent}>
        <Text style={styles.poiTitle}>{item.name}</Text>
        <Text style={styles.poiCategory}>{CATEGORY_NAMES[item.category]}</Text>
        <Text style={styles.poiDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const filteredPOIs = selectedCategory 
    ? pois.filter(poi => poi.category === selectedCategory)
    : pois;

  return (
    <View style={styles.container}>
      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, !selectedCategory && styles.filterButtonActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.filterText}>All</Text>
          </TouchableOpacity>
          {Object.entries(CATEGORY_ICONS).map(([category, icon]) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive
              ]}
              onPress={() => setSelectedCategory(category as POICategory)}
            >
              <Text style={styles.filterText}>{icon}</Text>
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
});