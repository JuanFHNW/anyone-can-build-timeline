// Timeline, the PAGE-ONLY version.
//
// Everything happens inside this one browser window. There is no server.
// The rules run here, and the posts are kept in this window's sessionStorage.
//
// Why sessionStorage, and not localStorage?
// localStorage is shared by every normal window of the same browser, so two
// windows could look "shared" when nothing is really shared.
// sessionStorage belongs to one window only, like each person's own phone.
// It survives a reload, but a second window starts empty and never sees
// this window's posts. That is the point of this version.

const MAX_TEXT = 280;
const MAX_AUTHOR = 40;
const STORAGE_KEY = "timeline-posts";

const authorBox = document.getElementById("author");
const textBox = document.getElementById("text");
const countLine = document.getElementById("count");
const statusLine = document.getElementById("status");
const timeline = document.getElementById("timeline");
const postForm = document.getElementById("post-form");
const submitButton = document.getElementById("submit-post");
const cancelEditButton = document.getElementById("cancel-edit");
let editingPostId = null;

// Read the saved posts from this window. Oldest first.
function loadPosts() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function savePosts(posts) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// The rules. The backend version keeps the same rules in server.py.
// Returns the broken rule, or "" if every rule is kept.
function brokenRule(author, text) {
  if (author === "") {
    return "The name must not be empty.";
  }
  if (author.length > MAX_AUTHOR) {
    return "The name must be 40 characters or fewer.";
  }
  if (text === "") {
    return "The post must not be empty.";
  }
  if (text.length > MAX_TEXT) {
    return "The post must be 280 characters or fewer.";
  }
  return "";
}

// The time now, as HH:MM.
function timeNow() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return hours + ":" + minutes;
}

// Put one post at the top of the timeline, so the newest is always first.
function showPost(post) {
  const item = document.createElement("li");
  item.className = "post";
  item.dataset.postId = post.id;
  updatePostItem(item, post);
  timeline.prepend(item);
}

function updatePostItem(item, post) {
  item.replaceChildren();

  const author = document.createElement("span");
  author.className = "post-author";
  author.textContent = post.author;

  const time = document.createElement("span");
  time.className = "post-time";
  time.textContent = post.posted_at;

  const text = document.createElement("p");
  text.className = "post-text";
  text.textContent = post.text;

  const edit = document.createElement("button");
  edit.className = "edit-button";
  edit.type = "button";
  edit.textContent = "Edit";
  edit.hidden = authorBox.value.trim() !== post.author;
  edit.addEventListener("click", function () {
    startEdit(post);
  });

  // textContent, never innerHTML: a post is shown as words, so it cannot run code on the page.
  item.append(author, time, text, edit);
}

function refreshEditButtons() {
  for (const item of timeline.querySelectorAll(".post")) {
    const edit = item.querySelector(".edit-button");
    const author = item.querySelector(".post-author").textContent;
    edit.hidden = authorBox.value.trim() !== author;
  }
}

function startEdit(post) {
  editingPostId = post.id;
  textBox.value = post.text;
  submitButton.textContent = "Save edit";
  cancelEditButton.hidden = false;
  updateCount();
  textBox.focus();
}

function cancelEdit() {
  editingPostId = null;
  textBox.value = "";
  submitButton.textContent = "Post";
  cancelEditButton.hidden = true;
  updateCount();
}

function showStatus(words) {
  statusLine.textContent = words;
}

// The live count under the box: "x / 280".
function updateCount() {
  const length = textBox.value.length;
  countLine.textContent = length + " / " + MAX_TEXT;
  countLine.classList.toggle("too-long", length > MAX_TEXT);
}

function addPost(event) {
  event.preventDefault();
  const author = authorBox.value.trim();
  const text = textBox.value.trim();

  const problem = brokenRule(author, text);
  if (problem !== "") {
    showStatus(problem);
    return;
  }

  const posts = loadPosts();
  if (editingPostId !== null) {
    const post = posts.find(function (savedPost) {
      return savedPost.id === editingPostId;
    });
    if (!post || post.author !== author) {
      showStatus("You can only edit your own posts.");
      return;
    }
    post.text = text;
    savePosts(posts);
    const item = timeline.querySelector('[data-post-id="' + editingPostId + '"]');
    updatePostItem(item, post);
    cancelEdit();
    showStatus("");
    return;
  }
  const post = { id: posts.length + 1, author: author, text: text, posted_at: timeNow() };
  posts.push(post);
  savePosts(posts);

  showPost(post);
  showStatus("");
  textBox.value = "";
  updateCount();
}

// When the page opens, show what this window saved before a reload.
for (const post of loadPosts()) {
  showPost(post);
}

textBox.addEventListener("input", updateCount);
authorBox.addEventListener("input", refreshEditButtons);
cancelEditButton.addEventListener("click", cancelEdit);
postForm.addEventListener("submit", addPost);
