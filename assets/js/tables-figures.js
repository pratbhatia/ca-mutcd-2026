/* CA MUTCD 2026 Training — List of Tables and Figures page */
(function(){
  "use strict";
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tf-tab"));
  var panels = {
    tables: document.querySelector('.tf-panel[data-panel="tables"]'),
    figures: document.querySelector('.tf-panel[data-panel="figures"]')
  };
  var input = document.getElementById("tf-filter-input");
  var jumpBar = document.getElementById("tf-jump");
  var emptyMsg = document.getElementById("tf-empty");
  var emptyQ = document.getElementById("tf-empty-q");
  if(!tabs.length || !input) return;

  var activeTab = "tables";

  function buildJumpBar(){
    var panel = panels[activeTab];
    var parts = Array.prototype.slice.call(panel.querySelectorAll(".tf-part"));
    jumpBar.innerHTML = parts.map(function(sec){
      return '<a href="#" class="tf-jump-chip" data-part="' + sec.getAttribute("data-part") + '">Part ' + sec.getAttribute("data-part") + "</a>";
    }).join("");
    jumpBar.querySelectorAll(".tf-jump-chip").forEach(function(chip){
      chip.addEventListener("click", function(e){
        e.preventDefault();
        var sec = panel.querySelector('.tf-part[data-part="' + chip.getAttribute("data-part") + '"]');
        if(sec) sec.scrollIntoView({behavior: "smooth", block: "start"});
      });
    });
  }

  function setTab(name){
    activeTab = name;
    tabs.forEach(function(t){
      var on = t.getAttribute("data-tab") === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    Object.keys(panels).forEach(function(k){
      panels[k].hidden = (k !== name);
    });
    buildJumpBar();
    applyFilter();
  }

  tabs.forEach(function(t){
    t.addEventListener("click", function(){ setTab(t.getAttribute("data-tab")); });
  });

  function applyFilter(){
    var q = input.value.trim().toLowerCase();
    var panel = panels[activeTab];
    var sections = Array.prototype.slice.call(panel.querySelectorAll(".tf-part"));
    var anyVisible = false;
    sections.forEach(function(sec){
      var rows = Array.prototype.slice.call(sec.querySelectorAll(".tf-row"));
      var visibleInSection = 0;
      rows.forEach(function(row){
        var hay = row.getAttribute("data-search") || "";
        var show = !q || hay.indexOf(q) !== -1;
        row.hidden = !show;
        if(show) visibleInSection++;
      });
      sec.hidden = visibleInSection === 0;
      if(visibleInSection > 0) anyVisible = true;
    });
    emptyMsg.hidden = anyVisible;
    if(!anyVisible) emptyQ.textContent = input.value.trim();
  }

  input.addEventListener("input", applyFilter);
  buildJumpBar();
})();
