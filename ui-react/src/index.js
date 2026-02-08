import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './index.css';

import FlightboardLayout from './layouts/FlightboardLayout';
import SingleRoomLayout from './layouts/SingleRoomLayout';
import RoomMinimalLayout from './layouts/RoomMinimalLayout';
import WiFiInfoLayout from './layouts/WiFiInfoLayout';
import AdminLayout from './layouts/AdminLayout';
import NotFound from './components/global/NotFound';

const container = document.getElementById('app');
const root = createRoot(container);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<FlightboardLayout />} />
      <Route path="/single-room/:name" element={<SingleRoomLayout />} />
      <Route path="/room-minimal/:name" element={<RoomMinimalLayout />} />
      <Route path="/wifi-info" element={<WiFiInfoLayout />} />
      <Route path="/admin" element={<AdminLayout />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
