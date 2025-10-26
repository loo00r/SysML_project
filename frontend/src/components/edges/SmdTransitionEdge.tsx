import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from 'reactflow';
import type { CSSProperties } from 'react';
import useDiagramStore from '../../store/diagramStore';
import type { SmdTransitionDraft } from '../../utils/smdTransition';
import {
  ensureSmdTransitionData,
  composeSmdTransitionLabel,
  SMD_EDGE_MARKER_URL,
  USE_SMD_EDGE_MARKERS,
} from '../../utils/smdTransition';
import ValidationBadge from '../overlays/ValidationBadge';

const LABEL_PLACEHOLDER = 'event [guard] / action';
const SAVE_DEBOUNCE_MS = 150;
const resolvedMarker = (incoming?: string) => {
  if (!USE_SMD_EDGE_MARKERS) {
    return undefined;
  }

  if (incoming && typeof incoming === 'string') {
    return incoming;
  }

  return SMD_EDGE_MARKER_URL;
};

const SmdTransitionEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
  } = props;

  const updateTransition = useDiagramStore((state) => state.updateSmdTransitionEdge);

  // Get validation results for this edge
  const activeDiagramId = useDiagramStore(state => state.activeDiagramId);
  const getSmdValidationResults = useDiagramStore(state => state.getSmdValidationResults);
  const validationResults = useMemo(() => {
    if (!activeDiagramId) return [];
    return getSmdValidationResults(activeDiagramId).filter(r => r.kind === 'edge' && r.id === id);
  }, [activeDiagramId, getSmdValidationResults, id]);

  const transitionData = useMemo(
    () => ensureSmdTransitionData(data as SmdTransitionDraft),
    [data],
  );
  const labelText = useMemo(
    () => composeSmdTransitionLabel(transitionData),
    [transitionData],
  );
  const isEmptyLabel = labelText.length === 0;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SmdTransitionDraft>(transitionData);
  const [initialData, setInitialData] = useState<SmdTransitionDraft>(transitionData);

  const eventInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(transitionData);
      setInitialData(transitionData);
    }
  }, [transitionData, isEditing]);

  useEffect(() => {
    if (isEditing && eventInputRef.current) {
      eventInputRef.current.focus();
      eventInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
  }, []);

  const scheduleUpdate = useCallback((nextDraft: SmdTransitionDraft) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      updateTransition(id, nextDraft);
      debounceRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [id, updateTransition]);

  const commitDraft = useCallback((next?: SmdTransitionDraft) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const payload = next ?? draft;
    updateTransition(id, payload);
    setIsEditing(false);
  }, [draft, id, updateTransition]);

  const cancelEditing = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDraft(initialData);
    updateTransition(id, initialData);
    setIsEditing(false);
  }, [initialData, id, updateTransition]);

  const handleInputChange = useCallback(
    (field: keyof SmdTransitionDraft) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((prev) => {
        const nextDraft = { ...prev, [field]: value };
        scheduleUpdate(nextDraft);
        return nextDraft;
      });
    },
    [scheduleUpdate],
  );

  const handleEditorKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }, [commitDraft, cancelEditing]);

  const handleInputBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (nextTarget && event.currentTarget.parentElement?.contains(nextTarget)) {
      return;
    }
    commitDraft();
  }, [commitDraft]);

  const beginEditing = useCallback((event: React.SyntheticEvent) => {
    if (isEditing) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setInitialData(transitionData);
    setDraft(transitionData);
    setIsEditing(true);
  }, [isEditing, transitionData]);

  const handleLabelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      beginEditing(event);
    }
  }, [beginEditing]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const resolvedMarkerEnd = resolvedMarker(markerEnd);
  const mergedStyle: CSSProperties = {
    stroke: '#37474f',
    strokeWidth: 2,
    ...(style as CSSProperties | undefined),
  };

  const labelContainerStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
    pointerEvents: 'all' as CSSProperties['pointerEvents'],
    zIndex: 1,
  };

  const labelClassName = `smd-edge-label${isEmptyLabel ? ' smd-edge-label--placeholder' : ''}`;
  const displayLabel = labelText || LABEL_PLACEHOLDER;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={mergedStyle}
        markerEnd={resolvedMarkerEnd}
        interactionWidth={20}
      />

      <EdgeLabelRenderer>
        <div style={labelContainerStyle}>
          {/* Validation Badge for Edge */}
          {validationResults.length > 0 && (
            <div style={{ position: 'absolute', left: -30, top: -10 }}>
              <ValidationBadge results={validationResults} position="top-right" size={18} />
            </div>
          )}

          {isEditing ? (
            <div
              className="smd-edge-label-editor"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <input
                ref={eventInputRef}
                className="smd-edge-label-editor__input"
                name="event"
                placeholder="event"
                value={draft.event ?? ''}
                onChange={handleInputChange('event')}
                onKeyDown={handleEditorKeyDown}
                onBlur={handleInputBlur}
                autoComplete="off"
              />
              <input
                className="smd-edge-label-editor__input"
                name="guard"
                placeholder="guard"
                value={draft.guard ?? ''}
                onChange={handleInputChange('guard')}
                onKeyDown={handleEditorKeyDown}
                onBlur={handleInputBlur}
                autoComplete="off"
              />
              <input
                className="smd-edge-label-editor__input"
                name="action"
                placeholder="action"
                value={draft.action ?? ''}
                onChange={handleInputChange('action')}
                onKeyDown={handleEditorKeyDown}
                onBlur={handleInputBlur}
                autoComplete="off"
              />
            </div>
          ) : (
            <div
              className={labelClassName}
              onDoubleClick={beginEditing}
              onKeyDown={handleLabelKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Edit transition label"
            >
              {displayLabel}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(SmdTransitionEdge);
