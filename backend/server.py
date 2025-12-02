from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import date
import os, re, joblib, requests, json, time
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter, Retry
import mysql.connector
from mysql.connector import pooling
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# -----------------------
# Flask App Setup
# -----------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    # ✅ Allow preflight (OPTIONS) requests and headers
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return response

# -----------------------
# Static File Routes
# -----------------------
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

app.add_url_rule("/uploads/<path:filename>", "uploads",
                 lambda filename: send_from_directory(app.config["UPLOAD_FOLDER"], filename))
app.add_url_rule("/files/<path:filename>", "files",
                 lambda filename: send_from_directory("E:/certificates", filename))

# -----------------------
# MySQL Connection Pools
# -----------------------

# DB1: Notices / AI / Scraper
# notice_db_config = {
#     "host": "localhost",
#     "user": "root",
#     "password": "Root*19470",
#     "database": "college9_notices",
#     "auth_plugin": "mysql_native_password",
# }
# connection_pool_notices = pooling.MySQLConnectionPool(pool_name="college_pool", pool_size=5, **notice_db_config)

# # DB2: Login / Users
# login_db_config = {
#     "host": "localhost",
#     "user": "root",
#     "password": "Root*19470",
#     "database": "notice_board",
# }

# connection_pool_login = pooling.MySQLConnectionPool(pool_name="login_pool", pool_size=5, **login_db_config)

# def get_notice_connection():
#     return connection_pool_notices.get_connection()

# def get_login_connection():
#     return connection_pool_login.get_connection()
# -----------------------
# MySQL Connection Pool (Single DB)
# -----------------------

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "Root*19470",
    "database": "department_db",   # ✅ your single database
    "auth_plugin": "mysql_native_password",
}

connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="department_pool",
    pool_size=10,
    **db_config
)

def get_connection():
    return connection_pool.get_connection()


# -----------------------
# AI Model Setup
# -----------------------
train_texts = [
    "Music fest registrations open",
    "Drama auditions next week",
    "dance competion",
    "Hackathon event starting soon",
    "Paper presentation competition",
    "Art exhibition entry submission",
    "Coding contest 2025",
    "Campus recruitment drive",
    "Placement notice for final year students",
    "Company interview schedule",
    "Internship hiring process",
    "Student achievement award",
    "Best project recognition",
    "Scholarship won by student",
]
train_labels = [
    "cultural", "cultural","cultural", "technical", "technical", "cultural", "technical",
    "placement", "placement", "placement", "placement", "achievements",
    "achievements", "achievements",
]

vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(train_texts)
model = MultinomialNB()
model.fit(X_train, train_labels)
joblib.dump((vectorizer, model), "notice_classifier.pkl")
vectorizer, model = joblib.load("notice_classifier.pkl")

def predict_category(title, description, semester):
    combined_text = f"{title} {description}".strip().lower()
    sem_match = re.search(r"sem\s*([1-8])", combined_text)
    sem_num = semester.lower() if semester else (sem_match.group(1) if sem_match else "")

    if "exam" in combined_text:
        if any(x in combined_text for x in ["ia", "internal", "midterm", "internal assessment"]):
            return f"exam_ia{sem_num}" if sem_num else "exam_ia"
        else:
            return f"exam_sem{sem_num}" if sem_num else "exam_sem"

    try:
        X = vectorizer.transform([combined_text])
        return model.predict(X)[0]
    except Exception:
        if any(w in combined_text for w in ["placement", "recruitment", "drive", "hiring"]):
            return "placement"
        if any(w in combined_text for w in ["hackathon", "coding", "technical", "workshop"]):
            return "technical"
        if any(w in combined_text for w in ["music", "fest", "drama", "cultural", "dance"]):
            return "cultural"
        if any(w in combined_text for w in ["award", "scholarship", "achievement", "prize"]):
            return "achievements"
        return "general"

# -----------------------
# Helper Functions
# -----------------------
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file(file_field):
    if file_field in request.files:
        file = request.files[file_field]
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)
            return f"/uploads/{filename}"
    return ""

# -----------------------
# Scraper (CSE Faculty)
# -----------------------
BASE = "https://klsvdit.edu.in"
CSE_URL = "https://klsvdit.edu.in/about-2/faculty-of-computer-science-and-engineering/"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "faculty_cache.json")

session = requests.Session()
retries = Retry(total=5, backoff_factor=0.6, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))
session.headers.update({"User-Agent": "Mozilla/5.0"})

def resolve_url(href):
    if not href:
        return None
    return urljoin(BASE, href)

