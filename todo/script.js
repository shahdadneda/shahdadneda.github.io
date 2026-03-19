const STORAGE_KEY = "shahdad-todo-items";
const SECTION_STORAGE_KEY = "shahdad-todo-active-section";
const ESS_SECTION_KEY = "ess-planner";
const SECTION_CONFIG = {
  general: {
    title: "General"
  },
  "weekend-goals": {
    title: "Weekend Goals"
  },
  [ESS_SECTION_KEY]: {
    title: "ESS planner"
  }
};

const todoForm = document.getElementById("todo-form");
const todoCard = document.querySelector(".todo-card");
const taskArea = document.getElementById("task-area");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");
const todoHeading = document.getElementById("todo-heading");
const todoContext = document.getElementById("todo-context");
const sectionLinks = Array.from(document.querySelectorAll(".section-link"));
const plannerShell = document.getElementById("planner-shell");
const plannerCreateButton = document.getElementById("planner-create-button");
const plannerEntryList = document.getElementById("planner-entry-list");
const plannerEmptyMessage = document.getElementById("planner-empty-message");
const plannerDatePickerShell = document.getElementById("planner-date-picker-shell");
const plannerDatePicker = document.getElementById("planner-date-picker");
const plannerDatePickerTitle = document.getElementById("planner-date-picker-title");
const plannerDatePickerGrid = document.getElementById("planner-date-picker-grid");
const MONTH_TITLE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});
const ENTRY_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short"
});
const ENTRY_ARIA_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});

let activeSection = loadActiveSection();
let tasksBySection = loadTasksBySection();
let draggedTaskId = null;
let dropIndicatorTaskId = null;
let isPlannerDatePickerOpen = false;
let plannerCalendarMonth = getStartOfMonth(new Date());

renderSectionState();
renderEssPlannerControls();
renderTasks();
renderPlannerDatePicker();

todoForm.addEventListener("submit", function (event) {
  event.preventDefault();

  if (!canManageCurrentTasks()) {
    formMessage.textContent = getEssSelectionMessage();
    return;
  }

  const taskText = taskInput.value.trim();

  if (!taskText) {
    formMessage.textContent = "Please type a task before adding it.";
    return;
  }

  const newTask = {
    id: createTaskId(),
    text: taskText,
    completed: false
  };

  const nextTasks = [newTask].concat(getCurrentTasks());
  setCurrentTasks(nextTasks);
  renderTasks();

  todoForm.reset();
  taskInput.focus();
  formMessage.textContent = "";
});

taskList.addEventListener("click", function (event) {
  const deleteButton = event.target.closest(".task-delete");

  if (deleteButton) {
    const taskId = Number(deleteButton.dataset.id);
    const nextTasks = getCurrentTasks().filter(function (task) {
      return task.id !== taskId;
    });

    setCurrentTasks(nextTasks);
    renderTasks();
  }
});

taskList.addEventListener("change", function (event) {
  if (!event.target.classList.contains("task-checkbox")) {
    return;
  }

  const previousPositions = getTaskPositions();
  const taskId = Number(event.target.dataset.id);
  const isCompleted = event.target.checked;

  const nextTasks = reorderTask(getCurrentTasks(), taskId, isCompleted);

  setCurrentTasks(nextTasks);
  renderTasks(previousPositions);
});

sectionLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    const nextSection = link.dataset.section;

    if (!SECTION_CONFIG[nextSection] || nextSection === activeSection) {
      return;
    }

    activeSection = nextSection;
    resetDragState();
    formMessage.textContent = "";
    saveActiveSection();
    renderSectionState();
    renderEssPlannerControls();
    renderTasks();

    if (canManageCurrentTasks()) {
      taskInput.focus();
    }
  });
});

plannerCreateButton.addEventListener("click", function () {
  if (isPlannerDatePickerOpen) {
    closePlannerDatePicker();
    return;
  }

  plannerCalendarMonth = getStartOfMonth(new Date());
  renderPlannerDatePicker();
  openPlannerDatePicker();
});

plannerEntryList.addEventListener("click", function (event) {
  const deleteButton = event.target.closest(".planner-entry-delete");

  if (deleteButton) {
    const entryIdToDelete = deleteButton.dataset.entryId;
    const planner = getEssPlannerData();

    planner.entries = planner.entries.filter(function (entry) {
      return entry.id !== entryIdToDelete;
    });

    if (planner.activeEntryId === entryIdToDelete) {
      planner.activeEntryId = null;
    }

    saveTasks();
    resetDragState();
    formMessage.textContent = "";
    renderSectionState();
    renderEssPlannerControls();
    renderTasks();
    return;
  }

  const entryButton = event.target.closest(".planner-entry-button");

  if (!entryButton) {
    return;
  }

  const nextEntryId = entryButton.dataset.entryId;
  const planner = getEssPlannerData();

  if (planner.activeEntryId === nextEntryId) {
    return;
  }

  planner.activeEntryId = nextEntryId;
  saveTasks();
  resetDragState();
  formMessage.textContent = "";
  renderSectionState();
  renderEssPlannerControls();
  renderTasks();
  taskInput.focus();
});

