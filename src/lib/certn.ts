// DEPRECATED — Certn replaced by Checkr for criminal background checks
// This file re-exports Checkr functions under legacy names for backward compatibility

export { isCheckrEnabled as isCertnEnabled } from "./checkr";
export { mapCheckrStatus as mapCertnStatus } from "./checkr";
export { verifyCheckrWebhook as verifyCertnWebhook } from "./checkr";
