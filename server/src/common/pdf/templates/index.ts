import { ReportCardTemplate } from './report-card.types';
import { ClassicTemplate } from './classic.template';
import { ModernTemplate } from './modern.template';
import { DetailedTemplate } from './detailed.template';
import { PrimaryTemplate } from './primary.template';

const registry: Record<string, ReportCardTemplate> = {
  classic: new ClassicTemplate(),
  modern: new ModernTemplate(),
  detailed: new DetailedTemplate(),
  primary: new PrimaryTemplate(),
};

export const TEMPLATE_NAMES = Object.keys(registry);

export function getTemplate(name: string | null | undefined): ReportCardTemplate {
  if (name && registry[name]) return registry[name];
  return registry.classic;
}

export * from './report-card.types';
