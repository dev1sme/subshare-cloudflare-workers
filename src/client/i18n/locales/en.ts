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
    INVALID_CREDENTIALS: "Username or password is incorrect.",
    UNAUTHORIZED: "Your session has ended, please sign in again.",
    FORBIDDEN: "You are not allowed to do this.",
    PASSWORD_TOO_SHORT: "The new password must be at least 8 characters.",
    WRONG_CURRENT_PASSWORD: "The current password is incorrect.",
    SESSION_NOT_CONFIGURED: "Sign-in is not configured on the server.",
    NOTHING_TO_UPDATE: "There is nothing to save.",
    CANNOT_DELETE_SELF: "You cannot delete the account you are signed in with.",
    LAST_ADMIN_REQUIRED: "At least one admin must remain.",
    USER_IS_PLAN_PAYER: "This admin pays for a plan; assign another payer first.",
  },
  fields: {
    username: "username",
    password: "password",
    current_password: "current password",
    new_password: "new password",
    display_name: "display name",
    role: "role",
  },
};

export default en;
