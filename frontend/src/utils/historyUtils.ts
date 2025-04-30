import { DiagramModel } from '@projectstorm/react-diagrams';

interface DiagramState {
  model: any;
  timestamp: number;
}

export class DiagramHistory {
  private undoStack: DiagramState[] = [];
  private redoStack: DiagramState[] = [];
  private current: DiagramState | null = null;
  private maxHistorySize = 50;

  constructor(private model: DiagramModel) {
    this.saveState();
  }

  saveState() {
    const serializedModel = this.model.serialize();
    const newState: DiagramState = {
      model: serializedModel,
      timestamp: Date.now()
    };

    if (this.current) {
      this.undoStack.push(this.current);
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }
    }

    this.current = newState;
    this.redoStack = []; // Clear redo stack when new action is performed
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const previousState = this.undoStack.pop()!;
    if (this.current) {
      this.redoStack.push(this.current);
    }
    this.current = previousState;

    this.applyState(previousState);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const nextState = this.redoStack.pop()!;
    if (this.current) {
      this.undoStack.push(this.current);
    }
    this.current = nextState;

    this.applyState(nextState);
    return true;
  }

  private applyState(state: DiagramState) {
    this.model.deserializeModel(state.model, this.model.getEngine());
    this.model.getEngine().repaintCanvas();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
  }
}