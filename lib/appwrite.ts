import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
  AppwriteException,
} from "react-native-appwrite";
import { Models } from "react-native-appwrite";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";

export const config = {
  platform: "com.jsm.restate",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  bookingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
  paymentMethodsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PAYMENT_METHODS_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
};

export const client = new Client();

if (config.endpoint && config.projectId) {
  client
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setPlatform(config.platform!);
}

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export interface AgentDoc extends Models.Document {
  name: string;
  email: string;
  avatar: string;
}

export interface GalleryImageDoc extends Models.Document {
  image: string;
}

export interface ReviewDoc extends Models.Document {
  name: string;
  avatar: string;
  review: string;
  rating: number;
}

export interface PropertyDoc extends Models.Document {
  name: string;
  address: string;
  type: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  facilities: string[];
  agent?: AgentDoc | null;
  gallery?: GalleryImageDoc[];
  reviews?: ReviewDoc[];
}

export type LoginResult =
  | { status: "success" }
  | { status: "canceled" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

export async function login(): Promise<LoginResult> {
  try {
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response)
      throw new Error(
        `Create OAuth2 token failed: empty response. Check that (1) Google OAuth provider is enabled in Appwrite Console -> Auth -> Settings with valid OAuth Client ID/Secret, and (2) the platform "${config.platform}" is registered in Appwrite Console -> Overview -> Platforms.`
      );

    if (Platform.OS === "web") {
      window.location.href = response.toString();
      return { status: "redirecting" };
    }

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success") {
      if (
        browserResult.type === "dismiss" ||
        browserResult.type === "cancel" ||
        browserResult.type === "locked"
      ) {
        return { status: "canceled" };
      }

      throw new Error(
        `Create OAuth2 token failed: browser auth result was "${browserResult.type}"`
      );
    }

    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();
    if (!secret || !userId)
      throw new Error(
        `Create OAuth2 token failed: missing secret/userId in redirect "${browserResult.url}"`
      );

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Failed to create session");

    return { status: "success" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to login";
    console.log("[login] error:", JSON.stringify(error, null, 2), message);
    return { status: "error", message };
  }
}

export async function completeOAuthSession(userId: string, secret: string) {
  try {
    const session = await account.createSession(userId, secret);
    return { status: "success", session } as const;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete login";
    console.log("[completeOAuthSession]", message);
    return { status: "error", message } as const;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession("current");
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);

      return {
        ...result,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getLatestProperties() {
  const result = await databases.listDocuments<PropertyDoc>({
    databaseId: config.databaseId!,
    collectionId: config.propertiesCollectionId!,
    queries: [Query.orderAsc("$createdAt"), Query.limit(5)],
  });

  return result.documents;
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  const buildQuery = [Query.orderDesc("$createdAt")];

    if (filter && filter !== "All")
      buildQuery.push(Query.equal("type", filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.contains("name", query),
          Query.contains("address", query),
          Query.contains("type", query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments<PropertyDoc>({
      databaseId: config.databaseId!,
      collectionId: config.propertiesCollectionId!,
      queries: buildQuery,
    });

    return result.documents;
}

export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument<PropertyDoc>({
      databaseId: config.databaseId!,
      collectionId: config.propertiesCollectionId!,
      documentId: id,
      queries: [Query.select(["*", "agent.*", "reviews.*", "gallery.*"])],
    });
    return result;
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return null;
    throw error;
  }
}

export async function getPropertiesByIds(ids: string[]) {
  if (ids.length === 0) return [] as PropertyDoc[];

  const result = await databases.listDocuments<PropertyDoc>({
    databaseId: config.databaseId!,
    collectionId: config.propertiesCollectionId!,
    queries: [Query.equal("$id", ids), Query.limit(ids.length)],
  });

  return result.documents;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface BookingDoc extends Models.Document {
  user: string;
  property: string;
  propertyName: string;
  propertyAddress: string;
  propertyImage: string;
  price: number;
  status: BookingStatus;
}

export interface CreateBookingData {
  userId: string;
  property: string;
  propertyName: string;
  propertyAddress: string;
  propertyImage: string;
  price: number;
}

export async function createBooking(data: CreateBookingData) {
  const result = await databases.createDocument<BookingDoc>({
    databaseId: config.databaseId!,
    collectionId: config.bookingsCollectionId!,
    documentId: ID.unique(),
    data: {
      user: data.userId,
      property: data.property,
      propertyName: data.propertyName,
      propertyAddress: data.propertyAddress,
      propertyImage: data.propertyImage,
      price: data.price,
      status: "confirmed",
    },
  });

  return result;
}

export async function getUserBookings(userId: string) {
  const result = await databases.listDocuments<BookingDoc>({
    databaseId: config.databaseId!,
    collectionId: config.bookingsCollectionId!,
    queries: [Query.equal("user", userId), Query.orderDesc("$createdAt")],
  });

  return result.documents;
}

export async function cancelBooking(bookingId: string) {
  const result = await databases.updateDocument<BookingDoc>({
    databaseId: config.databaseId!,
    collectionId: config.bookingsCollectionId!,
    documentId: bookingId,
    data: { status: "cancelled" },
  });

  return result;
}

export interface PaymentMethodDoc extends Models.Document {
  user: string;
  type: "card" | "mobile";
  brand: string;
  cardholderName: string;
  phone: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

export interface CreatePaymentMethodData {
  userId: string;
  type: "card" | "mobile";
  brand: string;
  cardholderName: string;
  last4: string;
  phone?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export async function createPaymentMethod(data: CreatePaymentMethodData) {
  const result = await databases.createDocument<PaymentMethodDoc>({
    databaseId: config.databaseId!,
    collectionId: config.paymentMethodsCollectionId!,
    documentId: ID.unique(),
    data: {
      user: data.userId,
      type: data.type,
      brand: data.brand,
      cardholderName: data.cardholderName,
      phone: data.phone ?? "",
      last4: data.last4,
      expiryMonth: data.expiryMonth ?? "00",
      expiryYear: data.expiryYear ?? "00",
      isDefault: false,
    },
  });

  return result;
}

export async function getUserPaymentMethods(userId: string) {
  const result = await databases.listDocuments<PaymentMethodDoc>({
    databaseId: config.databaseId!,
    collectionId: config.paymentMethodsCollectionId!,
    queries: [Query.equal("user", userId), Query.orderDesc("$createdAt")],
  });

  return result.documents;
}

export async function deletePaymentMethod(methodId: string) {
  const result = await databases.deleteDocument({
    databaseId: config.databaseId!,
    collectionId: config.paymentMethodsCollectionId!,
    documentId: methodId,
  });

  return result;
}

export async function setDefaultPaymentMethod(methodId: string) {
  const result = await databases.updateDocument<PaymentMethodDoc>({
    databaseId: config.databaseId!,
    collectionId: config.paymentMethodsCollectionId!,
    documentId: methodId,
    data: { isDefault: true },
  });

  return result;
}

export function detectCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\s/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}
