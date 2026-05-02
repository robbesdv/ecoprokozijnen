/* DakkapelLAB shim — gebruikt KozijnLAB als basis zonder KozijnLAB te overschrijven. */
(function () {
  "use strict";

  function dlCode() {
    var d = new Date();
    var y = String(d.getFullYear()).slice(-2);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var r = Math.floor(Math.random() * 9000 + 1000);
    return "DK-" + y + m + day + "-" + r;
  }

  function element(id, name, widthMM, heightMM, columns, notes) {
    return {
      id: id,
      name: name,
      type: "kozijn",
      widthMM: widthMM,
      heightMM: heightMM,
      columns: columns,
      profile: { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 },
      colorOutside: "RAL7016",
      colorInside: "same",
      colorSash: "same",
      colorPanel: "same",
      finishOutside: "smooth",
      finishInside: "smooth",
      glassPack: "HR++",
      hardware: "siegenia",
      qty: 1,
      notes: notes || ""
    };
  }

  function dakkapelTemplate() {
    var front = element(
      "dk_front_" + Date.now(),
      "Dakkapel voorzijde",
      3500,
      1200,
      [
        { widthPct: 33.33, rows: [{ paneType: "draaikiep", hinge: "left", glassPack: "HR++", glassFinish: "clear", fill: "glass", heightPct: 100 }] },
        { widthPct: 33.34, rows: [{ paneType: "vast", hinge: "left", glassPack: "HR++", glassFinish: "clear", fill: "glass", heightPct: 100 }] },
        { widthPct: 33.33, rows: [{ paneType: "draaikiep", hinge: "right", glassPack: "HR++", glassFinish: "clear", fill: "glass", heightPct: 100 }] }
      ],
      "Voorzijde dakkapel - pas breedte, vakverdeling en glasopties aan."
    );

    var sideLeft = element(
      "dk_side_left_" + Date.now(),
      "Zijwang links",
      700,
      1200,
      [{ widthPct: 100, rows: [{ paneType: "vast", hinge: "left", fill: "panel", heightPct: 100 }] }],
      "Zijwang links - paneel/afwerking als placeholder."
    );

    var sideRight = element(
      "dk_side_right_" + Date.now(),
      "Zijwang rechts",
      700,
      1200,
      [{ widthPct: 100, rows: [{ paneType: "vast", hinge: "left", fill: "panel", heightPct: 100 }] }],
      "Zijwang rechts - paneel/afwerking als placeholder."
    );

    return {
      offerCode: dlCode(),
      customer: {
        name: "",
        projectName: "Dakkapel offerte",
        address: "",
        postcode: "",
        city: "",
        phone: "",
        email: "",
        date: "",
        deliveryDate: ""
      },
      elements: [front, sideLeft, sideRight],
      activeElementId: front.id,
      montageEuro: 0,
      discountPct: 0,
      vatRate: 0.21,
      notes: "DakkapelLAB starter: voorzijde + zijwangen. KozijnLAB-engine als basis; dakkapel-specifieke prijzen/onderdelen later uitbreiden.",
      extras: [
        { id: "dk_extra_construction", name: "Dakconstructie / constructieve voorbereiding", qty: 1, unitPrice: 0 },
        { id: "dk_extra_inside_finish", name: "Binnenafwerking", qty: 1, unitPrice: 0 },
        { id: "dk_extra_installation", name: "Plaatsing dakkapel", qty: 1, unitPrice: 0 }
      ]
    };
  }

  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-show");
    setTimeout(function () { el.classList.remove("is-show"); }, 2200);
  }

  function render() {
    if (typeof renderAll === "function") renderAll();
    if (typeof saveState === "function") saveState();
  }

  function loadTemplate(force) {
    try {
      var hasState = !!localStorage.getItem("DL_V1_STATE");
      if (!force && hasState) return;
      state = dakkapelTemplate();
      render();
      toast("Dakkapel starter geladen");
    } catch (err) {
      console.warn("DakkapelLAB starter kon niet worden geladen", err);
    }
  }

  function relabel() {
    document.title = "DakkapelLAB — Configurator";

    var selectors = [
      [".brand-name", "DakkapelLAB"],
      [".brand-sub", "Configurator v0.1"],
      [".drawer-title", "Dakkapel export"]
    ];

    selectors.forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (el) el.textContent = pair[1];
    });

    var exportBtn = document.getElementById("btn-export");
    if (exportBtn) exportBtn.textContent = "Exporteer JSON";

    var newBtn = document.getElementById("btn-new-offer");
    if (newBtn) {
      newBtn.textContent = "Nieuwe dakkapel";
      newBtn.addEventListener("click", function () {
        setTimeout(function () { loadTemplate(true); }, 0);
      });
    }
  }

  function setupBridge() {
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "DAKKAPELLAB_LOAD_PROJECT") {
        window.postMessage({ type: "KOZIJNLAB_LOAD_PROJECT", data: event.data.data }, "*");
      }
      if (event.data && event.data.type === "REQUEST_DAKKAPELLAB_SUBMIT") {
        window.postMessage({ type: "REQUEST_SUBMIT" }, "*");
      }
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    relabel();
    setupBridge();
    setTimeout(function () { loadTemplate(false); }, 150);
  });
})();
