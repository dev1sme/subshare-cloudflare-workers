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
  },
  fields: {} as Record<string, string>,
};

export default vi;
