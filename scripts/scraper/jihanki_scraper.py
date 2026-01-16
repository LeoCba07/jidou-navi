#!/usr/bin/env python3
"""
Jihanki Sagase Web Scraper

Extracts vending machine data from jihanki.sagase.com URLs
and outputs to JSON with downloaded images.

Usage:
    python jihanki_scraper.py <input_file.md> [--output-dir <dir>]
"""

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Constants
DEFAULT_OUTPUT_DIR = "../output"
REQUEST_DELAY = 2.5  # seconds between requests (be respectful to small sites)
MAX_RETRIES = 2
REQUEST_TIMEOUT = 30

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


def extract_urls_from_markdown(file_path: str) -> list[str]:
    """Extract jihanki.sagase.com URLs from a markdown file."""
    urls = []
    url_pattern = re.compile(r'https?://jihanki\.sagase\.com/[^\s\)\]]+')

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all URLs matching the pattern
    matches = url_pattern.findall(content)
    for url in matches:
        # Clean up URL (remove trailing punctuation)
        url = url.rstrip('.,;:!?')
        if url not in urls:
            urls.append(url)

    return urls


def extract_machine_id(url: str) -> Optional[str]:
    """Extract machine ID from URL like https://jihanki.sagase.com/jihanki/3492/"""
    match = re.search(r'/jihanki/(\d+)', url)
    return match.group(1) if match else None


def fetch_page(url: str, session: requests.Session) -> Optional[str]:
    """Fetch a page with retries."""
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"  Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(REQUEST_DELAY)
    return None


