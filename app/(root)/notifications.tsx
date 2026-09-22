import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import icons from "@/constants/icons";
import EmptyState from "@/components/EmptyState";

const Notifications = () => {
  return (
    <SafeAreaView className="h-full bg-white">
      <View className="flex flex-row items-center justify-between px-5 mt-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
        >
          <Image source={icons.backArrow} className="size-5" />
        </TouchableOpacity>

        <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
          Notifications
        </Text>

        <View className="size-11" />
      </View>

      <EmptyState
        icon={icons.bell}
        title="No notifications"
        subtitle="New updates and alerts will show up here."
      />
    </SafeAreaView>
  );
};

export default Notifications;