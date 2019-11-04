const { hot } = require("react-hot-loader/root")

// prefer default export if available
const preferDefault = m => m && m.default || m


exports.components = {
  "component---cache-dev-404-page-js": hot(preferDefault(require("/mnt/d/Joel/Documenten/Coding/rooster/public/roosters/.cache/dev-404-page.js"))),
  "component---src-pages-index-js": hot(preferDefault(require("/mnt/d/Joel/Documenten/Coding/rooster/public/roosters/src/pages/index.js"))),
  "component---src-pages-import-js": hot(preferDefault(require("/mnt/d/Joel/Documenten/Coding/rooster/public/roosters/src/pages/import.js")))
}

