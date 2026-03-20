/** @file AdminLayout.js
 *  @description Layout wrapper for the admin panel, rendering the main Admin component.
 */
import React, { Component } from 'react';
import Admin from '../components/admin/Admin';

class AdminLayout extends Component {
  render() {
    return <Admin />;
  }
}

export default AdminLayout;
