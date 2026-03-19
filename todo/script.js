const STORAGE_KEY = "shahdad-todo-items";

const todoForm = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");

let tasks = normalizeTaskOrder(loadTasks());

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

  const previousPositions = getTaskPositions();
  const taskId = Number(event.target.dataset.id);
  const isCompleted = event.target.checked;

  tasks = reorderTask(taskId, isCompleted);

  saveTasks();
  renderTasks(previousPositions);
});

function renderTasks(previousPositions) {
  taskList.innerHTML = "";

  tasks.forEach(function (task) {
    const listItem = document.createElement("li");
    listItem.className = "task-item";
    listItem.dataset.taskId = String(task.id);

    if (task.completed) {
      listItem.classList.add("completed");
    }

    listItem.innerHTML = `
      <label class="task-main">
        <span class="task-toggle">
          <input
            class="task-checkbox"
            type="checkbox"
            data-id="${task.id}"
            ${task.completed ? "checked" : ""}
            aria-label="Mark ${escapeHtml(task.text)} as complete"
          />
          <span class="task-checkmark" aria-hidden="true"></span>
        </span>
        <span class="task-text">${escapeHtml(task.text)}</span>
      </label>
      <button class="task-delete" type="button" data-id="${task.id}">
        Delete
      </button>
    `;

    taskList.appendChild(listItem);
  });

  updateTaskCount();
  emptyState.classList.toggle("is-hidden", tasks.length > 0);

  if (previousPositions) {
    animateTaskReorder(previousPositions);
  }
}

function updateTaskCount() {
  const remainingTasks = tasks.filter(function (task) {
    return !task.completed;
  }).length;

  taskCount.textContent = String(remainingTasks);
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

function normalizeTaskOrder(taskItems) {
  const activeTasks = taskItems.filter(function (task) {
    return !task.completed;
  });
  const completedTasks = taskItems.filter(function (task) {
    return task.completed;
  });

  return activeTasks.concat(completedTasks);
}

function reorderTask(taskId, isCompleted) {
  const updatedTask = tasks.find(function (task) {
    return task.id === taskId;
  });

  if (!updatedTask) {
    return tasks;
  }

  const remainingTasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });
  const nextTask = {
    ...updatedTask,
    completed: isCompleted
  };

  if (!isCompleted) {
    return [nextTask].concat(remainingTasks);
  }

  const firstCompletedIndex = remainingTasks.findIndex(function (task) {
    return task.completed;
  });

  if (firstCompletedIndex === -1) {
    return remainingTasks.concat(nextTask);
  }

  remainingTasks.splice(firstCompletedIndex, 0, nextTask);
  return remainingTasks;
}

function getTaskPositions() {
  const positions = new Map();

  taskList.querySelectorAll(".task-item").forEach(function (taskItem) {
    positions.set(taskItem.dataset.taskId, taskItem.getBoundingClientRect().top);
  });

  return positions;
}

function animateTaskReorder(previousPositions) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  taskList.querySelectorAll(".task-item").forEach(function (taskItem) {
    const previousTop = previousPositions.get(taskItem.dataset.taskId);

    if (previousTop === undefined) {
      return;
    }

    const currentTop = taskItem.getBoundingClientRect().top;
    const offset = previousTop - currentTop;

    if (offset === 0) {
      return;
    }

    taskItem.animate(
      [
        { transform: `translateY(${offset}px)` },
        { transform: "translateY(0)" }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    );
  });
}

function escapeHtml(text) {
  const temporaryElement = document.createElement("div");
  temporaryElement.textContent = text;
  return temporaryElement.innerHTML;
}
