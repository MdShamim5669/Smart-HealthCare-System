import status from "http-status";
import config from "../../config";
import AppError from "../../errorHelpers/AppError";

export interface ISSLCommerzInitPayload {
    total_amount: number;
    tran_id: string;
    appointmentId: string;
    cus_name: string;
    cus_email: string;
    cus_phone?: string | null;
    cus_address?: string | null;
}


export interface ISSLCommerzValidationResponse {
    status: string;
    tran_date: string;
    tran_id: string;
    val_id: string;
    amount: string;
    store_amount?: string;
    currency: string;
    bank_tran_id?: string;
    card_type?: string;
    card_brand?: string;
    card_issuer?: string;
    [key: string]: any;
}

const getBaseUrl = (): string => {
    return config.sslcommerz.is_live
        ? "https://securepay.sslcommerz.com"
        : "https://sandbox.sslcommerz.com";
};

/**
 * Initialize SSLCommerz Payment Session
 */
const initPayment = async (payload: ISSLCommerzInitPayload): Promise<{ paymentUrl: string }> => {
    const store_id = config.sslcommerz.store_id || "phhealthcare_sandbox";
    const store_passwd = config.sslcommerz.store_passwd || "phhealthcare_sandbox@ssl";

    const backendUrl = config.backend_url.replace(/\/$/, "");

    const params = new URLSearchParams({
        store_id,
        store_passwd,
        total_amount: payload.total_amount.toFixed(2),
        currency: "BDT",
        tran_id: payload.tran_id,
        success_url: `${backendUrl}/api/v1/payments/sslcommerz/success?appointmentId=${payload.appointmentId}&transactionId=${payload.tran_id}`,
        fail_url: `${backendUrl}/api/v1/payments/sslcommerz/fail?appointmentId=${payload.appointmentId}&transactionId=${payload.tran_id}`,
        cancel_url: `${backendUrl}/api/v1/payments/sslcommerz/cancel?appointmentId=${payload.appointmentId}&transactionId=${payload.tran_id}`,
        ipn_url: `${backendUrl}/api/v1/payments/sslcommerz/ipn`,
        shipping_method: "NO",
        product_name: "Medical Consultation",
        product_category: "Healthcare",
        product_profile: "general",
        cus_name: payload.cus_name || "Patient",
        cus_email: payload.cus_email,
        cus_add1: payload.cus_address || "Dhaka, Bangladesh",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        cus_phone: payload.cus_phone || "01700000000",
        value_a: payload.appointmentId,
        value_b: payload.tran_id,
    });

    const initUrl = `${getBaseUrl()}/gwprocess/v4/api.php`;

    try {
        const response = await fetch(initUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        const data: any = await response.json();

        if (data.status === "SUCCESS" && (data.GatewayPageURL || data.redirectGatewayURL)) {
            return {
                paymentUrl: data.GatewayPageURL || data.redirectGatewayURL,
            };
        }

        // If sandbox fails or credentials are mock in local dev, provide dev URL
        if (config.env === "development") {
            const fallbackUrl = `${config.frontend_url}/payment/checkout/${payload.appointmentId}?gateway=sslcommerz&tran_id=${payload.tran_id}`;
            return { paymentUrl: fallbackUrl };
        }

        throw new AppError(
            status.BAD_REQUEST,
            `SSLCommerz session initialization failed: ${data.failedreason || "Unknown error"}`
        );
    } catch (error: any) {
        if (config.env === "development") {
            const fallbackUrl = `${config.frontend_url}/payment/checkout/${payload.appointmentId}?gateway=sslcommerz&tran_id=${payload.tran_id}`;
            return { paymentUrl: fallbackUrl };
        }
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            `SSLCommerz Service Error: ${error.message || "Failed to reach gateway"}`
        );
    }
};

/**
 * Validate SSLCommerz Payment with Validation Server
 */
const validatePayment = async (val_id: string): Promise<ISSLCommerzValidationResponse> => {
    const store_id = config.sslcommerz.store_id || "phhealthcare_sandbox";
    const store_passwd = config.sslcommerz.store_passwd || "phhealthcare_sandbox@ssl";

    const validateUrl = `${getBaseUrl()}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
        val_id
    )}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&format=json`;

    try {
        const response = await fetch(validateUrl);
        const data: any = await response.json();
        return data as ISSLCommerzValidationResponse;
    } catch (error: any) {
        throw new AppError(status.BAD_REQUEST, `SSLCommerz Validation Failed: ${error.message}`);
    }
};

export const SSLCommerzService = {
    initPayment,
    validatePayment,
};
