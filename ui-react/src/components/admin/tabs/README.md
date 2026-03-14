# Admin Tab Components

This directory contains extracted tab components from the monolithic Admin.js file. Each tab is a self-contained, reusable React component.

## Available Components

### DevicesTab.js
**Purpose**: Unified display management interface for Socket.IO and MQTT (Touchkio) displays

**Features**:
- Unified table showing all connected displays (Socket.IO + MQTT)
- Smart status indicators with color-coded dots:
  - Active (green) - Display is connected and on
  - Inactive (yellow) - Display connected but inactive
  - Partial (yellow) - Mixed status (e.g., Socket.IO active but MQTT off)
  - Connected (gray) - MQTT connected but power status unknown
  - Disconnected (red) - No connection
- Connection type badges (Socket.IO, MQTT) displayed vertically
- Display metrics (CPU, Memory, Temperature) for MQTT displays
- Context-aware action buttons:
  - Power Management (all displays)
  - Refresh (MQTT displays only)
  - Details (MQTT displays only - opens Touchkio modal)
  - Delete (disconnected displays only)
- Bulk operations:
  - "Refresh All Touchkio" - Refreshes all MQTT displays
  - "Reboot All Touchkio" - Reboots all MQTT displays
- Display tracking settings:
  - Tracking mode (Client ID vs IP+Room)
  - Retention time (1-168 hours)
  - Cleanup delay (0-60 minutes)
- Improved table layout with fixed column widths
- Device ID/hostname display under display name
- Room name extraction for single-room displays
- Smart status fallback: Falls back to Socket.IO status when MQTT power is unknown

**Props**:
```javascript
{
  // Data
  connectedDisplays: Array,
  connectedDisplaysLoading: Boolean,
  connectedDisplaysMessage: String,
  connectedDisplaysMessageType: String,
  systemDisplayTrackingMode: String,
  currentSystemDisplayTrackingMode: String,
  systemDisplayTrackingRetentionHours: Number,
  currentSystemDisplayTrackingRetentionHours: Number,
  systemDisplayTrackingCleanupMinutes: Number,
  currentSystemDisplayTrackingCleanupMinutes: Number,
  systemMessage: String,
  systemMessageType: String,
  
  // Translations
  t: Object,
  
  // Handlers
  onLoadDisplays: Function,
  onOpenPowerManagement: Function,
  onOpenTouchkioModal: Function,
  onMqttRefresh: Function,
  onMqttRefreshAll: Function,
  onMqttRebootAll: Function,
  onDeleteDisplay: Function,
  onTrackingModeChange: Function,
  onRetentionHoursChange: Function,
  onCleanupMinutesChange: Function,
  onSaveSettings: Function
}
```

**Lines**: ~421

---

### MqttTab.js
**Purpose**: MQTT broker configuration and status monitoring

**Features**:
- MQTT broker enable/disable toggle
- Connection settings (URL, authentication, discovery)
- Broker status display (running/stopped, connected clients)

**Lines**: ~140

---

### AuditTab.js
**Purpose**: Audit log viewer for configuration changes

**Features**:
- Load and display audit logs
- Timestamp, user, IP, and action details

**Lines**: ~45

---

### BackupTab.js
**Purpose**: Configuration backup and restore

**Features**:
- Export configuration as JSON
- Import configuration from JSON
- Validation and error handling

**Lines**: ~50

---

### SystemTab.js
**Purpose**: System-wide configuration settings

**Features**:
- Startup validation settings
- Error exposure configuration
- HSTS settings
- Rate limiting configuration
- Display tracking settings

**Lines**: ~170

---

## Component Architecture

All tab components follow a consistent pattern:

1. **Props-based**: All state and handlers passed as props
2. **Presentational**: No internal state management (except UI state)
3. **Reusable**: Can be used independently or within Admin.js
4. **Testable**: Pure components easy to test in isolation

## Usage Example

```javascript
import DevicesTab from './tabs/DevicesTab';

<DevicesTab
  connectedDisplays={this.state.connectedDisplays}
  connectedDisplaysLoading={this.state.connectedDisplaysLoading}
  t={this.getTranslations()}
  onLoadDisplays={this.handleLoadConnectedDisplays}
  onOpenPowerManagement={this.handleOpenPowerManagementModal}
  onOpenTouchkioModal={this.handleOpenTouchkioModal}
  // ... other props
/>
```

## Benefits

- **Maintainability**: Smaller, focused components are easier to understand and modify
- **Reusability**: Components can be reused in different contexts
- **Testability**: Isolated components are easier to test
- **Performance**: Smaller components can be optimized independently
- **Collaboration**: Multiple developers can work on different tabs simultaneously

## Future Enhancements

Planned tab extractions:
- TranslationApiTab (translation API settings)
- OAuthTab (OAuth and Graph configuration)
- MaintenanceTab (maintenance mode)
- TranslationsTab (i18n management)
- Display configuration tabs (WiFi, Logo, Colors, Booking)