plannerDatePicker.addEventListener("click", function (event) {
  const navButton = event.target.closest(".planner-date-picker-nav-button");

  if (navButton) {
    plannerCalendarMonth = getStartOfMonth(
      createCalendarDate(
        plannerCalendarMonth.getFullYear(),
        plannerCalendarMonth.getMonth() + (navButton.dataset.calendarNav === "next" ? 1 : -1),
        1
      )
    );
    renderPlannerDatePicker();
    return;
  }

  const dayButton = event.target.closest(".planner-date-picker-day");

  if (!dayButton) {
    return;
  }

  const selectedDate = createDateFromIso(dayButton.dataset.date);

  if (!selectedDate) {
    return;
  }

  createEssPlannerEntry(formatEssEntryDate(selectedDate));
  closePlannerDatePicker();
  formMessage.textContent = "";
  renderSectionState();
  renderEssPlannerControls();
  renderTasks();
  taskInput.focus();
});

document.addEventListener("click", function (event) {
  if (
    !isPlannerDatePickerOpen ||
    !plannerDatePickerShell ||
    plannerDatePickerShell.contains(event.target)
  ) {
    return;
  }

  closePlannerDatePicker();
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape" || !isPlannerDatePickerOpen) {
    return;
  }

  closePlannerDatePicker();
  plannerCreateButton.focus();
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
  const currentTasks = getCurrentTasks();
  const hasPlannerEntry = canManageCurrentTasks();

  taskList.innerHTML = "";
  updateTaskComposerState(hasPlannerEntry);

  if (!hasPlannerEntry) {
    updateTaskCount(currentTasks);
    emptyState.querySelector("p").textContent = getEssSelectionMessage();
    emptyState.classList.remove("is-hidden");
    return;
  }

  currentTasks.forEach(function (task) {
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

  emptyState.querySelector("p").textContent = getEmptyStateMessage();
  emptyState.classList.toggle("is-hidden", currentTasks.length > 0);

  if (previousPositions) {
    animateTaskReorder(previousPositions);
  }
}

function updateTaskCount(taskItems) {
  const taskCount = document.getElementById("task-count");

  if (!taskCount) {
    return;
  }

  const remainingTasks = taskItems.filter(function (task) {
    return !task.completed;
  }).length;

  taskCount.textContent = String(remainingTasks);
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
  return {
    general: [],
    "weekend-goals": [],
    [ESS_SECTION_KEY]: {
      entries: [],
      activeEntryId: null
    }
  };
}

function normalizeSections(sectionMap) {
  return {
    general: normalizeTaskList(sectionMap.general),
    "weekend-goals": normalizeTaskList(sectionMap["weekend-goals"]),
    [ESS_SECTION_KEY]: normalizeEssPlannerSection(sectionMap[ESS_SECTION_KEY])
  };
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
  todoContext.textContent = getSectionContext();
  todoContext.classList.toggle("is-hidden", !todoContext.textContent);
  plannerShell.classList.toggle("is-hidden", activeSection !== ESS_SECTION_KEY);
  todoCard.classList.toggle("is-planner-layout", activeSection === ESS_SECTION_KEY);

  if (activeSection !== ESS_SECTION_KEY) {
    closePlannerDatePicker();
  }

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

function renderEssPlannerControls() {
  if (activeSection !== ESS_SECTION_KEY) {
    plannerEntryList.innerHTML = "";
    plannerEmptyMessage.textContent = "";
    plannerEmptyMessage.classList.add("is-hidden");
    closePlannerDatePicker();
    return;
  }

  const planner = getEssPlannerData();
  plannerEntryList.innerHTML = "";

  planner.entries.forEach(function (entry) {
    const entryItem = document.createElement("div");

    entryItem.className = "planner-entry-item";

    if (entry.id === planner.activeEntryId) {
      entryItem.classList.add("is-active");
    }

    entryItem.innerHTML = `
      <button class="planner-entry-button" type="button" data-entry-id="${entry.id}">
        <span class="planner-entry-name">${escapeHtml(entry.name)}</span>
      </button>
      <button
        class="planner-entry-delete"
        type="button"
        data-entry-id="${entry.id}"
        aria-label="Delete ${escapeHtml(entry.name)}"
      >
        X
      </button>
    `;

    plannerEntryList.appendChild(entryItem);
  });

  if (planner.entries.length === 0) {
    plannerEmptyMessage.textContent =
      "No ESS planner entries yet. Create one for your next Tuesday or Thursday.";
    plannerEmptyMessage.classList.remove("is-hidden");
    return;
  }

  plannerEmptyMessage.textContent = "";
  plannerEmptyMessage.classList.add("is-hidden");
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

function reorderTask(taskItems, taskId, isCompleted) {
  const updatedTask = taskItems.find(function (task) {
    return task.id === taskId;
  });

  if (!updatedTask) {
    return taskItems;
  }

  const remainingTasks = taskItems.filter(function (task) {
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
  const currentTasks = getCurrentTasks();
  const taskLookup = new Map(
    currentTasks.map(function (task) {
      return [String(task.id), task];
    })
  );

  const nextTasks = Array.from(taskList.querySelectorAll(".task-item"))
    .map(function (taskItem) {
      return taskLookup.get(taskItem.dataset.taskId);
    })
    .filter(Boolean);

  setCurrentTasks(nextTasks);
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

function normalizeTaskList(taskItems) {
  if (!Array.isArray(taskItems)) {
    return [];
  }

  return taskItems.reduce(function (normalizedTasks, task, index) {
    if (!task || typeof task !== "object") {
      return normalizedTasks;
    }

    const text = typeof task.text === "string" ? task.text.trim() : "";

    if (!text) {
      return normalizedTasks;
    }

    normalizedTasks.push({
      id: typeof task.id === "number" ? task.id : Date.now() + index,
      text: text,
      completed: Boolean(task.completed)
    });

    return normalizedTasks;
  }, []);
}

function normalizeEssPlannerSection(sectionValue) {
  if (Array.isArray(sectionValue)) {
    const legacyTasks = normalizeTaskList(sectionValue);

    if (legacyTasks.length === 0) {
      return {
        entries: [],
        activeEntryId: null
      };
    }

    return {
      entries: [
        {
          id: "legacy-ess-entry",
          name: "Existing ESS Planner",
          tasks: legacyTasks
        }
      ],
      activeEntryId: null
    };
  }

  if (!sectionValue || typeof sectionValue !== "object") {
    return {
      entries: [],
      activeEntryId: null
    };
  }

  const rawEntries = Array.isArray(sectionValue.entries) ? sectionValue.entries : [];
  const entries = rawEntries.reduce(function (normalizedEntries, entry, index) {
    if (!entry || typeof entry !== "object") {
      return normalizedEntries;
    }

    const name = typeof entry.name === "string" ? entry.name.trim() : "";

    if (!name) {
      return normalizedEntries;
    }

    normalizedEntries.push({
      id: typeof entry.id === "string" && entry.id ? entry.id : `ess-entry-${Date.now()}-${index}`,
      name: name,
      tasks: normalizeTaskList(entry.tasks)
    });

    return normalizedEntries;
  }, []);

  const activeEntryId = entries.some(function (entry) {
    return entry.id === sectionValue.activeEntryId;
  })
    ? sectionValue.activeEntryId
    : null;

  return {
    entries: entries,
    activeEntryId: activeEntryId
  };
}

function getCurrentTasks() {
  if (activeSection !== ESS_SECTION_KEY) {
    return tasksBySection[activeSection];
  }

  const activeEntry = getActiveEssEntry();
  return activeEntry ? activeEntry.tasks : [];
}

function setCurrentTasks(nextTasks) {
  if (activeSection !== ESS_SECTION_KEY) {
    tasksBySection[activeSection] = nextTasks;
    saveTasks();
    return;
  }

  const planner = getEssPlannerData();
  planner.entries = planner.entries.map(function (entry) {
    if (entry.id !== planner.activeEntryId) {
      return entry;
    }

    return {
      ...entry,
      tasks: nextTasks
    };
  });

  saveTasks();
  renderEssPlannerControls();
}

function canManageCurrentTasks() {
  if (activeSection !== ESS_SECTION_KEY) {
    return true;
  }

  return Boolean(getActiveEssEntry());
}

function getSectionContext() {
  if (activeSection !== ESS_SECTION_KEY) {
    return "";
  }

  const activeEntry = getActiveEssEntry();

  if (!activeEntry) {
    return "Choose an ESS entry to start planning.";
  }

  return activeEntry.name;
}

function updateTaskComposerState(hasPlannerEntry) {
  const canEditTasks = typeof hasPlannerEntry === "boolean" ? hasPlannerEntry : canManageCurrentTasks();

  taskInput.disabled = !canEditTasks;
  todoForm.querySelector("button").disabled = !canEditTasks;
  taskInput.placeholder = canEditTasks
    ? getTaskPlaceholder()
    : getEssSelectionMessage();
}

function getTaskPlaceholder() {
  if (activeSection === ESS_SECTION_KEY) {
    const activeEntry = getActiveEssEntry();
    return activeEntry ? `Add a task for ${activeEntry.name}` : getEssSelectionMessage();
  }

  return "What do you want to get done?";
}

function getEmptyStateMessage() {
  if (activeSection === ESS_SECTION_KEY) {
    return "No tasks for this ESS entry yet.";
  }

  return "No tasks yet. Add your first one above.";
}

function getEssPlannerData() {
  return tasksBySection[ESS_SECTION_KEY];
}

function getActiveEssEntry() {
  const planner = getEssPlannerData();

  return (
    planner.entries.find(function (entry) {
      return entry.id === planner.activeEntryId;
    }) || null
  );
}

function createEssPlannerEntry(name) {
  const planner = getEssPlannerData();
  const newEntry = {
    id: createEntryId(),
    name: name,
    tasks: []
  };

  planner.entries.unshift(newEntry);
  planner.activeEntryId = newEntry.id;
  saveTasks();
}

function renderPlannerDatePicker() {
  if (!plannerDatePickerTitle || !plannerDatePickerGrid) {
    return;
  }

  plannerDatePickerTitle.textContent = MONTH_TITLE_FORMATTER.format(plannerCalendarMonth);
  plannerDatePickerGrid.innerHTML = "";

  const calendarStartDate = getCalendarGridStart(plannerCalendarMonth);
  const today = getStartOfDay(new Date());

  for (let dayOffset = 0; dayOffset < 42; dayOffset += 1) {
    const dayDate = createCalendarDate(
      calendarStartDate.getFullYear(),
      calendarStartDate.getMonth(),
      calendarStartDate.getDate() + dayOffset
    );
    const dayButton = document.createElement("button");
    const isCurrentMonth = dayDate.getMonth() === plannerCalendarMonth.getMonth();
    const isToday = areSameCalendarDay(dayDate, today);

    dayButton.className = "planner-date-picker-day";
    dayButton.type = "button";
    dayButton.dataset.date = formatDateForDataset(dayDate);
    dayButton.textContent = String(dayDate.getDate());
    dayButton.setAttribute("aria-label", ENTRY_ARIA_LABEL_FORMATTER.format(dayDate));

    if (!isCurrentMonth) {
      dayButton.classList.add("is-outside-month");
    }

    if (isToday) {
      dayButton.classList.add("is-today");
    }

    plannerDatePickerGrid.appendChild(dayButton);
  }
}

function openPlannerDatePicker() {
  if (!plannerDatePicker) {
    return;
  }

  isPlannerDatePickerOpen = true;
  plannerDatePicker.classList.remove("is-hidden");
  plannerDatePicker.setAttribute("aria-hidden", "false");
  plannerCreateButton.setAttribute("aria-expanded", "true");

  window.requestAnimationFrame(function () {
    const todayButton = plannerDatePicker.querySelector(".planner-date-picker-day.is-today");
    const firstVisibleButton = plannerDatePicker.querySelector(".planner-date-picker-day");
    const nextFocusTarget = todayButton || firstVisibleButton;

    if (nextFocusTarget) {
      nextFocusTarget.focus();
    }
  });
}

function closePlannerDatePicker() {
  if (!plannerDatePicker) {
    return;
  }

  isPlannerDatePickerOpen = false;
  plannerDatePicker.classList.add("is-hidden");
  plannerDatePicker.setAttribute("aria-hidden", "true");
  plannerCreateButton.setAttribute("aria-expanded", "false");
}

function formatEssEntryDate(date) {
  return `${ENTRY_MONTH_FORMATTER.format(date)} ${date.getDate()}, ${String(date.getFullYear()).slice(-2)}'`;
}

function getCalendarGridStart(monthDate) {
  return createCalendarDate(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - monthDate.getDay()
  );
}

function formatDateForDataset(date) {
  const monthValue = String(date.getMonth() + 1).padStart(2, "0");
  const dayValue = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${monthValue}-${dayValue}`;
}

function createDateFromIso(dateValue) {
  const dateParts = dateValue.split("-");

  if (dateParts.length !== 3) {
    return null;
  }

  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  if ([year, month, day].some(Number.isNaN)) {
    return null;
  }

  return createCalendarDate(year, month, day);
}

function createCalendarDate(year, month, day) {
  return new Date(year, month, day);
}

function getStartOfMonth(date) {
  return createCalendarDate(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfDay(date) {
  return createCalendarDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function areSameCalendarDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getEssSelectionMessage() {
  const planner = getEssPlannerData();
  return planner.entries.length > 0 ? "Select an ESS day first" : "Create an ESS entry first";
}

function createTaskId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function createEntryId() {
  return `ess-entry-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function resetDragState() {
  clearDropIndicator();
  draggedTaskId = null;
}

function escapeHtml(text) {
  const temporaryElement = document.createElement("div");
  temporaryElement.textContent = text;
  return temporaryElement.innerHTML;
}