def download_image(url: str, save_path: Path, session: requests.Session) -> bool:
    """Download an image with retry."""
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, stream=True)
            response.raise_for_status()

            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        except requests.RequestException as e:
            print(f"    Image download attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(REQUEST_DELAY / 2)
    return False


def extract_coordinates_from_scripts(soup: BeautifulSoup) -> tuple[Optional[float], Optional[float]]:
    """Try to extract lat/lng from JavaScript in the page."""
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string:
            # Look for common patterns like: lat: 35.123, lng: 139.456
            lat_match = re.search(r'lat[itude]*["\']?\s*[:=]\s*([0-9.]+)', script.string)
            lng_match = re.search(r'(?:lng|lon)[gitude]*["\']?\s*[:=]\s*([0-9.]+)', script.string)
            if lat_match and lng_match:
                try:
                    return float(lat_match.group(1)), float(lng_match.group(1))
                except ValueError:
                    pass

            # Also try LatLng(lat, lng) pattern
            latlng_match = re.search(r'LatLng\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)', script.string)
            if latlng_match:
                try:
                    return float(latlng_match.group(1)), float(latlng_match.group(2))
                except ValueError:
                    pass
    return None, None


def parse_machine_page(html: str, url: str, machine_id: str) -> dict:
    """Parse a machine page and extract data."""
    soup = BeautifulSoup(html, 'lxml')

    data = {
        "source_id": machine_id,
        "source_url": url,
        "name": None,
        "location": {
            "address": None,
            "latitude": None,
            "longitude": None
        },
        "merchandise": [],
        "categories": [],
        "features": [],
        "images": []
    }

    # jihanki.sagase.com specific: Parse the data table with has-fixed-layout class
    # Table rows: 自販機名, 所在地, 商品, 自販機特徴, ジャンル, 商品価格帯, etc.
    info_table = soup.select_one('table.has-fixed-layout')
    if info_table:
        rows = info_table.find_all('tr')
        for row in rows:
            cells = row.find_all(['th', 'td'])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)

                if '自販機名' in label:
                    data["name"] = value
                elif '所在地' in label or '住所' in label:
                    data["location"]["address"] = value
                elif label == '商品':
                    # Actual product sold (e.g., 煎餅, うどん)
                    items = re.split(r'[、,・\n/]', value)
                    data["merchandise"] = [item.strip() for item in items if item.strip()]
                elif 'ジャンル' in label or 'カテゴリ' in label:
                    # Categories/genres
                    items = re.split(r'[、,・\n/]', value)
                    data["categories"] = [item.strip() for item in items if item.strip()]
                elif '特徴' in label:
                    if value:
                        data["features"].append(value)

    # Fallback: Extract name from h1 if not found in table
    if not data["name"]:
        h1 = soup.select_one('h1')
        if h1:
            name = h1.get_text(strip=True)
            # Clean up common patterns like 「XXX」の詳細情報
            match = re.search(r'「(.+?)」', name)
            if match:
                data["name"] = match.group(1)
            elif name and len(name) < 200:
                data["name"] = name

    # Fallback: Try to get title from page title if still no name
    if not data["name"]:
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            match = re.search(r'「(.+?)」', title)
            if match:
                data["name"] = match.group(1)
            else:
                title = re.sub(r'\s*[-|].*$', '', title)
                if title:
                    data["name"] = title

    # Fallback: Extract address from text if not found in table
    if not data["location"]["address"]:
        prefecture_pattern = re.compile(r'〒?\d{3}-?\d{4}\s*[東京都北海道大阪府京都府].+?[0-9０-９\-ー]+')
        for text in soup.stripped_strings:
            if prefecture_pattern.search(text) and len(text) < 100:
                data["location"]["address"] = text
                break

    # Extract coordinates from scripts
    lat, lng = extract_coordinates_from_scripts(soup)
    data["location"]["latitude"] = lat
    data["location"]["longitude"] = lng

    # Also check for data attributes on map elements
    map_element = soup.select_one('[data-lat][data-lng], [data-latitude][data-longitude]')
    if map_element:
        lat = map_element.get('data-lat') or map_element.get('data-latitude')
        lng = map_element.get('data-lng') or map_element.get('data-longitude')
        if lat and lng:
            try:
                data["location"]["latitude"] = float(lat)
                data["location"]["longitude"] = float(lng)
            except ValueError:
                pass

    # Try to extract coordinates from Google Maps iframe src
    # jihanki.sagase.com uses: https://maps.google.co.jp/maps?q=35.702839,139.737497&output=embed
    iframe = soup.select_one('iframe[src*="maps.google"], iframe[src*="google.com/maps"]')
    if iframe and not data["location"]["latitude"]:
        src = iframe.get('src', '')
        # Try q=lat,lng pattern first (most common on jihanki.sagase.com)
        coord_match = re.search(r'[?&]q=(-?[0-9.]+),(-?[0-9.]+)', src)
        if coord_match:
            try:
                data["location"]["latitude"] = float(coord_match.group(1))
                data["location"]["longitude"] = float(coord_match.group(2))
            except ValueError:
                pass
        else:
            # Try !2d!3d pattern (Google Maps embed format)
            coord_match = re.search(r'!2d(-?[0-9.]+)!3d(-?[0-9.]+)', src)
            if coord_match:
                try:
                    data["location"]["longitude"] = float(coord_match.group(1))
                    data["location"]["latitude"] = float(coord_match.group(2))
                except ValueError:
                    pass

    # Extract images - prioritize machine images from wp-content/uploads/jihanki/
    found_images = set()

    # First, look for jihanki-specific images in wp-content/uploads/jihanki/
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
        if src:
            img_url = urljoin(url, src)
            # Prioritize images from the jihanki uploads folder
            if '/uploads/jihanki/' in img_url and img_url not in found_images:
                found_images.add(img_url)
                data["images"].append({
                    "url": img_url,
                    "local_path": None
                })

    # If no jihanki-specific images, fall back to other image selectors
    if not data["images"]:
        image_selectors = [
            '.post_content img',
            'article img',
            '.content img',
            'main img',
        ]

        for selector in image_selectors:
            images = soup.select(selector)
            for img in images:
                src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if src:
                    img_url = urljoin(url, src)
                    # Skip small icons, logos, navigation elements
                    if any(x in img_url.lower() for x in ['icon', 'logo', 'avatar', 'button', 'arrow', 'sprite', 'gravatar']):
                        continue
                    # Skip very small images
                    width = img.get('width')
                    height = img.get('height')
                    if width and height:
                        try:
                            if int(width) < 100 or int(height) < 100:
                                continue
                        except ValueError:
                            pass
                    if img_url not in found_images:
                        found_images.add(img_url)
                        data["images"].append({
                            "url": img_url,
                            "local_path": None
                        })

    return data


def get_image_extension(url: str, content_type: Optional[str] = None) -> str:
    """Determine image extension from URL or content type."""
    # Try to get from URL first
    path = urlparse(url).path.lower()
    for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        if path.endswith(ext):
            return ext

    # Default to jpg
    return '.jpg'


