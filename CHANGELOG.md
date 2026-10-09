# Changelog

## 0.1.0 (2026-10-09)

First version, extracted from the Fitness SF Exerp class schedule QA.

* `defineSignageConfig`: one project per size in si9n.json (1080x1920 and 1920x1080 if it lists none), serves `dist/`, runs tests in parallel, screenshot per test
* Tests run at the first size only, except those tagged `ALL_SIZES` (the layout checks). `QA_ALL_SIZES=1` runs everything at every size
* `mockPlayer`, `mockNetwork` (offline and outage modes), `zonedTime`, `advanceClock`, `box`, `description`
* Layout checks: `expectCleanLayout`, `expectNoTextOverflow`, `expectNoTextOverlap` (and the `find*` versions)
* Suites: `baselineTests`, `layoutTests`, `offlineTests`, `scheduleTests`, `menuTests`
* Durations (`toMs`, `refreshEvery`, timeline `after`) accept only ms (number >= 0), `'mm:ss'` or `'hh:mm:ss'`, and throw on anything else. `refreshEvery` must be more than 0, and `scheduleTests` checks every timeline step when the tests are registered
* `signage-qa-serve` never serves files outside the build folder, and answers 400 to a malformed URL instead of crashing
* Requires Node 20 or newer (the minimum for Playwright 1.63); tested on 20, 22 and 24
* The library's own tests run the suites end to end against a small real si9n template (`test/template`): real si9n-sdk driven by `mockPlayer`, served by `signage-qa-serve`. Each suite must pass on the working template and fail on a template with the bug it is meant to catch
