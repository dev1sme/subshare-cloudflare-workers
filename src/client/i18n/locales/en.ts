import type vi from "./vi";

const en: typeof vi = {
  errors: {
    NOT_FOUND: "Not found.",
    INTERNAL_ERROR: "Something went wrong, please try again.",
    DUPLICATE_DATA: "This already exists.",
    RELATED_DATA_EXISTS: "Cannot delete: related data exists.",
    INVALID_DATA: "Invalid data.",
    MALFORMED_JSON: "The request was malformed.",
    INVALID_CODE: "Invalid code.",
    INVALID_CREDENTIALS: "Email or password is incorrect.",
    UNAUTHORIZED: "Your session has ended, please sign in again.",
    FORBIDDEN: "You are not allowed to do this.",
    PASSWORD_TOO_SHORT: "The new password must be at least 8 characters.",
    WRONG_CURRENT_PASSWORD: "The current password is incorrect.",
    SESSION_NOT_CONFIGURED: "Sign-in is not configured on the server.",
  },
  fields: {
    email: "email",
    password: "password",
    current_password: "current password",
    new_password: "new password",
  },
};

export default en;
