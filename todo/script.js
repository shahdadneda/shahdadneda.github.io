const STORAGE_KEY = "shahdad-todo-items";
const SECTION_STORAGE_KEY = "shahdad-todo-active-section";
const SECTION_CONFIG = {
  general: {
    title: "General"
  },
  "weekend-goals": {
    title: "Weekend Goals"
  },
  "ess-planner": {
    title: "ESS planner"
  }
};

const todoForm = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");
const todoHeading = document.getElementById("todo-heading");
const sectionLinks = Array.from(document.querySelectorAll(".section-link"));

let activeSection = loadActiveSection();
let tasksBySection = loadTasksBySection();
let tasks = tasksBySection[activeSection].slice();
let draggedTaskId = null;
let dropIndicatorTaskId = null;

renderSectionState();
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
  syncSectionTasks();
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

  syncSectionTasks();
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

  syncSectionTasks();
  renderTasks(previousPositions);
});

sectionLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    const nextSection = link.dataset.section;

    if (!SECTION_CONFIG[nextSection] || nextSection === activeSection) {
      return;
    }

    activeSection = nextSection;
    tasks = tasksBySection[activeSection].slice();
    formMessage.textContent = "";
    saveActiveSection();
    renderSectionState();
    renderTasks();
    taskInput.focus();
  });
});

taskList.addEventListener("dragstart", function (event) {
  const draggedItem = event.target.closest(".task-item");

  if (!draggedItem || event.target.closest(".task-checkbox, .task-delete")) {
    event.preventDefault();
    return;
  }

  draggedTaskId = draggedItem.dataset.taskId;
  draggedItem.classList.add("is-dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTaskId);
  }
});

taskList.addEventListener("dragover", function (event) {
  if (!draggedTaskId) {
    return;
  }

  event.preventDefault();

  const draggedItem = taskList.querySelector(`[data-task-id="${draggedTaskId}"]`);

  if (!draggedItem) {
    return;
  }

  const nextItem = getDragAfterElement(event.clientY);
  updateDropIndicator(nextItem);

  if (!nextItem) {
    animateTaskShift(function () {
      taskList.appendChild(draggedItem);
    });
    return;
  }

  if (nextItem !== draggedItem) {
    animateTaskShift(function () {
      taskList.insertBefore(draggedItem, nextItem);
    });
  }
});

taskList.addEventListener("drop", function (event) {
  if (!draggedTaskId) {
    return;
  }

  event.preventDefault();
  clearDropIndicator();
  syncTasksToDomOrder();
});

taskList.addEventListener("dragend", function () {
  const draggedItem = taskList.querySelector(".task-item.is-dragging");

  if (draggedItem) {
    draggedItem.classList.remove("is-dragging");
  }

  clearDropIndicator();
  draggedTaskId = null;
});

function renderTasks(previousPositions) {
  taskList.innerHTML = "";

  tasks.forEach(function (task) {
    const listItem = document.createElement("li");
    listItem.className = "task-item";
    listItem.dataset.taskId = String(task.id);
    listItem.draggable = true;

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

function syncSectionTasks() {
  tasksBySection[activeSection] = tasks;
  saveTasks();
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksBySection));
}

function loadTasksBySection() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);
  const emptySections = createEmptySections();

  if (!savedTasks) {
    return emptySections;
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    if (Array.isArray(parsedTasks)) {
      emptySections.general = parsedTasks;
      return normalizeSections(emptySections);
    }

    if (!parsedTasks || typeof parsedTasks !== "object") {
      return emptySections;
    }

    return normalizeSections({
      ...emptySections,
      ...parsedTasks
    });
  } catch (error) {
    console.error("Could not read saved tasks.", error);
    return emptySections;
  }
}

function createEmptySections() {
  return Object.keys(SECTION_CONFIG).reduce(function (sections, sectionKey) {
    sections[sectionKey] = [];
    return sections;
  }, {});
}

function normalizeSections(sectionMap) {
  return Object.keys(SECTION_CONFIG).reduce(function (sections, sectionKey) {
    const sectionTasks = sectionMap[sectionKey];
    sections[sectionKey] = Array.isArray(sectionTasks) ? sectionTasks.slice() : [];
    return sections;
  }, {});
}

function saveActiveSection() {
  localStorage.setItem(SECTION_STORAGE_KEY, activeSection);
}

function loadActiveSection() {
  const savedSection = localStorage.getItem(SECTION_STORAGE_KEY);
  return SECTION_CONFIG[savedSection] ? savedSection : "general";
}

function renderSectionState() {
  todoHeading.textContent = SECTION_CONFIG[activeSection].title;

  sectionLinks.forEach(function (link) {
    const isActive = link.dataset.section === activeSection;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
      return;
    }

    link.removeAttribute("aria-current");
  });
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

function syncTasksToDomOrder() {
  const taskLookup = new Map(
    tasks.map(function (task) {
      return [String(task.id), task];
    })
  );

  tasks = Array.from(taskList.querySelectorAll(".task-item"))
    .map(function (taskItem) {
      return taskLookup.get(taskItem.dataset.taskId);
    })
    .filter(Boolean);

  syncSectionTasks();
}

function getDragAfterElement(pointerY) {
  const taskItems = Array.from(taskList.querySelectorAll(".task-item:not(.is-dragging)"));

  return taskItems.reduce(
    function (closest, taskItem) {
      const box = taskItem.getBoundingClientRect();
      const offset = pointerY - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset: offset,
          element: taskItem
        };
      }

      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      element: null
    }
  ).element;
}

function updateDropIndicator(nextItem) {
  taskList.classList.toggle("show-drop-at-end", !nextItem);

  if (dropIndicatorTaskId && (!nextItem || nextItem.dataset.taskId !== dropIndicatorTaskId)) {
    const previousIndicatorItem = taskList.querySelector(
      `[data-task-id="${dropIndicatorTaskId}"]`
    );

    if (previousIndicatorItem) {
      previousIndicatorItem.classList.remove("show-drop-before");
    }
  }

  if (!nextItem) {
    dropIndicatorTaskId = null;
    return;
  }

  nextItem.classList.add("show-drop-before");
  dropIndicatorTaskId = nextItem.dataset.taskId;
}

function clearDropIndicator() {
  taskList.classList.remove("show-drop-at-end");

  if (!dropIndicatorTaskId) {
    return;
  }

  const indicatorItem = taskList.querySelector(`[data-task-id="${dropIndicatorTaskId}"]`);

  if (indicatorItem) {
    indicatorItem.classList.remove("show-drop-before");
  }

  dropIndicatorTaskId = null;
}

function getTaskPositions() {
  const positions = new Map();

  taskList.querySelectorAll(".task-item").forEach(function (taskItem) {
    positions.set(taskItem.dataset.taskId, taskItem.getBoundingClientRect().top);
  });

  return positions;
}

function animateTaskShift(updateTaskOrder) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    updateTaskOrder();
    return;
  }

  const previousPositions = getTaskPositions();

  updateTaskOrder();

  taskList.querySelectorAll(".task-item:not(.is-dragging)").forEach(function (taskItem) {
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
        duration: 220,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    );
  });
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
