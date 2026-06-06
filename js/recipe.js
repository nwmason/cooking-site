const params = new URLSearchParams(window.location.search);
const recipeSlug = params.get("recipe");

let recipeData = null;

let currentScale = 1;
let originalIngredients = [];

let currentStep = 0;
let steps = [];

async function loadRecipe() {

    const response = await fetch(`data/recipes/${recipeSlug}.json`);
    recipeData = await response.json();

    document.title = recipeData.title;

    renderRecipe();

    setupBackButtonAutoHide();
    setupScaling();
    setupTapNavigation();

    steps = recipeData.instructions;
    currentStep = 0;

    setupScrollSync();
    highlightStep(false);
}



function renderRecipe() {

    originalIngredients = recipeData.ingredients;

    const container = document.getElementById("recipe-container");

    container.innerHTML = `
        <a href="index.html" class="back-button" id="backButton">
            <span class="back-icon">←</span>
            <span class="back-text">Recipes</span>
        </a>

        <img class="recipe-hero" src="${recipeData.image}" alt="${recipeData.title}" />

        <h1>${recipeData.title}</h1>

        <p>${recipeData.description}</p>

        <div class="scale-controls">
            <button data-scale="1" class="active">1x</button>
            <button data-scale="2">2x</button>
            <button data-scale="3">3x</button>
        </div>

        <h2>Ingredients</h2>

        <div class="ingredients">
            ${renderIngredients()}
        </div>

        <div id="nutrition-container">
            ${renderNutrition()}
        </div>

        <h2>Instructions</h2>

        <ol id="steps-list">
            ${recipeData.instructions.map((step, i) => `
                <li data-step="${i}">
                    ${step}
                </li>
            `).join("")}
        </ol>
    `;
}



function renderIngredients(checkedStates = []) {

    let checkboxIndex = 0;

    return originalIngredients.map(item => {

        // Header
        if (item.startsWith("_")) {
            return `
                <div class="ingredient-section">
                    ${item.substring(1)}
                </div>
            `;
        }

        const html = `
            <label class="ingredient">
                <input
                    type="checkbox"
                    ${checkedStates[checkboxIndex] ? "checked" : ""}
                >
                <span>${scaleIngredient(item, currentScale)}</span>
            </label>
        `;

        checkboxIndex++;
        return html;

    }).join("");
}

const FRACTIONS = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875
};

function parseQuantity(text) {

    // 1½
    let match = text.match(/^(\d+)([¼½¾⅓⅔⅛⅜⅝⅞])/);
    if (match) {
        return {
            value: parseInt(match[1]) + FRACTIONS[match[2]],
            match: match[0]
        };
    }

    // 1 1/2
    match = text.match(/^(\d+)\s+(\d+)\/(\d+)/);
    if (match) {
        return {
            value:
                parseInt(match[1]) +
                parseInt(match[2]) / parseInt(match[3]),
            match: match[0]
        };
    }

    // 1/2
    match = text.match(/^(\d+)\/(\d+)/);
    if (match) {
        return {
            value: parseInt(match[1]) / parseInt(match[2]),
            match: match[0]
        };
    }

    // ½
    match = text.match(/^([¼½¾⅓⅔⅛⅜⅝⅞])/);
    if (match) {
        return {
            value: FRACTIONS[match[1]],
            match: match[0]
        };
    }

    // 2 or 2.5
    match = text.match(/^(\d+(\.\d+)?)/);
    if (match) {
        return {
            value: parseFloat(match[0]),
            match: match[0]
        };
    }

    return null;
}

function formatQuantity(value) {

    const whole = Math.floor(value);
    const fraction = value - whole;

    const fractions = [
        [0.125, "⅛"],
        [0.25, "¼"],
        [1 / 3, "⅓"],
        [0.375, "⅜"],
        [0.5, "½"],
        [0.625, "⅝"],
        [2 / 3, "⅔"],
        [0.75, "¾"],
        [0.875, "⅞"]
    ];

    const closest = fractions.find(
        ([decimal]) => Math.abs(fraction - decimal) < 0.05
    );

    if (!closest) {
        return Number(value.toFixed(2)).toString();
    }

    const symbol = closest[1];

    if (whole === 0) {
        return symbol;
    }

    return `${whole}${symbol}`;
}

function scaleGramWeights(text, factor) {

    return text.replace(
        /\((\d+(?:\.\d+)?)g\)/gi,
        (_, grams) => `(${Math.round(parseFloat(grams) * factor)}g)`
    );
}

