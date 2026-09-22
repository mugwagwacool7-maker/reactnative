import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import icons from "@/constants/icons";
import EmptyState from "@/components/EmptyState";
import { useGlobalContext } from "@/lib/global-provider";
import {
  PaymentMethodDoc,
  createPaymentMethod,
  deletePaymentMethod,
  detectCardBrand,
  getUserPaymentMethods,
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

interface PaymentTypeOption {
  key: string;
  label: string;
  kind: "card" | "mobile";
  brand: string | null;
}

const QUICK_TYPES: PaymentTypeOption[] = [
  { key: "ecocash", label: "EcoCash", kind: "mobile", brand: "EcoCash" },
  { key: "onemoney", label: "One Money", kind: "mobile", brand: "One Money" },
  { key: "card", label: "Visa / Mastercard", kind: "card", brand: null },
];

const MORE_TYPES: PaymentTypeOption[] = [
  {
    key: "amex",
    label: "American Express",
    kind: "card",
    brand: "American Express",
  },
  { key: "discover", label: "Discover", kind: "card", brand: "Discover" },
  { key: "other", label: "Other Card", kind: "card", brand: null },
];

const parseExpiry = (expiry: string) => {
  const cleaned = expiry.replace(/\s/g, "");
  if (!/^\d{4}$/.test(cleaned)) return null;
  return { month: cleaned.slice(0, 2), year: cleaned.slice(2, 4) };
};

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (digits.length >= 3 && digits.length <= 6)
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length > 6)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return digits;
};

const isMobileMoney = (method: PaymentMethodDoc) => method.type === "mobile";

