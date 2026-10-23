import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import status from "http-status";
import AppError from "../errorHelpers/AppError";
import config from "./index";

cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
});

export const CloudinaryUpload = cloudinary;

/**
 * Cloudinary folders designated for specific healthcare items
 */
export const CLOUDINARY_FOLDER = {
    SPECIALTY: "ph-healthcare/specialties",
    DOCTOR: "ph-healthcare/doctors",
    PATIENT: "ph-healthcare/patients",
    ADMIN: "ph-healthcare/admins",
    PRESCRIPTION: "ph-healthcare/prescriptions",
    REPORT: "ph-healthcare/reports",
    USER: "ph-healthcare/users",
    GENERAL: "ph-healthcare/general",
} as const;

export type TCloudinaryFolderKey = keyof typeof CLOUDINARY_FOLDER;
export type TCloudinaryFolder = (typeof CLOUDINARY_FOLDER)[TCloudinaryFolderKey];

export interface ICloudinaryUploadOptions {
    folder?: TCloudinaryFolder | TCloudinaryFolderKey | string;
    publicId?: string;
    resourceType?: "auto" | "image" | "raw" | "video";
    overwrite?: boolean;
    invalidate?: boolean;
    tags?: string[];
}

/**
 * Resolve folder path from an item key, direct folder string, or fallback to general
 */
export const resolveCloudinaryFolder = (folder?: TCloudinaryFolder | TCloudinaryFolderKey | string): string => {
    if (!folder) {
        return CLOUDINARY_FOLDER.GENERAL;
    }
    const key = folder.toUpperCase() as TCloudinaryFolderKey;
    if (key in CLOUDINARY_FOLDER) {
        return CLOUDINARY_FOLDER[key];
    }
    if (folder.startsWith("ph-healthcare/")) {
        return folder;
    }
    return `ph-healthcare/${folder}`;
};

/**
 * Upload a file (Multer file, Buffer, or base64/remote URL string) to Cloudinary in a specific folder
 */
export const uploadToCloudinary = async (
    file: Express.Multer.File | Buffer | string,
    options?: ICloudinaryUploadOptions
): Promise<UploadApiResponse> => {
    if (!config.cloudinary.cloud_name || !config.cloudinary.api_key || !config.cloudinary.api_secret) {
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Cloudinary credentials are not configured in environment variables");
    }

    const targetFolder = resolveCloudinaryFolder(options?.folder);

    // If file is a base64 data URI, remote URL, or file path string
    if (typeof file === "string") {
        try {
            return await cloudinary.uploader.upload(file, {
                folder: targetFolder,
                public_id: options?.publicId,
                resource_type: options?.resourceType || "auto",
                overwrite: options?.overwrite,
                invalidate: options?.invalidate,
                tags: options?.tags,
            });
        } catch (error: any) {
            throw new AppError(
                status.BAD_REQUEST,
                error?.message || "Failed to upload file to Cloudinary"
            );
        }
    }

    // If file is Multer File or Buffer
    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    if (!buffer) {
        throw new AppError(status.BAD_REQUEST, "Invalid file content provided for Cloudinary upload");
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: targetFolder,
                public_id: options?.publicId,
                resource_type: options?.resourceType || "auto",
                overwrite: options?.overwrite,
                invalidate: options?.invalidate,
                tags: options?.tags,
            },
            (error, result) => {
                if (error || !result) {
                    return reject(
                        new AppError(
                            status.BAD_REQUEST,
                            error?.message || "Failed to upload file to Cloudinary"
                        )
                    );
                }
                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Delete an asset from Cloudinary using its public_id
 */
export const deleteFromCloudinary = async (
    publicId: string,
    options?: { resourceType?: "image" | "raw" | "video" }
): Promise<any> => {
    if (!publicId) return null;
    try {
        return await cloudinary.uploader.destroy(publicId, {
            resource_type: options?.resourceType || "image",
            invalidate: true,
        });
    } catch (error: any) {
        throw new AppError(
            status.BAD_REQUEST,
            error?.message || "Failed to delete file from Cloudinary"
        );
    }
};

/**
 * Extract public_id (including folder path) from a Cloudinary secure_url
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
    if (!url || !url.includes("cloudinary.com")) return null;
    try {
        const parts = url.split(/\/v\d+\//);
        if (parts.length > 1) {
            const pathWithExtension = parts[1];
            const lastDotIndex = pathWithExtension.lastIndexOf(".");
            return lastDotIndex !== -1 ? pathWithExtension.substring(0, lastDotIndex) : pathWithExtension;
        }
        return null;
    } catch {
        return null;
    }
};

