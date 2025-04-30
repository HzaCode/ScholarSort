// --- START OF FILE content.js (v7.2 - Enhanced Logging & Checks) ---
console.log("Scholar Highlighter: Content script injected and running (v7.2 - Enhanced Logging).");

let currentMode = 'none'; // 'none', 'highlighted', 'filtered_first_last', 'filtered_first', 'filtered_last'
let excludePreprintsActive = false;
let ownerInfoCache = null; // Cache for profile owner's parsed name

// Keywords to identify preprints in the source string (e.g., "arXiv preprint arXiv:...")
const PREPRINT_KEYWORDS = ['arxiv', 'biorxiv', 'medrxiv', 'preprint'];

// --- Robust Parsing Functions ---

/**
 * Parses the raw profile name text (e.g., "John A Smith (约翰·史密斯)")
 * Extracts lowercase last name and first initial from the English part.
 */
function parseProfileOwnerName(rawProfileName) {
    if (!rawProfileName) {
        console.warn("Scholar Highlighter: parseProfileOwnerName received null or empty input.");
        return null;
    }
    console.log(`Scholar Highlighter: Parsing owner name: "${rawProfileName}"`);
    // Remove parentheses and non-English characters more carefully
    let cleanedName = rawProfileName.replace(/ *\([^)]*\) */g, "").trim(); // Remove content in parentheses
    cleanedName = cleanedName.replace(/[^\u0041-\u005A\u0061-\u007A\s'-]/g, '').trim(); // Keep only English letters, space, hyphen, apostrophe

    if (!cleanedName) {
        console.warn(`Scholar Highlighter: Could not extract English part from owner name: "${rawProfileName}"`);
        return null;
    }

    const nameParts = cleanedName.toLowerCase().split(/[\s'-]+/).filter(part => part.length > 0); // Split by space or hyphen
    if (nameParts.length === 0) {
        console.warn(`Scholar Highlighter: No valid name parts found after cleaning owner name: "${cleanedName}"`);
        return null;
    }

    let lastName = '';
    let firstInitial = '';

    if (nameParts.length === 1) {
        lastName = nameParts[0];
        // No first initial available
    } else {
        // Assume last part is the last name
        lastName = nameParts[nameParts.length - 1];
        firstInitial = nameParts[0].charAt(0);
    }

    if (!lastName) {
        console.warn(`Scholar Highlighter: Could not determine last name for owner: "${cleanedName}"`);
        return null;
    }

    console.log(`Scholar Highlighter: Parsed owner -> L: "${lastName}", I: "${firstInitial}"`);
    return { lastName, firstInitial };
}

/**
 * Parses an author name string from the list (e.g., "Smith, JA" or "J Smith" or "JA Smith").
 * Returns lowercase { lastName, initials }. Handles "..." potentially.
 */
function parseAuthorListName(authorString) {
    if (!authorString) return null;

    let cleanedName = authorString.trim().toLowerCase();
    // Remove potential trailing annotations like '*' or numbers in brackets sometimes seen
    cleanedName = cleanedName.replace(/ [*\[\d\]]+$/, '');
    // Remove periods commonly used in initials
    cleanedName = cleanedName.replace(/\./g, '');

    if (!cleanedName) return null;

    let lastName = '';
    let initials = '';

    // Handle "Lastname, F" or "Lastname, FI" format
    if (cleanedName.includes(',')) {
        const parts = cleanedName.split(',');
        if (parts.length === 2) {
            lastName = parts[0].trim();
            // Extract initials from the second part, removing spaces
            initials = parts[1].trim().replace(/\s+/g, '');
            if (lastName) return { lastName, initials };
        }
        // If comma format is weird, fall back to splitting by space
        cleanedName = cleanedName.replace(/,/g, ''); // Remove comma and try space splitting
    }

    // Handle "F Lastname" or "FI Lastname" format (split by space)
    const parts = cleanedName.split(/\s+/).filter(part => part.length > 0);
    if (parts.length === 0) return null;

    if (parts.length === 1) {
        // Only one part - assume it's the last name
        lastName = parts[0];
    } else {
        // Assume last part is the last name, everything else is initials/first name parts
        lastName = parts[parts.length - 1];
        // Join the initial parts, take first letter of each if multiple, or just the string if one part
         if (parts.length === 2) { // "J Smith" -> initials "j"
            initials = parts[0]; // Keep full first part as initials string
         } else { // "J A Smith" -> initials "ja"
             initials = parts.slice(0, -1).map(p => p.charAt(0)).join(''); // Only take initials
         }
        // Simplified: treat all non-last parts as potential initials string
        initials = parts.slice(0, -1).join(''); // e.g., "J A" -> "ja", "John" -> "john"
    }

    if (!lastName) return null;

    return { lastName, initials };
}


/**
 * Gets the profile owner's info, caching the result.
 */
function getProfileOwnerInfo() {
    if (ownerInfoCache) return ownerInfoCache;

    console.log("Scholar Highlighter: Attempting to find profile owner name element (#gsc_prf_in)...");
    const nameElement = document.getElementById('gsc_prf_in');
    if (!nameElement) {
        console.error("Scholar Highlighter: CRITICAL - Could not find profile owner name element (#gsc_prf_in). Cannot function.");
        return null;
    }
    const rawName = nameElement.innerText;
    if (!rawName) {
         console.error("Scholar Highlighter: CRITICAL - Found owner name element (#gsc_prf_in) but it has no text content.");
         return null;
    }

    ownerInfoCache = parseProfileOwnerName(rawName);

    if (!ownerInfoCache) {
         console.error(`Scholar Highlighter: CRITICAL - Failed to parse owner name from raw text: "${rawName}". Cannot function.`);
    } else {
         console.log(`Scholar Highlighter: Profile Owner Info Initialized -> L: "${ownerInfoCache.lastName}", I: "${ownerInfoCache.firstInitial}"`);
    }
    return ownerInfoCache;
}

// --- Matching Functions ---
/**
 * Checks if the first author matches the profile owner.
 * Handles cases with or without first initial.
 */
function isFirstAuthorMatch(ownerInfo, firstAuthorInfo) {
    if (!ownerInfo || !firstAuthorInfo || !ownerInfo.lastName || !firstAuthorInfo.lastName) return false;

    // Last names must match (case-insensitive check done during parsing)
    if (ownerInfo.lastName !== firstAuthorInfo.lastName) return false;

    // If owner has no first initial (single name), or author has no initials, match based on last name only
    if (!ownerInfo.firstInitial || !firstAuthorInfo.initials) return true;

    // If both have initials, check if author's initials *start with* the owner's first initial
    // Allows matching "J" with "J", "JA", "John", etc.
    return firstAuthorInfo.initials.startsWith(ownerInfo.firstInitial);
}

/**
 * Checks if the last author matches the profile owner.
 */
function isLastAuthorMatch(ownerInfo, lastAuthorInfo) {
     // Logic is the same as first author matching for now
    if (!ownerInfo || !lastAuthorInfo || !ownerInfo.lastName || !lastAuthorInfo.lastName) return false;
    if (ownerInfo.lastName !== lastAuthorInfo.lastName) return false;
    if (!ownerInfo.firstInitial || !lastAuthorInfo.initials) return true;
    return lastAuthorInfo.initials.startsWith(ownerInfo.firstInitial);
}

// --- Helper Functions ---
/**
 * Parses authors from a publication row (.gsc_a_tr).
 * Returns { firstAuthorInfo, lastAuthorInfo, count, sourceText }
 */
function getParsedAuthors(row) {
    const authorDiv = row.querySelector('.gs_gray'); // Selector for the line containing authors/journal
    if (!authorDiv) {
        console.warn("Scholar Highlighter: Could not find author div (.gs_gray) in row:", row);
        return null;
    }
    // The author list is usually the first line within gs_gray, sometimes followed by journal/year
    // Split by newline or look for specific patterns if needed, but often innerText works if authors are first.
    // Let's assume the first line break separates authors from journal/year info
    const parts = authorDiv.innerText.split('\n');
    let authorString = parts[0].trim(); // Take the first line

    if (!authorString) {
         console.warn("Scholar Highlighter: Found author div (.gs_gray) but its first line is empty:", authorDiv.innerText);
         return null;
    }

    // Handle the "..." ellipsis indicating a truncated author list
    let fullListAvailable = !authorString.endsWith('...');
    if (!fullListAvailable) {
        // Remove "..." and potentially the partial name before it
        authorString = authorString.substring(0, authorString.lastIndexOf(',')); // Remove up to the last comma
        // If no comma, just remove "..."? Risky. Let's stick with comma removal.
         if (!authorString) {
             console.warn("Scholar Highlighter: Could not process truncated author string:", parts[0]);
             return null; // Cannot reliably determine last author
         }
    }

    const authorsRaw = authorString.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (authorsRaw.length === 0) {
        console.warn("Scholar Highlighter: No valid author names found after splitting:", authorString);
        return null;
    }

    const firstAuthorInfo = parseAuthorListName(authorsRaw[0]);
    // Only get last author if there's more than one AND the list wasn't truncated (or we handled truncation)
    const lastAuthorInfo = (authorsRaw.length > 1 && fullListAvailable) ? parseAuthorListName(authorsRaw[authorsRaw.length - 1]) : null;
    // If list was truncated, we cannot be sure about the *actual* last author. Set lastAuthorInfo to null.
    // Our previous logic already handled this via fullListAvailable check.

    const sourceText = authorDiv.innerText.toLowerCase(); // Use full text for preprint keyword check

    // Log parsing results for a specific row if needed for debugging
    // console.log(`Parsed Authors for row: First=${JSON.stringify(firstAuthorInfo)}, Last=${JSON.stringify(lastAuthorInfo)}, Count=${authorsRaw.length}, Truncated=${!fullListAvailable}`);

    return { firstAuthorInfo, lastAuthorInfo, count: authorsRaw.length, sourceText, truncated: !fullListAvailable };
}


/**
 * Checks if the publication source text indicates a preprint.
 */
function isPreprint(rowAuthors) {
    if (!rowAuthors || !rowAuthors.sourceText) return false;
    const sourceText = rowAuthors.sourceText;
    return PREPRINT_KEYWORDS.some(keyword => sourceText.includes(keyword));
}

// --- Core Logic Functions (Refactored v7.2) ---

function resetView() {
    console.log("Scholar Highlighter: Resetting view (Show All).");
    const publicationRows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
    publicationRows.forEach(row => {
        row.style.display = ''; // Make visible
        row.style.backgroundColor = ''; // Clear highlight/color
    });
    currentMode = 'none';
    excludePreprintsActive = false; // Fully reset preprint state too
    // ownerInfoCache = null; // Don't reset cache on simple view reset, only on full reload? Let's keep it.
    updateButtonStates();
}

function applyPreprintFilter() {
    console.log(`Scholar Highlighter: Applying preprint visibility (Exclude: ${excludePreprintsActive}).`);
    const publicationRows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
    let hiddenCount = 0;
    let processedCount = 0;
    publicationRows.forEach(row => {
        processedCount++;
        const authors = getParsedAuthors(row);
        const shouldHide = excludePreprintsActive && isPreprint(authors);

        // Apply display style based ONLY on preprint status
        row.style.display = shouldHide ? 'none' : '';

        if (shouldHide) {
            hiddenCount++;
        }
    });
    console.log(`Scholar Highlighter: Preprint filter processed ${processedCount} rows, set ${hiddenCount} to hidden.`);
}

function reapplyCurrentMode() {
    console.log(`Scholar Highlighter: Re-applying mode: ${currentMode}, Exclude Preprints: ${excludePreprintsActive}`);

    // 0. Ensure owner info is available (it should be cached after first successful load)
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) {
        console.error("Scholar Highlighter: Cannot reapply mode, owner info unavailable.");
        // Optionally disable buttons or show an error?
        return;
    }

    // 1. Apply preprint visibility FIRST
    applyPreprintFilter();

    // 2. Apply the specific mode's logic (highlighting or filtering)
    // These functions should now respect the display style set by applyPreprintFilter
    // and only modify background color or hide *additional* rows.
    switch (currentMode) {
        case 'highlighted':         applyHighlight(true); break;
        case 'filtered_first_last': applyFilterFirstLast(true); break;
        case 'filtered_first':      applyFilterFirstAuthor(true); break;
        case 'filtered_last':       applyFilterLastAuthor(true); break;
        case 'none':
        default:
            // Mode 'none': applyPreprintFilter did the work. Ensure no highlights linger on visible rows.
            console.log("Scholar Highlighter: Mode is 'none', ensuring visible rows have no highlight.");
            document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(row => {
                 if (row.style.display !== 'none') { // Only touch visible rows
                     row.style.backgroundColor = '';
                 }
             });
            break;
    }
    updateButtonStates(); // Ensure buttons reflect the final state
}

function toggleExcludePreprints() {
    excludePreprintsActive = !excludePreprintsActive;
    console.log(`Scholar Highlighter: Toggled Exclude Preprints to ${excludePreprintsActive}`);
    reapplyCurrentMode(); // Re-apply the current primary mode with the new preprint setting
}


function applyHighlight(skipModeChange = false) {
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) { console.error("Owner info not found for highlight."); return; }

    console.log(`Scholar Highlighter: Applying highlight.`);

    if (!skipModeChange) {
        currentMode = 'highlighted';
    }

    const publicationRows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
    let highlightedCount = 0;
    let checkedCount = 0;

    publicationRows.forEach((row) => {
        // Don't process rows hidden by preprint filter for highlighting
        // Although highlight applies bg color, it's pointless if row is hidden.
        // Let's still apply it in case filter changes later? No, stick to visible.
        // Correction: Apply highlight based on content, visibility handled separately.
        // Let's revert to applying highlight regardless of display.

        checkedCount++;
        const authors = getParsedAuthors(row);
        row.style.backgroundColor = ''; // Clear previous highlight first

        if (!authors) return; // Skip if authors couldn't be parsed

        let isMatch = false;
        // Check first author
        if (authors.firstAuthorInfo && isFirstAuthorMatch(ownerInfo, authors.firstAuthorInfo)) {
            isMatch = true;
        }
        // Check last author (only if not truncated and more than one author)
        else if (authors.lastAuthorInfo && !authors.truncated && authors.count > 1 && isLastAuthorMatch(ownerInfo, authors.lastAuthorInfo)) {
             isMatch = true;
        }


        if (isMatch) {
            row.style.backgroundColor = '#fffbdd'; // Apply highlight
            highlightedCount++;
        }
        // No 'else' needed as we cleared background at the start of the loop iteration.
    });

    console.log(`Scholar Highlighter: Checked ${checkedCount} rows for highlight, applied to ${highlightedCount}.`);
    if (!skipModeChange) updateButtonStates();
}


function applyFilterFirstLast(skipModeChange = false) {
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) { console.error("Owner info not found for filter."); return; }

    console.log(`Scholar Highlighter: Applying filter (1st/Last).`);

    if (!skipModeChange) {
        currentMode = 'filtered_first_last';
    }
    let shownCount = 0;
    let hiddenByThisFilter = 0; // Count rows hidden specifically by this filter pass
    let alreadyHiddenCount = 0; // Count rows already hidden (e.g., by preprints)
    let processedCount = 0;

    document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(row => {
        processedCount++;
        // Respect if already hidden by preprint filter
        if (row.style.display === 'none') {
            alreadyHiddenCount++;
            return; // Don't change display, it's already hidden
        }

        const authors = getParsedAuthors(row);
        let isMatch = false;
        if (authors) {
             if (authors.firstAuthorInfo && isFirstAuthorMatch(ownerInfo, authors.firstAuthorInfo)) {
                isMatch = true;
            } else if (authors.lastAuthorInfo && !authors.truncated && authors.count > 1 && isLastAuthorMatch(ownerInfo, authors.lastAuthorInfo)) {
                isMatch = true;
            }
        }

        row.style.backgroundColor = ''; // Ensure no highlight in filter modes

        if (isMatch) {
            row.style.display = ''; // Ensure matching non-preprints are visible
            shownCount++;
        } else {
            row.style.display = 'none'; // Hide non-matching non-preprints
            hiddenByThisFilter++;
        }
    });
    console.log(`Scholar Highlighter: Filter (1st/Last) processed ${processedCount} rows. Kept ${shownCount} visible. Hid ${hiddenByThisFilter} non-matches. ${alreadyHiddenCount} were already hidden.`);
    if (!skipModeChange) updateButtonStates();
}

