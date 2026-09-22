import { Image, ImageSourcePropType, Text, TouchableOpacity, View } from "react-native";

interface Props {
  icon: ImageSourcePropType;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }: Props) => (
  <View className="flex flex-col items-center justify-center flex-1 px-10 mt-10">
    <Image source={icon} className="size-16" tintColor={"#8C8E98"} />
    <Text className="text-xl font-rubik-bold text-black-300 mt-5 text-center">
      {title}
    </Text>
    {subtitle && (
      <Text className="text-base font-rubik text-black-100 text-center mt-2">
        {subtitle}
      </Text>
    )}
    {actionLabel && onAction && (
      <TouchableOpacity
        onPress={onAction}
        className="bg-primary-300 px-6 py-3 rounded-full mt-7"
      >
        <Text className="text-white font-rubik-bold text-base">{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default EmptyState;