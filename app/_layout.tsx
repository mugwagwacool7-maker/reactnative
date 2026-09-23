import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import "./global.css";
import { ping } from "@/lib/appwrite-client";
import GlobalProvider from "@/lib/global-provider";
import FavoritesProvider from "@/lib/favorites-provider";
import AvatarProvider from "@/lib/avatar-provider";
import images from "@/constants/images";

SplashScreen.preventAutoHideAsync();

const MIN_SPLASH_TIME = 2000;

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), MIN_SPLASH_TIME);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    ping().then((result) =>
      console.log("[appwrite] ping:", result.message)
    );
  }, []);

  const appReady = fontsLoaded && splashReady;

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady && !error) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Image
          source={images.splash}
          className="w-56 h-56"
          resizeMode="contain"
        />
        <ActivityIndicator className="mt-5" size="large" color="#191D31" />
      </View>
    );
  }

  return (
    <FavoritesProvider>
      <GlobalProvider>
        <AvatarProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AvatarProvider>
      </GlobalProvider>
    </FavoritesProvider>
  );
}
