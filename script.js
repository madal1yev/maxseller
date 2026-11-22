(function () {
  "use strict";
  var C = window.MAXSELLER_CONFIG;
  var CATS = window.MAXSELLER_CATEGORIES;
  var PRODUCTS = window.MAXSELLER_PRODUCTS;

  var TG = "https://t.me/" + C.telegramChannel;
  var IG = "https://instagram.com/" + C.instagram;

  // Ijtimoiy havolalar
  document.querySelectorAll("[data-tg]").forEach(function (a) { a.href = TG; });
  document.querySelectorAll("[data-ig]").forEach(function (a) { a.href = IG; });
  document.getElementById("year").textContent = new Date().getFullYear();

  // Mobil menyu
  var burger = document.getElementById("burger");
  var links = document.getElementById("navLinks");
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      links.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  // Kategoriya ikonkalari
  var ICONS = {
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    design: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.5-1.3.2-2.300 1.600-2.300H17a4 4 0 0 0 4-4c0-5-4-9.500-9-9.500Z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.500" r="1"/></svg>',
    docs: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.500V16c0 1.500 3 3 6 3s6-1.500 6-3v-4.500"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>'
  };
  var CAT_NAME = {};
  CATS.forEach(function (c) { CAT_NAME[c.id] = c.name; });

  var state = { cat: "all", q: "" };
  var tabs = document.getElementById("tabs");
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var search = document.getElementById("search");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function money(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  function orderLink(p) {
    var text = "Assalomu alaykum! \"" + p.title + "\" mahsulotini buyurtma qilmoqchiman.";
    return "https://t.me/" + C.orderUsername + "?text=" + encodeURIComponent(text);
  }

  function renderTabs() {
    tabs.innerHTML = CATS.map(function (c) {
      return '<button class="tab" role="tab" data-cat="' + c.id + '" aria-selected="' + (state.cat === c.id) + '">' + esc(c.name) + "</button>";
    }).join("");
  }

  function renderGrid() {
    var q = state.q.trim().toLowerCase();
    var list = PRODUCTS.filter(function (p) {
      var okCat = state.cat === "all" || p.cat === state.cat;
      var okQ = !q || (p.title + " " + p.desc).toLowerCase().indexOf(q) !== -1;
      return okCat && okQ;
    });
    grid.innerHTML = list.map(function (p) {
      var price = p.price > 0
        ? '<span class="price">' + money(p.price) + ' <small>' + esc(C.currency) + "</small></span>"
        : '<span class="price ask">Narxini so\'rang</span>';
      return '<article class="card">' +
        '<div class="cover">' + (ICONS[p.cat] || "") + (p.tag ? '<span class="tag">' + esc(p.tag) + "</span>" : "") + "</div>" +
        '<div class="card-body">' +
          '<span class="card-cat">' + esc(CAT_NAME[p.cat] || "") + "</span>" +
          "<h3>" + esc(p.title) + "</h3>" +
          "<p>" + esc(p.desc) + "</p>" +
          '<div class="card-foot">' + price +
            '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + orderLink(p) + '">Buyurtma berish</a>' +
          "</div>" +
        "</div></article>";
    }).join("");
    empty.hidden = list.length > 0;
  }

  tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".tab");
    if (!b) return;
    state.cat = b.dataset.cat;
    renderTabs();
    renderGrid();
  });
  search.addEventListener("input", function () {
    state.q = search.value;
    renderGrid();
  });
  document.querySelectorAll("[data-go]").forEach(function (a) {
    a.addEventListener("click", function () {
      state.cat = a.dataset.go;
      renderTabs();
      renderGrid();
    });
  });

  renderTabs();
  renderGrid();
})();