def scrape_machines(input_file: str, output_dir: str) -> dict:
    """Main scraping function."""
    output_path = Path(output_dir)
    images_path = output_path / "images"

    # Ensure output directories exist
    output_path.mkdir(parents=True, exist_ok=True)
    images_path.mkdir(parents=True, exist_ok=True)

    # Extract URLs from input file
    print(f"Reading URLs from: {input_file}")
    urls = extract_urls_from_markdown(input_file)
    print(f"Found {len(urls)} URLs to scrape")

    if not urls:
        print("No jihanki.sagase.com URLs found in input file.")
        return {"machines": [], "errors": []}

    # Create session for connection pooling
    session = requests.Session()

    result = {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "jihanki.sagase.com",
        "machines": [],
        "errors": []
    }

    for i, url in enumerate(urls):
        print(f"\n[{i+1}/{len(urls)}] Scraping: {url}")

        machine_id = extract_machine_id(url)
        if not machine_id:
            print(f"  Could not extract machine ID from URL, skipping")
            result["errors"].append({"url": url, "error": "Could not extract machine ID"})
            continue

        # Fetch page
        html = fetch_page(url, session)
        if not html:
            print(f"  Failed to fetch page, skipping")
            result["errors"].append({"url": url, "error": "Failed to fetch page"})
            continue

        # Parse page
        try:
            machine_data = parse_machine_page(html, url, machine_id)
            print(f"  Name: {machine_data['name']}")
            print(f"  Address: {machine_data['location']['address']}")
            if machine_data['location']['latitude']:
                print(f"  Coordinates: {machine_data['location']['latitude']}, {machine_data['location']['longitude']}")
            if machine_data['merchandise']:
                print(f"  Products: {', '.join(machine_data['merchandise'])}")
            print(f"  Found {len(machine_data['images'])} images")
        except Exception as e:
            print(f"  Error parsing page: {e}")
            result["errors"].append({"url": url, "error": f"Parse error: {str(e)}"})
            continue

        # Download images
        machine_images_dir = images_path / machine_id
        for j, img_info in enumerate(machine_data["images"]):
            img_url = img_info["url"]
            ext = get_image_extension(img_url)
            local_filename = f"{j+1}{ext}"
            local_path = machine_images_dir / local_filename

            print(f"    Downloading image {j+1}/{len(machine_data['images'])}...")
            if download_image(img_url, local_path, session):
                # Store relative path from output dir
                img_info["local_path"] = f"images/{machine_id}/{local_filename}"
            else:
                print(f"    Failed to download: {img_url}")

            time.sleep(REQUEST_DELAY / 2)  # Rate limit

        result["machines"].append(machine_data)

        # Rate limiting between pages (randomized to look more human)
        if i < len(urls) - 1:
            delay = REQUEST_DELAY + random.uniform(0, 1.5)
            time.sleep(delay)

    return result


def save_results(data: dict, output_dir: str) -> str:
    """Save results to JSON file."""
    output_path = Path(output_dir) / "machines.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return str(output_path)


def main():
    parser = argparse.ArgumentParser(
        description="Scrape vending machine data from jihanki.sagase.com"
    )
    parser.add_argument(
        "input_file",
        help="Markdown file containing jihanki.sagase.com URLs"
    )
    parser.add_argument(
        "--output-dir", "-o",
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})"
    )

    args = parser.parse_args()

    # Resolve paths relative to script location
    script_dir = Path(__file__).parent
    input_file = Path(args.input_file)
    if not input_file.is_absolute():
        input_file = script_dir / input_file

    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = script_dir / output_dir

    # Check input file exists
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)

    print("=" * 50)
    print("Jihanki Sagase Scraper")
    print("=" * 50)

    # Run scraper
    results = scrape_machines(str(input_file), str(output_dir))

    # Save results
    json_path = save_results(results, str(output_dir))

    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total URLs processed: {len(results['machines']) + len(results['errors'])}")
    print(f"Successfully scraped: {len(results['machines'])}")
    print(f"Failed: {len(results['errors'])}")
    print(f"Output saved to: {json_path}")

    if results['errors']:
        print("\nErrors:")
        for err in results['errors']:
            print(f"  - {err['url']}: {err['error']}")


if __name__ == "__main__":
    main()
