import { differenceInDays } from 'date-fns';

/**
 * Calculate warmth score based on days since last interaction
 * @param {string} lastInteractionDate - ISO date string
 * @returns {Object} { warmth_score: number, warmth_bucket: string }
 */
export function calculateWarmthScore(lastInteractionDate) {
  if (!lastInteractionDate) {
    return { score: 0, bucket: 'cold' };
  }

  const daysSince = differenceInDays(new Date(), new Date(lastInteractionDate));
  let score;

  if (daysSince <= 90) {
    // Hot: 0-90 days
    score = Math.max(80, 100 - Math.floor(daysSince / 4.5));
    return { score: score, bucket: 'hot' };
  } else if (daysSince <= 365) {
    // Warm: 91-365 days
    score = Math.max(40, 79 - Math.floor((daysSince - 90) / 7));
    return { score: score, bucket: 'warm' };
  } else {
    // Cold: 365+ days
    score = Math.max(0, 39 - Math.floor((daysSince - 365) / 30));
    return { score: score, bucket: 'cold' };
  }
}

/**
 * Calculate relevance score based on user career profile
 * @param {Object} contact - Contact object
 * @param {Object} userProfile - UserCareerProfile object
 * @returns {Object} { relevance_score: number, relevance_bucket: string }
 */
export function calculateRelevanceScore(contact, userProfile, weights) {
  if (!userProfile) {
    return { score: 50, bucket: 'medium' };
  }

  // Default weights if not provided
  const w = weights || {
    industry: 30,
    role: 25,
    location: 15,
    company: 15,
    skills: 15
  };

  let score = 0;
  let maxPossible = 0;

  // 1. Industry
  if (w.industry > 0) {
      maxPossible += w.industry;
      let industryMatch = false;
      
      // Direct industry match
      if (contact.industry && userProfile.target_industries?.some(i => 
          contact.industry.toLowerCase().includes(i.toLowerCase()) || 
          i.toLowerCase().includes(contact.industry.toLowerCase()))) {
        industryMatch = true;
      }
      
      // Fallback: Check title/company for industry keywords if industry is missing
      if (!industryMatch && userProfile.target_industries) {
          const textToCheck = `${contact.current_title || ''} ${contact.current_company || ''} ${contact.headline || ''}`.toLowerCase();
          if (userProfile.target_industries.some(i => {
             const industryTerm = i.toLowerCase();
             // specific check for "health" matching "healthcare"
             if (industryTerm.includes('health') && textToCheck.includes('health')) return true;
             if (industryTerm.includes('tech') && textToCheck.includes('tech')) return true;
             if (industryTerm.includes('finance') && textToCheck.includes('finance')) return true;
             
             // General check
             return textToCheck.includes(industryTerm);
          })) {
              industryMatch = true;
          }
      }

      if (industryMatch) score += w.industry;
  }

  // 2. Role
  if (w.role > 0) {
      maxPossible += w.role;
      if ((contact.current_title || contact.headline) && userProfile.dream_roles?.some(r => 
          (contact.current_title || contact.headline).toLowerCase().includes(r.toLowerCase()) ||
          r.toLowerCase().includes((contact.current_title || contact.headline).toLowerCase()))) {
        score += w.role;
      }
  }

  // 3. Location
  if (w.location > 0) {
      maxPossible += w.location;
      if (contact.location && userProfile.preferred_locations?.some(l => 
          contact.location.toLowerCase().includes(l.toLowerCase()) ||
          l.toLowerCase().includes(contact.location.toLowerCase()))) {
        score += w.location;
      }
  }

  // 4. Company (Current & Past)
  if (w.company > 0) {
      maxPossible += w.company;
      let companyMatch = false;
      
      // Check current
      if (contact.current_company && userProfile.wishlist_companies?.some(c => 
          contact.current_company.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(contact.current_company.toLowerCase()))) {
        companyMatch = true;
      }
      
      // Check past
      if (!companyMatch && contact.past_companies && userProfile.wishlist_companies) {
          if (contact.past_companies.some(past => 
              userProfile.wishlist_companies.some(target => 
                  past.toLowerCase().includes(target.toLowerCase()) || 
                  target.toLowerCase().includes(past.toLowerCase())
              )
          )) {
              companyMatch = true;
          }
      }
      
      if (companyMatch) {
        score += w.company;
      }
  }

  // 5. Skills
  if (w.skills > 0) {
      maxPossible += w.skills;
      if (contact.skills && userProfile.target_skills) {
          const matches = contact.skills.filter(s => 
              userProfile.target_skills.some(ts => 
                  s.toLowerCase().includes(ts.toLowerCase()) ||
                  ts.toLowerCase().includes(s.toLowerCase())
              )
          );
          
          if (matches.length >= 2) {
              score += w.skills;
          } else if (matches.length === 1) {
              score += (w.skills * 0.5);
          }
      }
  }
  
  // Normalize to 0-100 scale
  if (maxPossible > 0) {
      score = (score / maxPossible) * 100;
  } else {
      score = 0;
  }
  
  score = Math.round(score);

  // Determine bucket
  let bucket;
  if (score >= 80) bucket = 'high';
  else if (score >= 40) bucket = 'medium';
  else bucket = 'low';

  return { score: score, bucket: bucket };
}

/**
 * Calculate overall priority score
 * @param {number} relevanceScore 
 * @param {number} warmthScore 
 * @returns {Object} { overall_priority_score: number, overall_priority_bucket: string }
 */
export function calculateOverallPriority(relevanceScore, warmthScore) {
  const score = Math.round(0.7 * relevanceScore + 0.3 * warmthScore);
  
  let bucket;
  if (score >= 70) bucket = 'A';
  else if (score >= 40) bucket = 'B';
  else bucket = 'C';

  return { score: score, bucket: bucket };
}

/**
 * Get the most recent interaction date from all sources
 * @param {string} connectedOn - ISO date string
 * @param {Array} interactions - Array of interaction objects with date field
 * @returns {string} ISO date string of most recent interaction
 */
export function getLastInteractionDate(connectedOn, interactions = []) {
  const dates = [connectedOn];
  
  interactions.forEach(interaction => {
    if (interaction.date) {
      dates.push(interaction.date);
    }
  });

  // Filter out null/undefined and sort to get most recent
  const validDates = dates.filter(d => d).sort((a, b) => new Date(b) - new Date(a));
  
  return validDates[0] || connectedOn;
}