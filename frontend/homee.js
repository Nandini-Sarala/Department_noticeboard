



const menuButton = document.getElementById("menuButton");
const dropdownMenu = document.getElementById("dropdownMenu");


menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
    dropdownMenu.classList.toggle("opacity-0");
    dropdownMenu.classList.toggle("scale-95");
});

document.addEventListener("click", () => {
    if (!dropdownMenu.classList.contains("hidden")) {
        dropdownMenu.classList.add("hidden");
        dropdownMenu.classList.add("opacity-0");
        dropdownMenu.classList.add("scale-95");
    }
});
// Image slider logic
const slides = document.getElementById("slides");
const totalSlides = slides.children.length;
let currentIndex = 0;

function showSlide(index) {
    slides.style.transform = `translateX(-${index * 100}vw)`;
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    showSlide(currentIndex);
}

// Auto slide every 5 seconds
setInterval(nextSlide, 5000);

// Initialize first slide
showSlide(0);
const quotes = [
    { text: "Scientists dream about doing great things. Engineers do them.", author: "James A. Michener" },
    { text: "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.", author: "Dr. A. P. J. Abdul Kalam" },
    { text: "Engineering is the closest thing to magic that exists in the world.", author: "Elon Musk" },
    { text: "Excellence happens not by accident. It is a process.", author: "Dr. A. P. J. Abdul Kalam" },
    { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
    { text: "Technology is a useful servant but a dangerous master.", author: "Sam Pitroda" },
    { text: "Innovation is seeing what everybody has seen and thinking what nobody has thought.", author: "Dr. Radhakrishnan" },
    { text: "The engineer has been, and is, a maker of history.", author: "James Kip Finch" },

    { text: "India's future lies in the hands of its engineers.", author: "Sir M. Visvesvaraya" },

    { text: "India’s future lies in the hands of its engineers.", author: "Sir M. Visvesvaraya" },

    { text: "Failure is an option here. If things are not failing, you are not innovating enough.", author: "Elon Musk" }
];

const today = new Date();
const index = today.getDate() % quotes.length;
const todayQuote = quotes[index];

document.getElementById("quote").innerText = todayQuote.text;
document.getElementById("author").innerText = "— " + todayQuote.author;

const visionLink = document.getElementById('visionLink');
const visionModal = document.getElementById('visionMissionModal');
const closeVisionModal = document.getElementById('closeVisionModal');

// Open modal
visionLink.addEventListener('click', (e) => {
    e.preventDefault();
    visionModal.classList.remove('hidden');
});

// Close modal
closeVisionModal.addEventListener('click', () => {
    visionModal.classList.add('hidden');
});

// Close when clicking outside modal content
visionModal.addEventListener('click', (e) => {
    if (e.target === visionModal) {
        visionModal.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const savedUser = localStorage.getItem('user');
    const isAdmin = localStorage.getItem('isAdmin') === "true";
    const loginModal = document.getElementById('login-modal');
    const adminModal = document.getElementById('admin-login-modal');
    const adminSection = document.getElementById('admin-section');
    updateNoticeButtonVisibility();

    if (savedUser) {
        const user = JSON.parse(savedUser);
        document.getElementById('profile-usn').textContent = user.usn ? `User: ${user.usn}` : '';

        // Hide all login modals
        loginModal.classList.add('hidden');
        loginModal.classList.remove('active');
        adminModal.classList.add('hidden');
        adminModal.classList.remove('active');
        setBlurOnMainContent(false);

        if (isAdmin) {
            adminSection.classList.remove('hidden');
            console.log("✅ Admin session restored");
        } else {
            adminSection.classList.add('hidden');
            console.log("✅ Student session restored");
        }
    } else {
        // No saved user → show login
        loginModal.classList.add('active');
        setBlurOnMainContent(true);
    }

    // 🧩 User login form
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const usn = document.getElementById('login-usn').value;
        const password = document.getElementById('login-password').value;

        const res = await fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usn, password })
        });

        const data = await res.json();

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAdmin', data.user.isAdmin ? "true" : "false");

            handleLoginSuccess(data.user, data.user.isAdmin);
            loginModal.classList.remove('active');
            loginModal.classList.add('hidden');
            setBlurOnMainContent(false);
            document.getElementById('profile-usn').textContent = `USN: ${data.user.usn}`;
            updateNoticeButtonVisibility();
            showNotification("Login successful!", "success");
        } else {
            alert(data.error || 'Login failed');
        }
    });

    // 🧩 Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    adminLoginForm?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const usn = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        const res = await fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usn, password })
        });
        const data = await res.json();

        if (data.user && data.user.isAdmin) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAdmin', "true");
            handleLoginSuccess(data.user, true);
            adminModal.classList.remove('active');
            adminModal.classList.add('hidden');
            loginModal.classList.add('hidden');
            setBlurOnMainContent(false);
            adminSection.classList.remove('hidden');
            document.getElementById('profile-usn').textContent = `USN: ${data.user.usn}`;
            updateNoticeButtonVisibility();
            showNotification("Admin login successful!", "success");
        } else {
            alert("❌ You are not an admin!");
        }
    });

    // 🧩 Admin login button (switch from user → admin modal)
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    adminLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        showAdminLogin();
    });

    // 🧩 Logout button
    const logoutBtn = document.querySelector('.fa-sign-out-alt')?.parentElement;
    logoutBtn?.addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('user');
        localStorage.removeItem('isAdmin');
        document.getElementById('profile-usn').textContent = '';
        adminSection.classList.add('hidden');
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('login-modal').classList.add('active');
        setBlurOnMainContent(true);
        document.getElementById('login-password').value = '';
        document.getElementById('login-usn').value = '';
        showNotification("Logout successful!", "success");
        updateNoticeButtonVisibility();
    });
});

