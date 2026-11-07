# Moris: práce na dálku a sdílení

Soukromý repozitář: https://github.com/miroslavreznik/moris

## Na druhém počítači

Nainstaluj Git a Node.js 22.14.0 (verze je také v `.nvmrc`). Přihlas se na GitHub účtem, který má přístup k repozitáři. Potom v terminálu:

```sh
git clone https://github.com/miroslavreznik/moris.git
cd moris
npm ci
npm run dev
```

Otevři adresu z terminálu. Demo s ukázkovými návyky je na `/?demo=1`; používá vlastní databázi oddělenou od osobních návyků.

V Codexu otevři naklonovanou složku `moris`. Zdrojové soubory jsou v kořeni projektu. Složka `sites/moris` vzniká až při přípravě nasazení; není potřeba pro vývoj a nepatří do GitHub repozitáře.

## Ukládání práce a střídání počítačů

Před prací stáhni změny, pokud nemáš neuložené místní úpravy:

```sh
git switch main
git pull --ff-only
git switch -c feat/nazev-zmeny
```

Po úpravách ověř projekt a odešli větev na GitHub:

```sh
npm test
npm run build
git status
git add <soubory-ktere-chces-ulozit>
git commit -m "Popis zmeny"
git push -u origin feat/nazev-zmeny
```

Na GitHubu otevři pull request do `main`. Při pokračování na druhém počítači stáhni také rozpracovanou větev pomocí `git fetch origin` a přepni na ni pomocí `git switch feat/nazev-zmeny`. Necommitnutá ani neodeslaná práce se na druhý počítač nepřenese.

Pro ověření produkční PWA spusť `npm run build` a `npm run preview`. V dalším terminálu můžeš spustit `npm run test:browser`, `npm run test:evolution`, `npm run test:reminders` a `npm run test:companion`. Na Windows používají instalovaný Microsoft Edge; na macOS/Linux nejdřív spusť `npx playwright install chromium`.

## Přístup dalšího člověka

Repozitář zůstává soukromý. Na GitHubu otevři **Settings → Collaborators → Add people**, vyber konkrétní GitHub účet a pošli pozvánku. Pozvaný člověk ji musí přijmout; potom může projekt naklonovat stejným postupem. Změny si posílejte přes větve a pull requesty.

Přístup ke zdrojovému kódu a přístup k nasazené aplikaci jsou oddělené. Pozvánka do repozitáře sama neotevře soukromou aplikaci na Sites.

## Osobní návyky a nasazení

GitHub přenáší kód, dokumentaci a historii vývoje. Osobní návyky, historie a XP zůstávají v IndexedDB konkrétního prohlížeče. Pro jejich přenos použij v Morisu export zálohy a na druhém zařízení import. Zálohu přenes soukromě; neukládej ji do repozitáře. Automatická synchronizace mezi zařízeními není implementovaná.

`npm run preview` používá dočasnou databázi připomínek a čerstvé místní testovací klíče; nevyžaduje produkční tajné údaje. Produkční VAPID klíče zůstávají v runtime prostředí Sites a do Gitu nepatří.

Push do GitHubu automaticky nenasazuje aplikaci. Produkční nasazení dál používá existující Sites projekt a jeho původní URL podle `docs/deployment.md`. `node scripts/prepare-hosting.mjs` připraví kopii zdrojů pro tento postup. Zachovej projekt ID, databázi, runtime klíče a původní adresu, aby zůstala dostupná stávající data a připomínky.
