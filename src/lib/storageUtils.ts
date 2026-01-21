import { supabase } from "@/integrations/supabase/client";

/**
 * Gets a signed URL for a private storage object.
 * Returns null if the URL is already public or if there's an error.
 */
export const getSignedUrl = async (
  publicUrl: string,
  bucket: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> => {
  if (!publicUrl) return null;

  try {
    // Extract the file path from the public URL
    // Public URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlParts = publicUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length < 2) {
      // Try signed URL format
      const signedParts = publicUrl.split(`/storage/v1/object/sign/${bucket}/`);
      if (signedParts.length < 2) {
        console.warn("Could not parse storage URL:", publicUrl);
        return publicUrl; // Return original URL as fallback
      }
      // Already a signed URL, extract path before query params
      const pathWithParams = signedParts[1];
      const filePath = pathWithParams.split("?")[0];
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }

      return data.signedUrl;
    }

    const filePath = urlParts[1];

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
};

/**
 * Gets signed URLs for video content (longer expiry for playback)
 */
export const getVideoSignedUrl = async (publicUrl: string): Promise<string | null> => {
  return getSignedUrl(publicUrl, "course-videos", 7200); // 2 hours for video playback
};

/**
 * Gets signed URLs for document content
 */
export const getDocumentSignedUrl = async (publicUrl: string): Promise<string | null> => {
  return getSignedUrl(publicUrl, "course-documents", 3600); // 1 hour for documents
};
