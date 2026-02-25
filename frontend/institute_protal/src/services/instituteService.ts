import { authService } from "./authService";

export interface Institute {
  id: string;
  name: string;
  logo?: string;
  // Add other fields as needed
}

export interface Course {
  id: string;
  name: string;
  code: string;
  coverImage?: string;
  batchNumber: string;
  description?: string;
  instituteId?: string;
  assignedTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  courseId: string;
}

export type ContentType = 'pdf' | 'video' | 'document' | 'quiz' | 'link';

export interface ModuleContent {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  url?: string;
  order: number;
  moduleId: string;
}

class InstituteService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async getInstituteById(id: string): Promise<Institute | null> {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/auth/institutes/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // If any error occurs (4xx or 5xx), sign out the user
        console.error(`Institute fetch failed with status ${response.status}. Signing out...`);
        await authService.logout(); // Commenting out auto-logout to prevent disruptions during dev
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getInstituteById Error:", error);
      return null;
    }
  }

  async getInstituteUsers(instituteId: string, role?: string): Promise<any[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      // The backend controller is now at /institutes/:id/users
      // If role filtering is needed, we should add it to the backend controller query params.
      // For now, fetching all and filtering on frontend or backend (backend returns all currently).
      
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const users = await response.json();
      
      // Optional client-side filtering if backend doesn't support it yet
      if (role) {
          return users.filter((u: any) => u.role?.name === role || u.role === role);
      }
      return users;
    } catch (error) {
      console.error("InstituteService.getInstituteUsers Error:", error);
      return [];
    }
  }

  async createInstituteUser(instituteId: string, userData: any): Promise<any> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create user");
    }

    return await response.json();
  }

  async updateInstituteUser(instituteId: string, userId: string, userData: any): Promise<any> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update user");
    }

    return await response.json();
  }

  async deleteInstituteUser(instituteId: string, userId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete user");
    }
  }

  async getTeacherDetails(instituteId: string, userId: string): Promise<any> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users/${userId}/details`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch teacher details");
    }
    
    return await response.json();
  }

  async toggleInstituteUserStatus(instituteId: string, userId: string): Promise<any> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/users/${userId}/toggle-status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
        // Log detailed error for debugging
       console.error(`Toggle status failed: ${response.status} ${response.statusText}`);
       try {
           const errorBody = await response.json();
           console.error("Error body:", errorBody);
       } catch (e) {
           console.error("Could not parse error body");
       }
      throw new Error("Failed to toggle user status");
    }
    
    return await response.json();
  }

  // Course Management Methods
  async getCourses(instituteId: string): Promise<Course[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getCourses Error:", error);
      return [];
    }
  }

  async createCourse(instituteId: string, courseData: any): Promise<Course> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create course");
    }

    return await response.json();
  }

  async updateCourse(instituteId: string, courseId: string, courseData: any): Promise<Course> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update course");
    }

    return await response.json();
  }

  async deleteCourse(instituteId: string, courseId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete course");
    }
  }

  // Course Module Management Methods
  async getCourseModules(instituteId: string, courseId: string): Promise<CourseModule[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch course modules: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getCourseModules Error:", error);
      return [];
    }
  }

  async createCourseModule(instituteId: string, courseId: string, moduleData: any): Promise<CourseModule> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(moduleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create module");
    }

    return await response.json();
  }

  async updateCourseModule(instituteId: string, courseId: string, moduleId: string, moduleData: any): Promise<CourseModule> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(moduleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update module");
    }

    return await response.json();
  }

  async deleteCourseModule(instituteId: string, courseId: string, moduleId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete module");
    }
  }

  // Module Content Management Methods
  async getModuleContents(instituteId: string, courseId: string, moduleId: string): Promise<ModuleContent[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/contents`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch module contents: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getModuleContents Error:", error);
      return [];
    }
  }

  async createModuleContent(instituteId: string, courseId: string, moduleId: string, contentData: any): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/contents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create module content");
    }

    return await response.json();
  }

  async updateModuleContent(instituteId: string, courseId: string, moduleId: string, contentId: string, contentData: any): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/contents/${contentId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update module content");
    }

    return await response.json();
  }

  async deleteModuleContent(instituteId: string, courseId: string, moduleId: string, contentId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/contents/${contentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete module content");
    }
  }
}

export const instituteService = new InstituteService();
