import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import { completeOAuthSession } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";

export default function Home() {
  const params = useLocalSearchParams<{
    userId?: string;
    secret?: string;
  }>();
  const { refetch } = useGlobalContext();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!params.userId || !params.secret || processingRef.current) return;
    processingRef.current = true;
    (async () => {
      await completeOAuthSession(params.userId!, params.secret!);
      await refetch();
      router.replace("/");
    })();
  }, [params.userId, params.secret]);

  if (!params.userId || !params.secret) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#0061FF" />
    </View>
  );
}