function applyFilterFirstAuthor(skipModeChange = false) {
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) { console.error("Owner info not found for filter."); return; }

    console.log(`Scholar Highlighter: Applying filter (1st Author Only).`);
     if (!skipModeChange) {
        currentMode = 'filtered_first';
     }
    let shownCount = 0;
    let hiddenByThisFilter = 0;
    let alreadyHiddenCount = 0;
    let processedCount = 0;

    document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(row => {
         processedCount++;
         if (row.style.display === 'none') { alreadyHiddenCount++; return; } // Skip pre-hidden

        const authors = getParsedAuthors(row);
        let isMatch = false;
        if (authors && authors.firstAuthorInfo && isFirstAuthorMatch(ownerInfo, authors.firstAuthorInfo)) {
            isMatch = true;
        }

        row.style.backgroundColor = '';

        if (isMatch) {
            row.style.display = '';
            shownCount++;
        } else {
            row.style.display = 'none';
            hiddenByThisFilter++;
        }
    });
    console.log(`Scholar Highlighter: Filter (1st Only) processed ${processedCount} rows. Kept ${shownCount} visible. Hid ${hiddenByThisFilter} non-matches. ${alreadyHiddenCount} were already hidden.`);
    if (!skipModeChange) updateButtonStates();
}

function applyFilterLastAuthor(skipModeChange = false) {
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) { console.error("Owner info not found for filter."); return; }

    console.log(`Scholar Highlighter: Applying filter (Last Author Only).`);
    if (!skipModeChange) {
        currentMode = 'filtered_last';
    }
    let shownCount = 0;
    let hiddenByThisFilter = 0;
    let alreadyHiddenCount = 0;
    let processedCount = 0;

    document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(row => {
        processedCount++;
        if (row.style.display === 'none') { alreadyHiddenCount++; return; } // Skip pre-hidden

        const authors = getParsedAuthors(row);
        let isMatch = false;
        // Check last author (only if valid, not truncated, and more than one author)
        if (authors && authors.lastAuthorInfo && !authors.truncated && authors.count > 1 && isLastAuthorMatch(ownerInfo, authors.lastAuthorInfo)) {
            isMatch = true;
        }

        row.style.backgroundColor = '';

        if (isMatch) {
            row.style.display = '';
            shownCount++;
        } else {
            row.style.display = 'none';
            hiddenByThisFilter++;
        }
    });
    console.log(`Scholar Highlighter: Filter (Last Only) processed ${processedCount} rows. Kept ${shownCount} visible. Hid ${hiddenByThisFilter} non-matches. ${alreadyHiddenCount} were already hidden.`);
     if (!skipModeChange) updateButtonStates();
}


