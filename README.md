<div align="center">
  <img src="logo.jpg" alt="ScholarSort Logo" width="200">
  
  <h1>ScholarSort</h1>
  
  <p>
    <a href="https://scholar.google.com"><img src="https://img.shields.io/badge/Chrome-Extension-green.svg" alt="Chrome Extension"></a>
    <a href="manifest.json"><img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version"></a>
    <a href="journal_data_full.js"><img src="https://img.shields.io/badge/journals-25,852-orange.svg" alt="Impact Factors"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  </p>
  
  <p><strong>ScholarSort</strong> is a Chrome extension designed to enhance Google Scholar with advanced filtering capabilities and journal impact factor display.</p>
  
  <p>
    <a href="#installation">Installation</a> •
    <a href="#quickstart">Quickstart</a> •
    <a href="#features">Features</a> •
    <a href="#data-sources">Data Sources</a> •
    <a href="#troubleshooting">Troubleshooting</a>
  </p>
</div>

## Installation

Requires Google Chrome browser. Install as an unpacked extension:

```bash
git clone https://github.com/HzaCode/ScholarSort.git
cd ScholarSort
```

Load in Chrome:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked" and select the extension folder

## Quickstart

1. Visit any Google Scholar profile page
2. Control buttons will automatically appear
3. Click buttons to filter papers or show impact factors
4. Combine filters for advanced searching

## Features

### Author Position Filtering
- Highlight first/last author papers
- Filter by authorship position
- Smart author name detection

### Impact Factor Display  
- Real-time IF badges on papers
- 25,852 journals database
- Smart journal matching

### Preprint Detection
- Automatically detect preprint papers
- Hide or highlight preprints
- Supports 13+ preprint servers

## Usage

### Control Buttons

| Button | Function |
|--------|----------|
| **Exclude Preprints** | Hide all preprint papers |
| **Show Impact Factors** | Display IF badges |
| **Highlight 1st/Last** | Highlight first/last author papers |
| **Filter 1st/Last** | Show only first/last author papers |
| **Show All / Reset** | Reset all filters |

### Impact Factor Display
- Blue badges show format: `IF: X.XX`
- Hover over badges for detailed information (IF + SJR values)

## Data Sources

### Journal Database
- **Source**: [SCImago Journal Rank](https://www.scimagojr.com/) 2024 data
- **Coverage**: 25,852 journals with impact factors

### Database Options

| File | Size | Journals | Description |
|------|------|----------|-------------|
| `journal_data_full.js` | 6.7MB | 25,852 | Complete database |
| `journal_data_top5000.js` | 1.3MB | 5,000 | Top 5000 journals |
| `journal_data_top1000.js` | 238KB | 1,000 | Top 1000 journals |
| `journal_data_top500.js` | 116KB | 500 | Top 500 journals |

To use a smaller database, edit line 7 in `content.js`:
```javascript
// Change from:
'journal_data_full.js'
// To:
'journal_data_top1000.js'  // or another option
```

## Technical Details

### Architecture
- Manifest V3 Chrome extension
- Content script injection
- Asynchronous data loading
- Performance optimized

### Journal Matching
- Smart name recognition
- Abbreviation support
- Fuzzy matching
- Result caching

### Supported Preprint Servers
- arXiv, bioRxiv, medRxiv, ChemRxiv
- Research Square, SSRN, PsyArXiv, SocArXiv
- engrXiv, OSF Preprints, JMIR Preprints
- PeerJ Preprints, Preprints.org

## Performance

- Lazy loading when needed
- Smart caching system
- Non-blocking UI updates
- Minimal resource usage

## Troubleshooting

### Impact Factors Not Showing
1. Check browser console for errors (F12)
2. Ensure journal data file is loaded
3. Refresh page and click "Show Impact Factors" again

### Extension Not Working
1. Verify you're on scholar.google.com
2. Check extension is enabled in chrome://extensions/
3. Look for console error messages

## Contributing

We welcome contributions! Please feel free to submit issues or pull requests.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/HzaCode/ScholarSort.git

# Make your changes
# Test in Chrome Developer mode

# Submit a pull request
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Journal data from [SCImago Journal Rank](https://www.scimagojr.com/)
- Thanks to all contributors and users

