# CHARFIA Seller Funnel (Google Ads Landing Page)

Eigene Landing Page für Google Ads, für motivierte Hausverkäufer in Texas. Reines HTML/CSS/JS, gehostet kostenlos über GitHub Pages. Design wie charfia.com.

## Dateien

| Datei | Was sie ist |
|---|---|
| `index.html` | Landing Page: Hero + 2-Schritt-Formular, Vertrauensleiste, 3 Schritte, Situationen, Angebotsformel, Über uns, FAQ, zweites Formular |
| `thank-you.html` | Danke-Seite: "Wir rufen in Minuten an", Anruf-Button, optionale 3 Fragen (Zustand, Zeitrahmen, Makler ja/nein). Hier zählt die Google-Ads-Conversion |
| `privacy.html`, `terms.html` | Datenschutz und AGB (Pflicht für Google Ads und SMS) |
| `config.js` | **Alle Einstellungen**: Formular-Empfänger, Google Ads IDs, Telefonnummer, Städte |
| `app.js` | Formular-Logik, Spam-Schutz, gclid/UTM-Erfassung, Städte-Anpassung, Conversions |
| `style.css` | Design (schwarz, Bricolage Grotesque, IBM Plex) |
| `apps-script-Code.gs` | Code für Google Apps Script: Lead in Google Sheet + sofort Mail an dich + Bestätigungsmail an Verkäufer, optional Push nach Close.io |

## Städte-Seiten (Message Match)

Gleiche Seite, Stadt per Link: `?city=houston`, `?city=dallas`, `?city=fort-worth`, `?city=dfw`, `?city=austin`, `?city=san-antonio`. Die Überschrift zeigt dann z. B. "Sell Your Houston House As-Is". Nur diese Werte werden akzeptiert (kein Keyword-Einfügen, kein Markenrisiko).

## Noch zu tun (je 1 bis 5 Minuten)

1. **Lead-Empfang live schalten**: script.google.com, Projekt öffnen (Code ist schon drin) > Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone > Deploy > Zugriff erlauben. Die Web-App-URL in `config.js` bei `endpoint` eintragen.
2. **Google Ads**: Konto als Organisation verifizieren (S3 Group LLC). Conversion "Lead" anlegen, ID und Label in `config.js` (`adsId`, `adsLeadLabel`). Enhanced Conversions einschalten. "Phone click" nur als sekundäre Conversion.
3. **Eigene Domain**: Ein Ad-Konto = eine Domain. Subdomain `offer.charfia.com` als CNAME auf `ibrahimcharfia.github.io` und in GitHub Pages als Custom Domain eintragen.
4. **Close.io (optional, empfohlen)**: In Apps Script > Projekteinstellungen > Script-Eigenschaft `CLOSE_API_KEY` anlegen. Dann landet jeder Lead automatisch in Close, und ein Close-Workflow kann sofort die SMS schicken.
5. **Owner-Video** (30 bis 60 Sek., Selfie) auf der Danke-Seite einbauen, sobald aufgenommen.
