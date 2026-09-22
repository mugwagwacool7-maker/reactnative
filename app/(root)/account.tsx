import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { useAvatar } from "@/lib/avatar-provider";

const Account = () => {
  const { user } = useGlobalContext();
  const { avatarUri, pickAndSetAvatar, clearAvatar } = useAvatar();

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
          My Profile
        </Text>

        <View className="size-11" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7 mt-10"
      >
        <View className="flex flex-col items-center">
          <Image
            source={{ uri: avatarUri ?? user?.avatar }}
            className="size-32 rounded-full"
          />
          <TouchableOpacity onPress={pickAndSetAvatar} className="-mt-8 ml-24">
            <Image
              source={icons.edit}
              className="size-8"
              tintColor={"#0061FF"}
            />
          </TouchableOpacity>

          <Text className="text-2xl font-rubik-bold mt-4">{user?.name}</Text>
          <Text className="text-base font-rubik text-black-100 mt-1">
            {user?.email}
          </Text>

          {avatarUri && (
            <TouchableOpacity onPress={clearAvatar} className="mt-2">
              <Text className="text-sm font-rubik-medium text-black-100">
                Remove photo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex flex-col mt-10 border-t pt-5 border-primary-200">
          <View className="flex flex-row items-center justify-between py-3">
            <Text className="text-lg font-rubik-medium text-black-300">
              Member since
            </Text>
            <Text className="text-lg font-rubik-medium text-primary-300">
              Today
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between py-3">
            <Text className="text-lg font-rubik-medium text-black-300">
              Bookings
            </Text>
            <Text className="text-lg font-rubik-medium text-primary-300">
              0
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between py-3">
            <Text className="text-lg font-rubik-medium text-black-300">
              Favorites
            </Text>
            <Text className="text-lg font-rubik-medium text-primary-300">
              0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Account;