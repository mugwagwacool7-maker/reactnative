import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import icons from "@/constants/icons";
import EmptyState from "@/components/EmptyState";
import { useGlobalContext } from "@/lib/global-provider";
import {
  BookingDoc,
  cancelBooking,
  getUserBookings,
} from "@/lib/appwrite";

interface SectionHeaderProps {
  title: string;
}

const SectionHeader = ({ title }: SectionHeaderProps) => (
  <View className="flex flex-row items-center justify-between px-5 mt-5">
    <TouchableOpacity
      onPress={() => router.back()}
      className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
    >
      <Image source={icons.backArrow} className="size-5" />
    </TouchableOpacity>

    <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
      {title}
    </Text>

    <View className="size-11" />
  </View>
);

const Bookings = () => {
  const { user } = useGlobalContext();
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await getUserBookings(user.$id);
      setBookings(results);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load bookings";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const handleCancel = async (booking: BookingDoc) => {
    setCancelling(booking.$id);
    try {
      await cancelBooking(booking.$id);
      Alert.alert("Booking cancelled", `${booking.propertyName} was cancelled.`);
      loadBookings();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel booking";
      Alert.alert("Error", message);
    } finally {
      setCancelling(null);
    }
  };

  const renderBooking = ({ item }: { item: BookingDoc }) => (
    <View className="flex flex-row items-center bg-white rounded-xl border border-primary-200 p-4 mt-4">
      <Image
        source={{ uri: item.propertyImage }}
        className="size-20 rounded-lg"
      />

      <View className="flex-1 flex flex-col ml-4">
        <Text className="text-base font-rubik-bold text-black-300">
          {item.propertyName}
        </Text>
        <Text className="text-xs font-rubik text-black-100 mt-1">
          {item.propertyAddress}
        </Text>
        <Text className="text-base font-rubik-bold text-primary-300 mt-1">
          ${item.price}
        </Text>
      </View>
    </View>
  );

  const renderActions = ({ item }: { item: BookingDoc }) => (
    <View className="flex flex-row items-center justify-between mt-2">
      <View className="flex flex-row items-center gap-2">
        <View
          className={`px-3 py-1 rounded-full ${
            item.status === "confirmed" ? "bg-primary-100" : "bg-danger/10"
          }`}
        >
          <Text
            className={`text-xs font-rubik-bold capitalize ${
              item.status === "confirmed"
                ? "text-primary-300"
                : "text-danger"
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>

      {item.status === "confirmed" && (
        <TouchableOpacity
          onPress={() => handleCancel(item)}
          disabled={cancelling === item.$id}
        >
          {cancelling === item.$id ? (
            <ActivityIndicator size="small" className="text-danger" />
          ) : (
            <Text className="text-base font-rubik-bold text-danger">
              Cancel
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.$id}
        contentContainerClassName="pb-32 px-5"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<SectionHeader title="My Bookings" />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" className="text-primary-300 mt-5" />
          ) : (
            <EmptyState
              icon={icons.calendar}
              title="No bookings yet"
              subtitle="When you book a property, it will show up here."
              actionLabel="Explore homes"
              onAction={() => router.push("/explore")}
            />
          )
        }
        renderItem={({ item }) => (
          <View>
            {renderBooking({ item })}
            {renderActions({ item })}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Bookings;