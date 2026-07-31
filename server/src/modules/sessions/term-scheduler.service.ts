import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

/**
 * Runs nightly at midnight.
 * For each school that has a current session:
 *   - If the current term's endDate has passed, find the next term (by startDate)
 *     within the same session and set it as current.
 *   - If all terms in the current session are finished, keep the last term as current
 *     (admin will manually set the next session/term when ready).
 */
@Injectable()
export class TermSchedulerService {
  private readonly logger = new Logger(TermSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoAdvanceCurrentTerm() {
    this.logger.log('Running term auto-advance check…');

    const now = new Date();

    // Find all schools that have an active current session
    const currentSessions = await this.prisma.session.findMany({
      where: { isCurrent: true, deletedAt: null },
      include: {
        terms: {
          where: { deletedAt: null },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    let advanced = 0;

    for (const session of currentSessions) {
      const terms = session.terms;
      if (terms.length === 0) continue;

      // Find the current term
      const currentTerm = terms.find(t => t.isCurrent);
      if (!currentTerm) {
        // No current term set — set the first term that hasn't ended yet, or the first overall
        const activeTerm = terms.find(t => new Date(t.endDate) >= now) ?? terms[0];
        await this.prisma.term.update({
          where: { id: activeTerm.id },
          data: { isCurrent: true },
        });
        this.logger.log(`School ${session.schoolId}: set initial current term → ${activeTerm.name}`);
        advanced++;
        continue;
      }

      // If current term hasn't ended yet, nothing to do
      if (new Date(currentTerm.endDate) >= now) continue;

      // Current term has ended — find the next term by startDate
      const currentIndex = terms.findIndex(t => t.id === currentTerm.id);
      const nextTerm = terms[currentIndex + 1];

      if (!nextTerm) {
        // No next term — all terms done, session is over
        this.logger.log(`School ${session.schoolId}: all terms in session "${session.name}" are complete`);
        continue;
      }

      // Advance to next term
      await this.prisma.$transaction([
        this.prisma.term.update({
          where: { id: currentTerm.id },
          data: { isCurrent: false },
        }),
        this.prisma.term.update({
          where: { id: nextTerm.id },
          data: { isCurrent: true },
        }),
      ]);

      this.logger.log(
        `School ${session.schoolId}: advanced term ${currentTerm.name} → ${nextTerm.name}`
      );
      advanced++;
    }

    this.logger.log(`Term auto-advance complete: ${advanced} school(s) updated`);
  }
}
