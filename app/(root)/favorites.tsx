import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import icons from "@/constants/icons";
import { Card } from "@/components/Cards";
import EmptyState from "@/components/EmptyState";
import { getPropertiesByIds, PropertyDoc } from "@/lib/appwrite";
import { useFavorites } from "@/lib/favorites-provider";

const Favorites = () => {
  const { favorites } = useFavorites();
  const [properties, setProperties] = useState<PropertyDoc[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const results = await getPropertiesByIds(favorites);
      if (active) {
        setProperties(results);
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [favorites]);

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  const ListEmpty = () =>
    loading ? (
      <ActivityIndicator size="large" className="text-primary-300 mt-5" />
    ) : (
      <EmptyState
        icon={icons.heart}
        title="No favorites yet"
        subtitle="Tap the heart on any house you like to save it here."
        actionLabel="Explore homes"
        onAction={() => router.push("/explore")}
      />
    );

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={properties ?? []}
        numColumns={2}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item.$id)} />
        )}
        keyExtractor={(item) => item.$id}
        contentContainerClassName="pb-32"
        columnWrapperClassName="flex gap-5 px-5"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ListEmpty}
        ListHeaderComponent={() => (
          <View className="px-5">
            <View className="flex flex-row items-center justify-between mt-5">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
                Favorites
              </Text>

              <View className="size-11" />
            </View>

            {properties && properties.length > 0 && (
              <Text className="text-xl font-rubik-bold text-black-300 mt-6">
                {properties.length} Saved Hom{properties.length === 1 ? "e" : "es"}
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Favorites;