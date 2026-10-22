import { Request } from "express";

export class CookieUtils {
    public static getCookie(req: Request, name: string): string | undefined {
        if (req.cookies && req.cookies[name]) {
            return req.cookies[name];
        }
        if (req.signedCookies && req.signedCookies[name]) {
            return req.signedCookies[name];
        }
        return undefined;
    }
}
