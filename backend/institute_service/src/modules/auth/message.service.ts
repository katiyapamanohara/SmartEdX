import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepository } from '../../infra/database/repositories/message.repository';
import { CourseRepository } from '../../infra/database/repositories/course.repository';
import { InstituteUserRepository } from '../../infra/database/repositories/institute-user.repository';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly courseRepository: CourseRepository,
    private readonly instituteUserRepository: InstituteUserRepository,
  ) {}

  /**
   * Get all contactable users for the current user.
   * For students: returns teachers from their enrolled courses.
   * For teachers: returns students from their assigned courses.
   */
  async getContacts(instituteId: string, userId: string, role: string) {
    if (role === 'student') {
      const courses = await this.courseRepository.findByStudentUserId(userId, instituteId);
      const teacherMap = new Map<string, any>();
      for (const course of courses) {
        for (const teacher of course.teachers || []) {
          if (teacher.user && !teacherMap.has(teacher.userId)) {
            teacherMap.set(teacher.userId, {
              id: teacher.userId,
              firstName: teacher.user.firstName,
              lastName: teacher.user.lastName,
              email: teacher.user.email,
              profilePicture: teacher.user.profilePicture,
              role: 'teacher',
              courses: [],
            });
          }
          if (teacher.user && teacherMap.has(teacher.userId)) {
            teacherMap.get(teacher.userId).courses.push({
              id: course.id,
              name: course.name,
            });
          }
        }
      }
      return Array.from(teacherMap.values());
    }

    if (role === 'teacher' || role === 'instructor') {
      const courses = await this.courseRepository.findByTeacherUserIdWithStudents(userId, instituteId);
      const studentMap = new Map<string, any>();
      for (const course of courses) {
        for (const student of course.students || []) {
          if (student.user && !studentMap.has(student.userId)) {
            studentMap.set(student.userId, {
              id: student.userId,
              firstName: student.user.firstName,
              lastName: student.user.lastName,
              email: student.user.email,
              profilePicture: student.user.profilePicture,
              role: 'student',
              courses: [],
            });
          }
          if (student.user && studentMap.has(student.userId)) {
            studentMap.get(student.userId).courses.push({
              id: course.id,
              name: course.name,
            });
          }
        }
      }
      return Array.from(studentMap.values());
    }

    return [];
  }

  /**
   * Get conversation messages between current user and another user.
   */
  async getConversation(
    instituteId: string,
    currentUserId: string,
    otherUserId: string,
    role: string,
  ) {
    // Validate that the users are connected via a course
    const isConnected = await this.areUsersConnected(instituteId, currentUserId, otherUserId, role);
    if (!isConnected) {
      throw new ForbiddenException('You can only message users from your assigned courses');
    }

    // Mark messages from other user as read
    await this.messageRepository.markAsRead(otherUserId, currentUserId, instituteId);

    const messages = await this.messageRepository.findConversation(currentUserId, otherUserId, instituteId);
    return messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      isRead: msg.isRead,
      isMine: msg.senderId === currentUserId,
      createdAt: msg.createdAt,
    }));
  }

  /**
   * Send a message to another user.
   */
  async sendMessage(
    instituteId: string,
    senderId: string,
    dto: CreateMessageDto,
    role: string,
  ) {
    const isConnected = await this.areUsersConnected(instituteId, senderId, dto.recipientId, role);
    if (!isConnected) {
      throw new ForbiddenException('You can only message users from your assigned courses');
    }

    const message = await this.messageRepository.create({
      senderId,
      recipientId: dto.recipientId,
      content: dto.content.trim(),
      instituteId,
      isRead: false,
    });

    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      recipientId: message.recipientId,
      isRead: message.isRead,
      isMine: true,
      createdAt: message.createdAt,
    };
  }

  /**
   * Get unread message counts per contact for the current user.
   */
  async getUnreadCounts(instituteId: string, userId: string) {
    const contacts = await this.messageRepository.findAll({
      where: { recipientId: userId, isRead: false, instituteId },
      select: ['senderId'],
    });

    const counts: Record<string, number> = {};
    for (const msg of contacts) {
      counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
    }
    return counts;
  }

  private async areUsersConnected(
    instituteId: string,
    userId1: string,
    userId2: string,
    role: string,
  ): Promise<boolean> {
    if (role === 'student') {
      // userId1 is student, userId2 should be a teacher in their course
      const courses = await this.courseRepository.findByStudentUserId(userId1, instituteId);
      for (const course of courses) {
        for (const teacher of course.teachers || []) {
          if (teacher.userId === userId2) return true;
        }
      }
    } else if (role === 'teacher' || role === 'instructor') {
      // userId1 is teacher, userId2 should be a student in their course
      const courses = await this.courseRepository.findByTeacherUserIdWithStudents(userId1, instituteId);
      for (const course of courses) {
        for (const student of course.students || []) {
          if (student.userId === userId2) return true;
        }
      }
    }
    return false;
  }
}
