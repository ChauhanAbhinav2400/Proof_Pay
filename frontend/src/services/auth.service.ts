import * as authApi from "../api/auth.api";

export const authService = { requestNonce: authApi.requestNonce, verifyWalletSignature: authApi.verifyWalletSignature };
