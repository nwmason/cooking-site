let allRecipes = [];

async function loadRecipes() {

    const response = await fetch("data/recipes.json");
    allRecipes = await response.json();

    allRecipes.sort((a, b) =>
        a.title.localeCompare(b.title)
    );

    renderRecipes(allRecipes);
}

function highlight(text, query) {

    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");

    return text.replace(regex, "<mark>$1</mark>");
}

function renderRecipes(recipes, query = "") {

    const grid = document.getElementById("recipe-grid");
    const noResults = document.getElementById("no-results");

    grid.innerHTML = "";

    if (recipes.length === 0) {
        noResults.classList.remove("hidden");
        return;
    }

    noResults.classList.add("hidden");

    recipes.forEach(recipe => {

        const card = document.createElement("a");

        card.className = "recipe-card";
        card.href = `recipe.html?recipe=${recipe.slug}`;

        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <div class="card-content">
                <h2>
                    ${highlight(recipe.title, query)}
                </h2>
                <p>
                    ${highlight(recipe.description, query)}
                </p>
            </div>
        `;

        grid.appendChild(card);
    });
}

function setupSearch() {

    const searchInput =
        document.getElementById("search");

    searchInput.addEventListener("input", (e) => {

        const query = e.target.value.trim().toLowerCase();

        const filtered = allRecipes.filter(recipe =>
            recipe.title.toLowerCase().includes(query) ||
            recipe.description.toLowerCase().includes(query)
        );

        renderRecipes(filtered, query);
    });
}

loadRecipes();
setupSearch();