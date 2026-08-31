/**
 * Cloudflare R2 Adapter for Event Domain
 * Infrastructure layer - external services
 *
 * Bucket layout: jaaiye/events/{uuid}.ext — flat, matches the v2 backend's
 * convention (avatars/, vendors/{id}/, events/) so both backends write to
 * the same shared namespace in the same R2 bucket.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov'
};

class R2Adapter {
  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL;

    this.isConfigured = Boolean(
      accountId && accessKeyId && secretAccessKey && this.bucket && this.publicUrl
    );

    if (this.isConfigured) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey }
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        'R2 credentials are not set - uploads will return a simulated result instead of calling the real API.'
      );
    }
  }

  /**
   * Upload image to R2
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Public URL
   */
  async uploadImage(fileBuffer, options = {}) {
    const folder = options.folder || 'events';
    const contentType = options.contentType || 'application/octet-stream';
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] || '';
    const key = `${folder}/${randomUUID()}${extension}`;

    if (!this.isConfigured) {
      // eslint-disable-next-line no-console
      console.warn(`[SIMULATED] R2 uploadImage(${key}, ${fileBuffer.length} bytes)`);
      return `https://simulated.local/${key}`;
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType
        })
      );
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
}

module.exports = R2Adapter;
