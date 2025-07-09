let siteIndex = [];
let featureToggles = {
  showTitle: true,
  showSnippet: true,
  showPath: true,
  showFavicon: true,
  defaultFavicon: "favicon.ico"
};

// Load feature toggles and site index
async function initialize() {
  try {
    // Load feature toggles
    const togglesRes = await fetch('featureToggles.json');
    if (togglesRes.ok) {
      featureToggles = Object.assign(
        featureToggles,
        await togglesRes.json()
      );
    }

    // Load site index
    const siteIndexRes = await fetch('siteIndex.json');
    if (!siteIndexRes.ok) throw new Error('Failed to load siteIndex.json');
    siteIndex = await siteIndexRes.json();

    showResults([], document.getElementById('searchBox').value);
  } catch (e) {
    document.getElementById('results').innerHTML =
      '<span style="color:red">Failed to load site index or feature toggles.</span>';
  }
}

// Search function using regex
function searchSite(query) {
  if (!query.trim()) return [];
  let regex;
  try {
    regex = new RegExp(query, "i");
  } catch {
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
  }
  return siteIndex.filter(page =>
    regex.test(page.title) ||
    regex.test(page.path) ||
    regex.test(page.snippet)
  );
}

// Rendering results
function showResults(results, query) {
  const resultsDiv = document.getElementById('results');
  if (!query.trim()) {
    resultsDiv.innerHTML = `<em>Type to search website pages...</em>`;
    return;
  }
  if (results.length === 0) {
    resultsDiv.innerHTML = `<em>No results found for "<b>${escapeHtml(query)}</b>"</em>`;
    return;
  }
  resultsDiv.innerHTML = results
    .map(page => {
      // Favicon logic
      let faviconUrl = featureToggles.defaultFavicon;
      if (
        featureToggles.showFavicon &&
        typeof page.favicon === "string" &&
        page.favicon.trim() !== ""
      ) {
        faviconUrl = page.favicon;
      }
      return `
      <div class="result">
        ${
          featureToggles.showFavicon
            ? `<img class="result-favicon" src="${faviconUrl}" alt="favicon" onerror="this.src='${featureToggles.defaultFavicon}'">`
            : ""
        }
        ${
          featureToggles.showTitle
            ? `<a class="result-title" href="${page.path}" target="_blank">${highlightMatch(page.title, query)}</a>`
            : ""
        }
        ${
          featureToggles.showPath
            ? `<div class="result-path">${highlightMatch(page.path, query)}</div>`
            : ""
        }
        ${
          featureToggles.showSnippet
            ? `<div class="result-snippet">${highlightMatch(page.snippet, query)}</div>`
            : ""
        }
      </div>
      `;
    })
    .join('');
}

// Highlight regex matches in text
function highlightMatch(text, query) {
  if (!text) return "";
  let regex;
  try {
    regex = new RegExp(query, "gi");
  } catch {
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
  }
  return text.replace(regex, match => `<mark>${escapeHtml(match)}</mark>`);
}

// Escape HTML for safety
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

// Live search event
document.getElementById('searchBox').addEventListener('input', function() {
  const query = this.value;
  const results = searchSite(query);
  showResults(results, query);
});

initialize();