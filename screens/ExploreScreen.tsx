import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { POI, POICategory } from '../types/poi';

const CATEGORY_ICONS: Record<POICategory, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  restaurant: '🍽️',
  port: '🚢',
  landmark: '👑',
};

export default function ExploreScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<POICategory | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    fetchPOIs();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

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

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('poi_id')
        .eq('user_id', user?.id)
        .eq('type', 'favorite');

      if (error) throw error;
      setFavorites(new Set(data?.map(item => item.poi_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (poiId: string) => {
    if (!user) return;

    const isFavorite = favorites.has(poiId);
    try {
      if (isFavorite) {
        await supabase
          .from('user_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('poi_id', poiId)
          .eq('type', 'favorite');
        
        favorites.delete(poiId);
      } else {
        await supabase
          .from('user_interactions')
          .insert([{
            user_id: user.id,
            poi_id: poiId,
            type: 'favorite',
            timestamp: new Date().toISOString(),
          }]);
        
        favorites.add(poiId);
      }
      setFavorites(new Set(favorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderPOICard = ({ item }: { item: POI }) => (
    <View style={styles.card}>
      {item.images_urls[0] && (
        <Image
          source={{ uri: item.images_urls[0] }}
          style={styles.image}
        />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.title}>
          {CATEGORY_ICONS[item.category]} {item.name}
        </Text>
        <Text style={styles.description}>{item.description}</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Text>{favorites.has(item.id) ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.categoryFilters}>
        {Object.entries(CATEGORY_ICONS).map(([category, icon]) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === category ? null : category as POICategory
            )}
          >
            <Text>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={pois.filter(poi => !selectedCategory || poi.category === selectedCategory)}
        renderItem={renderPOICard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
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
  categoryFilters: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
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
  list: {
    padding: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    color: '#666',
  },
  favoriteButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
});