def parse_cse_faculty(soup):
    results = []
    for fig in soup.find_all("figure", class_="wp-block-image"):
        figcaption = fig.find("figcaption")
        if figcaption:
            text = figcaption.get_text(" ", strip=True)
            email_match = re.search(r"([\w\.-]+@[\w\.-]+)", text)
            email = email_match.group(1) if email_match else None
            img_tag = fig.find("img")
            image = resolve_url(img_tag["src"]) if img_tag and img_tag.get("src") else None
            name = text.replace(email or "", "").strip()
            if name:
                results.append({"name": name, "email": email, "image": image})
    return results

def scrape_cse():
    r = session.get(CSE_URL, timeout=15)
    soup = BeautifulSoup(r.text, "lxml")
    return parse_cse_faculty(soup)

def load_cache():
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("data", [])
    except:
        return []

def save_cache(data):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": int(time.time()), "data": data}, f, ensure_ascii=False, indent=2)

# -----------------------
# Routes: Notices + AI
# -----------------------
@app.route("/api/categorize", methods=["POST"])
def categorize_notice():
    data = request.get_json()
    category = predict_category(data.get("title", ""), data.get("description", ""), data.get("semester", ""))
    return jsonify({"category": category})

@app.route("/api/notices", methods=["POST"])
def add_notice():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        expiry_date = request.form.get("expiry_date", None)
        semester = request.form.get("semester", "").strip().lower()
        if not title or not description:
            return jsonify({"success": False, "error": "Title and description required"}), 400

        category = predict_category(title, description, semester)
        combined_text = (title + " " + description).lower()
        if any(word in combined_text for word in ["placement", "recruitment", "drive"]):
            category = "placement"

        image_url = save_file("image_file")
        if category == "placement" and not image_url:
            return jsonify({"success": False, "error": "Placement notice requires an image."}), 400

        if category.startswith("exam"):
            cursor.execute("SELECT id, image_url FROM notice WHERE category=%s", (category,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute(
                    """UPDATE notices SET title=%s, description=%s, expiry_date=%s, image_url=%s WHERE id=%s""",
                    (title, description, expiry_date, image_url or existing["image_url"], existing["id"])
                )
                conn.commit()
                return jsonify({"success": True, "message": f"Updated {category} notice"})
        cursor.execute(
            """INSERT INTO notice (title, description, category, semester, image_url, expiry_date)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (title, description, category, semester, image_url, expiry_date)
        )
        conn.commit()
        return jsonify({"success": True, "message": f"Added new {category} notice"})
    except Exception as e:
        conn.rollback()
        print("Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/notices", methods=["GET"])
def get_notices():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = date.today()
        cursor.execute("""SELECT * FROM notice WHERE expiry_date IS NULL OR expiry_date >= %s ORDER BY id DESC""", (today,))
        rows = cursor.fetchall()
        for r in rows:
            if r["expiry_date"]:
                r["expiry_date"] = r["expiry_date"].strftime("%Y-%m-%d")
        return jsonify(rows)
    finally:
        cursor.close()
        conn.close()

@app.route("/api/notices/<category>", methods=["GET"])
def get_notices_by_category(category):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if category.startswith("exam"):
            cursor.execute("SELECT * FROM notice WHERE category LIKE %s", (f"{category}%",))
        else:
            cursor.execute("SELECT * FROM notice WHERE category=%s", (category,))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

@app.route("/api/notices/recent", methods=["GET"])
def get_recent_notices():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, title, category FROM notice ORDER BY id DESC LIMIT 15")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

@app.route("/api/cleanup_expired", methods=["DELETE"])
def cleanup_expired():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = date.today()
        cursor.execute("DELETE FROM notice WHERE expiry_date < %s", (today,))
        conn.commit()
        return jsonify({"success": True, "deleted": cursor.rowcount})
    finally:
        cursor.close()
        conn.close()

# -----------------------
# Route: Faculty Scraper
# -----------------------
@app.route("/api/cse-faculty", methods=["GET"])
def faculty_data():
    try:
        data = load_cache()
        if not data:
            data = scrape_cse()
            save_cache(data)
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# -----------------------
# Route: Login
# -----------------------
@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    data = request.get_json()
    usn = data.get("usn")
    password = data.get("password")

    if not usn or not password:
        return jsonify({"error": "All fields are required"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM user WHERE usn = %s AND password_date = %s"
        cursor.execute(query, (usn, password))
        rows = cursor.fetchall()
        if len(rows) == 0:
            return jsonify({"error": "Invalid USN or password"}), 401

        user = rows[0]
        return jsonify({
            "user": {
                "usn": user["usn"],
                "password": user["password_date"],
                "isAdmin": bool(user.get("is_admin", 0)),
            }
        })
    except Exception as e:
        print("❌ Login error:", e)
        return jsonify({"error": "Server error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# -----------------------
# Run Server
# -----------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


