import React from 'react';
import { Paper, Typography } from '@mui/material';
import { Panel } from 'reactflow';

interface StatusPanelProps {
  diagramName: string;
  nodeCount: number;
  edgeCount: number;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  diagramName,
  nodeCount,
  edgeCount,
}) => {
  return (
    <Panel position="bottom-left">
      <Paper sx={{ padding: '4px 8px', opacity: 0.8 }}>
        <Typography variant="caption">
          {diagramName} | {nodeCount} nodes | {edgeCount} connections
        </Typography>
      </Paper>
    </Panel>
  );
};

export default StatusPanel;