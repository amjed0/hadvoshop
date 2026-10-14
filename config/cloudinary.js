const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary if environment variables are provided
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Upload an uploaded file object (from express-fileupload)
 * If Cloudinary is configured, uploads directly to Cloudinary CDN (works on Vercel).
 * If not configured, gracefully falls back to local storage in ./public/<folder>/<filename>
 */
const uploadImage = async (file, folder = 'products', filename = null) => {
  if (!file) return null;

  // 1. If Cloudinary credentials are set in environment, upload to Cloudinary CDN
  if (isConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `hadvo/${folder}`,
          public_id: filename ? path.parse(filename).name : undefined,
          resource_type: 'image'
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Upload Error:', error);
            return reject(error);
          }
          console.log('✅ Uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);
        }
      );

      // Pipe file buffer directly to Cloudinary stream (no disk write needed)
      if (file.data) {
        Readable.from(file.data).pipe(uploadStream);
      } else if (file.tempFilePath) {
        fs.createReadStream(file.tempFilePath).pipe(uploadStream);
      } else {
        reject(new Error('Invalid file payload'));
      }
    });
  }

  // 2. Local fallback if Cloudinary is not configured yet
  const targetName = filename || (Date.now() + '.jpg');
  const relPath = `/${folder}/${targetName}`;
  const fullDir = path.join(__dirname, `../public/${folder}`);
  
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }

  const fullPath = path.join(fullDir, targetName);
  await file.mv(fullPath);
  return relPath;
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadImage
};