function scaleIngredient(text, factor) {

    const quantity = parseQuantity(text);

    let result = text;

    if (quantity) {

        const scaledValue = quantity.value * factor;

        result = result.replace(
            quantity.match,
            formatQuantity(scaledValue)
        );
    }

    return scaleGramWeights(result, factor);
}

function setupScaling() {

    document.addEventListener("click", (e) => {

        if (!e.target.matches(".scale-controls button")) return;

        currentScale = parseInt(e.target.dataset.scale);

        document.querySelectorAll(".scale-controls button")
            .forEach(btn => btn.classList.remove("active"));

        e.target.classList.add("active");

        const checkedStates = [...document.querySelectorAll(".ingredient input")]
            .map(input => input.checked);

        document.querySelector(".ingredients").innerHTML =
            renderIngredients(checkedStates);

        const nutritionContainer =
            document.getElementById("nutrition-container");

        if (nutritionContainer) {
            nutritionContainer.innerHTML = renderNutrition();
}
    });
}

function renderNutrition() {

    if (!recipeData.nutrition) return "";

    const n = recipeData.nutrition;

    return `
        <h2>Nutrition Facts</h2>

        <div class="nutrition-facts">

            <div class="nutrition-header">
                <h3>Per Serving</h3>
                <small>
                    ${recipeData.servings * currentScale}
                    serving${recipeData.servings * currentScale !== 1 ? "s" : ""}
                </small>
            </div>

            <div class="nutrition-row">
                <span>Calories</span>
                <strong>${n.calories}</strong>
            </div>

            <div class="nutrition-row">
                <span>Total Fat</span>
                <strong>${n.fat}</strong>
            </div>

            <div class="nutrition-row">
                <span>Saturated Fat</span>
                <strong>${n.saturatedFat}</strong>
            </div>

            <div class="nutrition-row">
                <span>Cholesterol</span>
                <strong>${n.cholesterol}</strong>
            </div>

            <div class="nutrition-row">
                <span>Sodium</span>
                <strong>${n.sodium}</strong>
            </div>

            <div class="nutrition-row">
                <span>Total Carbohydrates</span>
                <strong>${n.carbs}</strong>
            </div>

            <div class="nutrition-row">
                <span>Dietary Fiber</span>
                <strong>${n.fiber}</strong>
            </div>

            <div class="nutrition-row">
                <span>Sugars</span>
                <strong>${n.sugar}</strong>
            </div>

            <div class="nutrition-row">
                <span>Protein</span>
                <strong>${n.protein}</strong>
            </div>

        </div>
    `;
}


function setupTapNavigation() {

    document.addEventListener("click", (e) => {

        if (!e.target.closest("#steps-list")) return;

        const viewportHeight = window.innerHeight;
        const tapY = e.clientY;

        if (tapY < viewportHeight * 0.35) {
            currentStep = Math.max(0, currentStep - 1);
        } else {
            currentStep = Math.min(steps.length - 1, currentStep + 1);
        }

        highlightStep(true);
    });
}


function syncStepWithScroll() {

    const stepEls = document.querySelectorAll("#steps-list li");
    if (!stepEls.length) return;

    const viewportHeight = window.innerHeight;
    const centerY = viewportHeight / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    stepEls.forEach((el, index) => {

        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;

        const distance = Math.abs(elCenter - centerY);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    if (closestIndex !== currentStep) {
        currentStep = closestIndex;
        highlightStep(false); // prevent scroll loop
    }
}

function setupBackButtonAutoHide() {

    const backButton = document.getElementById("backButton");
    if (!backButton) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener("scroll", () => {

        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {

            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY;

            // show only when scrolling up OR near top
            if (scrollingDown && currentScrollY > 80) {
                backButton.classList.add("hidden");
            } else {
                backButton.classList.remove("hidden");
            }

            lastScrollY = currentScrollY;
            ticking = false;
        });
    });
}

function setupScrollSync() {

    let ticking = false;

    window.addEventListener("scroll", () => {

        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
            syncStepWithScroll();
            ticking = false;
        });
    });
}


function highlightStep(shouldScroll = true) {

    const stepEls = document.querySelectorAll("#steps-list li");

    stepEls.forEach((el, i) => {

        el.style.opacity = i === currentStep ? "1" : "0.35";
        el.style.transform = i === currentStep ? "scale(1.02)" : "scale(1)";
        el.style.transition = "0.2s ease";
    });

    if (shouldScroll) {
        stepEls[currentStep]?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


loadRecipe();