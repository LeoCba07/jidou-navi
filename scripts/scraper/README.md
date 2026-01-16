# Jihanki Sagase Web Scraper

Extracts vending machine data from jihanki.sagase.com URLs and outputs to JSON with downloaded images.

## Installation

```bash
cd scripts/scraper
pip install -r requirements.txt
```

## Usage

1. Create or edit the input file with jihanki.sagase.com URLs (one per line or in markdown links):

```bash
# Edit the input file
nano ../input/machines_to_scrape.md
```

2. Run the scraper:

```bash
python jihanki_scraper.py ../input/machines_to_scrape.md
```

3. Check the output:
   - `../output/machines.json` - Extracted machine data
   - `../output/images/` - Downloaded images organized by machine ID

## Options

```
python jihanki_scraper.py <input_file> [--output-dir <dir>]

Arguments:
  input_file          Markdown file containing jihanki.sagase.com URLs

Options:
  --output-dir, -o    Output directory (default: ../output)
```

## Input Format

The input file can be a plain text or markdown file. The scraper will extract all jihanki.sagase.com URLs. Supported formats:

```markdown
# My Vending Machine List

- https://jihanki.sagase.com/jihanki/3492/
- [Cool Machine](https://jihanki.sagase.com/jihanki/1234/)

Or just plain URLs:
https://jihanki.sagase.com/jihanki/5678/
```

## Output Format

### machines.json

```json
{
  "scraped_at": "2026-01-16T12:00:00+00:00",
  "source": "jihanki.sagase.com",
  "machines": [
    {
      "source_id": "3492",
      "source_url": "https://jihanki.sagase.com/jihanki/3492/",
      "name": "Machine Name",
      "location": {
        "address": "Tokyo, Japan",
        "latitude": 35.6762,
        "longitude": 139.6503
      },
      "merchandise": ["Item 1", "Item 2"],
      "features": ["24 hours", "Cash only"],
      "images": [
        {
          "url": "https://...",
          "local_path": "images/3492/1.jpg"
        }
      ]
    }
  ],
  "errors": []
}
```

### Images

Images are saved to `output/images/{machine_id}/` with sequential numbering:
```
output/images/3492/1.jpg
output/images/3492/2.jpg
```

## Notes

- Rate limiting: 1.5 second delay between requests to be respectful
- Failed URLs are logged in the `errors` array and skipped
- Images that fail to download will have `local_path: null`
- The scraper handles missing data gracefully (fields will be null or empty arrays)

## Troubleshooting

**No data extracted**: The site may use JavaScript rendering. If this happens consistently, the scraper may need to be updated to use Playwright (headless browser) instead of requests.

**Connection errors**: Check your internet connection and try again. The scraper includes retry logic.

**Missing images**: Some images may be lazy-loaded or protected. Check the machine's source URL directly.