// --- UI Functions ---

function initializeUI() {
    console.log("Scholar Highlighter: Attempting to inject buttons...");
    const targetArea = document.getElementById('gsc_a_trh'); // The table header row
    const table = document.getElementById('gsc_a_b'); // The table body

    if (!targetArea) {
        console.error("Scholar Highlighter: CRITICAL - Target area for buttons (#gsc_a_trh) not found. Cannot inject UI.");
        return;
    }
     if (!table || !table.parentNode) {
        console.error("Scholar Highlighter: CRITICAL - Could not find table body (#gsc_a_b) or its parent. Cannot inject UI correctly.");
        return;
    }
    // Check if controls already exist (e.g., due to script re-injection on navigation)
    if (document.getElementById('scholar-highlighter-controls')) {
        console.log("Scholar Highlighter: Controls already exist. Skipping injection.");
        return;
    }

    const controlContainer = document.createElement('div');
    controlContainer.id = 'scholar-highlighter-controls';
    controlContainer.style.padding = '10px 0 5px 16px'; // Match Google's padding
    controlContainer.style.borderTop = '1px solid #e0e0e0';
    controlContainer.style.marginTop = '-1px'; // Overlap slightly with table border
    controlContainer.style.display = 'flex';
    controlContainer.style.flexWrap = 'wrap';
    controlContainer.style.gap = '6px'; // Spacing between buttons

    // --- Create Buttons ---
    const excludePreprintButton = createButton('sch_hl_exclude_preprint', 'Exclude Preprints', toggleExcludePreprints);
    const highlightButton = createButton('sch_hl_highlight', 'Highlight 1st/Last', () => applyHighlight(false));
    const filterFirstLastButton = createButton('sch_hl_filter_first_last', 'Filter 1st/Last', () => applyFilterFirstLast(false));
    const filterFirstButton = createButton('sch_hl_filter_first', 'Filter 1st Author', () => applyFilterFirstAuthor(false));
    const filterLastButton = createButton('sch_hl_filter_last', 'Filter Last Author', () => applyFilterLastAuthor(false));
    const showAllButton = createButton('sch_hl_showall', 'Show All / Reset', resetView);

    // --- Append Buttons ---
    controlContainer.appendChild(excludePreprintButton);
    controlContainer.appendChild(highlightButton);
    controlContainer.appendChild(filterFirstLastButton);
    controlContainer.appendChild(filterFirstButton);
    controlContainer.appendChild(filterLastButton);
    controlContainer.appendChild(showAllButton);

    // Inject container *before* the table body
    table.parentNode.insertBefore(controlContainer, table);

    console.log("Scholar Highlighter: Buttons injected successfully.");

    // Try to get owner info immediately to enable/disable buttons correctly if needed
    getProfileOwnerInfo();
    updateButtonStates(); // Set initial button states
}

