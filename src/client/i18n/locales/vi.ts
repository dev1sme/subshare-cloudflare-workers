// UI copy. `errors` is keyed by API error.code; `fields` names the fields that
// MISSING_/INVALID_/TOO_LONG_ codes refer to (used when a code has no own key).
const vi = {
  errors: {
    NOT_FOUND: "Không tìm thấy dữ liệu.",
    INTERNAL_ERROR: "Có lỗi xảy ra, vui lòng thử lại.",
    DUPLICATE_DATA: "Dữ liệu đã tồn tại.",
    RELATED_DATA_EXISTS: "Không thể xoá vì còn dữ liệu liên quan.",
    INVALID_DATA: "Dữ liệu không hợp lệ.",
    MALFORMED_JSON: "Yêu cầu gửi lên không đúng định dạng.",
    INVALID_CODE: "Mã không hợp lệ.",
    INVALID_CREDENTIALS: "Tên đăng nhập hoặc mật khẩu không đúng.",
    UNAUTHORIZED: "Phiên đăng nhập đã hết, vui lòng đăng nhập lại.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    PASSWORD_TOO_SHORT: "Mật khẩu mới phải có ít nhất 8 ký tự.",
    WRONG_CURRENT_PASSWORD: "Mật khẩu hiện tại không đúng.",
    SESSION_NOT_CONFIGURED: "Máy chủ chưa được cấu hình đăng nhập.",
    NOTHING_TO_UPDATE: "Không có thay đổi nào để lưu.",
    CANNOT_DELETE_SELF: "Không thể xoá tài khoản đang đăng nhập.",
    LAST_ADMIN_REQUIRED: "Phải còn ít nhất một quản trị viên.",
  },
  fields: {
    username: "tên đăng nhập",
    password: "mật khẩu",
    current_password: "mật khẩu hiện tại",
    new_password: "mật khẩu mới",
    display_name: "tên hiển thị",
    role: "vai trò",
  } as Record<string, string>,
};

export default vi;
