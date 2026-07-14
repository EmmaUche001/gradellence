import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Internal domain events, used to decouple side effects (notifications,
 * cache invalidation, future analytics hooks, etc.) from the services that
 * trigger them — e.g. ResultsService shouldn't need to know who, if
 * anyone, is listening when results are published.
 *
 * This deliberately uses Node's built-in EventEmitter rather than
 * @nestjs/event-emitter. That package isn't currently a dependency of this
 * project, and the same architectural goal (decoupling) is achievable
 * without adding it. If the team later wants the decorator-based
 * @OnEvent() ergonomics, swapping this for @nestjs/event-emitter's
 * EventEmitter2 is a small, contained change — this service's public
 * surface (emit/on) maps directly onto it.
 */

export const DOMAIN_EVENTS = {
  RESULTS_PUBLISHED: 'results.published',
  RESULTS_UNPUBLISHED: 'results.unpublished',
  RESULTS_COMPUTED: 'results.computed',
} as const;

export interface ResultsPublishedPayload {
  schoolId: string;
  termId: string;
  subjectIds?: string[];
  publishedCount: number;
  publishedBy: string;
}

export interface ResultsUnpublishedPayload {
  schoolId: string;
  termId: string;
  subjectIds?: string[];
  unpublishedCount: number;
  unpublishedBy: string;
}

export interface ResultsComputedPayload {
  schoolId: string;
  classId: string;
  termId: string;
  computedCount: number;
  computedBy: string;
}

@Injectable()
export class DomainEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Result computation/publication can affect many students per call;
    // default of 10 listeners is easy to exceed as more features (Phase 2
    // notifications, analytics) start listening to the same events.
    this.emitter.setMaxListeners(50);
  }

  emit(event: typeof DOMAIN_EVENTS[keyof typeof DOMAIN_EVENTS], payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  on(
    event: typeof DOMAIN_EVENTS[keyof typeof DOMAIN_EVENTS],
    listener: (payload: any) => void,
  ): void {
    this.emitter.on(event, listener);
  }
}