function createButton(id, text, clickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.innerText = text;
    button.type = "button"; // Essential to prevent form submission if nested
    styleButton(button);
    button.addEventListener('click', clickHandler);
    return button;
}

function styleButton(button) {
    // Mimic Google Scholar button style more closely
    button.style.padding = '6px 12px';
    button.style.border = '1px solid #dcdcdc'; // Lighter border
    button.style.borderRadius = '2px'; // Less rounded
    button.style.backgroundColor = '#f8f8f8'; // Standard background
    button.style.color = '#555'; // Standard text color
    button.style.cursor = 'pointer';
    button.style.fontSize = '11px'; // Smaller font
    button.style.fontWeight = 'bold'; // Bold text like Scholar buttons
    button.style.fontFamily = 'arial, sans-serif'; // Match font
    button.style.whiteSpace = 'nowrap';
    button.style.transition = 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s';

    button.onmouseover = () => {
        if (!button.disabled) {
            button.style.backgroundColor = '#f1f1f1'; // Slightly darker on hover
            button.style.borderColor = '#c6c6c6';
            button.style.boxShadow = '0 1px 1px rgba(0,0,0,0.1)';
        }
    };
    button.onmouseout = () => {
         // Reset based on active state
         const isActive = button.classList.contains('sch_hl_active');
         const isPreprintToggle = button.id === 'sch_hl_exclude_preprint';

         if (button.disabled) { // Primary active/disabled state
             button.style.backgroundColor = '#e0e0e0';
             button.style.borderColor = '#aaa';
             button.style.boxShadow = 'none';
         } else if (isPreprintToggle && isActive) { // Preprint active state
             button.style.backgroundColor = '#d4edda';
             button.style.borderColor = '#c3e6cb';
             button.style.boxShadow = 'none';
         } else { // Default inactive state
            button.style.backgroundColor = '#f8f8f8';
            button.style.borderColor = '#dcdcdc';
            button.style.boxShadow = 'none';
         }
    };

     button.onmousedown = () => { // Pressed state
         if (!button.disabled) {
             button.style.backgroundColor = '#e1e1e1';
             button.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';
         }
     };
     button.onmouseup = () => { // Release state (restore hover state)
          if (!button.disabled) {
             button.onmouseover(); // Trigger hover style again
          }
     };
}

