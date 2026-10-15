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
 * 1. If Cloudinary is configured -> uploads directly to Cloudinary CDN (Best for Vercel)
 * 2. If running on Vercel without Cloudinary -> converts to Base64 data URI (stored in MongoDB, 0 disk writes)
 * 3. Local development -> saves to ./public/<folder>/<filename>
 */
const uploadImage = async (file, folder = 'products', filename = null) => {
  if (!file) return null;

  // Helper: convert file buffer to Base64 Data URI (stored in MongoDB, works everywhere)
  const toBase64 = () => {
    if (file.data) {
      const mime = file.mimetype || 'image/jpeg';
      return `data:${mime};base64,${file.data.toString('base64')}`;
    }
    return null;
  };

  // 1. If Cloudinary credentials are set, try uploading to Cloudinary CDN
  if (isConfigured) {
    try {
      const url = await new Promise((resolve, reject) => {
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
      return url;
    } catch (cloudErr) {
      // Cloudinary failed — fall back to Base64
      console.warn('⚠️ Cloudinary failed, falling back to Base64:', cloudErr.message);
      const b64 = toBase64();
      if (b64) return b64;
    }
  }

  // 2. If on Vercel or read-only environment, use Base64 Data URI (stored in MongoDB)
  if (process.env.VERCEL) {
    console.log('ℹ️ Vercel detected without Cloudinary: saving image as Base64 in MongoDB');
    const b64 = toBase64();
    if (b64) return b64;
  }

  // 3. Local fallback for local development — save to disk
  try {
    const targetName = filename || (Date.now() + '.jpg');
    const relPath = `/${folder}/${targetName}`;
    const fullDir = path.join(__dirname, `../public/${folder}`);
    
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const fullPath = path.join(fullDir, targetName);
    await file.mv(fullPath);
    return relPath;
  } catch (fsErr) {
    // If disk write fails, convert to Base64 as last resort
    console.warn('⚠️ Disk write failed, falling back to Base64 Data URI:', fsErr.message);
    const b64 = toBase64();
    if (b64) return b64;
    throw fsErr;
  }
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadImage
};
