import type { GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types';

export interface CloudflareImagesAdapterArgs {
  apiKey: string;
  accountId: string;
  accountHash: string;
  variant?: string; // Optional: specify a default variant like 'public'
}

// Helper function to make API calls
async function cloudflareApiCall(endpoint: string, options: RequestInit, apiKey: string) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API Error (${response.status}): ${errorText}`);
  }

  // Return JSON only if there's content, handle empty responses (like for DELETE)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null; // Or handle as needed for specific endpoints
}

// Define a simpler interface for the doc, replacing TypeWithID import
interface DocWithId {
  id: string | number;
  // Add other potential fields if needed, or keep minimal
}
type DocWithCloudflareId = DocWithId & { cloudflareId?: string | null };

export const cloudflareImagesAdapter = ({
  apiKey,
  accountId,
  accountHash,
  variant = 'public',
}: CloudflareImagesAdapterArgs): GeneratedAdapter => {
  if (!apiKey || !accountId || !accountHash) {
    throw new Error('Cloudflare Images adapter requires apiKey, accountId, and accountHash.');
  }

  return {
    name: 'cloudflare-images',

    // Add a field to store the Cloudflare Image ID
    fields: [
      {
        name: 'cloudflareId',
        type: 'text',
        admin: {
          readOnly: true,
          condition: (data: any) => Boolean(data?.cloudflareId),
        },
        label: 'Cloudflare Image ID',
      },
    ] as any, // Keep 'as any' as Field type isn't available

    handleUpload: async ({ data, file }) => {
      const formData = new FormData();
      formData.append('file', new Blob([file.buffer]), file.filename);

      const endpoint = `/accounts/${accountId}/images/v1`;
      const options: RequestInit = { method: 'POST', body: formData };

      try {
        const result = await cloudflareApiCall(endpoint, options, apiKey);
        if (!result || !result.success || !result.result?.id) {
          throw new Error('Cloudflare upload failed or returned unexpected response.');
        }

        // Assign the cloudflareId directly to the data object
        data.cloudflareId = result.result.id;

        // Return the original (now mutated) data object
        return data;
      } catch (error) {
        console.error('Cloudflare Upload Error:', error);
        throw error;
      }
    },

    handleDelete: async ({ doc }: { doc: DocWithCloudflareId }) => {
      const imageId = doc.cloudflareId;
      if (!imageId || typeof imageId !== 'string') {
        console.warn(`No Cloudflare ID found for document ${doc.id}, skipping delete.`);
        return; // Or throw an error if deletion is critical
      }

      const endpoint = `/accounts/${accountId}/images/v1/${imageId}`;
      const options: RequestInit = {
        method: 'DELETE',
      };

      try {
        await cloudflareApiCall(endpoint, options, apiKey);
        console.log(`Deleted Cloudflare Image: ${imageId}`);
      } catch (error) {
        console.error(`Cloudflare Delete Error for ID ${imageId}:`, error);
        // Re-throw or handle error appropriately
        throw error;
      }
    },

    // Adhere to the GenerateURL type signature
    generateURL: ({ data, filename }): string => {
      const imageId = data?.cloudflareId;
      if (!imageId || typeof imageId !== 'string') {
        console.warn(
          `Cloudflare ID missing on data object for filename ${filename} during generateURL`,
        );
        // Fallback or return empty string if ID isn't available when URL is generated
        return '';
      }
      // Construct the public URL using accountHash (from adapter scope) and imageId (from data)
      return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
    },

    // Explicitly cast the handler to 'any' to satisfy the interface type
    staticHandler: ((_: any, __: any, next: any) => {
      // When using Cloudflare Images, files are served directly from Cloudflare's CDN.
      // Payload's static handler is bypassed if disablePayloadAccessControl: true is set.
      // If Payload access control is needed, this handler would need to proxy requests,
      // but that defeats the purpose of using Cloudflare's CDN directly.
      // Therefore, this handler is typically not used or just calls next().
      next();
    }) as any,
  };
};
