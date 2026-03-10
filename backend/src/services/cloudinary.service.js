import { v2 as cloudinary } from "cloudinary";

/* =====================================================
   CLOUDINARY CONFIGURATION
   =====================================================
   Uses the CLOUDINARY_URL env var which contains the full
   cloudinary:// protocol string.  Because ES module imports
   are evaluated before dotenv.config() runs in app.js, we
   configure lazily on the first upload call.
===================================================== */

let configured = false;

const ensureConfigured = () => {
  if (configured) return;
  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error("CLOUDINARY_URL env var is not set");
  // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const match = url.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
  if (!match) throw new Error("CLOUDINARY_URL is malformed");
  cloudinary.config({
    cloud_name: match[3],
    api_key: match[1],
    api_secret: match[2],
    secure: true,
  });
  configured = true;
};

/**
 * Detect the Cloudinary resource_type from a MIME type string.
 * Cloudinary accepts: image | video | raw | auto
 *   - "video" covers video uploads (Cloudinary transcodes these)
 *   - "raw"   stores files verbatim — used for audio (browser-recorded
 *     WebM/Opus gets corrupted if Cloudinary tries to transcode it)
 *     and for documents (PDF, DOCX, etc.)
 */
const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  // Audio files (especially browser-captured audio/webm Opus) must be
  // uploaded as "raw" so Cloudinary stores them byte-for-byte without
  // any transcoding that would break playback.
  return "raw";
};

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer}  buffer       - The file contents
 * @param {string}  originalName - Original filename (used for public_id context)
 * @param {string}  mimetype     - MIME type of the file
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadToCloudinary = (buffer, originalName, mimetype) => {
  ensureConfigured();
  const resourceType = getResourceType(mimetype);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "discuss",
        resource_type: resourceType,
        // Use original filename (sans extension) so the URL is human-readable
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 * @param {string} publicId    - The Cloudinary public_id
 * @param {string} resourceType - "image" | "video" | "raw"
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
};

export default cloudinary;
