# Payload Cloudflare Images Storage Adapter

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/AryanJ-NYC/payload-cloudflare-images-storage-adapter)
[![NPM Package](https://img.shields.io/npm/v/payload-cloudflare-images-storage-adapter.svg)](https://www.npmjs.com/package/payload-cloudflare-images-storage-adapter)

A storage adapter for [Payload CMS](https://payloadcms.com/) that enables uploading media directly to [Cloudflare Images](https://www.cloudflare.com/developer-platform/cloudflare-images/).

## Installation

```bash
# pnpm
pnpm add @payloadcms/storage-cloudflare-images @payloadcms/plugin-cloud-storage

# npm
npm install @payloadcms/storage-cloudflare-images @payloadcms/plugin-cloud-storage

# yarn
yarn add @payloadcms/storage-cloudflare-images @payloadcms/plugin-cloud-storage
```

## Prerequisites

- A Cloudflare Account with Cloudflare Images enabled.
- Your Cloudflare **API Key**.
- Your Cloudflare **Account ID**.
- Your Cloudflare Images **Account Hash**.

These credentials should be stored securely, typically as environment variables.

## Usage

In your `payload.config.ts`, import the `cloudStoragePlugin` and the `cloudflareImagesAdapter`:

```typescript
// payload.config.ts
import { buildConfig } from 'payload/config';
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { cloudflareImagesAdapter } from '@payloadcms/storage-cloudflare-images'; // Assuming it's installed
import { Media } from './collections/Media'; // Your media collection slug

// Ensure environment variables are set and valid
const cfApiKey = process.env.CLOUDFLARE_API_KEY;
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfAccountHash = process.env.CLOUDFLARE_ACCOUNT_HASH;

if (!cfApiKey || !cfAccountId || !cfAccountHash) {
  // Handle missing credentials appropriately - throw error in production
  console.error('Missing Cloudflare credentials!');
  // throw new Error('Missing Cloudflare credentials');
}

export default buildConfig({
  collections: [
    // Your other collections
    Media,
  ],
  plugins: [
    cloudStoragePlugin({
      collections: {
        [Media.slug]: {
          // Your media collection slug
          adapter: cloudflareImagesAdapter({
            apiKey: cfApiKey!,
            accountId: cfAccountId!,
            accountHash: cfAccountHash!,
            // variant: 'public', // Optional: specify default variant
          }),
          // Disable Payload's default access control and static route handler
          // This allows URLs to point directly to Cloudflare's CDN
          disablePayloadAccessControl: true,
        },
      },
    }),
    // Your other plugins
  ],
  // ... rest of your config
});
```

## Configuration Options

The `cloudflareImagesAdapter` function accepts an object with the following properties:

| Option        | Type     | Required | Description                                                         | Default    |
| ------------- | -------- | -------- | ------------------------------------------------------------------- | ---------- |
| `apiKey`      | `string` | Yes      | Your Cloudflare API Key.                                            |            |
| `accountId`   | `string` | Yes      | Your Cloudflare Account ID (used for API calls).                    |            |
| `accountHash` | `string` | Yes      | Your Cloudflare Images Account Hash (used for delivery URLs).       |            |
| `variant`     | `string` | No       | The default Cloudflare Image variant name to use in generated URLs. | `'public'` |

## Important Notes

- **Added Field:** This adapter automatically adds a read-only text field named `cloudflareId` to your specified media collection(s). This field stores the ID returned by Cloudflare upon successful upload and is used for generating URLs and handling deletes.
- **`disablePayloadAccessControl: true`:** Setting this option (recommended for CDN usage) means:
  - The URLs generated for your media will point directly to `imagedelivery.net`.
  - Payload's built-in read access control for the media collection will **not** apply to accessing the files via their URL. Access control must be managed within Cloudflare Images (e.g., using Signed URLs if needed, though this adapter doesn't support generating them currently).
  - Payload's static handler is bypassed for these files.
- **Environment Variables:** Ensure the following environment variables are set in your deployment environment:
  - `CLOUDFLARE_API_KEY`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_ACCOUNT_HASH`

## License

[MIT](./LICENSE) <!-- You might want to add a LICENSE file -->
