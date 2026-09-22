import { useState } from "react";
import { Alert, Image, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import icons from "@/constants/icons";

const Security = () => {
  const [biometricLogin, setBiometricLogin] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

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
          Security
        </Text>

        <View className="size-11" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7 mt-8"
      >
        <View className="flex flex-col">
          <View className="flex flex-row items-center justify-between py-3">
            <View className="flex flex-row items-center gap-3">
              <Image source={icons.person} className="size-6" />
              <Text className="text-lg font-rubik-medium text-black-300">
                Face ID / Fingerprint
              </Text>
            </View>
            <Switch
              value={biometricLogin}
              onValueChange={setBiometricLogin}
              trackColor={{ false: "#E6E6E6", true: "#0061FF" }}
              thumbColor={"#FFFFFF"}
            />
          </View>

          <View className="flex flex-row items-center justify-between py-3">
            <View className="flex flex-row items-center gap-3">
              <Image source={icons.shield} className="size-6" />
              <Text className="text-lg font-rubik-medium text-black-300">
                Two-Factor Authentication
              </Text>
            </View>
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: "#E6E6E6", true: "#0061FF" }}
              thumbColor={"#FFFFFF"}
            />
          </View>

          <TouchableOpacity
            onPress={() =>
              Alert.alert("Change Password", "This feature is coming soon.")
            }
            className="flex flex-row items-center justify-between py-3"
          >
            <View className="flex flex-row items-center gap-3">
              <Image source={icons.shield} className="size-6" />
              <Text className="text-lg font-rubik-medium text-black-300">
                Change Password
              </Text>
            </View>
            <Image source={icons.rightArrow} className="size-5" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Security;