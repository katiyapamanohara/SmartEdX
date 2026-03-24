import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';

interface MessageEvent {
  userId: string;
  data: Record<string, any>;
}

@Injectable()
export class MessageEventService {
  private readonly subject = new Subject<MessageEvent>();

  /**
   * Returns an Observable stream of message events for a specific user.
   * Used by the SSE controller endpoint.
   */
  streamForUser(userId: string): Observable<{ data: string }> {
    return this.subject.asObservable().pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: JSON.stringify(event.data) })),
    );
  }

  /**
   * Push a new message event to a user's stream.
   */
  emit(userId: string, data: Record<string, any>): void {
    this.subject.next({ userId, data });
  }
}
