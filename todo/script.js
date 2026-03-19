const STORAGE_KEY = "shahdad-todo-items";

const todoForm = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");

let tasks = loadTasks();

renderTasks();

todoForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const taskText = taskInput.value.trim();

  if (!taskText) {
    formMessage.textContent = "Please type a task before adding it.";
    return;
  }

  const newTask = {
    id: Date.now(),
    text: taskText,
    completed: false
  };

  tasks.unshift(newTask);
  saveTasks();
  renderTasks();

  todoForm.reset();
  taskInput.focus();
  formMessage.textContent = "";
});

taskList.addEventListener("click", function (event) {
  const deleteButton = event.target.closest(".task-delete");

  if (!deleteButton) {
    return;
  }

  const taskId = Number(deleteButton.dataset.id);
  tasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });

  saveTasks();
  renderTasks();
});

taskList.addEventListener("change", function (event) {
  if (!event.target.classList.contains("task-checkbox")) {
    return;
  }

  const taskId = Number(event.target.dataset.id);

  tasks = tasks.map(function (task) {
    if (task.id === taskId) {
      return {
        ...task,
        completed: event.target.checked
      };
    }

    return task;
  });

  saveTasks();
  renderTasks();
});

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach(function (task) {
    const listItem = document.createElement("li");
    listItem.className = "task-item";

    if (task.completed) {
      listItem.classList.add("completed");
    }

    listItem.innerHTML = `
      <input
        class="task-checkbox"
        type="checkbox"
        data-id="${task.id}"
        ${task.completed ? "checked" : ""}
        aria-label="Mark ${escapeHtml(task.text)} as complete"
      />
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" type="button" data-id="${task.id}">
        Delete
      </button>
    `;

    taskList.appendChild(listItem);
  });

  const remainingTasks = tasks.filter(function (task) {
    return !task.completed;
  }).length;

  taskCount.textContent =
    remainingTasks === 1 ? "1 task left" : `${remainingTasks} tasks left`;

  emptyState.classList.toggle("is-hidden", tasks.length > 0);
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks;
  } catch (error) {
    console.error("Could not read saved tasks.", error);
    return [];
  }
}

function escapeHtml(text) {
  const temporaryElement = document.createElement("div");
  temporaryElement.textContent = text;
  return temporaryElement.innerHTML;
}