function updateButtonStates() {
    const excludePreprintBtn = document.getElementById('sch_hl_exclude_preprint');
    const highlightBtn = document.getElementById('sch_hl_highlight');
    const filterFirstLastBtn = document.getElementById('sch_hl_filter_first_last');
    const filterFirstBtn = document.getElementById('sch_hl_filter_first');
    const filterLastBtn = document.getElementById('sch_hl_filter_last');
    const showAllBtn = document.getElementById('sch_hl_showall');
    const primaryButtons = [highlightBtn, filterFirstLastBtn, filterFirstBtn, filterLastBtn];

    // Reset styles for all primary buttons first
    primaryButtons.forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('sch_hl_active');
            btn.style.cursor = 'pointer';
            // Apply default inactive style (using the logic from onmouseout)
             btn.style.backgroundColor = '#f8f8f8';
             btn.style.borderColor = '#dcdcdc';
             btn.style.boxShadow = 'none';
             btn.style.color = '#555';
             btn.style.fontWeight = 'bold'; // Keep bold always? Or remove for inactive? Let's keep it.
        }
    });

    // Handle preprint toggle button state
    if (excludePreprintBtn) {
        const isActive = excludePreprintsActive;
        excludePreprintBtn.classList.toggle('sch_hl_active', isActive);
        excludePreprintBtn.innerText = isActive ? 'Include Preprints' : 'Exclude Preprints';
        // Apply active/inactive styles
         excludePreprintBtn.style.backgroundColor = isActive ? '#d4edda' : '#f8f8f8'; // Greenish active, default inactive
         excludePreprintBtn.style.borderColor = isActive ? '#c3e6cb' : '#dcdcdc';
         excludePreprintBtn.style.color = isActive ? '#155724' : '#555'; // Dark green text when active
         excludePreprintBtn.style.boxShadow = 'none';
         excludePreprintBtn.disabled = false; // Never disabled itself
         excludePreprintBtn.style.cursor = 'pointer';
    }

    // Handle primary mode button states (Active/Disabled)
    // Show All enabled unless mode is 'none' AND preprints aren't excluded
    if (showAllBtn) showAllBtn.disabled = (currentMode === 'none' && !excludePreprintsActive);

    let activeBtn = null;
    switch (currentMode) {
        case 'highlighted': activeBtn = highlightBtn; break;
        case 'filtered_first_last': activeBtn = filterFirstLastBtn; break;
        case 'filtered_first': activeBtn = filterFirstBtn; break;
        case 'filtered_last': activeBtn = filterLastBtn; break;
    }

    if (activeBtn) {
        activeBtn.disabled = true;
        activeBtn.classList.add('sch_hl_active');
        // Apply disabled/active style
        activeBtn.style.backgroundColor = '#e0e0e0'; // Greyish background
        activeBtn.style.borderColor = '#aaa'; // Darker border
        activeBtn.style.color = '#888'; // Greyed out text
        activeBtn.style.boxShadow = 'none';
        activeBtn.style.cursor = 'default';
    }

     // Also disable Show All button if it's meant to be disabled
     if (showAllBtn && showAllBtn.disabled) {
          showAllBtn.style.backgroundColor = '#e0e0e0';
          showAllBtn.style.borderColor = '#aaa';
          showAllBtn.style.color = '#888';
          showAllBtn.style.cursor = 'default';
          showAllBtn.classList.add('sch_hl_active'); // Visually indicate disabled state
     } else if (showAllBtn && !showAllBtn.disabled) {
          // Ensure reset button looks normal when enabled
          showAllBtn.style.backgroundColor = '#f8f8f8';
          showAllBtn.style.borderColor = '#dcdcdc';
          showAllBtn.style.color = '#555';
          showAllBtn.style.cursor = 'pointer';
          showAllBtn.classList.remove('sch_hl_active');
     }
}


