const expressionDisplay = document.querySelector("#expression");
const resultDisplay = document.querySelector("#result");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const historyKey = "good-mood-calculator-history";

let expression = "";
let justEvaluated = false;
let history = loadHistory();

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) throw new Error("That number is out of range.");
  const rounded = Number.parseFloat(value.toPrecision(12));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }).format(rounded);
}

function prettyExpression(value) {
  return value.replaceAll("*", "×").replaceAll("/", "÷").replaceAll("-", "−");
}

function updateDisplay(preview = true) {
  expressionDisplay.textContent = expression ? prettyExpression(expression) : "0";
  resultDisplay.classList.toggle("is-placeholder", !expression);

  if (!expression) {
    resultDisplay.innerHTML = "let's make it count<span class=\"cursor\"></span>";
    return;
  }

  if (preview) {
    try {
      resultDisplay.textContent = formatNumber(calculate(expression));
    } catch {
      resultDisplay.textContent = "";
    }
  }
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = history.length > 0;
  for (const entry of history) {
    const item = document.createElement("li");
    item.className = "history-item";
    const equation = document.createElement("span");
    equation.className = "history-equation";
    equation.textContent = `${prettyExpression(entry.expression)} =`;
    const answer = document.createElement("span");
    answer.className = "history-answer";
    answer.textContent = entry.result;
    item.append(equation, answer);
    historyList.append(item);
  }
}

function saveHistory() {
  try {
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch {
    // The calculator still works when storage is unavailable.
  }
}

function calculate(source) {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)|[()+\-*/%]/g);
  if (!tokens || tokens.join("") !== source.replace(/\s/g, "")) throw new Error("Invalid expression.");
  let position = 0;

  function parsePrimary() {
    const token = tokens[position++];
    let value;
    if (token === "(") {
      value = parseExpression();
      if (tokens[position++] !== ")") throw new Error("Missing closing parenthesis.");
    } else if (token === undefined || !/^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
      throw new Error("Expected a number.");
    } else {
      value = Number(token);
    }

    while (tokens[position] === "%") {
      position++;
      value /= 100;
    }
    return value;
  }

  function parseUnary() {
    if (tokens[position] === "+") { position++; return parseUnary(); }
    if (tokens[position] === "-") { position++; return -parseUnary(); }
    return parsePrimary();
  }

  function parseTerm() {
    let value = parseUnary();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const next = parseUnary();
      if (operator === "/" && next === 0) throw new Error("Can't divide by zero.");
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const next = parseTerm();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const value = parseExpression();
  if (position !== tokens.length) throw new Error("Unexpected input.");
  if (!Number.isFinite(value)) throw new Error("That number is out of range.");
  return value;
}

function enterDigit(digit) {
  if (justEvaluated) expression = "";
  justEvaluated = false;
  if (expression.endsWith("%") || expression.endsWith(")")) expression += "*";
  expression += digit;
  updateDisplay();
}

function enterDecimal() {
  if (justEvaluated) expression = "";
  justEvaluated = false;
  if (expression.endsWith("%") || expression.endsWith(")")) expression += "*";
  const currentNumber = expression.split(/[+\-*/()]/).at(-1) || "";
  if (!currentNumber.includes(".")) expression += currentNumber === "" ? "0." : ".";
  updateDisplay();
}

function enterOperator(operator) {
  justEvaluated = false;
  if (!expression) {
    if (operator === "-") expression = "-";
    updateDisplay();
    return;
  }
  if (/[+\-*/]$/.test(expression)) {
    if (operator === "-" && /[+*/]$/.test(expression)) expression += operator;
    else expression = expression.replace(/[+\-*/]+$/, operator);
  } else {
    expression += operator;
  }
  updateDisplay();
}

function toggleSign() {
  if (!expression || /[+\-*/]$/.test(expression)) {
    if (expression.endsWith("-") && /[+*/]-$/.test(expression)) expression = expression.slice(0, -1);
    else expression += expression ? "-" : "-";
  } else {
    const match = expression.match(/(?:\d+\.?\d*|\.\d+)%?$/);
    if (match) {
      let start = expression.length - match[0].length;
      const previous = expression[start - 1];
      const beforePrevious = expression[start - 2];
      if (previous === "-" && (start === 1 || /[+*/(]/.test(beforePrevious))) start--;
      if (expression[start] === "-") expression = expression.slice(0, start) + expression.slice(start + 1);
      else expression = expression.slice(0, start) + "-" + expression.slice(start);
    }
  }
  justEvaluated = false;
  updateDisplay();
}

function applyPercent() {
  if (expression && /(?:\d|\))$/.test(expression) && !expression.endsWith("%")) {
    expression += "%";
    justEvaluated = false;
    updateDisplay();
  }
}

function evaluateExpression() {
  if (!expression || /[+\-*/.]$/.test(expression)) return;
  try {
    const source = expression;
    const result = formatNumber(calculate(source));
    history.unshift({ expression: source, result });
    history = history.slice(0, 6);
    saveHistory();
    renderHistory();
    expression = String(calculate(source));
    expressionDisplay.textContent = `${prettyExpression(source)} =`;
    resultDisplay.classList.remove("is-placeholder");
    resultDisplay.textContent = result;
    justEvaluated = true;
  } catch (error) {
    resultDisplay.classList.remove("is-placeholder");
    resultDisplay.textContent = error.message === "Can't divide by zero." ? "can't do that :/" : "check that math";
    justEvaluated = true;
  }
}

function clearAll() {
  expression = "";
  justEvaluated = false;
  updateDisplay(false);
}

function deleteLast() {
  if (justEvaluated) {
    justEvaluated = false;
    updateDisplay(false);
    return;
  }
  expression = expression.slice(0, -1);
  updateDisplay();
}

document.querySelector(".keypad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
  else if (button.dataset.operator) enterOperator(button.dataset.operator);
  else if (button.dataset.action === "decimal") enterDecimal();
  else if (button.dataset.action === "percent") applyPercent();
  else if (button.dataset.action === "sign") toggleSign();
  else if (button.dataset.action === "equals") evaluateExpression();
  else if (button.dataset.action === "clear") clearAll();
  else if (button.dataset.action === "delete") deleteLast();
});

document.querySelector("#clear-history").addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.dataset.theme = button.dataset.theme;
    document.querySelectorAll(".swatch").forEach((swatch) => {
      const selected = swatch === button;
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-pressed", String(selected));
    });
  });
});

document.addEventListener("keydown", (event) => {
  if (/^\d$/.test(event.key)) enterDigit(event.key);
  else if (event.key === ".") enterDecimal();
  else if (["+", "-", "*", "/"].includes(event.key)) enterOperator(event.key);
  else if (event.key === "%") applyPercent();
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); evaluateExpression(); }
  else if (event.key === "Backspace") deleteLast();
  else if (event.key === "Escape") clearAll();
});

renderHistory();
updateDisplay();