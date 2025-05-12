declare module './ValidationPanel' {
  import { ValidationError } from '../store/diagramStore';
  
  export interface ValidationPanelProps {
    errors: ValidationError[];
  }
  
  const ValidationPanel: React.FC<ValidationPanelProps>;
  export default ValidationPanel;
}
