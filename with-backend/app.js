// Timeline, the version WITH a backend.
//
// This page keeps nothing itself. It sends each new post to the server
// (server.py), and every second it asks the server: "anything new?"
// Because every window asks the same server, every window sees every post.

const MAX_TEXT = 280;
const CANNOT_REACH = "Cannot reach the server. Trying again every second.";

const authorBox = document.getElementById("author");
const textBox = document.getElementById("text");
const countLine = document.getElementById("count");
const statusLine = document.getElementById("status");
const timeline = document.getElementById("timeline");
const postForm = document.getElementById("post-form");
const submitButton = document.getElementById("submit-post");
const cancelEditButton = document.getElementById("cancel-edit");

// The id of the newest post this window has shown. 0 means "none yet".
let lastId = 0;
let editingPostId = null;

// Put one post at the top of the timeline, so the newest is always first.
function showPost(post) {
  // Skip a post this window already shows.
  if (post.id <= lastId) {
    const existing = timeline.querySelector('[data-post-id="' + post.id + '"]');
    if (existing) {
      updatePostItem(existing, post);
    }
    return;
  }
  lastId = post.id;

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

// Ask the server for every post newer than the last one we have.
async function checkForNewPosts() {
  try {
    const response = await fetch("/posts?after=" + lastId);
    const posts = await response.json();
    // The server sends them oldest first. Each one goes on top, so the newest ends up first.
    for (const post of posts) {
      showPost(post);
    }
    if (statusLine.textContent === CANNOT_REACH) {
      showStatus("");
    }
  } catch (error) {
    showStatus(CANNOT_REACH);
  }
}

// Ask, wait for the answer, wait one second, then ask again. Forever.
async function keepChecking() {
  await checkForNewPosts();
  setTimeout(keepChecking, 1000);
}

// Send a new post to the server.
async function sendPost(event) {
  event.preventDefault();
  const author = authorBox.value;
  const text = textBox.value;

  // A quick check on the page, so the person does not wait for an answer.
  // The server checks the same rules again. Never trust only the screen:
  // anyone can send a request without using this page at all.
  if (text.trim() === "") {
    showStatus("The post must not be empty.");
    return;
  }

  try {
    const editing = editingPostId !== null;
    const url = editing ? "/posts/" + editingPostId : "/posts";
    const response = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: author, text: text }),
    });
    const answer = await response.json();
    if (!response.ok) {
      // The server refused the post. It says which rule was broken.
      showStatus(answer.error);
      return;
    }
    if (editing) {
      showPost(answer);
      cancelEdit();
      showStatus("");
      return;
    }
    // Saved. Ask for new posts now, instead of waiting for the next second.
    // This also brings in any post from another window that came just before ours.
    showStatus("");
    textBox.value = "";
    updateCount();
    await checkForNewPosts();
  } catch (error) {
    showStatus(CANNOT_REACH);
  }
}

textBox.addEventListener("input", updateCount);
authorBox.addEventListener("input", refreshEditButtons);
cancelEditButton.addEventListener("click", cancelEdit);
postForm.addEventListener("submit", sendPost);
keepChecking();
