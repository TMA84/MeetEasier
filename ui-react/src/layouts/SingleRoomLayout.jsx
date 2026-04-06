/** @file SingleRoomLayout.js
*  @description Layout wrapper for the single-room display view, extracting the room alias from the URL and rendering the room Display or a NotFound fallback.
*/
import React from 'react';
import { useParams } from 'react-router-dom';

import Display from '../components/single-room/Display';
import NotFound from '../components/global/NotFound';

function SingleRoomLayout() {
  const { name: roomAlias } = useParams();

  // Set page title
  React.useEffect(() => {
    document.title = roomAlias ? `${roomAlias.charAt(0).toUpperCase() + roomAlias.slice(1)} - Single Room` : 'Single Room';
  }, [roomAlias]);

  return (
    <div id="single-room__wrap">
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

export default SingleRoomLayout;
