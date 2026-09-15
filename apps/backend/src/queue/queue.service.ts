import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { QueueStore } from './queue.store';
import { PrismaService } from '../database/prisma.service';
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
import { Prisma } from '@prisma/client';

@Injectable()
export class QueueService implements OnModuleInit {
  constructor(
    private readonly store: QueueStore,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const tickets = await this.prisma.queueTicket.findMany({ orderBy: { createdAt: 'asc' } });
    this.store.hydrateTickets(tickets.map((ticket) => this.fromPersistedTicket(ticket)));
  }

  public snapshot(): QueueSnapshot {
    return this.store.getSnapshot();
  }

  /**
   * Patient-safe queue view. Queue ordering is calculated from the
   * authoritative full queue, but clinical triage metadata is never sent to
   * the patient portal.
   */
  public patientSnapshot(patientId: string): QueueSnapshot {
    const snapshot = this.store.getSnapshot();
    return {
      departments: snapshot.departments,
      rooms: [],
      doctors: [],
      tickets: snapshot.tickets
        .filter((ticket) => ticket.patientId === patientId)
        .map((ticket) => ({
          ...ticket,
          patientPhone: '',
          triageLevel: 'NORMAL' as const,
          triageScore: undefined,
          triageNotes: undefined,
          vitals: undefined,
        })),
      events: [],
      policy: snapshot.policy,
      metrics: [],
    };
  }

