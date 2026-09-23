import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { login } from "@/lib/appwrite";
import { Redirect, router } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import icons from "@/constants/icons";
import images from "@/constants/images";

const Auth = () => {
  const { refetch, loading, isLogged } = useGlobalContext();

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    const result = await login();
    if (result.status === "redirecting") return;
    if (result.status === "success") {
      await refetch();
      router.replace("/");
    } else if (result.status === "error") {
      Alert.alert("Error", result.message);
    }
  };

  const illustrationSize = Math.min(
    Dimensions.get("window").width - 32,
    280
  );

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full items-center justify-center mt-4 pt-6">
          <Image
            source={images.onboarding}
            style={{
              width: illustrationSize,
              height: illustrationSize * (1104 / 799),
            }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 px-8 pt-6">
          <Text className="text-xs font-rubik-semibold text-primary-300 text-center uppercase tracking-widest">
            Welcome to Real Scout
          </Text>

          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-3 leading-relaxed">
            Let&apos;s Get You Closer To {"\n"}
            <Text className="text-primary-300">Your Ideal Home</Text>
          </Text>

          <Text className="text-base font-rubik text-black-200 text-center mt-6">
            Sign in below to start exploring the perfect place you&apos;ll love
          </Text>

          <TouchableOpacity
            onPress={handleLogin}
            className="bg-primary-300 shadow-lg shadow-primary-300/40 rounded-full w-full py-4 mt-10"
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.google}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-white ml-2">
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Auth;