// --- Initialization and MutationObserver ---

function runInitialization() {
    // 1. Try to get owner info early. If this fails, the script might not be useful.
    const ownerInfo = getProfileOwnerInfo();
    if (!ownerInfo) {
        console.warn("Scholar Highlighter: Initialization failed to get owner info. Features requiring owner matching will not work.");
        // We might still inject buttons, but they might fail when clicked.
        // Or we could skip UI injection if owner is not found? Let's inject anyway for now.
    }

    // 2. Initialize the UI (inject buttons)
    initializeUI();

    // 3. Setup MutationObserver if the table exists
    const tableBody = document.getElementById('gsc_a_b');
    if (tableBody) {
        setupMutationObserver(tableBody);
    } else {
        console.warn("Scholar Highlighter: Could not find table body (#gsc_a_b) during initialization. Observer not set up.");
    }
}

function setupMutationObserver(targetNode) {
    let debounceTimeout;
    const observer = new MutationObserver((mutationsList) => {
        let nodesAdded = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('.gsc_a_tr')) {
                        nodesAdded = true;
                        break;
                    }
                     // Check if added node *contains* a TR (e.g., if rows are wrapped)
                    if (node.nodeType === Node.ELEMENT_NODE && node.querySelector('.gsc_a_tr')) {
                         nodesAdded = true;
                         break;
                    }
                }
            }
            if (nodesAdded) break;
        }

        if (!nodesAdded) return; // Ignore mutations that don't add relevant rows

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            console.log("Scholar Highlighter: Detected DOM changes potentially adding rows, re-applying mode:", currentMode, `Exclude Preprints: ${excludePreprintsActive}`);
            // Re-check owner info in case of navigation? Cache should still be valid unless page fully reloaded.
            if (!ownerInfoCache) getProfileOwnerInfo(); // Try to re-fetch if cache was lost

            if (ownerInfoCache) {
                reapplyCurrentMode(); // Re-apply the combined state correctly
            } else {
                console.warn("Mutation observer callback: Owner info still not available. Cannot re-apply mode.");
            }
        }, 600); // Debounce wait time
    });

    observer.observe(targetNode, { childList: true, subtree: true }); // Observe children and their descendants
    console.log("Scholar Highlighter: MutationObserver set up for #gsc_a_b.");

    // Attach listeners to sort/show more - rely on observer to handle DOM changes
    const handleActionTrigger = (event) => {
        console.log("Scholar Highlighter: Action potentially modifying list triggered by:", event.target.id || event.target.innerText);
        // No need to manually call reapply, observer should catch it.
    };
    const yearButton = document.getElementById('gsc_a_ha'); // Year sort link
    if (yearButton) yearButton.addEventListener('click', handleActionTrigger);
    const titleButton = document.querySelector('#gsc_a_th a'); // Title sort link
    if (titleButton) titleButton.addEventListener('click', handleActionTrigger);
    const citedByButton = document.querySelector('#gsc_a_tc a'); // Cited by sort link
    if (citedByButton) citedByButton.addEventListener('click', handleActionTrigger);
    const showMoreButton = document.getElementById('gsc_bdy_sb'); // Show more button
    if (showMoreButton) showMoreButton.addEventListener('click', handleActionTrigger);

}

// --- Script Entry Point ---
// Use 'DOMContentLoaded' as a fallback, but 'document_idle' in manifest is preferred.
// The runInitialization function handles the core setup.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitialization);
} else {
    // The document is already interactive or complete
    runInitialization();
}

console.log("Scholar Highlighter: Content script finished initial execution.");
// --- END OF FILE content.js (v7.2) ---