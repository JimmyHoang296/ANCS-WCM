import React, { useState } from "react";
import { Save, Trash } from "lucide-react";
import { toDateInputValue } from "../../assets/helpers";

const VisitPlanDetailModal = ({ plan, onClose, onSave, onUpdate, onDelete }) => {
  const isNew = !plan?.id;
  const [formData, setFormData] = useState(plan || {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (isNew) onSave(formData);
    else onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-bold">
            {isNew ? "Kế hoạch mới" : "Chi tiết kế hoạch"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-3xl"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-sm">Ngày kiểm tra</label>
            <input
              type="date"
              name="date"
              value={toDateInputValue(formData.date) || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm">Mã CH</label>
            <input
              type="text"
              name="site"
              value={formData.site || ""}
              onChange={handleChange}
              placeholder={isNew ? "VD: SV00123, SV00456, SV00789" : ""}
              className="w-full p-2 border rounded-md"
            />
            {isNew && (
              <p className="text-xs text-gray-400 mt-1">
                Có thể nhập nhiều mã CH cùng lúc, cách nhau bởi dấu phẩy để tạo nhiều kế hoạch cho cùng ngày kiểm tra.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 flex items-center"
          >
            <Save className="mr-2" size={18} /> Lưu
          </button>
          {!isNew && (
            <button
              onClick={() => onDelete(formData.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center"
            >
              <Trash className="mr-2" size={18} /> Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitPlanDetailModal;
