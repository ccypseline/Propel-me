/**
 * Track warmth changes and detect reactivations
 * @param {Object} contact - Current contact object
 * @param {string} newWarmthBucket - New warmth bucket ('hot', 'warm', 'cold')
 * @param {number} newWarmthScore - New warmth score
 * @param {string} badgeStartDate - User's badge_start_date from settings
 * @returns {Object} Updated contact fields
 */
export function trackWarmthChange(contact, newWarmthBucket, newWarmthScore, badgeStartDate) {
  const updates = {
    warmth_bucket: newWarmthBucket,
    warmth_score: newWarmthScore,
  };

  const previousBucket = contact.previous_warmth_bucket || contact.warmth_bucket;
  
  // Check if warmth bucket actually changed
  if (previousBucket !== newWarmthBucket) {
    updates.previous_warmth_bucket = previousBucket;
    updates.last_warmth_change_at = new Date().toISOString();
    
    // Check for reactivation: cold → warm/hot
    if (previousBucket === 'cold' && newWarmthBucket !== 'cold') {
      const now = new Date();
      const existingReactivation = contact.reactivated_at ? new Date(contact.reactivated_at) : null;
      const resetWindow = badgeStartDate ? new Date(badgeStartDate) : null;
      
      // Count as reactivation if:
      // - No previous reactivation recorded, OR
      // - Previous reactivation was before the badge start date (reset period)
      if (!existingReactivation || (resetWindow && existingReactivation < resetWindow)) {
        updates.reactivated_at = now.toISOString();
      }
    }
  }

  return updates;
}

/**
 * Count reactivations since badge start date
 * @param {Array} contacts - All contacts
 * @param {string} badgeStartDate - Badge start date from user settings
 * @returns {number} Count of reactivated contacts
 */
export function countReactivations(contacts, badgeStartDate) {
  if (!badgeStartDate) {
    return 0;
  }

  const startDate = new Date(badgeStartDate);
  
  return contacts.filter(contact => {
    if (!contact.reactivated_at) return false;
    
    const reactivationDate = new Date(contact.reactivated_at);
    return reactivationDate >= startDate;
  }).length;
}