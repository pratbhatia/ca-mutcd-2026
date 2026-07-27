/* CA MUTCD 2026 Training — shared behavior */
(function(){
  "use strict";

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var savedTheme = localStorage.getItem("mutcd-theme");
  if(savedTheme) root.setAttribute("data-theme", savedTheme);

  function toggleTheme(){
    var current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("mutcd-theme", next);
  }
  document.querySelectorAll("[data-action='toggle-theme']").forEach(function(btn){
    btn.addEventListener("click", toggleTheme);
  });

  /* ---------- Mobile sidebar ---------- */
  document.querySelectorAll("[data-action='toggle-sidebar']").forEach(function(btn){
    btn.addEventListener("click", function(){
      var sb = document.querySelector(".sidebar");
      if(sb) sb.classList.toggle("open");
    });
  });
  document.addEventListener("click", function(e){
    var sb = document.querySelector(".sidebar");
    if(!sb || !sb.classList.contains("open")) return;
    if(sb.contains(e.target) || e.target.closest("[data-action='toggle-sidebar']")) return;
    sb.classList.remove("open");
  });

  /* ---------- Progress tracking (localStorage) ---------- */
  var PROGRESS_KEY = "mutcd-progress";
  function getProgress(){
    try{ return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
    catch(e){ return {}; }
  }
  function setProgress(id, done){
    var p = getProgress();
    if(done) p[id] = true; else delete p[id];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    paintProgress();
  }
  function paintProgress(){
    var p = getProgress();
    document.querySelectorAll("[data-chapter-id]").forEach(function(el){
      var id = el.getAttribute("data-chapter-id");
      var done = !!p[id];
      var dot = el.querySelector(".done-dot");
      if(dot) dot.classList.toggle("on", done);
      var check = el.querySelector(".check");
      if(check) check.classList.toggle("on", done);
    });
    var cb = document.querySelector("#reviewed-checkbox");
    if(cb){
      var id = cb.getAttribute("data-chapter-id");
      cb.checked = !!p[id];
    }
    var doneCount = Object.keys(p).length;
    document.querySelectorAll("[data-progress-count]").forEach(function(el){
      el.textContent = doneCount;
    });
  }
  var reviewedCb = document.querySelector("#reviewed-checkbox");
  if(reviewedCb){
    reviewedCb.addEventListener("change", function(){
      setProgress(reviewedCb.getAttribute("data-chapter-id"), reviewedCb.checked);
    });
  }
  paintProgress();

  /* ---------- Active sidebar link / scrollspy ---------- */
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll(".sidebar nav .section-link"));
  if(sectionLinks.length){
    var targets = sectionLinks.map(function(a){
      var id = a.getAttribute("href").split("#")[1];
      return id ? document.getElementById(id) : null;
    });
    function onScroll(){
      var pos = window.scrollY + 100;
      var activeIdx = -1;
      targets.forEach(function(t, i){
        if(t && t.offsetTop <= pos) activeIdx = i;
      });
      sectionLinks.forEach(function(a, i){
        a.classList.toggle("active", i === activeIdx);
      });
    }
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  }

  /* ---------- Lightbox for figures ---------- */
  var lightbox = document.querySelector(".lightbox");
  if(!lightbox){
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = "<img>";
    document.body.appendChild(lightbox);
  }
  document.querySelectorAll(".figure img").forEach(function(img){
    img.addEventListener("click", function(){
      lightbox.querySelector("img").src = img.src;
      lightbox.classList.add("open");
    });
  });
  lightbox.addEventListener("click", function(){ lightbox.classList.remove("open"); });

  /* ---------- Search ---------- */
  var overlay = document.querySelector(".search-overlay");
  var input, results;
  function buildOverlay(){
    if(overlay) return;
    overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.innerHTML =
      '<div class="search-panel">' +
      '<input type="text" placeholder="Search chapters, sections, sign codes…" autocomplete="off">' +
      '<div class="search-results"></div>' +
      "</div>";
    document.body.appendChild(overlay);
    input = overlay.querySelector("input");
    results = overlay.querySelector(".search-results");
    overlay.addEventListener("click", function(e){
      if(e.target === overlay) closeSearch();
    });
    input.addEventListener("input", runSearch);
  }
  function rootPrefix(){
    return document.body.getAttribute("data-root") || "";
  }
  function openSearch(){
    buildOverlay();
    overlay.classList.add("open");
    input.value = "";
    results.innerHTML = "";
    setTimeout(function(){ input.focus(); }, 30);
  }
  function closeSearch(){ if(overlay) overlay.classList.remove("open"); }
  function runSearch(){
    var q = input.value.trim().toLowerCase();
    if(!q || !window.MUTCD_SEARCH_INDEX){
      results.innerHTML = q ? "" : '<div class="search-empty">Type to search across all 9 Parts, chapters, and sections.</div>';
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    var scored = [];
    window.MUTCD_SEARCH_INDEX.forEach(function(entry){
      var hay = (entry.t + " " + entry.k + " " + (entry.s || "")).toLowerCase();
      var ok = terms.every(function(t){ return hay.indexOf(t) !== -1; });
      if(ok){
        var score = hay.indexOf(q) === -1 ? 1 : 0;
        scored.push([score, entry]);
      }
    });
    scored.sort(function(a,b){ return a[0]-b[0]; });
    var top = scored.slice(0, 30).map(function(x){ return x[1]; });
    if(!top.length){
      results.innerHTML = '<div class="search-empty">No matches for “' + escapeHtml(input.value) + '”.</div>';
      return;
    }
    results.innerHTML = top.map(function(entry){
      return '<a class="res" href="' + rootPrefix() + entry.u + '">' +
        '<div class="rtitle">' + escapeHtml(entry.t) + '</div>' +
        '<div class="rpath">' + escapeHtml(entry.k) + '</div></a>';
    }).join("");
  }
  function escapeHtml(s){
    return s.replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  document.querySelectorAll("[data-action='open-search']").forEach(function(el){
    el.addEventListener("click", openSearch);
  });
  document.addEventListener("keydown", function(e){
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){
      e.preventDefault(); openSearch();
    } else if(e.key === "Escape"){
      closeSearch();
    }
  });
})();
