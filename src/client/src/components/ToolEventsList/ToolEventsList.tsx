import React from 'react';
import ToolEventItem from '../ToolEventItem';
import Panel from '../Panel';

interface ToolEventsListProps {
  toolEvents: Array<{
    id: string | number;
    type: string;
    timestamp: Date;
    tool?: string;
    from?: string;
    to?: string;
    output?: string;
    [key: string]: any;
  }>;
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