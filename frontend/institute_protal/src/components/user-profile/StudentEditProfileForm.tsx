"use client";
import React, { useState, useEffect } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { authService, User } from "@/services/authService";

export default function StudentEditProfileForm() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle save logic here
    console.log("Saving student profile changes...");
    alert("Profile update logic not implemented yet (mock only)");
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSave} className="flex flex-col">
      <div className="space-y-6">
        <div>
          <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h5>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
            <div className="col-span-2 lg:col-span-1">
              <Label>First Name</Label>
              <Input type="text" defaultValue={user.firstName} placeholder="Enter your first name" />
            </div>

            <div className="col-span-2 lg:col-span-1">
              <Label>Last Name</Label>
              <Input type="text" defaultValue={user.lastName} placeholder="Enter your last name" />
            </div>

            <div className="col-span-2 lg:col-span-1">
              <Label>Email Address</Label>
              <Input type="text" defaultValue={user.email} disabled placeholder="Your email address" />
            </div>

            <div className="col-span-2 lg:col-span-1">
              <Label>Role</Label>
              <Input type="text" defaultValue={user.role} disabled placeholder="Your role" />
            </div>

            <div className="col-span-2">
              <Label>Profile Picture URL</Label>
              <Input type="text" defaultValue={user.profilePicture} placeholder="Link to your profile picture" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
            Social Links
          </h5>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
            <div>
              <Label>Facebook</Label>
              <Input type="text" placeholder="https://facebook.com/your-profile" />
            </div>

            <div>
              <Label>X.com</Label>
              <Input type="text" placeholder="https://x.com/your-handle" />
            </div>

            <div>
              <Label>Linkedin</Label>
              <Input type="text" placeholder="https://linkedin.com/in/your-profile" />
            </div>

            <div>
              <Label>Instagram</Label>
              <Input type="text" placeholder="https://instagram.com/your-handle" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8 lg:justify-end">
        <Button size="sm" variant="outline" type="button" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button size="sm" type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
