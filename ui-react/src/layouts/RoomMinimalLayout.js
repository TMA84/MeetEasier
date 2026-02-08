import React from 'react';
import { useParams } from 'react-router-dom';

import Display from '../components/room-minimal/Display';
import NotFound from '../components/global/NotFound';

function RoomMinimalLayout() {
  const { name: roomAlias } = useParams();

  React.useEffect(() => {
    document.title = roomAlias ? `${roomAlias.charAt(0).toUpperCase() + roomAlias.slice(1)} - Room Display` : 'Room Display';
  }, [roomAlias]);

  return (
    <div id="room-minimal__wrap">
      { roomAlias ?
        <Display alias={roomAlias} />
      :
        <div id="error-wrap">
          <NotFound />
        </div>
      }
    </div>
  )
}

export default RoomMinimalLayout;
