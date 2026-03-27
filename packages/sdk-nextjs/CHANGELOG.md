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
