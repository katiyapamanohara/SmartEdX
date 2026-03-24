"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { instituteService, Course, Institute } from "@/services/instituteService";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import { FiUser, FiMail, FiBook, FiCreditCard, FiCheckCircle, FiLoader, FiBookOpen } from "react-icons/fi";

function EnrolForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const instituteId = params?.instituteId as string;
  const initialCourseId = searchParams.get("courseId");

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    admissionNumber: "",
    batchNumber: "",
    courseIds: [] as string[],
  });

  useEffect(() => {
    if (!instituteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [instData, coursesData] = await Promise.all([
          instituteService.getPublicInstituteInfo(instituteId),
          instituteService.getPublicCourses(instituteId),
        ]);
        setInstitute(instData);
        setCourses(coursesData);

        // Pre-select course from query param if it exists
        if (initialCourseId && coursesData.some((c: Course) => c.id === initialCourseId)) {
          setFormData((prev) => ({
            ...prev,
            courseIds: [initialCourseId],
          }));
        }
      } catch (error) {
        console.error("Failed to fetch public data:", error);
        setErrorMsg("Failed to load enrollment information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [instituteId, initialCourseId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCourseToggle = (courseId: string) => {
    setFormData((prev) => {
      const isSelected = prev.courseIds.includes(courseId);
      if (isSelected) {
        return { ...prev, courseIds: prev.courseIds.filter((id) => id !== courseId) };
      } else {
        return { ...prev, courseIds: [...prev.courseIds, courseId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setErrorMsg("Please fill in all required fields (First Name, Last Name, Email)");
      return;
    }

    if (formData.courseIds.length === 0 && !formData.batchNumber) {
      setErrorMsg("Please select at least one course or provide a batch number");
      return;
    }

    setSubmitting(true);
    try {
      await instituteService.publicEnrol(instituteId, {
        ...formData,
        role: "student",
      });
      setEnrolled(true);
    } catch (error: any) {
      console.error("Enrollment failed:", error);
      setErrorMsg(error.message || "Failed to enrol. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        <FiLoader className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <div className="mx-auto max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/15 text-success-600 dark:text-success-500">
            <FiCheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enrollment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Welcome to {institute?.name || "the institute"}. Your application has been received and you'll receive a confirmation email shortly.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary" className="w-full">
            Enrol Another Student
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 dark:bg-gray-950">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mb-10 text-center">
          {institute?.logo ? (
            <img src={institute.logo} alt={institute.name} className="mx-auto mb-4 h-16 w-auto object-contain" />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-500">
              <FiBookOpen className="h-10 w-10" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {institute?.name} Enrollment
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create your student account and join our courses.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
                Student Information
              </h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name <span className="text-error-500">*</span></Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    startIcon={<FiUser />}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name <span className="text-error-500">*</span></Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    startIcon={<FiUser />}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address <span className="text-error-500">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  startIcon={<FiMail />}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="admissionNumber">Admission Number</Label>
                  <Input
                    id="admissionNumber"
                    name="admissionNumber"
                    placeholder="ADM-123"
                    startIcon={<FiCreditCard />}
                    value={formData.admissionNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    name="batchNumber"
                    placeholder="BATCH-2024"
                    startIcon={<FiBook />}
                    value={formData.batchNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Courses</h2>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  Pick your path
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div
                      key={course.id}
                      className={`flex items-start space-x-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                        formData.courseIds.includes(course.id)
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/5 ring-1 ring-brand-500"
                          : "border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-800"
                      }`}
                      onClick={() => handleCourseToggle(course.id)}
                    >
                      <Checkbox
                        checked={formData.courseIds.includes(course.id)}
                        onChange={() => {}} // Handle via parent div click for better UX
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                          {course.name}
                        </p>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">{course.code}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No courses available for enrollment at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-white/[0.02] p-8 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <Button 
               type="submit" 
               className="w-full py-6 text-base font-bold transition-all hover:scale-[1.01]" 
               disabled={submitting}
            >
              {submitting ? (
                <>
                  <FiLoader className="mr-2 h-5 w-5 animate-spin" />
                  Processing Enrollment...
                </>
              ) : (
                "Complete Enrollment"
              )}
            </Button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              By enrolling, you agree to our <a href="#" className="underline hover:text-brand-500">Terms of Service</a> and <a href="#" className="underline hover:text-brand-500">Privacy Policy</a>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PublicEnrolPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        <FiLoader className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <EnrolForm />
    </Suspense>
  );
}
