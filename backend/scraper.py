import os
import json
import re
import time
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter, Retry

BASE = "https://klsvdit.edu.in"
CSE_URL = "https://klsvdit.edu.in/about-2/faculty-of-computer-science-and-engineering/"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "faculty_cache.json")
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# requests session with retry
session = requests.Session()
retries = Retry(total=5, backoff_factor=0.6, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))
session.headers.update({"User-Agent": USER_AGENT})


def fetch_url(url, timeout=12):
    try:
        r = session.get(url, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[fetch_url] Error fetching {url}: {e}")
        return None


def resolve_url(href):
    if not href:
        return None
    return urljoin(BASE, href)



def parse_cse_faculty(soup):
    results = []

    # -------- Case 1: The 'wp-block-cover' pattern (e.g., Dr. Venkatesh) --------
    # This pattern has a cover image followed by a separate h2 and p.
    for cover in soup.find_all("div", class_="wp-block-cover"):
        img_tag = cover.find("img")
        image = resolve_url(img_tag["src"]) if img_tag and img_tag.get("src") else None

        h2 = cover.find_next_sibling("h2")
        p = h2.find_next_sibling("p") if h2 else None

        if not h2:
            continue

        name = h2.get_text(strip=True)
        designation, email, phone, profile = "", None, None, None

        if p:
            text = p.get_text(" ", strip=True)
            email_match = re.search(r"[\w\.-]+@[\w\.-]+", text)
            if email_match:
                email = email_match.group(0)
            phone_match = re.search(r"\b\d{10}\b", text)
            if phone_match:
                phone = phone_match.group(0)
            designation = text.split("E-mail:")[0].split("Mob:")[0].strip()

        link_tag = h2.find_next_sibling("ul")
        if link_tag:
            a = link_tag.find("a", href=True)
            if a:
                profile = resolve_url(a["href"])

        results.append({
            "name": name,
            "designation": designation,
            "email": email,
            "phone": phone,
            "image": image,
            "profile": profile
        })
    
    # -------- Case 2: The 'figure + h2 + p' pattern (e.g., Farzana) --------
    # This pattern has a figure, followed by an h2, and then a p.
    for fig in soup.find_all("figure", class_="wp-block-image"):
        h2 = fig.find_next_sibling("h2")
        if h2: # This is the key condition for this pattern
            img_tag = fig.find("img")
            image = resolve_url(img_tag["src"]) if img_tag and img_tag.get("src") else None
            p = h2.find_next_sibling("p") 

            name = h2.get_text(strip=True)
            designation, email = "", None

            if p:
                text = p.get_text(" ", strip=True)
                email_match = re.search(r"[\w\.-]+@[\w\.-]+", text)
                if email_match:
                    email = email_match.group(0)
                designation = text.split("E-mail:")[0].strip()

            results.append({
                "name": name,
                "designation": designation,
                "email": email,
                "phone": None,
                "image": image,
                "profile": None
            })

    # -------- Case 3: The 'figure + figcaption' pattern (Nirmala, Vijeth, Suman) --------
    # This pattern has all the information contained within a single figure element.
    for fig in soup.find_all("figure", class_="wp-block-image"):
        figcaption = fig.find("figcaption")
        if figcaption:
            text = figcaption.get_text(" ", strip=True)

            # Use regex to extract the name (before E-mail) and the email itself.
            # name_match = re.search(r"^(.*?)(?:\s+E-mail:)", text)
            # email_match = re.search(r"([\w\.-]+@[\w\.-]+)", text)

            # Extract email (case-insensitive)
            email_match = re.search(r"([\w\.-]+@[\w\.-]+)", text, re.IGNORECASE)
            email = email_match.group(1) if email_match else None

           # Extract name before "E-mail" or "Email", or fallback to all text minus email
            name_match = re.search(r"^(.?)(?:\s+(?:E[-]?mail|Email)\s:)", text, re.IGNORECASE)
            if name_match:
                name = name_match.group(1).strip()
            elif email:
                name = text.replace(email, "").strip()
            else:
                name = text.strip()

            # get image
            img_tag = fig.find("img")
            image = resolve_url(img_tag["src"]) if img_tag and img_tag.get("src") else None

            # append only if name exists
            if name:
                results.append({
                    "name": name,
                    "designation": "Professor",  # fallback designation
                    "email": email,
                    "phone": None,
                    "image": image,
                    "profile": None
                })
            
        
    # -------- Case 4: 'wp-block-cover + p.has-custom-weight' pattern (e.g., Prof. Nirmala Ganiger) --------
    for cover in soup.find_all("div", class_="wp-block-cover"):
        img_tag = cover.find("img")
        image = resolve_url(img_tag["src"]) if img_tag and img_tag.get("src") else None

        next_p = cover.find_next_sibling("p", class_="has-custom-weight")
        if not next_p:
            continue

        text = next_p.get_text(" ", strip=True)

        name_match = re.search(r"Prof\.\s*([A-Za-z\s]+)", text)
        email_match = re.search(r"[\w\.-]+@[\w\.-]+", text)
        desig_match = re.search(r"(Professor(?:\s*\(.*\))?)", text, re.IGNORECASE)

        name = "Prof. " + name_match.group(1).strip() if name_match else None
        designation = desig_match.group(1).strip() if desig_match else ""
        email = email_match.group(0) if email_match else None

        if name:
            results.append({
                "name": name,
                "designation": designation,
                "email": email,
                "phone": None,
                "image": image,
                "profile": None
            })

    # -------- Deduplicate by name --------
    seen, out = set(), []
    for f in results:
        key = f["name"].lower().strip()
        if key not in seen and f["name"]:
            seen.add(key)
            out.append(f)

    return out


def scrape_cse():
    html = fetch_url(CSE_URL)
    if not html:
        raise RuntimeError("Failed to fetch CSE faculty page.")
    soup = BeautifulSoup(html, "lxml")

    faculty = parse_cse_faculty(soup)

    # deduplicate by name
    seen, out = set(), []
    for f in faculty:
        key = f["name"].lower().strip()
        if key not in seen and f["name"]:
            seen.add(key)
            out.append(f)
    return out


def save_cache(data):
    payload = {"fetched_at": int(time.time()), "source": CSE_URL, "data": data}
    with open(CACHE_FILE, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    print(f"[save_cache] saved {len(data)} records to {CACHE_FILE}")


def load_cache():
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
            return payload.get("data", [])
    except FileNotFoundError:
        return None
    except Exception as e:
        print(f"[load_cache] Error loading cache: {e}")
        return None


if __name__ == "__main__":
    print("Scraping CSE faculty...")
    data = scrape_cse()
    save_cache(data)
    print(f"Total faculty found: {len(data)}\n")
    for faculty in data:
        print(json.dumps(faculty, indent=2, ensure_ascii=False))