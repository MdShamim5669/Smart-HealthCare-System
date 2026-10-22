import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

const generateToken = (payload: Record<string, unknown>, secret: Secret, expiresIn: string): string => {
    return jwt.sign(payload, secret, {
        expiresIn: expiresIn as SignOptions["expiresIn"],
    });
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
    return jwt.verify(token, secret) as JwtPayload;
};

export const JwtUtils = {
    generateToken,
    verifyToken,
};
