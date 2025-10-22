export interface SmdTransitionData {
  event?: string;
  guard?: string;
  action?: string;
}

export type SmdTransitionDraft = Partial<SmdTransitionData>;

export const SMD_EDGE_MARKER_ID = 'smdArrowHead';
export const SMD_EDGE_MARKER_URL = `url(#${SMD_EDGE_MARKER_ID})`;
export const USE_SMD_EDGE_MARKERS = true;

export const ensureSmdTransitionData = (data?: SmdTransitionDraft): Required<SmdTransitionData> => ({
  event: data?.event?.trim() ?? '',
  guard: data?.guard?.trim() ?? '',
  action: data?.action?.trim() ?? '',
});

export const composeSmdTransitionLabel = (data: SmdTransitionDraft | undefined): string => {
  const { event, guard, action } = ensureSmdTransitionData(data);

  if (!event && !guard && !action) {
    return '';
  }

  const eventPart = event;
  const guardPart = guard ? `[${guard}]` : '';
  const actionPart = action;

  if (eventPart && guardPart && actionPart) {
    return `${eventPart} ${guardPart} / ${actionPart}`;
  }

  if (eventPart && guardPart) {
    return `${eventPart} ${guardPart}`;
  }

  if (eventPart && actionPart) {
    return `${eventPart} / ${actionPart}`;
  }

  if (guardPart && actionPart) {
    return `${guardPart} / ${actionPart}`;
  }

  if (eventPart) {
    return eventPart;
  }

  if (guardPart) {
    return guardPart;
  }

  return `/ ${actionPart}`;
};

export const parseSmdTransitionLabel = (label: string | undefined): Required<SmdTransitionData> => {
  if (!label) {
    return ensureSmdTransitionData();
  }

  const trimmed = label.trim();
  if (!trimmed) {
    return ensureSmdTransitionData();
  }

  const slashIndex = trimmed.indexOf('/');
  let beforeAction = trimmed;
  let action = '';

  if (slashIndex >= 0) {
    action = trimmed.slice(slashIndex + 1).trim();
    beforeAction = trimmed.slice(0, slashIndex).trim();
  }

  const guardMatch = beforeAction.match(/\[([^[\]]*)\]/);
  let guard = '';
  let event = beforeAction;

  if (guardMatch) {
    guard = guardMatch[1]?.trim() ?? '';
    event = beforeAction.replace(guardMatch[0], '').trim();
  }

  return ensureSmdTransitionData({ event, guard, action });
};
