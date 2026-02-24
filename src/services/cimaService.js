
// Use relative path to leverage Vite proxy
const API_BASE_URL = '/api/psuministro';

/**
 * Fetches the list of medicine shortages from the CIMA API using parallel requests.
 * @param {function} onProgress - Callback function(currentLoadedPages, totalPages)
 * @returns {Promise<Object>} - The JSON response from the API.
 */
export const getAllShortages = async (onProgress) => {
  let allResults = [];
  const pageSize = 200; // API limits to 200 items per page
  const CONCURRENCY_LIMIT = 5; // Fetch 5 pages at a time

  try {
    const cacheBuster = `&t=${Date.now()}`;

    // 1. Fetch First Page to get Total Count
    const firstResponse = await fetch(`${API_BASE_URL}?pagina=1&tamanioPagina=${pageSize}${cacheBuster}`);
    if (!firstResponse.ok) throw new Error(`API error: ${firstResponse.status}`);

    const firstData = await firstResponse.json();
    const totalItems = firstData.totalFilas || 0;
    const initialResults = firstData.resultados || [];

    allResults = [...initialResults];

    if (totalItems === 0) return { resultados: [], total: 0 };

    const totalPages = Math.ceil(totalItems / pageSize);
    if (onProgress) onProgress(1, totalPages);

    // 2. Prepare remaining pages
    if (totalPages > 1) {
      const remainingPages = [];
      for (let i = 2; i <= totalPages; i++) {
        remainingPages.push(i);
      }

      // 3. Process in Chunks (Simple Concurrency Control)
      for (let i = 0; i < remainingPages.length; i += CONCURRENCY_LIMIT) {
        const chunk = remainingPages.slice(i, i + CONCURRENCY_LIMIT);

        const chunkPromises = chunk.map(async (pageNum) => {
          try {
            const res = await fetch(`${API_BASE_URL}?pagina=${pageNum}&tamanioPagina=${pageSize}${cacheBuster}`);
            if (!res.ok) {
              console.warn(`Failed to fetch page ${pageNum}: ${res.status}`);
              return [];
            }
            const data = await res.json();
            return data.resultados || [];
          } catch (err) {
            console.error(`Error fetching page ${pageNum}`, err);
            return [];
          }
        });

        // Wait for this chunk to finish
        const chunkResults = await Promise.all(chunkPromises);

        // Flatten and add to results
        chunkResults.forEach(results => {
          allResults = [...allResults, ...results];
        });

        // Update Progress
        if (onProgress) {
          onProgress(1 + i + chunk.length, totalPages);
        }
      }
    }

    return { resultados: allResults, total: allResults.length };
  } catch (error) {
    console.error('Error fetching shortages:', error);
    throw error;
  }
};
