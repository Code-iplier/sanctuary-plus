import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { QueueStore } from './queue.store';
import {
  PatientTicket,
  QueueSnapshot,
  TriageLevel,
  DoctorAvailability,
  RoomStatus,
  VisitType,
  DoctorProfile,
  DoctorRoom,
} from './queue.types';

@Injectable()
export class QueueService {
  constructor(private readonly store: QueueStore) {}

  public snapshot(): QueueSnapshot {
    return this.store.getSnapshot();
  }

  public issueTicket(input: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    departmentId: string;
    visitType: VisitType;
    reason: string;
  }): PatientTicket {
    if (!input.patientId || !input.departmentId) {
      throw new BadRequestException('Patient ID and Department ID are required.');
    }
    return this.store.issueTicket(input);
  }

  public triageTicket(
    ticketId: string,
    input: {
      triageLevel: TriageLevel;
      vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
      triageNotes?: string;
      actor?: string;
    }
  ): PatientTicket {
    return this.store.triageTicket(
      ticketId,
      input.triageLevel,
      input.vitals,
      input.triageNotes,
      input.actor
    );
  }

  public callNext(roomId: string, actor?: string): PatientTicket {
    return this.store.callNext(roomId, actor);
  }

  public startConsultation(roomId: string, actor?: string): PatientTicket {
    return this.store.startConsultation(roomId, actor);
  }

  public finishConsultation(roomId: string, notes?: string, actor?: string): PatientTicket {
    return this.store.finishConsultation(roomId, notes, actor);
  }

  public markNoShow(roomId: string, reason?: string, actor?: string): PatientTicket {
    return this.store.markNoShow(roomId, reason, actor);
  }

  public recallPatient(roomId: string, actor?: string): PatientTicket {
    return this.store.recallPatient(roomId, actor);
  }

  public skipTicket(roomId: string, actor?: string): PatientTicket {
    return this.store.skipTicket(roomId, actor);
  }

  public cancelTicket(ticketId: string, reason?: string, actor?: string): PatientTicket {
    return this.store.cancelTicket(ticketId, actor, reason);
  }

  public updatePriority(ticketId: string, priority: TriageLevel, reason: string, actor?: string): PatientTicket {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason is mandatory for priority adjustments.');
    }
    return this.store.updatePriority(ticketId, priority, reason, actor);
  }

  public updateDoctorStatus(doctorId: string, status: DoctorAvailability): DoctorProfile {
    return this.store.updateDoctorStatus(doctorId, status);
  }

  public updateRoomStatus(roomId: string, status: RoomStatus): DoctorRoom {
    return this.store.updateRoomStatus(roomId, status);
  }

  public getActiveTicketForPatient(patientId: string): PatientTicket | null {
    return this.store.getActiveTicketForPatient(patientId);
  }

  public getTicketsForPatient(patientId: string): PatientTicket[] {
    return this.store.getTicketsForPatient(patientId);
  }
}
