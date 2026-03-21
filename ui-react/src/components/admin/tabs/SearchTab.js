/**
 * @file SearchTab.js
 * @description Admin panel tab for configuring room search parameters, including Graph API usage toggle, maximum days/room lists/rooms/items, and the polling interval.
 */
import React from 'react';

const SearchTab = ({
  isActive,
  searchLocked,
  t,
  currentSearchUseGraphAPI,
  currentSearchMaxDays,
  currentSearchMaxRoomLists,
  currentSearchMaxRooms,
  currentSearchMaxItems,
  currentSearchPollIntervalMs,
  searchLastUpdated,
  searchUseGraphAPI,
  searchMaxDays,
  searchMaxRoomLists,
  searchMaxRooms,
  searchMaxItems,
  searchPollIntervalMs,
  searchMessage,
  searchMessageType,
  booleanLabel,
  onSearchChange,
  onSearchSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
    <div className="admin-card" id="ops-search">
      <div className="admin-form-divider"></div>

      {!searchLocked && (
        <>
          <h3>Search Configuration</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">Use Microsoft Graph API</span>
                <span className="config-value">{booleanLabel(currentSearchUseGraphAPI)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Max days</span>
                <span className="config-value">{currentSearchMaxDays}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Max room lists</span>
                <span className="config-value">{currentSearchMaxRoomLists}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Max rooms</span>
                <span className="config-value">{currentSearchMaxRooms}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Max items</span>
                <span className="config-value">{currentSearchMaxItems}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Poll interval (ms)</span>
                <span className="config-value">{currentSearchPollIntervalMs}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{searchLastUpdated || '-'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSearchSubmit}>
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">Use Microsoft Graph API</span>
                <input
                  type="checkbox"
                  checked={searchUseGraphAPI}
                  onChange={(e) => onSearchChange('searchUseGraphAPI', e.target.checked)}
                />
              </label>
            </div>

            <div className="admin-form-group">
              <label htmlFor="searchMaxDays">Max days</label>
              <input
                id="searchMaxDays"
                type="number"
                min="1"
                value={searchMaxDays}
                onChange={(e) => onSearchChange('searchMaxDays', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="searchMaxRoomLists">Max room lists</label>
              <input
                id="searchMaxRoomLists"
                type="number"
                min="1"
                value={searchMaxRoomLists}
                onChange={(e) => onSearchChange('searchMaxRoomLists', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="searchMaxRooms">Max rooms</label>
              <input
                id="searchMaxRooms"
                type="number"
                min="1"
                value={searchMaxRooms}
                onChange={(e) => onSearchChange('searchMaxRooms', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="searchMaxItems">Max items</label>
              <input
                id="searchMaxItems"
                type="number"
                min="1"
                value={searchMaxItems}
                onChange={(e) => onSearchChange('searchMaxItems', Math.max(parseInt(e.target.value, 10) || 1, 1))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="searchPollIntervalMs">Poll interval (ms)</label>
              <input
                id="searchPollIntervalMs"
                type="number"
                min="5000"
                step="1000"
                value={searchPollIntervalMs}
                onChange={(e) => onSearchChange('searchPollIntervalMs', Math.max(parseInt(e.target.value, 10) || 5000, 5000))}
              />
              <small>Minimum: 5000 ms</small>
            </div>

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                searchUseGraphAPI === currentSearchUseGraphAPI &&
                parseInt(searchMaxDays, 10) === currentSearchMaxDays &&
                parseInt(searchMaxRoomLists, 10) === currentSearchMaxRoomLists &&
                parseInt(searchMaxRooms, 10) === currentSearchMaxRooms &&
                parseInt(searchMaxItems, 10) === currentSearchMaxItems &&
                parseInt(searchPollIntervalMs, 10) === currentSearchPollIntervalMs
              }
            >
              Save Search Configuration
            </button>
          </form>

          {searchMessage && (
            <div className={`admin-message admin-message-${searchMessageType}`}>
              {searchMessage}
            </div>
          )}

          <div className="admin-form-divider"></div>
        </>
      )}

      {searchLocked && (
        <>
          <h3>Search Configuration</h3>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
          <div className="admin-form-divider"></div>
        </>
      )}
    </div>
    </div>
  );
};

export default SearchTab;
