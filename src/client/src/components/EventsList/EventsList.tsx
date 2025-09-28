import React, { useState } from 'react';
import EventItem from '../EventItem';
import Panel from '../Panel';
import { ServerEvent } from '@common/types';

type UIEvent = ServerEvent & { id: string | number; timestamp: Date };

interface EventsListProps {
  events: UIEvent[];
  title: string;
  maxDisplayCount?: number;
}

const EventsList: React.FC<EventsListProps> = ({ 
  events, 
  title, 
  maxDisplayCount = 0
}) => {
  const [autoScroll, setAutoScroll] = useState(true);

  const displayEvents = maxDisplayCount > 0 
    ? events.slice(-maxDisplayCount) 
    : events;

  const startIndex = maxDisplayCount > 0 && events.length > maxDisplayCount
    ? events.length - maxDisplayCount
    : 0;

  return (
    <Panel
      title={title}
      count={events.length}
      autoScroll={autoScroll}
      onAutoScrollChange={setAutoScroll}
      maxHeight="500px"
    >
      {displayEvents.map((event, localIndex) => (
        <EventItem 
          key={event.id} 
          event={event} 
          index={startIndex + localIndex}
        />
      ))}
    </Panel>
  );
};

export default EventsList;