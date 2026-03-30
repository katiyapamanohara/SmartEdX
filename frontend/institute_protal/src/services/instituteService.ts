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
  moduleCount?: number;
  assignedTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
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

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number;
}

export interface ModuleContent {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  url?: string;
  quizData?: QuizData;
  order: number;
  moduleId: string;
  createdAt?: string;
  studentAttempts?: Record<string, any>;
}

export interface StudentAssessmentGroup {
  course: Course;
  quizzes: { content: ModuleContent; module: Pick<CourseModule, 'id' | 'title' | 'order'> }[];
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
      // Build URL with optional role query param — backend now supports server-side filtering
      const url = role
        ? `${this.apiUrl}/api/institutes/institutes/${instituteId}/users?role=${encodeURIComponent(role)}`
        : `${this.apiUrl}/api/institutes/institutes/${instituteId}/users`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      return await response.json();
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

  // ─── Teacher module CRUD ─────────────────────────────────────────
  async createTeacherModule(instituteId: string, courseId: string, data: { title: string; description?: string; order?: number }): Promise<CourseModule> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
    return res.json();
  }

  async updateTeacherModule(instituteId: string, courseId: string, moduleId: string, data: Partial<{ title: string; description: string; order: number }>): Promise<CourseModule> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
    return res.json();
  }

  async deleteTeacherModule(instituteId: string, courseId: string, moduleId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to delete module");
  }

  // ─── Teacher content CRUD ─────────────────────────────────────────
  async createTeacherContent(instituteId: string, courseId: string, moduleId: string, data: any): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}/contents`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
    return res.json();
  }

  async updateTeacherContent(instituteId: string, courseId: string, moduleId: string, contentId: string, data: any): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}/contents/${contentId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
    return res.json();
  }

  async deleteTeacherContent(instituteId: string, courseId: string, moduleId: string, contentId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}/contents/${contentId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to delete content");
  }

  async createTeacherAssessment(
    instituteId: string,
    courseId: string,
    moduleId: string,
    data: { title: string; description?: string; quizData: any }
  ): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/teacher-quiz`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create assessment");
    }

    return await response.json();
  }

  async createTeacherAssessmentSmart(
    instituteId: string,
    courseId: string,
    data: { moduleId?: string; moduleName?: string; title: string; description?: string; quizData: any }
  ): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-assessment`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create assessment");
    }

    return await response.json();
  }

  async getCourseForTeacher(instituteId: string, courseId: string): Promise<{ course: Course; modules: (CourseModule & { contents: ModuleContent[] })[] } | null> {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/for-teacher`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch course: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getCourseForTeacher Error:", error);
      return null;
    }
  }

  async getMyTeacherAssessments(instituteId: string): Promise<{ course: Course; quizzes: { content: ModuleContent; module: Pick<CourseModule, 'id' | 'title' | 'order'> }[] }[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/my-assessments`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assessments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getMyTeacherAssessments Error:", error);
      return [];
    }
  }

  async getMyStudentAssessments(instituteId: string): Promise<StudentAssessmentGroup[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/student-assessments`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch student assessments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('InstituteService.getMyStudentAssessments Error:', error);
      return [];
    }
  }

  async submitVoiceAssessmentResult(
    instituteId: string,
    contentId: string,
    result: {
      score: number;
      voiceResult: {
        totalScore: number;
        totalMarks: number;
        grade: string;
        passed: boolean;
        overallFeedback: string;
        questionResults: Array<{
          questionId: string;
          question: string;
          studentAnswer: string;
          expectedAnswer: string;
          score: number;
          marksAvailable: number;
          percentage: number;
          feedback: string;
        }>;
      };
    },
  ): Promise<{ success: boolean; message: string; score: number }> {
    const token = authService.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/student-assessments/${contentId}/submit`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).message || response.statusText);
    }
    return response.json();
  }

  async getMyEnrolledCourses(instituteId: string): Promise<Course[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/my-enrolled-courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enrolled courses: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getMyEnrolledCourses Error:", error);
      return [];
    }
  }

  async getMyTeacherCourses(instituteId: string): Promise<Course[]> {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/my-courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch my courses: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getMyTeacherCourses Error:", error);
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

  async uploadFileContent(
    instituteId: string,
    courseId: string,
    moduleId: string,
    file: File,
    metadata: { title: string; type: string; description?: string; order?: number },
  ): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", metadata.title);
    formData.append("type", metadata.type);
    if (metadata.description) formData.append("description", metadata.description);
    if (metadata.order !== undefined) formData.append("order", String(metadata.order));

    const response = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/modules/${moduleId}/contents/upload-file`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to upload file");
    }

    return await response.json();
  }

  async uploadTeacherFileContent(
    instituteId: string,
    courseId: string,
    moduleId: string,
    file: File,
    metadata: { title: string; type: string; description?: string; order?: number },
  ): Promise<ModuleContent> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", metadata.title);
    formData.append("type", metadata.type);
    if (metadata.description) formData.append("description", metadata.description);
    if (metadata.order !== undefined) formData.append("order", String(metadata.order));

    const response = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/courses/${courseId}/teacher-modules/${moduleId}/contents/upload-file`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to upload file");
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

  async getTeacherCount(instituteId: string): Promise<number> {
    const token = authService.getToken();
    if (!token) return 0;

    try {
      const response = await fetch(
        `${this.apiUrl}/api/institutes/auth/institutes/${instituteId}/teachers/count`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch teacher count: ${response.statusText}`);
      }

      const data = await response.json();
      return data.count ?? 0;
    } catch (error) {
      console.error("InstituteService.getTeacherCount Error:", error);
      return 0;
    }
  }
}

export const instituteService = new InstituteService();
