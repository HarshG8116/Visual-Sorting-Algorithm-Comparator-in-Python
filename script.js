
const API_URL = "https://YOUR-BACKEND.onrender.com";

const $ = (id) => document.getElementById(id);

let animationToken = 0;
let paused = false;
let currentSteps = [];
let currentStep = 0;
let currentResult = null;

function getNumbers() {
  const values = $("arrayInput").value
    .split(",")
    .map(value => value.trim());

  if (
    values.some(value => value === "" || !Number.isFinite(Number(value))) ||
    values.length > 60
  ) {
    throw new Error("Enter 1–60 valid numbers separated by commas.");
  }

  return values.map(Number);
}

function renderBars(values, active = [], swapped = [], sorted = []) {
  const container = $("bars");
  container.replaceChildren();

  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  const minHeight = 10;

  values.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";

    const height = minHeight +
      (Math.abs(value) / maxAbs) * 240;

    bar.style.height = `${height}px`;
    bar.textContent = value;
    bar.title = `Index ${index}: ${value}`;

    if (sorted.includes(index)) {
      bar.classList.add("sorted");
    } else if (swapped.includes(index)) {
      bar.classList.add("swapped");
    } else if (active.includes(index)) {
      bar.classList.add("active");
    }

    container.appendChild(bar);
  });
}

function updateMetrics(metrics = {}) {
  $("comparisons").textContent = metrics.comparisons ?? 0;
  $("swaps").textContent = metrics.swaps ?? 0;
  $("writes").textContent = metrics.writes ?? 0;
  $("time").textContent = `${metrics.execution_ms ?? 0} ms`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSort(algorithm, array) {
  const response = await fetch(`${API_URL}/api/sort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ algorithm, array })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Sorting request failed.");
  }

  return data;
}

async function startAnimation() {
  const token = ++animationToken;

  try {
    const array = getNumbers();
    const algorithm = $("algorithm").value;

    paused = false;
    $("pauseBtn").textContent = "Pause";
    $("status").textContent = "Preparing animation...";
    $("startBtn").disabled = true;

    currentResult = await fetchSort(algorithm, array);
    currentSteps = currentResult.steps;
    currentStep = 0;

    $("visualTitle").textContent =
      currentResult.algorithm;

    updateMetrics();
    renderBars(array);

    $("status").textContent = "Animation running...";

    for (const step of currentSteps) {
      if (token !== animationToken) return;

      while (paused) {
        if (token !== animationToken) return;
        await sleep(100);
      }

      if (token !== animationToken) return;

      renderBars(
        step.array,
        step.indices,
        step.action === "swap" ? step.indices : [],
        step.sorted_indices
      );

      $("stepInfo").textContent =
        `Step: ${step.step} / ${currentSteps.length}`;

      $("actionInfo").textContent = step.message;

      updateMetrics({
        comparisons: step.comparisons,
        swaps: step.swaps,
        writes: step.writes,
        execution_ms: currentResult.metrics.execution_ms
      });

      await sleep(Number($("speed").value));
    }

    if (token !== animationToken) return;

    renderBars(
      currentResult.sorted_array,
      [],
      [],
      currentResult.sorted_array.map((_, i) => i)
    );

    updateMetrics(currentResult.metrics);
    $("status").textContent = "Sorting completed successfully.";
  } catch (error) {
    if (token === animationToken) {
      $("status").textContent = error.message;
    }
  } finally {
    if (token === animationToken) {
      $("startBtn").disabled = false;
    }
  }
}

$("startBtn").addEventListener("click", startAnimation);

$("pauseBtn").addEventListener("click", () => {
  if ($("startBtn").disabled) {
    paused = !paused;
    $("pauseBtn").textContent = paused ? "Resume" : "Pause";
  }
});

$("resetBtn").addEventListener("click", () => {
  animationToken++;
  paused = false;
  currentSteps = [];
  currentStep = 0;
  currentResult = null;

  $("startBtn").disabled = false;
  $("pauseBtn").textContent = "Pause";
  $("status").textContent = "Animation reset.";
  $("stepInfo").textContent = "Step: 0";
  $("actionInfo").textContent = "Waiting to start...";

  try {
    renderBars(getNumbers());
    updateMetrics();
  } catch (error) {
    renderBars([]);
    $("status").textContent = error.message;
  }
});

$("randomBtn").addEventListener("click", () => {
  animationToken++;
  paused = false;
  $("startBtn").disabled = false;
  $("pauseBtn").textContent = "Pause";

  const values = Array.from(
    { length: 10 },
    () => Math.floor(Math.random() * 90) + 10
  );

  $("arrayInput").value = values.join(",");
  renderBars(values);
  updateMetrics();
  $("status").textContent = "Random array generated.";
});

$("algorithm").addEventListener("change", () => {
  const names = {
    bubble: "Bubble Sort",
    selection: "Selection Sort",
    insertion: "Insertion Sort"
  };

  $("visualTitle").textContent = names[$("algorithm").value];
});

$("compareBtn").addEventListener("click", async () => {
  const button = $("compareBtn");
  const output = $("comparisonResults");

  try {
    const array = getNumbers();
    button.disabled = true;
    output.textContent = "Running comparison...";

    const algorithms = ["bubble", "selection", "insertion"];

    const results = await Promise.all(
      algorithms.map(algorithm => fetchSort(algorithm, array))
    );

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const header = document.createElement("tr");

    [
      "Algorithm",
      "Comparisons",
      "Swaps",
      "Array Writes",
      "Time (ms)"
    ].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      header.appendChild(th);
    });

    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    results.forEach(result => {
      const row = document.createElement("tr");

      [
        result.algorithm,
        result.metrics.comparisons,
        result.metrics.swaps,
        result.metrics.writes,
        result.metrics.execution_ms
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    output.replaceChildren(table);
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

try {
  renderBars(getNumbers());
} catch (error) {
  $("status").textContent = error.message;
}
