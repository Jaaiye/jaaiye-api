/**
 * Cloudinary Adapter for Event Domain
 * Infrastructure layer - external services
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryAdapter {
  /**
   * Upload image to Cloudinary
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Image URL
   */
  async uploadImage(fileBuffer, options = {}) {
    try {
      const defaultOptions = {
        folder: 'jaaiye/events',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        ...options
      };

      // Support Buffer uploads via upload_stream
      const uploadStream = () => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(defaultOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        stream.end(fileBuffer);
      });

      const result = await uploadStream();
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
}

module.exports = CloudinaryAdapter;

