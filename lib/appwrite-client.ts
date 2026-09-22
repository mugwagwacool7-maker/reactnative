import { config } from "./appwrite";

export async function ping(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${config.endpoint}/locale`, {
      headers: {
        "X-Appwrite-Project": config.projectId || "",
      },
    });

    if (response.ok) {
      return { success: true, message: "Successfully connected to Appwrite!" };
    }

    const text = await response.text();
    return {
      success: false,
      message: `Appwrite responded with status ${response.status}: ${text}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to Appwrite";
    return { success: false, message };
  }
}
