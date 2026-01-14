import json
import requests
import sys
from typing import Optional

# Configuration
API_BASE_URL = "https://api.test.zephyrapp.nz"  # Adjust this to your API URL
SITES_FILE = "sites.json"


def load_sites(filepath: str) -> list:
    """Load sites from JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def add_site(site: dict, admin_key: str) -> tuple[Optional[dict], Optional[str]]:
    """
    Submit a site to the API endpoint.

    Mirrors the addSite function from site.service.ts:
    POST to /sites?key={adminKey} with site data as JSON body

    Returns:
        tuple: (result_data, error_message) - one will be None
    """
    url = f"{API_BASE_URL}/sites"
    params = {"key": admin_key}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(
            url, params=params, headers=headers, json=site)

        # Try to get response body for error messages
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = {"message": response.text}

        if not response.ok:
            error_msg = response_data.get("message") or response_data.get(
                "error") or f"HTTP {response.status_code}"
            return None, error_msg

        return response_data, None

    except requests.exceptions.ConnectionError:
        return None, "Connection failed - is the server running?"
    except requests.exceptions.Timeout:
        return None, "Request timed out"
    except requests.exceptions.RequestException as e:
        return None, str(e)


def main():
    # Get admin key from command line argument or prompt
    if len(sys.argv) > 1:
        admin_key = sys.argv[1]
    else:
        admin_key = input("Enter admin key: ").strip()

    if not admin_key:
        print("Error: Admin key is required")
        sys.exit(1)

    # Load sites from JSON file
    print(f"Loading sites from {SITES_FILE}...")
    sites = load_sites(SITES_FILE)
    print(f"Found {len(sites)} sites to import")

    # Track results
    success_count = 0
    failed_sites = []

    # Submit each site
    for i, site in enumerate(sites, 1):
        site_name = site.get("name", "Unknown")
        print(f"[{i}/{len(sites)}] Adding site: {site_name}...", end=" ")

        result, error = add_site(site, admin_key)

        if result:
            print("✓")
            success_count += 1
        else:
            print(f"✗ - {error}")
            failed_sites.append((site_name, error))

    # Print summary
    print("\n" + "=" * 50)
    print(
        f"Import complete: {success_count}/{len(sites)} sites added successfully")

    if failed_sites:
        print(f"\nFailed sites ({len(failed_sites)}):")
        for name, error in failed_sites:
            print(f"  - {name}: {error}")


if __name__ == "__main__":
    main()