// ✅ Helper functions
function handleLoginSuccess(user, isAdmin = false) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('isAdmin', isAdmin ? "true" : "false");
    updateUIAfterLogin(user);
}

function updateUIAfterLogin(user) {
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user.name || user.usn}`;
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
}

function showAdminLogin() {
    const adminModal = document.getElementById('admin-login-modal');
    const userModal = document.getElementById('login-modal');
    adminModal?.classList.remove('hidden');
    adminModal?.classList.add('active');
    userModal?.classList.add('hidden');
    userModal?.classList.remove('active');
    setBlurOnMainContent(true);
}

function showUserLogin() {
    const adminModal = document.getElementById('admin-login-modal');
    const userModal = document.getElementById('login-modal');
    adminModal?.classList.add('hidden');
    adminModal?.classList.remove('active');
    userModal?.classList.remove('hidden');
    userModal?.classList.add('active');
    setBlurOnMainContent(true);
}

function hideAdminLogin() {
    const adminModal = document.getElementById('admin-login-modal');
    const userModal = document.getElementById('login-modal');
    adminModal?.classList.add('hidden');
    adminModal?.classList.remove('active');
    userModal?.classList.add('hidden');
    userModal?.classList.remove('active');
    setBlurOnMainContent(false);
}
function setBlurOnMainContent(blur) {
    const main = document.getElementById('main-content'); // body wrapper
    const nav = document.querySelector('nav');  // navbar
    if (!main || !nav) return; // safety check

    if (blur) {
        main.classList.add('blur-bg');
        nav.classList.add('blur-bg');

    } else {
        main.classList.remove('blur-bg');
        nav.classList.remove('blur-bg');
    }
    const blurOverlay = document.getElementById('blur-overlay');
    if (!blurOverlay) return;
    if (blur) {
        blurOverlay.classList.remove('hidden');
    } else {
        blurOverlay.classList.add('hidden');
    }
}
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
        }`;

    notification.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-sm">${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white opacity-70 hover:opacity-100">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}
