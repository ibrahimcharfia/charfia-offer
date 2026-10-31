/* CHARFIA Seller Funnel - form, tracking, city match. No libraries. */
(function () {
  "use strict";
  var C = window.CHARFIA || {};
  var qs = new URLSearchParams(location.search);

  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } }

  /* ---------- 1. Attribution: gclid + UTM, kept for the whole visit ---------- */
  var TRACK = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  TRACK.forEach(function (k) { var v = qs.get(k); if (v) store("cf_" + k, v.slice(0, 200)); });
  if (!load("cf_landing")) { store("cf_landing", location.href.split("#")[0].slice(0, 300)); store("cf_referrer", (document.referrer || "").slice(0, 300)); }

  /* ---------- 2. City message match (whitelist only) ---------- */
  var cityKey = (qs.get("city") || load("cf_city") || "").toLowerCase();
  var city = (C.cities || {})[cityKey];
  if (city) {
    store("cf_city", cityKey);
    document.querySelectorAll("[data-city]").forEach(function (el) { el.textContent = city; });
    document.querySelectorAll("[data-city-in]").forEach(function (el) { el.textContent = "in " + city; });
  }

  /* ---------- 3. Google Ads tag (only when configured) ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  if (C.adsId) {
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.adsId);
    document.head.appendChild(s);
    gtag("js", new Date()); gtag("config", C.adsId);
  }
  function conv(label, extra) {
    if (!C.adsId || !label) return;
    var o = { send_to: C.adsId + "/" + label };
    for (var k in extra) o[k] = extra[k];
    gtag("event", "conversion", o);
  }

  /* phone links: fill number + count clicks as secondary conversion */
  document.querySelectorAll("[data-phone]").forEach(function (a) {
    a.href = "tel:" + C.phoneHref;
    if (a.hasAttribute("data-phone-text")) a.textContent = C.phone;
    a.addEventListener("click", function () { conv(C.adsCallLabel); });
  });
  document.querySelectorAll("[data-email]").forEach(function (a) { a.href = "mailto:" + C.email; a.textContent = C.email; });
  var yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- 4. Send helper (Apps Script accepts form-encoded POST) ---------- */
  function send(data) {
    var body = new URLSearchParams(data).toString();
    if (!C.endpoint) { console.warn("CHARFIA: endpoint not set, lead not sent", data); return Promise.resolve(); }
    return fetch(C.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body, keepalive: true })
      .catch(function () {
        if (navigator.sendBeacon) navigator.sendBeacon(C.endpoint, new Blob([body], { type: "application/x-www-form-urlencoded" }));
      });
  }
  function uid() { return "L" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function digits(v) { return (v || "").replace(/\D/g, ""); }

  /* ---------- 5. Two-step lead form (works for every .lead-form on the page) ---------- */
  document.querySelectorAll(".lead-form").forEach(function (form) {
    var steps = form.querySelectorAll(".step");
    var barFill = form.querySelector(".bar i");
    var stepLbl = form.querySelector(".stepper");
    var started = false;
    function errEl() { return form.querySelector(".step.on .err"); }

    function show(i) {
      steps.forEach(function (s, j) { s.classList.toggle("on", j === i); });
      if (barFill) barFill.style.width = i === 0 ? "50%" : "92%";
      if (stepLbl) stepLbl.textContent = "Step " + (i + 1) + " of 2";
      var f = steps[i].querySelector("input"); if (f && i > 0) f.focus();
    }
    function fail(msg) { var e = errEl(); e.textContent = msg; e.style.display = "block"; }
    function ok() { form.querySelectorAll(".err").forEach(function (e) { e.style.display = "none"; }); }

    form.addEventListener("input", function () {
      if (!started) { started = true; if (C.adsId) gtag("event", "form_start"); }
    }, { once: true });

    form.querySelector("[data-next]").addEventListener("click", function () {
      var addr = form.elements.address.value.trim();
      if (addr.length < 6 || !/\d/.test(addr)) { fail("Please enter the full property address (street number, street, city or ZIP)."); form.elements.address.focus(); return; }
      ok(); show(1);
    });
    var back = form.querySelector("[data-back]");
    if (back) back.addEventListener("click", function () { ok(); show(0); });

    var phone = form.elements.phone;
    phone.addEventListener("input", function () {
      var d = digits(phone.value); if (d.length === 11 && d[0] === "1") d = d.slice(1);
      d = d.slice(0, 10);
      phone.value = d.length > 6 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : d.length > 3 ? "(" + d.slice(0, 3) + ") " + d.slice(3) : d;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (steps[0].classList.contains("on")) { form.querySelector("[data-next]").click(); return; }
      var name = form.elements.name.value.trim();
      var d = digits(phone.value);
      var email = form.elements.email.value.trim();
      if (name.length < 2) return fail("Please enter your name.");
      if (d.length !== 10 || /^[01]/.test(d) || /^(\d)\1{9}$/.test(d)) return fail("Please enter a valid 10-digit US phone number.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("Please enter a valid email address.");
      if (!form.elements.consent.checked) return fail("Please check the consent box so we can call or text you about your offer.");
      ok();
      if (form.elements.website && form.elements.website.value) { location.href = "thank-you.html"; return; } // honeypot: bots

      var id = uid();
      var data = {
        type: "lead", lead_id: id,
        address: form.elements.address.value.trim(),
        name: name, phone: d, email: email,
        consent: "yes", consent_text: form.querySelector(".consent span").textContent.replace(/\s+/g, " ").trim(),
        city_page: city || "Texas", form_position: form.getAttribute("data-pos") || "",
        page: location.pathname, user_agent: navigator.userAgent.slice(0, 200),
        submitted_at: new Date().toISOString()
      };
      TRACK.forEach(function (k) { data[k] = load("cf_" + k); });
      data.landing_url = load("cf_landing"); data.referrer = load("cf_referrer");

      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Sending...";
      store("cf_lead_id", id); store("cf_first", name.split(" ")[0]);
      store("cf_ec_email", email.toLowerCase()); store("cf_ec_phone", "+1" + d); // for Enhanced Conversions, cleared on thank-you page
      var go = function () { location.href = "thank-you.html?id=" + encodeURIComponent(id); };
      var t = setTimeout(go, 2500);
      send(data).then(function () { clearTimeout(t); go(); });
    });
  });

  /* ---------- 6. Thank-you page: conversion + optional property survey ---------- */
  var ty = document.getElementById("ty-survey");
  if (ty) {
    var id = qs.get("id") || load("cf_lead_id");
    var first = load("cf_first");
    var hi = document.getElementById("ty-name"); if (hi && first) hi.textContent = ", " + first;
    var ecE = load("cf_ec_email"), ecP = load("cf_ec_phone");
    if (C.adsId && (ecE || ecP)) gtag("set", "user_data", { email: ecE || undefined, phone_number: ecP || undefined }); // Enhanced Conversions (gtag hashes it)
    try { sessionStorage.removeItem("cf_ec_email"); sessionStorage.removeItem("cf_ec_phone"); } catch (e) {}
    if (id && load("cf_conv_" + id) !== "1") { conv(C.adsLeadLabel, { transaction_id: id }); store("cf_conv_" + id, "1"); }
    ty.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(ty), data = { type: "update", lead_id: id || "unknown" };
      fd.forEach(function (v, k) { data[k] = String(v).slice(0, 500); });
      send(data);
      ty.style.display = "none";
      document.getElementById("ty-done").style.display = "block";
    });
  }
})();
