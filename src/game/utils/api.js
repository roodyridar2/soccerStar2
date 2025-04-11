// API utilities for session tracking

// API URL with fallback
const API_URL = window.VITE_GAMES_API || 'https://online-games-api.lezzoodevs.com';

// Create API utility object
const ApiUtils = {};

/**
 * Get URL parameters
 * @returns {URLSearchParams} URL search parameters
 */
ApiUtils.getUrlParams = function() {
  return new URLSearchParams(window.location.search);
};

/**
 * Get app version from URL parameters
 * @returns {string} App version or default value
 */
ApiUtils.getAppVersion = function() {
  const query = ApiUtils.getUrlParams();
  return query.get('appVersion') || '1';
};

/**
 * Send session data to the API
 * @param {Object} session - Session data
 * @param {string} token - Authentication token
 * @returns {Promise} API response
 */
ApiUtils.addSessionToDB = async function(session, token) {
  try {
    // Use fetch API since we're in a browser environment
    const response = await fetch(`${API_URL}/api/records/session-end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${token}`
      },
      body: JSON.stringify({
        ...session,
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending session data:', error);
    return null;
  }
};

/**
 * Create a new game session
 * @param {Object} gameData - Initial game data
 * @returns {Object} Session object
 */
ApiUtils.createGameSession = function(gameData = {}) {
  // Get app version from URL parameters
  const appVersion = ApiUtils.getAppVersion();
  
  return {
    game_id: 20,
    customer_id: 0,
    session_score: 0, // Only tracking red score as a number
    appVersion: appVersion,
    startTime: new Date().toISOString(),
    endTime: null,
    ...(gameData || {})
  };
};

// Initialize ApiUtils as a global object for compatibility with existing code
if (typeof window !== 'undefined') {
  window.ApiUtils = ApiUtils;
}

export default ApiUtils;
