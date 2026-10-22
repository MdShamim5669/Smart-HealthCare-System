import crypto from "crypto";

const hashPassword = (password: string): string => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
};

const verifyPassword = (password: string, combinedHash: string): boolean => {
    const [salt, originalHash] = combinedHash.split(":");
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === originalHash;
};

export const PasswordUtils = {
    hashPassword,
    verifyPassword,
};
