import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import { useGlobalContext } from "./global-provider";

const avatarStorageKey = (userId: string) => `@restate/avatar:${userId}`;

interface AvatarContextType {
  avatarUri: string | null;
  pickAndSetAvatar: () => Promise<void>;
  clearAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

interface AvatarProviderProps {
  children: ReactNode;
}

export const AvatarProvider = ({ children }: AvatarProviderProps) => {
  const { user } = useGlobalContext();
  const userId = user?.$id ?? "";
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setAvatarUri(null);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(avatarStorageKey(userId));
        if (active) setAvatarUri(stored);
      } catch (error) {
        console.error("Failed to load profile image", error);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [userId]);

  const pickAndSetAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to change your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setAvatarUri(uri);
    if (userId) {
      try {
        await AsyncStorage.setItem(avatarStorageKey(userId), uri);
      } catch (error) {
        console.error("Failed to save profile image", error);
      }
    }
  }, [userId]);

  const clearAvatar = useCallback(async () => {
    setAvatarUri(null);
    if (userId) {
      try {
        await AsyncStorage.removeItem(avatarStorageKey(userId));
      } catch (error) {
        console.error("Failed to remove profile image", error);
      }
    }
  }, [userId]);

  return (
    <AvatarContext.Provider
      value={{ avatarUri, pickAndSetAvatar, clearAvatar }}
    >
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = (): AvatarContextType => {
  const context = useContext(AvatarContext);
  if (!context)
    throw new Error("useAvatar must be used within an AvatarProvider");

  return context;
};

export default AvatarProvider;