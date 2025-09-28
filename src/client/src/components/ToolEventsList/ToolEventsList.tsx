import React from 'react';
import ToolEventItem from '../ToolEventItem';
import Panel from '../Panel';
import { ServerEvent } from '@common/types';

type UIEvent = (ServerEvent & Partial<{ tool: string; from: string; to: string; output: string }>) & {
  id: string | number;
  timestamp: Date;
};

interface ToolEventsListProps {
  toolEvents: UIEvent[];
}

const ToolEventsList: React.FC<ToolEventsListProps> = ({ toolEvents }) => {
  return (
    <Panel
      title="Инструменты"
      count={toolEvents.length}
      maxHeight="300px"
    >
      {toolEvents.map((event) => (
        <ToolEventItem key={event.id} event={event} />
      ))}
    </Panel>
  );
};

export default ToolEventsList;