function updateNoticeButtonVisibility() {
    const addNoticeBtn = document.getElementById("addNoticeBtn");
    if (!addNoticeBtn) return;

    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (isAdmin) {
        addNoticeBtn.style.display = "block";   // show for admin
    } else {
        addNoticeBtn.style.display = "none";    // hide for student/guest
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const addNoticeBtn = document.getElementById("addNoticeBtn");
    const addNoticeModal = document.getElementById("addNoticeModal");
    const closeAddNoticeModal = document.getElementById("closeAddNoticeModal");
    const submitNotice = document.getElementById("submitNotice");
    const isAdmin = localStorage.getItem("isAdmin") === "true";


    if (!addNoticeBtn || !addNoticeModal || !closeAddNoticeModal || !submitNotice) return;
    if (!isAdmin) {
        // Hide the add notice button for non-admins
        if (addNoticeBtn) addNoticeBtn.style.display = "none";
        return; // stop binding events
    }
    addNoticeBtn.addEventListener("click", () => addNoticeModal.classList.remove("hidden"));
    closeAddNoticeModal.addEventListener("click", () => addNoticeModal.classList.add("hidden"));

    submitNotice.addEventListener("click", async () => {
        const title = document.getElementById("noticeTitle").value.trim();
        const description = document.getElementById("noticeDescription").value.trim();
        const imageFile = document.getElementById("noticeImage").files[0];
        const expiry = document.getElementById("noticeExpiry").value;
        const semester = document.getElementById("noticeSemester")?.value.trim() || "";


        if (!title || !description) {
            alert("Please fill all fields!");
            return;
        }


        try {
            const aiRes = await fetch("http://127.0.0.1:5000/api/categorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, semester })
            });
            // const { category } = await aiRes.json();
            if (!aiRes.ok) throw new Error("AI categorization failed");
            const aiJson = await aiRes.json();
            let predictedCategory = aiJson.category || "general";
            const combinedText = (title + " " + description).toLowerCase();
            if (/placement|recruitment|campus drive/i.test(combinedText)) {
                predictedCategory = "placement";
            } else if (/achievements|award|recognition/i.test(combinedText)) {
                predictedCategory = "achievements";
            }



            // --- Prepare FormData for backend ---
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("semester", semester);

            formData.append("expiry_date", expiry);
            formData.append("category", predictedCategory);
            if (imageFile) formData.append("image_file", imageFile); // append file

            // Save to backend
            const saveRes = await fetch("http://127.0.0.1:5000/api/notices", {
                method: "POST",
                body: formData
            });
            //     body: JSON.stringify({ title, description, category, image_url: image, expiry_date: expiry })
            //   });
            if (!saveRes.ok) {
                const text = await saveRes.text();
                throw new Error(`Server returned ${saveRes.status}: ${text}`);
            }
            const saveData = await saveRes.json();

            if (saveData.success) {
                alert(`Notice added successfully under category: ${predictedCategory}`);
                //  appendNoticeToDOM(saveData.notice);
                try{
               if (predictedCategory === "placement") {
                    await loadPlacementImages();
                    //loadNotices();
                }
                else if (predictedCategory === "achievements") {
                    appendNoticeToDOM(saveData.notice);
                }
                else {
                    appendNoticeToDOM(saveData.notice);
                }
            }catch(rendeerErr){
                console.error("Error rendering new notice:", rendeerErr);
            }
                addNoticeModal.classList.add("hidden");
                document.getElementById("noticeTitle").value = "";
                document.getElementById("noticeDescription").value = "";
                document.getElementById("noticeSemester").value = "";

                document.getElementById("noticeImage").value = "";
                document.getElementById("noticeExpiry").value = "";
                document.getElementById("addNoticeModal").classList.add("hidden");


            } else {
                alert("Failed to save notice.");
                console.error(saveData.error);
            }

        } catch (err) {
            console.error("Error submitting notice:", err);
            alert("Something went wrong while submitting the notice.\n" + err.message);
        }
    });
});


