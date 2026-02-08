import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";

interface AddEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  user?: any; // If user is provided, it's edit mode
}

const AddEditUserModal: React.FC<AddEditUserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "", // Only for new users
    role: "teacher", // Default role
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: "",
        role: user.role || "teacher",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "teacher",
      });
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save user:", error);
      // Ideally show error message to user
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-6">
        <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {user ? "Edit Lecture Staff" : "Add New Staff"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user ? "Update the details of the staff member." : "Fill in the details to add a new lecture staff."}
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="w-full">
              <Label>First Name</Label>
              <InputField
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                // required
              />
            </div>
            <div className="w-full">
               <Label>Last Name</Label>
              <InputField
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                // required
              />
            </div>
          </div>
          <div>
            <Label>Email Address</Label>
            <InputField
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              // required
              disabled={!!user} // Disable email editing for existing users if required
            />
          </div>
          {!user && (
            <div>
              <Label>Password</Label>
              <InputField
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                // required
              />
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : user ? "Update Staff" : "Add Staff"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddEditUserModal;
