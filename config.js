/* CHARFIA Funnel - central settings. Change values here only. */
window.CHARFIA = {
  // Google Apps Script Web App URL (receives leads, writes Google Sheet, sends emails)
  endpoint: "",
  // Google Ads: conversion ID (AW-XXXXXXXXX) and labels. Leave empty until the Ads account exists.
  adsId: "",
  adsLeadLabel: "",   // conversion label for "Lead form submit" (fires on thank-you page)
  adsCallLabel: "",   // "Phone click" label: set this conversion to SECONDARY in Google Ads (clicks are not real calls).
                      // Real calls: use a call asset with Google forwarding number, count calls of 60s+ as primary.
  phone: "713-588-5613",
  phoneHref: "+17135885613",
  email: "acquisitions@charfia.com",
  // City message match: /?city=houston etc. Only these values are accepted (no raw keyword insertion).
  cities: {
    "houston": "Houston",
    "dallas": "Dallas",
    "fort-worth": "Fort Worth",
    "dfw": "Dallas-Fort Worth",
    "austin": "Austin",
    "san-antonio": "San Antonio"
  }
};
