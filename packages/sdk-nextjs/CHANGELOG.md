## [1.13.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.12.0...sdk-v1.13.0) (2026-04-08)

### Features

* **sdk:** extract report dialog into standalone component rendered by provider ([49edec6](https://github.com/WebNaresh/glitchgrab/commit/49edec69c9721fef01496719dd422890a17a5bb5))
* **sdk:** render ReportDialog inside GlitchgrabProvider so dialog is always available ([5e92acc](https://github.com/WebNaresh/glitchgrab/commit/5e92acc3e48662540e8bb388ecb09b3fa445d04b))

## [1.12.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.11.0...sdk-v1.12.0) (2026-04-08)

### Features

* **api:** add commentCount to reports list endpoint ([f8a78b1](https://github.com/WebNaresh/glitchgrab/commit/f8a78b1127aae7c61333ad0c4448965cd8b4ffb5))
* **api:** map report type and severity to dynamic GitHub labels and title prefixes ([1b286d2](https://github.com/WebNaresh/glitchgrab/commit/1b286d20cff0418afd720504223ceb27862dad00))
* **billing:** show cancelled status message from live Razorpay state ([6d7eee0](https://github.com/WebNaresh/glitchgrab/commit/6d7eee0f7d53671ec4886c2b997b6cdb27b394a4))
* **docs:** implement Markdown to JSX renderer for documentation page ([c4ba583](https://github.com/WebNaresh/glitchgrab/commit/c4ba5832386b0e837770a2bd91e4712138efae90))
* **landing:** add docs link to navbar/footer and remove pricing section ([4e2bf93](https://github.com/WebNaresh/glitchgrab/commit/4e2bf93d4ed54a4cd1d5efef65f85404509bf72f))
* **sdk:** accept type option in openReportDialog for pre-selecting category ([077901c](https://github.com/WebNaresh/glitchgrab/commit/077901c07697c8c463e91364899c8c125bd9888a))
* **sdk:** add commentCount field to GlitchgrabReport type ([459b6db](https://github.com/WebNaresh/glitchgrab/commit/459b6dbcab26f39a4540dfcc281937311bd23464))
* **sdk:** add documentation links to the landing page ([ca96328](https://github.com/WebNaresh/glitchgrab/commit/ca963288083f8b83706e372ebe18416bd2cce469))
* **sdk:** add multi-step stepper variant for report dialog with category, details, and review steps ([b6d2af0](https://github.com/WebNaresh/glitchgrab/commit/b6d2af0f8c4fc6089a4434fa56c0c74396ffd6cf))
* **sdk:** add ReportSeverity type, variant and showSeverity props to ReportButtonProps ([2e2c31e](https://github.com/WebNaresh/glitchgrab/commit/2e2c31e4b1ac7a64e6ad225767e254bba9afded7))
* **sdk:** export GlitchgrabReport type from barrel ([0446f19](https://github.com/WebNaresh/glitchgrab/commit/0446f1989dc80b77325c8bb873e5af4516ba4486))
* **sdk:** export ReportSeverity type from barrel ([3769c8d](https://github.com/WebNaresh/glitchgrab/commit/3769c8dd24b333baea449485c4abdf30b33f54c1))

### Bug Fixes

* **billing:** check live Razorpay status before creating new subscription ([4ee70ad](https://github.com/WebNaresh/glitchgrab/commit/4ee70ad922edfeeebc29c2be4ad14bc17311e405))
* **billing:** fetch subscription status live from Razorpay API instead of stale DB ([3b6a495](https://github.com/WebNaresh/glitchgrab/commit/3b6a495713c3d1208d501f99105e293e7fde1ce3))
* **billing:** only store razorpay subscription ID on verify, no status ([bd64bf7](https://github.com/WebNaresh/glitchgrab/commit/bd64bf77e2cd9ff35902f310a4c2915974ebbd1b))
* **billing:** revalidate dashboard layout after payment verification ([ed62da2](https://github.com/WebNaresh/glitchgrab/commit/ed62da2b9a47df2d6f4a71c393cef93cc397f856))
* **billing:** revalidate dashboard layout after subscription cancellation ([5b36d54](https://github.com/WebNaresh/glitchgrab/commit/5b36d545abbbfc2dfda16e82031c5c6a367bde9e))

### Performance Improvements

* **billing:** pass pre-fetched plan to getTrialStatus to avoid redundant API call ([2b2cc09](https://github.com/WebNaresh/glitchgrab/commit/2b2cc09fa59d059f845f92ebb903481cfb86e433))

## [1.11.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.10.0...sdk-v1.11.0) (2026-03-28)

### Features

* **sdk:** pass description in openReportDialog custom event detail ([1dbabe0](https://github.com/WebNaresh/glitchgrab/commit/1dbabe03d8e38d646edbe974a82cdaa83c50eb4e))
* **sdk:** pre-fill description textarea from openReportDialog event detail ([c9a047d](https://github.com/WebNaresh/glitchgrab/commit/c9a047d69d0a2b9dc09f21b9d38d4f206eaf1280))
* **sdk:** update openReportDialog type to accept optional description ([826920c](https://github.com/WebNaresh/glitchgrab/commit/826920c02f6b30fe31454b9b9a4f256003f9e32c))

## [1.10.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.9.1...sdk-v1.10.0) (2026-03-28)

### Features

* **sdk:** add openReportDialog() to programmatically trigger ReportButton modal ([280658d](https://github.com/WebNaresh/glitchgrab/commit/280658d8e42cb7786dfee583a29b96153371c4b6))

### Bug Fixes

* **proxy:** add CORS for /api/v1/reports routes used by SDK actions ([2e2ee15](https://github.com/WebNaresh/glitchgrab/commit/2e2ee158d5b23d7613dd20321af61c944f23f2d0))
* **sdk-api:** remove status, rawInput, source, pageUrl from SDK reports response ([951095a](https://github.com/WebNaresh/glitchgrab/commit/951095a5e5028a8425e833ec12d95fe6ca388651))

## [1.9.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.9.0...sdk-v1.9.1) (2026-03-27)

### Bug Fixes

* **sdk:** add session to report callback deps so session data is included in reports ([f244e81](https://github.com/WebNaresh/glitchgrab/commit/f244e818313232cd238855b8a14d73e24de26e9c))

## [1.9.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.8.0...sdk-v1.9.0) (2026-03-27)

### Features

* **sdk:** add useGlitchgrabActions hook with isPending, error, onSuccess, onError callbacks ([b6c700c](https://github.com/WebNaresh/glitchgrab/commit/b6c700c8aacf0939bb0dfd2345451d19940df19d))

### Bug Fixes

* **sdk-report:** remove debug console.log statements ([3f0bf8e](https://github.com/WebNaresh/glitchgrab/commit/3f0bf8efdd018c5db2d53a7f7a62e217610094a5))

## [1.8.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.7.2...sdk-v1.8.0) (2026-03-27)

### Features

* **sdk:** add limit option to useGlitchgrabReports and update README with hook + TanStack Query examples ([cad4ebf](https://github.com/WebNaresh/glitchgrab/commit/cad4ebf530def378ae8302c263a751dc2748582d))
* **sdk:** add useGlitchgrabReports hook and fetchGlitchgrabReports fetcher ([d43822e](https://github.com/WebNaresh/glitchgrab/commit/d43822e7ff9739f6420f0b389e1b43225b28dc4b))

## [1.7.2](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.7.1...sdk-v1.7.2) (2026-03-27)

### Bug Fixes

* **s3:** hardcode cdn.glitchgrab.dev for screenshot URLs ([7d4db8e](https://github.com/WebNaresh/glitchgrab/commit/7d4db8e8093762721f83413dbbab042bec31ad15))
* **sdk-report:** add S3 upload debug logging to diagnose screenshot failures ([46fdc1b](https://github.com/WebNaresh/glitchgrab/commit/46fdc1b7f504120746180cdfcb11ae91e1c7d547))

## [1.7.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.7.0...sdk-v1.7.1) (2026-03-27)

### Bug Fixes

* **sdk:** use www.glitchgrab.dev to avoid naked domain redirect breaking CORS preflight ([bccbbd4](https://github.com/WebNaresh/glitchgrab/commit/bccbbd41d3c762420b468d0aac4ea5f15d591034))

## [1.7.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.6.4...sdk-v1.7.0) (2026-03-27)

### Features

* **middleware:** add CORS for SDK API routes and merge with dashboard auth guard ([ef00849](https://github.com/WebNaresh/glitchgrab/commit/ef008495cb2d508e488dce4305bd317efec0f4ce))

### Bug Fixes

* **proxy:** add CORS for SDK API routes in proxy.ts, remove incorrect middleware.ts ([b872920](https://github.com/WebNaresh/glitchgrab/commit/b872920609bfa7a012adb4cabff38c25bb65e2ee))
* **sdk:** await reportBug response before showing success message ([d9c01b3](https://github.com/WebNaresh/glitchgrab/commit/d9c01b38ac76560ac4680b7a4440e5682c4341ee))

## [1.6.4](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.6.3...sdk-v1.6.4) (2026-03-27)

### Bug Fixes

* **sdk:** default baseUrl to glitchgrab.dev instead of window.location.origin ([976ab41](https://github.com/WebNaresh/glitchgrab/commit/976ab4122f2bade71d632efec21baab4a464d548))

## [1.6.3](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.6.2...sdk-v1.6.3) (2026-03-27)

### Bug Fixes

* **sdk:** render modal in portal to escape host stacking contexts ([eeb58cd](https://github.com/WebNaresh/glitchgrab/commit/eeb58cd28b1d8a672588eddaa8d640f7696a2ac1))

## [1.6.2](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.6.1...sdk-v1.6.2) (2026-03-27)

### Bug Fixes

* **sdk:** max z-index to cover all host elements, fix button colors for light theme ([2c0765c](https://github.com/WebNaresh/glitchgrab/commit/2c0765c0a421f2ca7ee94f5790cad2bb1f289b45))

## [1.6.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.6.0...sdk-v1.6.1) (2026-03-27)

### Bug Fixes

* **sdk:** replace × characters with SVG icons and add isolation to prevent host CSS bleed ([220447d](https://github.com/WebNaresh/glitchgrab/commit/220447d88ef0fcd6aced368d350bf0456aedd288))

## [1.6.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.5.1...sdk-v1.6.0) (2026-03-27)

### Features

* **sdk:** auto-detect light/dark theme and adapt modal colors ([16227a5](https://github.com/WebNaresh/glitchgrab/commit/16227a5051625d547f74ce7611b8262badae0046))

## [1.5.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.5.0...sdk-v1.5.1) (2026-03-27)

### Bug Fixes

* **ci:** enable GitHub Release creation in SDK publish workflow ([7ec3b04](https://github.com/WebNaresh/glitchgrab/commit/7ec3b04f8142336901c34a1e1d13de0f3ae4d96b))

## [1.5.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.4.0...sdk-v1.5.0) (2026-03-27)

### Features

* **sdk:** add changelog generation to SDK release workflow ([9e5650b](https://github.com/WebNaresh/glitchgrab/commit/9e5650badf5d48fcb3cb34f370c493cf263e1ed5))

### Bug Fixes

* **ci:** use GH_TOKEN for semantic-release push and add [skip ci] to prevent loop ([de017e3](https://github.com/WebNaresh/glitchgrab/commit/de017e3d0f3bd09bef100fb9a827398b5e71ea60))
* **ci:** use GH_TOKEN in release workflow and add [skip ci] guard ([c714570](https://github.com/WebNaresh/glitchgrab/commit/c71457071efe92856d8daeab3b901967412c3ffd))