  public async issueTicket(input: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    departmentId: string;
    visitType: VisitType;
    reason: string;
  }): Promise<PatientTicket> {
    if (!input.patientId || !input.departmentId) {
      throw new BadRequestException('Patient ID and Department ID are required.');
    }
    const ticket = this.store.issueTicket(input);
    if (ticket.encounterId) return ticket;
    try {
      const patient = await this.prisma.patient.upsert({
        where: { id: input.patientId },
        update: { displayName: input.patientName, phone: input.patientPhone.replace(/\D/g, '') || undefined },
        create: { id: input.patientId, displayName: input.patientName, phone: input.patientPhone.replace(/\D/g, '') || null },
      });
      const encounter = await this.prisma.encounter.create({
        data: {
          patientId: patient.id,
          type: 'OPD',
          status: 'TOKEN_GENERATED',
          startedAt: new Date(ticket.createdAt),
        },
      });
      const attached = this.store.attachEncounterId(ticket.id, encounter.id);
      await this.persistTicket(attached);
      return attached;
    } catch (error) {
      this.store.removeTicket(ticket.id);
      throw error;
    }
  }

  public triageTicket(
    ticketId: string,
    input: {
      triageLevel: TriageLevel;
      vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
      triageNotes?: string;
      priorityScore?: number;
      actor?: string;
    }
  ): PatientTicket {
    const ticket = this.store.triageTicket(
      ticketId,
      input.triageLevel,
      input.vitals,
      input.triageNotes,
      input.actor,
      input.priorityScore,
    );
    void this.syncEncounterStatus(ticket, 'WAITING');
    return ticket;
  }

  public applyAutomatedTriage(encounterId: string, input: { triageLevel: TriageLevel; priorityScore: number }): PatientTicket {
    const ticket = this.store.getTicketByEncounterId(encounterId);
    if (!ticket) throw new BadRequestException('No queue ticket is linked to this encounter.');
    const updated = this.store.triageTicket(ticket.id, input.triageLevel, ticket.vitals, undefined, 'MediKiosk clinical decision support', input.priorityScore);
    void this.syncEncounterStatus(updated, 'WAITING');
    return updated;
  }

  public callNext(roomId: string, actor?: string): PatientTicket {
    const ticket = this.store.callNext(roomId, actor);
    void this.syncEncounterStatus(ticket, 'DOCTOR_CALLED');
    return ticket;
  }

  public startConsultation(roomId: string, actor?: string): PatientTicket {
    const ticket = this.store.startConsultation(roomId, actor);
    void this.syncEncounterStatus(ticket, 'CONSULTATION');
    return ticket;
  }

  public finishConsultation(roomId: string, notes?: string, actor?: string): PatientTicket {
    const ticket = this.store.finishConsultation(roomId, notes, actor);
    void this.syncEncounterStatus(ticket, 'CONSULTATION_COMPLETED');
    return ticket;
  }

  public markNoShow(roomId: string, reason?: string, actor?: string): PatientTicket {
    const ticket = this.store.markNoShow(roomId, reason, actor);
    void this.syncEncounterStatus(ticket, 'NO_SHOW');
    return ticket;
  }

  public recallPatient(roomId: string, actor?: string): PatientTicket {
    const ticket = this.store.recallPatient(roomId, actor);
    void this.syncEncounterStatus(ticket, 'WAITING');
    return ticket;
  }

  public skipTicket(roomId: string, actor?: string): PatientTicket {
    const ticket = this.store.skipTicket(roomId, actor);
    void this.syncEncounterStatus(ticket, 'SKIPPED');
    return ticket;
  }

  public cancelTicket(ticketId: string, reason?: string, actor?: string): PatientTicket {
    const ticket = this.store.cancelTicket(ticketId, actor, reason);
    void this.syncEncounterStatus(ticket, 'CANCELLED');
    return ticket;
  }

  public updatePriority(ticketId: string, priority: TriageLevel, reason: string, actor?: string): PatientTicket {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason is mandatory for priority adjustments.');
    }
    const ticket = this.store.updatePriority(ticketId, priority, reason, actor);
    void this.persistTicket(ticket).catch(() => undefined);
    return ticket;
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

  private async syncEncounterStatus(ticket: PatientTicket, status: string): Promise<void> {
    if (ticket.encounterId) {
      await this.prisma.encounter.update({ where: { id: ticket.encounterId }, data: { status } }).catch(() => undefined);
    }
    await this.persistTicket(ticket).catch(() => undefined);
  }

  private fromPersistedTicket(ticket: {
    id: string;
    encounterId: string | null;
    patientId: string;
    patientName: string;
    patientPhone: string;
    tokenNumber: string;
    departmentId: string;
    departmentName: string;
    visitType: string;
    reason: string;
    triageLevel: string;
    status: string;
    triageScore: number | null;
    triageNotes: string | null;
    vitals: Prisma.JsonValue | null;
    assignedDoctorId: string | null;
    assignedRoomId: string | null;
    assignedDoctorName: string | null;
    assignedRoomNumber: string | null;
    createdAt: Date;
    triagedAt: Date | null;
    calledAt: Date | null;
    consultationStartedAt: Date | null;
    consultationCompletedAt: Date | null;
    cancelledAt: Date | null;
  }): PatientTicket {
    const asDate = (value: Date | null) => value?.toISOString() ?? null;
    const vitals = ticket.vitals && typeof ticket.vitals === 'object' && !Array.isArray(ticket.vitals)
      ? ticket.vitals as PatientTicket['vitals']
      : undefined;
    return {
      id: ticket.id,
      encounterId: ticket.encounterId ?? undefined,
      tokenNumber: ticket.tokenNumber,
      patientId: ticket.patientId,
      patientName: ticket.patientName,
      patientPhone: ticket.patientPhone,
      departmentId: ticket.departmentId,
      departmentName: ticket.departmentName,
      visitType: ticket.visitType as PatientTicket['visitType'],
      reason: ticket.reason,
      triageLevel: ticket.triageLevel as PatientTicket['triageLevel'],
      triageScore: ticket.triageScore ?? undefined,
      status: ticket.status as PatientTicket['status'],
      assignedDoctorId: ticket.assignedDoctorId,
      assignedRoomId: ticket.assignedRoomId,
      assignedDoctorName: ticket.assignedDoctorName,
      assignedRoomNumber: ticket.assignedRoomNumber,
      createdAt: ticket.createdAt.toISOString(),
      triagedAt: asDate(ticket.triagedAt),
      calledAt: asDate(ticket.calledAt),
      consultationStartedAt: asDate(ticket.consultationStartedAt),
      consultationCompletedAt: asDate(ticket.consultationCompletedAt),
      cancelledAt: asDate(ticket.cancelledAt),
      vitals,
      triageNotes: ticket.triageNotes ?? undefined,
    };
  }

  private async persistTicket(ticket: PatientTicket): Promise<void> {
    await this.prisma.queueTicket.upsert({
      where: { id: ticket.id },
      create: this.toPersistedTicket(ticket),
      update: this.toPersistedTicket(ticket),
    });
  }

  private toPersistedTicket(ticket: PatientTicket) {
    const asDate = (value?: string | null) => value ? new Date(value) : null;
    return {
      id: ticket.id,
      encounterId: ticket.encounterId ?? null,
      patientId: ticket.patientId,
      patientName: ticket.patientName,
      patientPhone: ticket.patientPhone,
      tokenNumber: ticket.tokenNumber,
      departmentId: ticket.departmentId,
      departmentName: ticket.departmentName,
      visitType: ticket.visitType,
      reason: ticket.reason,
      triageLevel: ticket.triageLevel,
      status: ticket.status,
      triageScore: ticket.triageScore ?? null,
      triageNotes: ticket.triageNotes ?? null,
      vitals: ticket.vitals ? ticket.vitals as Prisma.InputJsonValue : Prisma.JsonNull,
      assignedDoctorId: ticket.assignedDoctorId ?? null,
      assignedRoomId: ticket.assignedRoomId ?? null,
      assignedDoctorName: ticket.assignedDoctorName ?? null,
      assignedRoomNumber: ticket.assignedRoomNumber ?? null,
      createdAt: new Date(ticket.createdAt),
      triagedAt: asDate(ticket.triagedAt),
      calledAt: asDate(ticket.calledAt),
      consultationStartedAt: asDate(ticket.consultationStartedAt),
      consultationCompletedAt: asDate(ticket.consultationCompletedAt),
      cancelledAt: asDate(ticket.cancelledAt),
    };
  }
}