const Payments = () => {
  const { user } = useGlobalContext();

  const [methods, setMethods] = useState<PaymentMethodDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selected, setSelected] = useState<PaymentTypeOption | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [cardholderName, setCardholderName] = useState("");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const loadMethods = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await getUserPaymentMethods(user.$id);
      setMethods(results);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load payment methods";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMethods();
    }, [loadMethods])
  );

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  const resetForm = () => {
    setCardholderName("");
    setPhone("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setSelected(null);
    setShowMore(false);
    setAdding(false);
  };

  const handleAdd = async () => {
    if (!user || !selected) return;

    const name = cardholderName.trim();

    if (selected.kind === "mobile") {
      const digits = phone.replace(/\s/g, "");
      if (!name) return Alert.alert("Error", "Enter the wallet account name.");
      if (digits.length !== 9 && digits.length !== 10)
        return Alert.alert("Error", "Enter a valid phone number.");

      try {
        await createPaymentMethod({
          userId: user.$id,
          type: "mobile",
          brand: selected.brand!,
          cardholderName: name,
          phone: digits,
          last4: digits.slice(-4),
        });

        Alert.alert("Success", `${selected.brand} linked successfully.`);
        resetForm();
        loadMethods();
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to add payment method";
        return Alert.alert("Error", message);
      }
    }

    const digits = cardNumber.replace(/\s/g, "");
    const parsedExpiry = parseExpiry(expiry);

    if (!name) return Alert.alert("Error", "Enter the cardholder name.");
    if (digits.length < 15 || digits.length > 16)
      return Alert.alert("Error", "Enter a valid card number.");
    if (!parsedExpiry)
      return Alert.alert("Error", "Enter a valid expiry date (MM/YY).");
    if (cvc.replace(/\D/g, "").length !== 3)
      return Alert.alert("Error", "Enter a valid CVC.");

    try {
      await createPaymentMethod({
        userId: user.$id,
        type: "card",
        brand: selected.brand ?? detectCardBrand(digits),
        cardholderName: name,
        last4: digits.slice(-4),
        expiryMonth: parsedExpiry.month,
        expiryYear: parsedExpiry.year,
      });

      Alert.alert("Success", "Payment method added.");
      resetForm();
      loadMethods();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add payment method";
      Alert.alert("Error", message);
    }
  };

  const handleDelete = async (method: PaymentMethodDoc) => {
    setDeleting(method.$id);
    try {
      await deletePaymentMethod(method.$id);
      Alert.alert("Deleted", `${method.brand} ending in ${method.last4} was removed.`);
      loadMethods();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete payment method";
      Alert.alert("Error", message);
    } finally {
      setDeleting(null);
    }
  };

  const renderTypeChip = (option: PaymentTypeOption) => {
    const active = selected?.key === option.key;
    return (
      <TouchableOpacity
        key={option.key}
        onPress={() => setSelected(option)}
        className={`px-4 py-2 rounded-full border mr-2 mb-2 ${
          active
            ? "bg-primary-300 border-primary-300"
            : "bg-white border-primary-200"
        }`}
      >
        <Text
          className={`text-sm font-rubik-bold ${
            active ? "text-white" : "text-black-300"
          }`}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTypePicker = () => (
    <View className="mt-6">
      <Text className="text-base font-rubik-bold text-black-300">
        Choose payment type
      </Text>

      <View className="flex flex-row flex-wrap mt-3">
        {QUICK_TYPES.map(renderTypeChip)}
        <TouchableOpacity
          onPress={() => setShowMore((prev) => !prev)}
          className="px-4 py-2 rounded-full border border-primary-200 bg-white mr-2 mb-2"
        >
          <Text className="text-sm font-rubik-medium text-black-100">
            {showMore ? "Less" : "More"}
          </Text>
        </TouchableOpacity>
      </View>

      {showMore && (
        <View className="flex flex-row flex-wrap">
          {MORE_TYPES.map(renderTypeChip)}
        </View>
      )}
    </View>
  );

  const renderMobileForm = () => (
    <View className="mt-5">
      <TextInput
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="Account / wallet name"
        className="bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300"
      />
      <TextInput
        value={phone}
        onChangeText={(text) => setPhone(formatPhoneInput(text))}
        placeholder="Phone number (e.g. 0772 123 456)"
        keyboardType="number-pad"
        className="bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300 mt-3"
      />
    </View>
  );

  const renderCardForm = () => (
    <View className="mt-5">
      <TextInput
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="Cardholder name"
        className="bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300"
      />
      <TextInput
        value={cardNumber}
        onChangeText={(text) => setCardNumber(formatCardNumber(text))}
        placeholder="Card number"
        keyboardType="number-pad"
        className="bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300 mt-3"
      />
      <View className="flex flex-row gap-4 mt-3">
        <TextInput
          value={expiry}
          onChangeText={(text) => setExpiry(formatExpiryInput(text))}
          placeholder="MM/YY"
          keyboardType="number-pad"
          className="flex-1 bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300"
        />
        <TextInput
          value={cvc}
          onChangeText={(text) => setCvc(text.replace(/\D/g, "").slice(0, 3))}
          placeholder="CVC"
          keyboardType="number-pad"
          secureTextEntry
          className="flex-1 bg-accent-100 border border-primary-100 rounded-lg px-4 py-3 text-sm font-rubik text-black-300"
        />
      </View>
    </View>
  );

  const renderTypeLabel = () => (
    <View className="flex flex-row items-center justify-between mt-5">
      <Text className="text-base font-rubik-bold text-black-300">
        {selected?.label}
      </Text>
      <TouchableOpacity onPress={() => setSelected(null)}>
        <Text className="text-sm font-rubik-medium text-black-100">Change</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForm = () => {
    if (!selected) return renderTypePicker();

    return (
      <View>
        {renderTypeLabel()}
        <View className="bg-accent-100 border border-primary-100 rounded-xl p-4 mt-3">
          {selected.kind === "mobile" ? renderMobileForm() : renderCardForm()}

          <TouchableOpacity
            onPress={handleAdd}
            className="bg-primary-300 py-3 rounded-full items-center mt-4"
          >
            <Text className="text-white text-base font-rubik-bold">
              Add {selected?.label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={resetForm} className="items-center py-2 mt-1">
            <Text className="text-base font-rubik-medium text-black-100">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMethod = ({ item }: { item: PaymentMethodDoc }) =>
    isMobileMoney(item) ? (
      <View className="bg-black-300 rounded-xl p-5 mt-5">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-white text-base font-rubik-bold">{item.brand}</Text>

          <TouchableOpacity onPress={() => handleDelete(item)}>
            {deleting === item.$id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image source={icons.logout} className="size-5" tintColor="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-white text-xl font-rubik-extrabold tracking-widest mt-5">
          •••• •••• {item.last4}
        </Text>

        <View className="flex flex-row items-center justify-between mt-5">
          <Text className="text-white text-sm font-rubik-medium uppercase">
            {item.cardholderName}
          </Text>
          <Text className="text-white text-sm font-rubik-medium">Mobile Money</Text>
        </View>
      </View>
    ) : (
      <View className="bg-primary-300 rounded-xl p-5 mt-5">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-white text-base font-rubik-bold">{item.brand}</Text>

          <TouchableOpacity onPress={() => handleDelete(item)}>
            {deleting === item.$id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Image source={icons.logout} className="size-5" tintColor="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-white text-xl font-rubik-extrabold tracking-widest mt-5">
          •••• •••• •••• {item.last4}
        </Text>

        <View className="flex flex-row items-center justify-between mt-5">
          <Text className="text-white text-sm font-rubik-medium uppercase">
            {item.cardholderName}
          </Text>
          <Text className="text-white text-sm font-rubik-medium">
            {item.expiryMonth}/{item.expiryYear}
          </Text>
        </View>
      </View>
    );

  return (
    <SafeAreaView className="h-full bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={methods}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="pb-32 px-5"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <SectionHeader title="Payments" />
              {!adding && (
                <TouchableOpacity
                  onPress={() => setAdding(true)}
                  className="flex flex-row items-center justify-center bg-primary-100 border border-primary-300 border-dashed rounded-xl py-4 mt-6"
                >
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    + Add payment method
                  </Text>
                </TouchableOpacity>
              )}
              {adding && renderForm()}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" className="text-primary-300 mt-5" />
            ) : !adding ? (
              <EmptyState
                icon={icons.wallet}
                title="No payment methods"
                subtitle="Add EcoCash, One Money, or a card to pay quickly."
              />
            ) : null
          }
          renderItem={renderMethod}
          ListFooterComponent={<View className="h-6" />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Payments;