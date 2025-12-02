import { base44 } from '@/api/base44Client';
import { calculateRelevanceScore, calculateOverallPriority } from './scoringUtils';

/**
 * Enrich a single contact from their LinkedIn profile
 * @param {Object} contact - Contact object with profile_url
 * @param {Object} careerProfile - User's career profile for relevance scoring
 * @returns {Object} { success: boolean, contact?: Object, error?: string }
 */
export async function enrichContactFromLinkedIn(contact, careerProfile) {
  if (!contact.profile_url) {
    return { 
      success: false, 
      error: 'No LinkedIn URL available' 
    };
  }

  try {
    // Use AI with internet access to research the person
    // Direct scraping of LinkedIn URLs often fails due to auth walls, so we use search context instead
    const extractedData = await base44.integrations.Core.InvokeLLM({
      add_context_from_internet: true,
      prompt: `Research the professional profile of ${contact.first_name} ${contact.last_name}${contact.current_company ? ` (works at ${contact.current_company})` : ''}.
      
The user provided this LinkedIn URL: ${contact.profile_url}

Using search results and public information, extract the following professional details:
- full_name
- headline (professional headline)
- current_title (most recent job title)
- current_company (most recent company)
- industry (e.g., "Technology", "Healthcare", "Finance")
- location (city and country/region, e.g., "Boston, MA" or "London, UK")
- skills (a short list of 3-5 most relevant skills)
- summary (a short 1-2 sentence professional summary)

If specific fields cannot be confidentially determined, return null for that field.
Do not invent data.`,
      response_json_schema: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          headline: { type: "string" },
          current_title: { type: "string" },
          current_company: { type: "string" },
          industry: { type: "string" },
          location: { type: "string" },
          skills: { 
            type: "array",
            items: { type: "string" }
          },
          summary: { type: "string" }
        }
      }
    });

    // Prepare update object - only update empty fields
    const updates = {
      enrichment_status: 'success',
      enriched_at: new Date().toISOString()
    };

    if (extractedData.headline && !contact.headline) {
      updates.headline = extractedData.headline;
    }
    if (extractedData.current_title && !contact.current_title) {
      updates.current_title = extractedData.current_title;
    }
    if (extractedData.current_company && !contact.current_company) {
      updates.current_company = extractedData.current_company;
    }
    if (extractedData.industry && !contact.industry) {
      updates.industry = extractedData.industry;
    }
    if (extractedData.location && !contact.location) {
      updates.location = extractedData.location;
    }
    if (extractedData.skills && (!contact.skills || contact.skills.length === 0)) {
      updates.skills = extractedData.skills;
    }
    if (extractedData.summary && !contact.summary) {
      updates.summary = extractedData.summary;
    }
    
    // Fix potential null values in arrays
    if (updates.skills && !Array.isArray(updates.skills)) {
      updates.skills = [];
    }

    // Recalculate relevance with enriched data
    const enrichedContact = { ...contact, ...updates };
    const relevance = calculateRelevanceScore(enrichedContact, careerProfile);
    const priority = calculateOverallPriority(relevance.score, contact.warmth_score || 0);

    updates.relevance_score = relevance.score;
    updates.relevance_bucket = relevance.bucket;
    updates.overall_priority_score = priority.score;
    updates.overall_priority_bucket = priority.bucket;

    // Update contact in database
    await base44.entities.Contact.update(contact.id, updates);

    return { 
      success: true, 
      contact: { ...contact, ...updates } 
    };

  } catch (error) {
    console.error('Enrichment error:', error);
    
    // Mark as failed
    await base44.entities.Contact.update(contact.id, {
      enrichment_status: 'failed',
      enriched_at: new Date().toISOString()
    });

    return { 
      success: false, 
      error: error.message || 'Unknown error during enrichment' 
    };
  }
}

/**
 * Enrich multiple contacts in batches
 * @param {Array} contacts - Array of contacts to enrich
 * @param {Object} careerProfile - User's career profile
 * @param {Function} onProgress - Callback for progress updates (current, total, lastResult)
 * @returns {Object} { succeeded: number, failed: number, results: Array }
 */
export async function enrichContactsBatch(contacts, careerProfile, onProgress) {
  const BATCH_SIZE = 1; // Process one by one for stability
  let succeeded = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    const result = await enrichContactFromLinkedIn(contact, careerProfile);
    results.push({ contact, result });

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, contacts.length, result);
    }

    // Delay between EVERY request to be "rolling" and polite to APIs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { succeeded, failed, results };
}