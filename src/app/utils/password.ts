import crypto from "crypto";

const DEFAULT_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

const hashPassword = (password: string): string => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, DEFAULT_ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
    return `${salt}:${DEFAULT_ITERATIONS}:${hash}`;
};

const verifyPassword = (password: string, combinedHash: string): boolean => {
    try {
        if (!combinedHash || typeof combinedHash !== "string") return false;

        const parts = combinedHash.split(":");
        let salt: string;
        let iterations = 1000;
        let originalHash: string;

        if (parts.length === 2) {
            // Legacy format: salt:hash (1,000 iterations)
            [salt, originalHash] = parts;
        } else if (parts.length === 3) {
            // Modern format: salt:iterations:hash
            salt = parts[0];
            iterations = parseInt(parts[1], 10) || DEFAULT_ITERATIONS;
            originalHash = parts[2];
        } else {
            return false;
        }

        if (!salt || !originalHash) return false;

        const hash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString("hex");

        const hashBuf = Buffer.from(hash, "utf-8");
        const origBuf = Buffer.from(originalHash, "utf-8");

        if (hashBuf.length !== origBuf.length) {
            return false;
        }

        return crypto.timingSafeEqual(hashBuf, origBuf);
    } catch {
        return false;
    }
};

const needsRehash = (combinedHash: string): boolean => {
    const parts = combinedHash.split(":");
    return parts.length === 2 || (parts.length === 3 && parseInt(parts[1], 10) < DEFAULT_ITERATIONS);
};

export const PasswordUtils = {
    hashPassword,
    verifyPassword,
    needsRehash,
};