// ---------------- Append Notice to DOM ----------------
function appendNoticeToDOM(notice) {
    // Get the container for this category
    const container = document.getElementById(notice.category + "Notices");
    if (!container) return;
    if (notice.category === "placement") return;

    const li = document.createElement("li");
    // li.textContent = ${notice.title} - ${notice.description};
    li.className = "mb-2 p-2 border-b border-gray-200"; // optional styling


    // ✅ Title
    const titleE1 = document.createElement("h3");
    titleE1.className = "font-bold text-lg";
    titleE1.textContent = notice.title;
    li.appendChild(titleE1);

    // ✅ Description
    const descE1 = document.createElement("p");
    descE1.className = "text-gray-700";
    descE1.textContent = notice.description;
    li.appendChild(descE1);

    // ✅ Expiry
    if (notice.expiry_date) {
        const expiryEl = document.createElement("div");
        expiryEl.textContent = `Expires on: ${notice.expiry_date}`;
        expiryEl.className = "text-sm text-red-600 mt-1";
        li.appendChild(expiryEl);
    }

    // Display uploaded file if exists
    if (notice.image_url) {
        const fileLink = document.createElement("a");
        fileLink.href = `http://127.0.0.1:5000${notice.image_url}`;
        fileLink.target = "_blank";

        if (/exam_/i.test(notice.category) && /ia/i.test(notice.description.toLowerCase())) {
            fileLink.textContent = "📘 View IA Timetable";
            fileLink.className = "block text-blue-600 mt-2 underline";
        } else if (/exam_/i.test(notice.category)) {
            fileLink.textContent = "📗 View Semester Timetable";
            fileLink.className = "block text-green-600 mt-2 underline";
        } else {
            fileLink.textContent = "📄 View File";
            fileLink.className = "block text-gray-700 mt-2 underline";
        }


        li.appendChild(fileLink);
    }


    container.appendChild(li);
}
// ---------------- Load Notices from Backend ----------------
async function loadNotices() {
    const categories = ["technical", "exam", "workshop", "faculty", "placement", "general"];
    const noticeList = document.getElementById("noticeList");

    // 🧹 Clear old notices before reloading
    noticeList.innerHTML = "";

    for (const cat of categories) {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/notices/${cat}`);

            // Ensure backend responded correctly
            if (!res.ok) {
                console.error(`❌ Failed to fetch ${cat} notices. Status:`, res.status);
                continue;
            }

            const notices = await res.json();
            if (Array.isArray(notices) && notices.length > 0) {
                // Optional: category header
                const catHeader = document.createElement("h3");
                catHeader.textContent = cat.toUpperCase();
                catHeader.classList.add("text-xl", "font-bold", "mt-4", "mb-2");
                noticeList.appendChild(catHeader);

                notices.forEach(appendNoticeToDOM);
            }
        } catch (err) {
            console.error(`⚠ Error loading notices for category "${cat}":`, err);
        }
    }
}

document.addEventListener("DOMContentLoaded", loadNotices);



async function cleanupExpiredNoticesFromBackend() {
    try {
        const res = await fetch("http://127.0.0.1:5000/api/cleanup_expired", {
            method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
            console.log(`🧹 Deleted ${data.deleted} expired notices from DB`);
        } else {
            console.warn("⚠ Cleanup failed:", data.error);
        }
    } catch (err) {
        console.error("Error cleaning up expired notices:", err);
    }
}

function removeExpiredNotices() {
    const now = new Date();
    document.querySelectorAll("li").forEach((li) => {
        const expiryEl = li.querySelector("div.text-red-600");
        if (expiryEl) {
            const expiryDate = new Date(expiryEl.textContent.replace("Expires on: ", ""));
            if (expiryDate < now) li.remove();
        }
    });
}

async function loadRecentNotices() {
    const container = document.getElementById("recentNotices");
    container.innerHTML = "Loading recent notices...";

    try {
        // http://127.0.0.1:5000
        const res = await fetch("http://127.0.0.1:5000/api/notices/recent");
        const notices = await res.json();

        if (!Array.isArray(notices) || notices.length === 0) {
            container.innerHTML = "No recent notices available.";
            return;
        }

        container.innerHTML = notices.map(notice => {
            let link = "#";
            if (notice.category.startsWith("exam")) {
                const match = notice.category.match(/exam[_\s]*sem(\d)/i);
                const semKey = match ? `sem${match[1]}` : "";
                const lowerTitle = notice.title.toLowerCase();
                const type = /ia|internal/.test(lowerTitle) ? "ia" : "sem";
                link = `exam_schedule.html?sem=${semKey}&type=${type}`;
            } else if (notice.category === "technical") link = "technical.html";
            else if (notice.category === "cultural") link = "cultural.html";
            else if (notice.category === "achievements") link = "achievements.html";
            else if (notice.category === "placement") link = "placement.html";
            // else link = "general.html";

            return `
                <a href="${link}" class="hover:underline text-blue-700">
                    🔔 ${notice.title}
                </a>&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;
            `;
        }).join("");
    } catch (err) {
        console.error("Error loading notices:", err);
        container.innerHTML = "Error loading recent notices.";
    }
}


// ✅ Run everything once when page loads
document.addEventListener("DOMContentLoaded", async () => {
    await cleanupExpiredNoticesFromBackend();
    await loadRecentNotices();
    removeExpiredNotices();
});

// 🔁 Optional: repeat cleanup + reload every minute
setInterval(async () => {
    await cleanupExpiredNoticesFromBackend();
    await loadRecentNotices();
    removeExpiredNotices();

}, 60000);



