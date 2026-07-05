## [1.43.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.43.1...v1.43.2) (2026-07-05)

## [1.43.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.43.0...v1.43.1) (2026-07-05)

## [1.43.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.42.1...v1.43.0) (2026-07-05)

## [1.42.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.42.0...v1.42.1) (2026-05-25)

### Bug Fixes

* **mobile:** remove unnecessary type assertion and unused eslint-disable in _layout ([d027d35](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d027d351651300edb7ed7b3d9770a7a687ff5dcd))
* **seo:** suppress hydration warning on meta date in InnerPageHeader ([e84ff2f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e84ff2f90226b3bf666391d1f2bfb1ae40b1d9ce))

## [1.42.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.41.0...v1.42.0) (2026-05-25)

### Features

* **app/dashboard/seo:** update gsc property last sync date to display in US locale ([20dba73](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/20dba73d3e135bec6ff0eb7fd30c15076b70de3a))

### Bug Fixes

* **apps/mobile/app/_layout.tsx:** initial implementation of media library listener ([1427577](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1427577adfcc38fb4e189859d73810fddaecfe4d))

## [1.41.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.40.2...v1.41.0) (2026-05-25)

### Features

* **app/api/v1/gsc/reindex:** record reindex action in the indexing-history timeline ([8520010](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8520010358d04bcd48c1914f86b6f82ead0248d1))
* **app/mobile:** update Expo Share Intent for image sharing ([a41cf8c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a41cf8cabcb90e17ce9cccb1d2fe22504fed4ad7))
* **apps/mobile/package.json:** upgrade react-native to 0.83.6 ([6455036](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/645503627090b6d446e6f9469d93d11fa87ce922))
* **seo:** clearer sync/reindex feedback and indexing history chart ([313ebc3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/313ebc305ffcc64b44c32cb9109123da2bc6ce28)), closes [#219](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues/219) [#219](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues/219) [#218](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues/218)

### Bug Fixes

* **app:** add share intent filter for image support ([51f232a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/51f232a91e811b3d7acc69670bb1cccbc74f034e))
* **gsc-properties:** update sync and reindex mutations to use useMutation with custom options ([0a815ba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0a815baefb4be886ff9d1b5012fc001dd2e27ea8))
* **mobile:** update start scripts for improved local development experience ([d33ee24](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d33ee24afcb06cb1ea88ed563fdd26933c7c7efa))
* **package.json:** update dependencies to support new versions ([6d019a9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6d019a93b3592452338885ed0c3a27494fb02b31))
* **package:** add --clear flag to dev script for improved iOS build process ([8212b12](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8212b128422834538f4a9282c93fae5494a0e98e))
* **props:** add indexing history chart to SEO detail page ([3b778de](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3b778debd41a63a1dc2fc055c2ad0d68c797e43c))
* **props:** record sync in indexing-history timeline ([b9aacdf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b9aacdf40220f69be28b0338fd7838e791e0a189))
* **route:** add dynamic property and handling ([9433a48](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9433a4808b020f7c624092b5d38b98a2531e9b4c))

## [1.40.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.40.1...v1.40.2) (2026-05-23)

### Bug Fixes

* **sdk:** drop opaque cross-origin errors with no error object or filename ([ed88c71](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ed88c71acec2985240e62aaedfdc513ffb36ee60))

## [1.40.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.40.0...v1.40.1) (2026-05-23)

## [1.40.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.39.1...v1.40.0) (2026-05-22)

### Features

* **.mcp.json:** add expo-mcp server configuration ([1d87ab7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d87ab79145dc535f440fb7dcf2ff3a8fcf878cc))
* add metro.config.js for apps/mobile ([54bbbff](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/54bbbffb09f6b9d84b0f546ae9a71be123fee4b7))
* Add ReportCard component in mobile app ([d255b34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d255b348fd2c564d416bff164d72763703e9a480))
* add useGlitchgrab hook ([77922b6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/77922b61c616d4eb80a103a5b13bbcd6fe2e824d))
* **api:** add logout listener to handle 401 responses ([7b9cb0e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7b9cb0ec388eca2bec7f600db1797e2b5a7bb3b1))
* **api:** update getBaseUrl function ([9f840dd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9f840ddef79a9b5c1c1de49fa803e64cc7c055c1))
* **app/_layout.tsx:** add screenshot detection and bug report sheet ([c71a627](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c71a6272890a834d9430a796ab007951d72a9bda))
* **app/auth/login:** add logo image ([bcb65a1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bcb65a19cbe27074f1090d6051deacbee9c6e13c))
* **apps/mobile/app/(tabs)/chat.tsx:** Add chat screen with report submission form ([650f227](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/650f22770e0c4994d434e692c16ccbd4c2ccd23c))
* **apps/mobile/scripts:** remove sourceURL for bridge in AppDelegate.swift ([878d9de](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/878d9de752f57eaad4c25bf297e4c667481cd4ba))
* **apps/mobile/src/contexts/AuthContext.tsx:** add logout event listener ([cef6164](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cef616419f9ca35cf1334d6f4f12ebf8d2d542a7))
* **apps/mobile/src/hooks/use-repos.ts:** add useRepos hook to fetch repos ([4b67947](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b67947ff7b7b9d7c945e6032595fb428826c4a0))
* **apps/mobile/tamagui.config.ts:** add Glitchgrab brand colors for Tamagui configuration ([839787c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/839787c2b504bc7472f19239737037c023e1da5f))
* **apps/mobile:** add babel config for mobile apps ([232adf9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/232adf915a2db465b4f9cc550dfe069b33a337c9))
* **apps/mobile:** add module-resolver for babel configuration ([8677d49](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8677d4920567f67417dc68985f93a28cb8a67dcc))
* **apps/mobile:** add vector icons dependency ([ed86ca4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ed86ca429bd22cf06ac1735fc11d1d8bb12a5bc3))
* **apps/mobile:** update dependencies ([ceaec88](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ceaec88ff00812dbe952b3d4c08ae3d5dff481cc))
* **auth:** add AuthLayout component ([434fd23](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/434fd23dc2c0887fb90023b629c9101889d90ad7))
* **auth:** Implement login functionality with GitHub integration ([ea23faa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ea23faa20959bb43f8a5a82f2df73f4ece0d0eaa))
* **colors:** add new colors constants ([a15d223](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a15d223fd0b368f5a995e9b883754e03d7c81f6f))
* **config:** update animations type and cast for rc.7 vs rc.42 AnimationDriver types ([194679f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/194679fefc813f62098ad842285bf65c297e3c74))
* **contexts:** added AuthContext for managing authentication state ([d5a85b3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d5a85b3fe1825376211070ce076ebba4a0231b08))
* **docs:** add Glitchgrab bug capture SDK for Expo apps ([b7a6a72](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7a6a726e5a359aa48db6f0838bf79ee887f9313))
* **images:** add image size constants ([0045235](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0045235bc8eba6e24ea4781ef7ed850867c18a22))
* **lib/api:** add BASE_URL environment variable for API URL ([159c4fc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/159c4fc3fa387cd252e5b2f61d6c01b467c521cf))
* **lib/secure-store:** add secure storage functionalities ([ea20239](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ea20239e302287cda809230e9d33dd037377d057))
* **packages/sdk-expo/src:** add `useGlitchgrab` hook for interacting with the glitchgrab service ([ec89b3d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec89b3d9e10c55893d42fd713b92dd32a99e4812))
* **reports:** add useReports and useReport hooks for mobile app ([90b444f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/90b444f62b7c13843503af912aa265d65870bc9a))
* **sdk-expo/tsconfig.json:** add default tsconfig.json ([b2d0072](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b2d00728b55b771987d9c82478092b8880a060b1))
* **src/BugReportSheet.tsx:** Add bug report sheet feature ([17367b9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/17367b95bc69c431e57e2eea25d8ac5a20526189))
* **tabs:** add home screen with stats and recent reports ([a869bf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a869bf677f515a32cb06606f44e063e24b531d22))
* **tamagui:** upgrade packages to rc.42 ([0d3127b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0d3127b418f999be6dba59ae3572d1eaeaa01b39))
* **types:** add types for mobile apps ([b51b42c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b51b42c5080faff9aa0d093752b0405ddfcc44ee))
* **ui/LoadingSpinner:** add loading spinner component ([1b9eb79](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1b9eb79874db7c44243dd966a470d01081e5cc58))
* **ui:** add EmptyState component ([711f8cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/711f8cfaf547c4e8a24a50481bbb533a707b62c0))
* **useScreenshotDetection:** added dynamic screenshot detection functionality ([fc21367](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fc2136733541b27b331d6e183571641150097534))

### Bug Fixes

* **.gitignore:** add tamagui auto-generated style cache ([6bc7a42](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6bc7a425332cf9e4d5f2f6273b1164d85ba54718))
* Add context for Glitchgrab configurations and user state ([5b4a295](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b4a29594fdcbb305549e4e6015f0f8eaf997961))
* add report detail screen ([cbc53b1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cbc53b17c761e410ebfd3e718a509ac937572c94))
* **api:** add API endpoints for mobile device interactions ([8299f1b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8299f1b66a17b96285fb1cd081aa37372b59fd10))
* **api:** add submitReport function to sdk-expo ([a097b8c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a097b8ce35b1ac9e3a9c4ae3a20ee500ff11e45e))
* **app-delegate:** remove extra line in AppDelegate.swift ([0a6ff21](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0a6ff2133c7d8aaac42754edb83fab350600b29c))
* **app.json:** add permissions and base_url ([d25656e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d25656eac5d9b86291297addf3b45c1eb3e5e5af))
* **app/auth/login.tsx:** add logo and improve styling ([b6e710f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b6e710fbd5066c1eb11f65684ac73bdc22c05bb6))
* **app/auth/login.tsx:** update logo icon ([eff27ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/eff27ac7ee4ba9516cf469abc327a8c635ab9272))
* **app/mobile/app:** add Index component ([f00d0cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f00d0cfa7dcbc5475191300a1a7dd9735c988b53))
* **app/mobile/eslint.config.mjs:** add patches, plugins and scripts directories ([d818c01](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d818c018c3741a1a31bdfe5657880ae6d024df90))
* **app/mobile:** update dependencies to use expo-router and tamagui ([b2bd486](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b2bd486edb8677ad2ebb4b8909fda1cc0abe2bff))
* **apps/mobile/app/(tabs)/repos.tsx:** add new repos screen ([096163a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/096163a6ea132bde6be69061cb2c90823751786d))
* **apps/mobile/package.json:** add babel-plugin-module-resolver for module resolution ([05d2527](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/05d2527be2e7aee05fd56fc4ce16c14d72f01186))
* **app:** upgrade Tamagui version ([978e3f3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/978e3f3061c15c01d773619cb94fbb0a26739a31))
* **auth:** update login form UI ([14b195c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/14b195c3df71881785f9b1c22b428e843b7847a0))
* **babel:** update react-native-reanimated/plugin dependency ([3f36a17](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3f36a17ec96c632f603a61315024d59125fa2617))
* **bug-chat:** remove unnecessary padding in top context bar ([beab1e1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/beab1e1089376e3527be2f1befbd5d0ffe9ff395))
* **capture:** add dynamic capture and readUriAsBase64 functions ([d3faba7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d3faba791c67d43f13f864bcdba339d32f5d775c))
* **chat:** Add chat screen with type selector, repo selector, description input, and submit button ([3a07262](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3a07262605c2d5624d38e08a50064616e2a94a39))
* **components:** add bug report sheet component ([21e8448](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/21e844801bb016e5397d93bc214c2f9eab59ee38))
* **config:** add tamagui.config.ts for mobile branch ([093671d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/093671d55478530b734deb145585f91487ea406f))
* **config:** update Tamagui config to match rc.7 and ensure type safety ([9d45a1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9d45a1c6212b1e1363f3d4d381d06510d870f20f))
* **eslint.config.mjs:** refactor ESLint config to use TypeScript config and plugins ([d531627](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d531627895709c4cafe70af90bd2c6c6c7f037a7))
* **expoConstants:** add `APP_ENV` and `hostUri` to ExpoConfig for API URL ([44c0717](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/44c07175f78adc277afd68414ee5300df43a1872))
* **hero-terminal:** implement logic to reset line count when cycle changes ([886454f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/886454fe576087e6937f61e8fc45e51210a5aae4))
* **index:** update expo-router entry import ([06611a7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/06611a7c96cd1db1c0a73868d30a572c5cc6941e))
* initial commit of SDK-expo ([c0320cd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0320cdad9168516d396ccbd1f5924772cb22cd5))
* initial implementation of GlitchgrabProvider ([00e408a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00e408a3b9df883f2b5e2ee527317dad5e74c291))
* **knip.json:** add project and ignore dependencies for mobile app ([978e054](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/978e0540bd8aa5936776400c4f1de24b3570ff02))
* **metro.config.js:** patch resolveRequest to handle specs_DEPRECATED/NativePlatformConstantsIOS ([e7eb262](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e7eb262eb138088b44b370b913f859d99aa727b5))
* **metro.config.js:** patch specs_DEPRECATED/NativePlatformConstantsIOS.js for RN 0.83 ([59cfaf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/59cfaf60539f7d475a7c701238c8254dc12a6a9f))
* **NativePlatformConstantsIOS:** add lazy proxy for TurboModule ([8d44f6f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8d44f6f5caf30acea1d5d8374514d0d80887a0ec))
* **package.json:** update development build steps to include node script and port option ([e2066b2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e2066b25854625f469dd1d948ebf5c93ca0d78cf))
* **provider:** ignore cross-origin script errors ([54339ba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/54339ba392d695e539751410f3cf33c54589e6cc))
* **reports:** add button to filter reports ([2b24950](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2b24950cdba33aea4b9aee51155da72e11facbc8))
* **settings:** added settings screen and components ([40b3f3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/40b3f3e3383577ad1070ce0736e72d5a7e1c7831))
* **settings:** update sign-out button and header ([6e8ac9b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6e8ac9b0ddf7d9bf3ce9dfe3aa8abec5b4ff9441))
* **table:** add missing class selector ([bfe3a8a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bfe3a8af8be1a7d590521a863cd3e1a1bb5b914f))
* **tabs:** add mobile app tabs layout ([0b25ad3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0b25ad37521d7ec771e83c9ef7c10c417c3e0003))
* **tabs:** update tab icons to improve visibility ([51956da](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/51956da5fe58ad313e85f155e3ec78ff5a698e3f))
* **tamagui:** update _layout.tsx to use new Expo Router and AuthContext ([f4b00d9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f4b00d9bd7ae4850331dcbaae77932651ae43c7b))
* **test:** filter out 'Script error.' from error events in GlitchgrabProvider ([74bd130](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/74bd130ae2012a6295094775c402b9775bb138cb))
* **tsconfig:** add baseUrl and paths for source files ([5c9c25c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5c9c25c7a25737d920c00e7096c27359469c88a0))
* **types:** fix missing types for `User` and `Repo` objects ([14dda40](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/14dda402d71de5165d4c8e3550f4689ec67e8a36))
* update app.json for glitchgrab scheme ([2c811da](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2c811da48294476da0a1d1c140f6fc384580f6d9))
* update dev script to use localhost instead of 0.0.0.0 ([a87da39](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a87da39e57fb0b44cb3879f1453973aba80d66ca))
* update dev script to use REACT_NATIVE_PACKAGER_HOSTNAME ([e782a5c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e782a5c62d0a6a7195e2a011d2caf61deb1f4bb6))
* update tsconfig.json to include App.tsx and src/api.ts and src/screens ([ef3bbe1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef3bbe1b9b6737f20f18eb1e9cd0ba05a3b48df6))

## [1.39.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.39.0...v1.39.1) (2026-05-20)

### Bug Fixes

* **org-bottom-nav:** use full-page nav in WebView to prevent removeChild crash ([8800424](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/880042413dc0d8295da817ba29d0791383c0c19b))

## [1.39.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.38.0...v1.39.0) (2026-05-18)

### Features

* **gsc:** expose cached notIndexedPages in properties list ([c333caf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c333cafd7dcb1ee67e5cc009f5a46c79a5ea13ff))
* **org-overview:** embed not-indexed URLs in Page Issues copy prompt ([f658b29](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f658b295dcc693e99686a37ff9287e40c30d6aa7))

## [1.38.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.37.0...v1.38.0) (2026-05-17)

### Features

* **org-overview:** add Connect GSC button and dialog to SEO panel ([5ffc08d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5ffc08d45525b371df2a8f6ee523a4e53f6627cc))
* **org-overview:** add sync functionality for GSC properties with user feedback ([1d57d67](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d57d67877015e014837d0f24bb302b4ac9decde))
* **org-overview:** add sync progress bar visibility during syncing ([778e43c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/778e43c2ca7c28d6d7690b3f77d5a698eea02b76))
* **org-overview:** enhance sync and reindex button functionality and visibility ([1d8236a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d8236afbd9bd6a9f0e71499b37d977574d1c355))
* **seo:** extract reusable ConnectGscDialog component ([907881f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/907881f6dc39a9af914222812df3c5e4df610fff))
* **sync-progress:** add sync progress bar animation and styling ([ed3c690](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ed3c6907a68bc2b5dabe7851adfb309bee4bcfff))

### Bug Fixes

* **org-overview:** adjust layout of SEO panel for improved responsiveness ([74f6b07](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/74f6b070f9a16c763579294198b55c206faaed13))
* **org-overview:** improve SEO panel layout and sync button visibility ([1f3f3d4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1f3f3d4c906b76614b1d526b993c92bb1ca75377))

## [1.37.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.36.0...v1.37.0) (2026-05-17)

### Features

* **gsc-property-detail:** reorganize stats section for improved layout and clarity ([24d8e75](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/24d8e75e77963dcb17398580952815395b585738))
* **org-overview:** add SEO panel with GSC properties and indexing stats ([02f9b84](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/02f9b84569819ecc721b87a451ed1401b93ca2df))
* **org-overview:** enhance SEO panel with site domain extraction and health prompts ([b4722c3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b4722c387d6a8b3d7c487f65e03680b2230c2f5c))
* **org-overview:** implement health check for favicon and OG metadata with improved prompt handling ([51fc08a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/51fc08a1d049adc6ba1f898452d7b57c8f9520e4))
* **org-overview:** refactor health check logic for favicon and OG metadata ([4da4c79](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4da4c794c2f12f5e54a546aa86ec29eb32c55baa))

## [1.36.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.35.0...v1.36.0) (2026-05-16)

### Features

* **org-overview:** skeleton for member commits loading + +N repos hint in triage chips ([bad97e7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bad97e7199767d1d28c59d12d6b5280f3fc24887))

## [1.35.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.34.0...v1.35.0) (2026-05-16)

### Features

* **member-stats:** add PRs-created-today per repo to member activity ([c5a7d61](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c5a7d615c2ca4bc94badf92190b270bb161fa432))
* **org-overview:** show PR count with icons in team panel member rows ([1bdd8a5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1bdd8a50882f0c4f3bdfc25d65ec1de82e2d93d6))

### Bug Fixes

* **ci:** add legacy-peer-deps to unblock semantic-release npm version step ([c63e0eb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c63e0eb616c02faf1356bb3b85d66e855ced6c08))
* **ci:** replace workspace:* with file: protocol for npm compatibility ([4195dd9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4195dd9613a2693229c9407d0462c8fc2acf7c2d))

## [1.34.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.33.0...v1.34.0) (2026-05-16)

### Features

* **web:** add IssueRow component for improved issue display and link copying ([e7fc939](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e7fc939c51ce792818167ae5e1efc02373720cca))
* **web:** add repo filtering to OrgIssuesTriage component ([d5e1d9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d5e1d9c3aaddd87dcd54ed7d247f0ca8efd9176e))
* **web:** enhance issue fetching by linking PRs to issues ([575d409](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/575d409472395fdae8bebc382641e9201a57fa0d))
* **web:** enhance IssueRow for improved link handling and styling ([8198640](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8198640dde9056b61907a1ee39543091cfd46aa2))
* **web:** implement repo filter popover for issue triage ([34e652f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/34e652f52f6960d601600487d93ec569ce655d53))

### Bug Fixes

* **web:** extract token const to satisfy TypeScript narrowing in issues route ([005ed9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/005ed9c1b0e5e29099e7b806e99d5d53df828b92))

## [1.33.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.32.0...v1.33.0) (2026-05-16)

### Features

* **web:** include CI check state in org PR list endpoint ([3324939](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3324939037c2862038c043aae03dd094ac334784))
* **web:** show CI check badge on org overview PR list ([317f7c8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/317f7c866ba6acd78a3727ec1246d72d328f3afc))

### Bug Fixes

* **web:** allow team panel repo list to wrap instead of truncating ([195fc4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/195fc4d656f114259e28f7c955e7a249137806a7))
* **web:** show all repos in org team panel instead of slicing to 3 ([01bb2ef](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/01bb2ef46082e08121e73f691563326aed7f6fd5))

## [1.32.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.31.0...v1.32.0) (2026-05-16)

### ⚠ BREAKING CHANGES

* SDK_AUTO responses no longer return status='PROCESSING'
— they return the created issue inline.
* response no longer includes intent variants
(update/close/merge/clarify); always returns intent='create' or an
error.
* The AI pipeline no longer mutates report content.
Issue titles, bodies, labels, and severity are derived deterministically.

### Features

* add AI enhance button to dashboard chat composer ([a15687a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a15687a919d90de32155458028b99301403b6d60))
* add ai-enhance lib for polishing user-written text ([2cf29ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2cf29acac8df22d2e946148a76f83da2f9d00487))
* add POST /api/v1/ai/enhance-text endpoint ([61bc7a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/61bc7a2862078ce5127d08de55cf80f23f876d09))
* dashboard report endpoint creates GitHub issues directly ([080dd70](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/080dd706671293a0e347da2fce0b2e2229bdb918))
* remove AI enrichment pipeline ([6a6f1cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a6f1cfaf5c318f6033d03b8c2bb457062b4bea5))
* SDK report endpoint creates GitHub issues directly ([4af2a6c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4af2a6cb2d1ef3d6317bacffafe59f5e5121c805))
* **sdk:** add AI enhance link to report dialog description step ([9e33d1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9e33d1a76324072de78b01897bd20ee99051da8e))
* **sdk:** expose enhanceText helper on useGlitchgrab ([074ca87](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/074ca87143e4399c2631908675c1c4848c40235a))

## [1.31.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.30.0...v1.31.0) (2026-05-16)

### Features

* enhance commit counting by utilizing GitHub search API for deduplication ([f69ec0d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f69ec0de5301e9d3d59249a8d4bec85886a38802))
* optimize commit counting by using GitHub search API for deduplication ([275f707](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/275f7071807f000dd6be882f56bb4c4e366611fe))
* **orgs:** count commits across all branches in member-stats ([35559ed](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/35559ed18390e2e5348dd76b7eee776e32c14374))
* **orgs:** count today-activity commits across all branches ([34b43a9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/34b43a94df3ce0370b439cdacd30909b89489478))
* **org:** show contributing branches in repo tooltip ([e643345](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e64334509c02f8535645c964894f9f6ab329b408))

## [1.30.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.29.1...v1.30.0) (2026-05-16)

### Features

* **seo:** add favicon proxy route with apex/www fallback ([f6270cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f6270cf3d9ab237a8b1cba9b81288aec8cd73c4e))
* **seo:** consolidate favicon and Open Graph issue handling into a unified health prompt ([8f66704](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8f6670480eb7f9a701bf34edefc0d0195925df82))
* **ui:** add button for previewing Open Graph image in GscPropertyDetail ([a96d5bc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a96d5bcc2fa752431839f0bff98c5c0745e7c6e1))
* **ui:** add favicon preview functionality with dialog display ([84177bb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/84177bbc3321045d4483df126b72c1f9c6f04e4f))

### Bug Fixes

* ensure ogImage is correctly typed as string in GscPropertyDetail ([27c1d7b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/27c1d7b88762d21a5b5d38cfc6cd3a9f6ed15eb6))
* **seo:** use favicon proxy so 404 fallback to Globe works ([52ba745](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/52ba74511671ff374158013d97e5db91e140fcc4))
* **web:** add 32x32 size to favicon.ico ([a0edb1f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0edb1fd47b38ad3ed3a355c505bf23ddd9bfee1))
* **web:** declare 32x32 size on favicon.ico link tag ([c0916ad](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0916ad24e44f13b9bc9ec7ac037e4cfd7ebf9b6))

### Performance Improvements

* **web:** compress og-image.png below 300KB for WhatsApp previews ([af7cf4f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af7cf4f5902df2324249969642d7b8716b9ce29f))

## [1.29.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.29.0...v1.29.1) (2026-05-15)

### Bug Fixes

* **seo:** switch favicon API to gstatic faviconV2 for reliable display ([4b4efaa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b4efaa2ab10666ce751f7034b082add63e417b2))

## [1.29.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.28.0...v1.29.0) (2026-05-15)

### Features

* **api/orgs:** add GET /orgs/[slug]/pull-requests endpoint ([205df7a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/205df7a6ee10a006ec20dbb5d15be967b83eba46))
* **org-overview:** add open PRs tab with workflows fallback and skeleton loading ([7daaeec](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7daaeec368f4464ead073998094f2922d4f9b163))
* **org:** add member-stats API — today commits per GitHub org member including pending ([5a0e548](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5a0e548b5a0034a00ccbb9c93b3af9742c545b7c))
* **seo:** add skeleton loading for GSC properties list page ([ca55d37](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ca55d370a9ec14db9cc29d0a271de2857660034b))
* **seo:** add skeleton loading for org SEO properties list page ([69b7f8f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/69b7f8f608bd4dfb4ad12a8b0c56cfe53a66a2c8))
* **seo:** add two-column skeleton loading for GSC property detail page ([075d76d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/075d76d0fd70acc90357743f5c81367e97a57558))
* **seo:** add two-column skeleton loading for org GSC property detail page ([8b070bc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8b070bcdee566f2dfd69a0729035b9934d290571))

### Bug Fixes

* **active-workflows:** replace spinner with skeleton rows on loading ([b9db3d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b9db3d2179382c2e0d839d4d6099485079d57b13))
* **github-contributions:** replace spinner with full 52×7 skeleton heatmap grid on loading ([53115f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/53115f5700c29bc58890c0f1cb0d2d7451b0d187))
* **github-contributions:** update skeleton component styling for consistency ([53798c5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/53798c57a404e080762baa362a2f89940d963fa1))
* **member-stats:** remove export from internal-only interfaces to satisfy pruny ([3902789](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3902789b8576290aa680499b7dc5c0c41ae9619f))
* **org-overview:** shrink PR panel skeleton to prevent layout shift ([3792416](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/37924162eb375725e59dabbaf08cc8ff8487eb00))
* **overview:** replace Math.random in render with static height array for skeleton bars ([99841db](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/99841dbe22871b811811e88b4dc858be0e11f495))
* **seo:** pass detailHrefPrefix prop to avoid hardcoded /dashboard/seo link in org context ([a4ed37c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a4ed37c1b7923ea1e120eb1135c39e21f0221cbc))
* **seo:** replace circular spinner with skeleton in dashboard loading fallback ([10a60b6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/10a60b6ffdb47fcb5eb6ad3f310452cd87c87f8e))
* **seo:** supply detailHrefPrefix to GscPropertiesClient in dashboard ([462d380](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/462d38087601786d8422f0bdfd43b94092b62ab6))
* **seo:** supply org-scoped detailHrefPrefix so property links stay within org routing ([bcfd93c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bcfd93c201b164fa36a257201ae330b7eb08d1bb))

## [1.28.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.27.0...v1.28.0) (2026-05-15)

### Features

* **ai:** add sessionInfo field to AiInput for reporter context ([43a54b9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43a54b9db1925e5b53b61717f873f2aeb865e1ed))
* **analytics:** add analytics and SEO sections with visual insights and management features ([29aa353](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/29aa3532cd26527f83aa53fc5135aa69df7b35fa))
* **analytics:** compact 2x2 stat grid + chart side-by-side, fix tooltip headroom and x-axis labels ([75b1794](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/75b1794a7e3aa84a1bb34950c5d142710814c1c4))
* **analytics:** enhance hover overlay for closed issues with detailed repo counts and improve layout spacing ([dbac746](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbac74607e6c3ced2de8454f6befc11d0ee6ed14))
* **api/orgs/members:** POST invite sends email to pending member with GitHub sign-in link ([d4e28d9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4e28d96ebb2d47c00f65ab4cd18a6b0d26df265))
* **api/orgs:** add GET my-github-orgs endpoint to fetch user GitHub org memberships ([bb096b4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bb096b423bcab1f5930817376df2fa6299fa0485))
* **api/orgs:** GET and PATCH member repo assignments, OWNER-only write access ([52bc798](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/52bc7989739b253b0f377f2ad2a87e8d4f49ebba))
* **api/orgs:** GET members merges GitHub org members with DB state, shows pending for non-signed-in users ([f29f6b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f29f6b861f440be9b81efa33515d16ffc8bd42f2))
* **api/orgs:** GET org by slug with members and repos, verify requester is a member ([1c90d86](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1c90d862e6b16ac8934dd2c36331e07a93737672))
* **api/orgs:** GET own org membership, POST create org with GitHub org login and auto-sync repos ([1caccbc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1caccbce885c457ddd186ff92f1e9116dfa7e3d9))
* **api/orgs:** POST sync-repos pulls all GitHub org repos and upserts them into DB ([7d7b556](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7d7b5565021cfe101d4298fe6f12eb338c121153))
* **api:** remove collaborator accept endpoint ([a08b5d4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a08b5d480ec7a992ce71fd37867d38c50e06dbe3))
* **api:** remove collaborator invite endpoint ([ccf7568](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ccf75684a788b0062437346333c414e74d0f68cd))
* **api:** remove collaborator repo access endpoint ([980c480](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/980c480b8d2d0320140a34284f8b557a1d1b4630))
* **api:** remove collaborator revoke endpoint ([e6a6ca5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e6a6ca53660286043af5c74ff2efa80c8b30e449))
* **api:** remove collaborators list endpoint ([cd172b7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cd172b76376008b351e6506527a3d281647d0d62))
* **assets:** add bug-report.webp — converted from PNG (312K → 49K) ([72b068c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/72b068c65d0b68d33a965a51d9675adb9d7125d2))
* **assets:** add chat.webp — converted from PNG (97K → 28K) ([723cb1b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/723cb1b19a46335d124e3b62696c87d982d2e40f))
* **assets:** add dashboard.webp — converted from PNG (171K → 54K) ([07bfa2f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/07bfa2fe3e1ef6c12f2994d1cfea509f381e97bf))
* **assets:** add repos.webp — converted from PNG (153K → 47K) ([0b7a4a3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0b7a4a3e21ec27a6d7bd23eeac0a9f0afa21f480))
* **auth:** auto-assign org repos to MEMBER on login using their GitHub token — no manual assignment needed ([ef72a5d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef72a5dd5f79dc8915f52efb115e2aced56ad664))
* **auth:** auto-detect GitHub org membership on login and upsert OrgMember with correct role ([65f0800](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/65f0800391b634c1fc16324ea53735d7717e86c1))
* **auth:** use GitHub org membership role (admin→OWNER) instead of ownerId comparison ([e244d3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e244d3e699df26b24f0310fca78e61416aeceb68))
* **collaborate:** remove collaborator accept page ([be66296](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/be6629667fe273a7c42ad728e2a36c841c2b5bed))
* **collaborators:** remove collaborators dashboard page ([aa17abd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aa17abda2d786ae518c640d9ed43dfd416d7f2d0))
* **collaborators:** remove edit repos dialog UI ([9c2b610](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9c2b610f65a5806e54882ff6e09ddb1d6bb2997b))
* **collaborators:** remove invite dialog UI ([f8aa6fa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8aa6fa69e0c663f00f6157973a69616c8b96084))
* **collaborators:** remove revoke access button UI ([9130134](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9130134430cbc774f7102196f3554a25a0026b8a))
* **compare:** add Glitchgrab vs Linear comparison page with table, breadcrumb schema, and canonical ([6e6846f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6e6846fd0945941d46c0d781a81198a8a75cf501))
* **compare:** add Glitchgrab vs Sentry comparison page with table, breadcrumb schema, and canonical ([38b3996](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38b39960159067f19a079d1d951b87a1472c3a60))
* **dashboard:** redirect org members away from /dashboard to their org path ([d54a8db](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d54a8db22215d1a51c2159d1a2fcdee7710c550a))
* **dashboard:** redirect org members to their org on landing instead of personal dashboard ([e3d42d3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e3d42d3828fe16590e4f91b44aef866d111bd619))
* **enricher:** include all context in GitHub issue body — full error, stack, breadcrumbs, reporter, environment ([213ad96](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/213ad9678d869926ef878bf62a7d5abcfb82df18))
* **footer:** add About link to Resources column ([eac7f8b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/eac7f8beab8b99f42c3f3a30de74821b819cf2ed))
* **footer:** add vs Sentry and vs Linear comparison page links under Resources ([8767b7f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8767b7f4bffa0f8f0f707b78b2d7bc0033bfec58))
* **github:** add getGitHubOrgMembers helper to fetch all GitHub org members ([ec6a660](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec6a660f6a9540aaad825558c14248220942fdd7))
* **github:** add getUserOrgRoles to fetch real org membership roles from GitHub API ([814750f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/814750fbabbbb39321d917a05b5703ca05b06436))
* **github:** add getUserOrgs, getOrgRepos, getGitHubOrgInfo, getGitHubUserLogin helpers for org integration ([5f08405](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5f08405f9021d18b8f10c4aabe78e4991ea32c72))
* **gsc-property-detail:** integrate Skeleton component for loading states in indexing and favicon sections ([d639441](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d639441ffe74a22831c44f22ae238546ad0287bc))
* **gsc-property-detail:** refactor UI with icon buttons, tooltips, skeletons, sync/reindex in card header, and repo picker in page header ([c4de9ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c4de9abba156e8591d688d2944b898473c8ca915))
* **gsc:** add Google Search Console section with indexing health report ([0fef507](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0fef507ff0851134cda3a196d77c3e536a26f503))
* **homepage:** replace tagline H1 with keyword-rich text and add trust bar between hero and features ([6ff342b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6ff342bfa2fc5fbe991836a80fd5720c95cdb81e))
* **landing:** add version badge in nav, dashboard/chat/bug-report/repos product screenshot sections ([49b6767](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49b6767f0c0ad0f6a119d46ac9d610f63b631cff))
* **landing:** replace pipeline boxes with 3-card vacation dev story workflow ([7ac29dc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7ac29dcd63b3080ab2d138735bbee6fec4d875aa))
* **layout:** wrap app in TooltipProvider for shadcn tooltip support ([5bf8dfd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5bf8dfd9df3e6e845b7b1c3003bf8faf140b0f9a))
* **legal:** replace simple header with shared PublicNav for consistent navigation ([23a7509](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/23a75092abe1c820b0a8911ce76986c1c0567174))
* **lib:** remove collab-auth cookie session module ([972a6ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/972a6accd7b019af8387141383f254f276b0b890))
* **login:** redirect org members to /org/[slug] or /org/[slug]/chat based on role after login ([a4ae3a8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a4ae3a88a161807999f98079ed76aa9725757ee6))
* **mail:** add sendOrgMemberInvite email to invite pending GitHub org members to sign in ([db9d006](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/db9d006e455c036bd12b24ee7de0ac5234015265))
* **meta:** add analytics screenshot WebP for landing page ([bb461c5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bb461c5e076136a61f36839ed4e60f7a3c57e007))
* **meta:** add issue reports image for enhanced visual representation ([a078999](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a07899949ff2e29c208e9ffc6728f1dbbcbf9bc2))
* **meta:** add SEO screenshot WebP for landing page ([00ad58f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00ad58f7671d556a1024e26b7ff6e99380046dc3))
* **migration:** drop OrgMemberRepo table ([2778854](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/27788547e71a7ece1544c3170a07e2c413b25a19))
* **nav:** add PublicNav shared component for consistent header across all public pages ([c3ce405](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c3ce405dd6dec0ae0ee85a97175dfb8f9ac26990))
* **org/analytics:** guard MEMBER access, redirect OWNER to /dashboard/analytics ([1eba167](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1eba1678527c7dfd5c577d6ab3f862372c2232e9))
* **org/billing:** guard MEMBER access, redirect OWNER to /dashboard/billing ([21caf62](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/21caf620b9ab0aabe35e76d561956f4285765e38))
* **org/bottom-nav:** add SEO to mobile nav ([6c58139](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6c581391a650634886a9a1f844e0c191f2f6142b))
* **org/chat:** chat page reuses BugChat with role-scoped repos — OWNER all, MEMBER assigned only ([664df62](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/664df621ed2693207e8027f927d42bbec3e60d4d))
* **org/collaborators:** guard MEMBER access, redirect OWNER to /dashboard/collaborators ([e59d0e5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e59d0e546a583c578eaf45ede7ad78de8880cbe3))
* **org/context:** replace assigned-repo DB lookup with live GitHub API fetch for member repos ([b4ffadd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b4ffaddb42661324cf72a9f777aa104e517fa374))
* **org/contributions:** add org-wide combined commit heatmap endpoint using REST commits API ([711e004](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/711e0041aaab0176596c6efaf0800f45439fbbc3))
* **org/issues-closed:** add org-scoped closed issues bar chart endpoint ([a693164](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a6931647f2ebf246e45dc4e93cca803d95390139))
* **org/issues:** add org-scoped open GitHub issues endpoint ([ac7f33a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ac7f33aa2561ac8c25afa683671fea365fa95403))
* **org/members:** members page loads all org members with assigned repos for OWNER management ([4fa85fb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4fa85fb355ae9b6d42269976c37a5eff78f6740c))
* **org/members:** remove per-member repo assignment endpoint — repos now sourced from GitHub directly ([43fcbdd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43fcbdd6b2c857909f06792de30bd11cf53d2b6e))
* **org/members:** repo assignment UI — OWNER toggles repos per member and saves via PATCH ([464b188](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/464b1884e209134f2fa4f38ed2033c64a1e2e8a3))
* **org/nav:** add Repos link to member bottom nav ([1bb1a4a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1bb1a4af0eaf068bf1722cc50a891497cbd44b41))
* **org/overview:** add inline invite button on pending members — OWNER enters email, sends invite ([0251045](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/02510452011f8978acc809000eddd0110de8aa96))
* **org/overview:** full dashboard-style redesign with stats, issues triage, workflows, contributions heatmap ([bbaa9ff](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bbaa9ff30a5f54fc0d5b3047453f8bdfde29c8bd))
* **org/reports:** guard MEMBER access, redirect OWNER to /dashboard/reports ([00610a0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00610a03a92604bf7692166db55480f4b725e36f))
* **org/repos:** fetch all GitHub repos and merge with org DB repos for full visibility ([97c4185](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/97c41856f61bca1d9837953a891b773cef8420f8))
* **org/repos:** repo list with sync-from-GitHub button that re-imports org repos ([dd4b22d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dd4b22d393710383c6d7bdca6c4b43766ad51fa2))
* **org/repos:** repos page lists all org repos with token and report counts, OWNER only ([7d59a5d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7d59a5d1244cfb4cf7769e9709e12a40009d0f4a))
* **org/repos:** show tracked/untracked repo split, merge GitHub repos with DB state ([ef46917](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef46917423def9d1be4b73dee9e5a49a816cb86f))
* **org/seo:** add SEO page that redirects OWNER to dashboard/seo, blocks MEMBER ([c0cb022](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0cb02202742994a99748f350a4b942720a72233))
* **org/seo:** render GSC properties inline instead of redirecting to /dashboard/seo ([83a37ef](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/83a37ef53cb22611d2480a5b18e326b7001cf8c7))
* **org/settings:** guard MEMBER access, redirect OWNER to /dashboard/settings ([c3f98ff](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c3f98ff647f17f281dc55b438c975af291c6688d))
* **org/setup:** auto-load and display user GitHub orgs as clickable cards instead of manual text input ([c441145](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c44114528e321be248189eb5ba3fc4a9b76b2f68))
* **org/setup:** connect GitHub org form with auto-repo sync and post-create redirect ([8bce20f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8bce20f6c2df233e40df352398465c4c6a39ce41))
* **org/setup:** redirect already-org users to their org, render setup client otherwise ([bcbd84f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bcbd84f30a4e14a973430dc250cc1cabe4194e47))
* **org/sidebar:** add Repos link to member sidebar nav ([88d4d89](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/88d4d89f739104edfaec98b02d1c141fccfb5cc3))
* **org/sidebar:** add SEO to OWNER workspace nav ([5b43bfc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b43bfc099b6790a32290cd4a6040484378395cc))
* **org/sidebar:** show GitHub org avatar instead of Glitchgrab logo in brand header ([b39c3e0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b39c3e039bf3ca847b592819f1ff4aa6bdf44787))
* **org/stats:** add org-scoped report analytics endpoint ([dc08614](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dc08614b6361f10f33c3867304ba4d6a9888a635))
* **org/today-activity:** count per-member commits today via repo commits API to include private repos ([d8179ff](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d8179ff25115b15d10cc9f066c04266bb3dab8af))
* **org/tokens:** guard MEMBER access, redirect OWNER to /dashboard/tokens ([0ac9676](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0ac967610c99c3a665d79a11bc0f830fc7f3a2cb))
* **org/workflow-runs:** add org-scoped GitHub Actions workflow runs endpoint ([95b89c4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/95b89c4a71ba46062a07fd168317aea21f41103b))
* **org:** getOrgContext helper returns org membership, role, and scoped repos per role ([8bf7b65](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8bf7b65056dace92353c79027310d224c97214ba))
* **org:** mobile bottom nav scoped to role — OWNER gets 5 items, MEMBER gets chat only ([ab6fcbe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ab6fcbe5ca4f63823be77cf32e214acbddd12d48))
* **org:** org layout with role-aware sidebar and bottom nav ([ad1d13d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ad1d13dd61b60c516ec59b872ead60a3c6c198c0))
* **org:** org overview shows repo/member counts, team list with roles, and quick nav links ([81b2d3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/81b2d3e86f3c690b9a6d25fc87c331e3f0a9264c))
* **org:** org root page — MEMBER bounced to chat, OWNER sees overview ([64ed193](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/64ed193dc9364f8904ed8bce53d35a24254c71db))
* **org:** org sidebar shows full nav for OWNER, chat-only for MEMBER ([888d9cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/888d9cf15e4116ee58bc2dbaeef6cd10ba538a4e))
* **org:** remove org collaborators page ([752b7a5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/752b7a5f8fe843110e01fce013fca9059be0e492))
* **page:** add OrgGscPropertyPage component for Google Search Console integration ([919de20](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/919de20f4562ccdd2d4ba3ebc102c78ce9ae13b3))
* **pipeline:** pass reporter session info to AI enricher ([c4f85a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c4f85a28c5d7975af457e7c858952c8ebed19853))
* **reports:** restructure filter bar to single row with labeled groups, switch list to grid cards ([0259165](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0259165a1f102dd156ac572c1022d28eba4d3dea))
* **repos:** add search input and grid card layout ([dbc8d4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbc8d4d401d85db0de16a9b95d631e4ff7a2b8b2))
* **repos:** add search input and grid card layout for org repos page ([c9426ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c9426ae06c745ea402097ab8c61db4ebec128400))
* **schema:** add Organization, OrgMember, OrgMemberRepo models and orgId on Repo for team support ([93038ce](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/93038ce583b97d250225e1830c63df6c4e881a1b))
* **schema:** drop OrgMemberRepo model — member repo access now via GitHub API ([88f15a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/88f15a2dea72bf12cf2852a58e4e6b62776a151c))
* **seo:** add /about page with founder bio, company background, and E-E-A-T signals ([6b402f0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6b402f0788f602fc362e8dc0d0949aac44cfc4bd))
* **seo:** add /about to sitemap with priority 0.8 ([b4ce995](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b4ce995c34e8366c7f62b73f203630966cee11a3))
* **seo:** add collapsible FAQ section with FAQPage JSON-LD schema to homepage ([d4230e3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4230e3ea1f3467ce36a78bc61d4ffa3777f528f))
* **seo:** add complete favicon links, web manifest, and switch to compressed og-image.jpg ([af00b16](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af00b1648ab794afee58fd29804f9b9de5eeb094))
* **seo:** add google-seo.webp for improved SEO visuals ([aa90cce](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aa90cce4d793a99d76fe5aa658382bed0d34c78c))
* **seo:** add llms-full.txt with full page-by-page content for AI engine indexing ([6bf59b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6bf59b8b000c782558f2c00058d7e0956ca53a0e))
* **seo:** enrich SoftwareApplication schema with featureList, softwareVersion, dual offers, MIT license, sameAs ([da49743](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/da497437e99f64f0eae12c49ded95d57cc79bcdb))
* **seo:** fix duplicate title tag; add HowToJsonLd for 5-step SDK install walkthrough ([b017fe8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b017fe81909e1827e3daec2583c259099592fc03))
* **seo:** inject WebSiteJsonLd with SearchAction in root layout ([cfb0b7d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cfb0b7d5091864610e092ca25b4f27019f0ed579))
* **seo:** replace Script with script tag for synchronous rendering; add WebSiteJsonLd, FAQJsonLd, HowToJsonLd; improve OrganizationJsonLd with logo object, npm sameAs, contact email ([b6b5ea0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b6b5ea01fe9535bd5f5ef80df3a65e4f6e056c7d))
* **sidebar:** add Create Org link in Config section for users without an org ([aca164a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aca164a36fd550a2a8b4deaa0face5d651f47087))
* **skeleton:** add Skeleton component for loading placeholders ([cddf8c2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cddf8c25ed8155117870eaff6e861ac56752c510))
* **tooltip:** implement TooltipProvider, Tooltip, TooltipTrigger, and TooltipContent components ([0faf2e7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0faf2e7b35a4f8468e2750ba9863bdebf2506fac))

### Bug Fixes

* **analytics:** adjust height of X-axis labels and background size for better layout ([0e3f778](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0e3f7787628cfb610041eaad3d2d98e384a1c33b))
* **analytics:** adjust margin for tooltip space and update grid height for better layout ([6971cab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6971cabfc8bc18b896e2238463d196fba20bac28))
* **analytics:** render IssuesClosedAnalytics directly to fix redirect loop ([deac534](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/deac534a85869d7b69a68e6afb86f5496186f78a))
* **api/orgs/members:** backfill githubLogin from GitHub API for users who logged in before it was stored, preventing duplicate entries in team list ([89ee7cd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/89ee7cd563164148fc487c0337b57abe2cba10bb))
* **api:** remove collab session from issues-closed analytics auth ([2c429fe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2c429fe810dafb4583d6ac3a2006ab31030b1085))
* **api:** remove collab session from reports analytics auth ([55128ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/55128aef2533a16e949cb36245d6b6b8422077b7))
* **api:** remove collab session from reports list and create ([cc6225d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cc6225dd5e5a033d3772f8030e259f7363c59c82))
* **api:** remove collab session from single report auth ([1aa2e18](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1aa2e18309394922cfe2a39c0c2d0b3880385be9))
* **api:** remove collab shared-repos from repos list ([589423e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/589423eddc41eaacf63bbe1c1c5426609bab68c8))
* **bottom-nav:** remove Collaborators from sheet nav and userType prop ([675f34b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/675f34bcb0dce372866fdc9c1895862bee7dd9f9))
* **chat:** remove collaboratorOnly prop from no-repos state ([b0e66b2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b0e66b2fb4b77e5ba96b82f6bc839df411a006d8))
* **dashboard:** increase issues-closed bar chart height from h-14 to h-24 ([b78484b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b78484b3a8173db85a25ffc00df73ed87bcf850a))
* **dashboard:** prevent redirect for specific config paths in DashboardLayout ([a0d039d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0d039d602ae451ada6f70a01096304481cf5bd8))
* **dashboard:** remove collab session and simplify to owner-only auth ([3c2f761](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3c2f7618aa71a748373abd96c009b1f5f6709089))
* **dashboard:** remove collaboratorOnly prop and message ([e560adb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e560adbe7cedc5938f2f5078db2d4bea90793adf))
* **dashboard:** remove collaboratorOnly prop from no-repos state ([1133dc9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1133dc93a30e1c8b1880f1c0c2cd98b12746a03c))
* **dashboard:** remove shared-repo collab logic from context ([b714d11](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b714d110bde8a743c2ed312250d851c508512cd0))
* **glitchgrab-vs-linear:** escape unescaped quote entities for ESLint compliance ([7a729d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7a729d23710114784b87570d2f543c3ec117e073))
* **glitchgrab-vs-sentry:** escape unescaped apostrophe entities for ESLint compliance ([810c823](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/810c823980253ac52716610ae20dfb5a7978101f))
* **gsc-property-detail:** add tooltips for copy prompt and GitHub issue actions ([ef0e48a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef0e48aa63787bf39489f810d4f88cee00033cd6))
* **gsc-property-detail:** enhance layout responsiveness and adjust flex properties ([c0c13b0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0c13b0ff12f99a0ce38c73bdaa2024ab90a2ebd))
* **gsc-property-detail:** improve favicon and OG tag issue handling with copy prompt functionality ([82f0b56](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/82f0b569d79b76c7eb73f4f7c2f3e4c4912ae000))
* **inner-page-header:** add truncate class to title for better text handling ([04a92f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/04a92f1556e1d2c3b425bad995a8a4ea415da9f2))
* **landing:** add GitFork to lucide import to fix runtime error ([4d20c3b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4d20c3bae72c6cbe2c6231b669b729f1f4f018a0))
* **landing:** escape apostrophes and comment slashes as JSX entities for ESLint ([8800da2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8800da294d2ca223c371673800f7e456d6d9a0d5))
* **layout:** add TooltipProvider for enhanced user interaction ([3497933](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3497933d1a3a1f4348e16a8f8e3468bea7e731b9))
* **llms:** remove COLLABORATOR from report sources documentation ([7890eba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7890ebaa4131f6425d488f7cdc9e7dbc12d602c7))
* **mail:** remove sendCollaboratorInvite email function ([9694709](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/969470916c88e3ba7c4133f1ee3d88c40db2e065))
* **migration:** drop collaborator tables and remove COLLABORATOR from ReportSource enum ([1b9935e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1b9935efa3bc269a0e861a1d348993f0ecdb39ed))
* **org/overview:** use merged members endpoint so all GitHub org members show, pending badge for non-joined ([38f3aba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38f3abafad910fdf2bff3cc296f1d4e77efb8a24))
* **org:** remove Collaborators from org sidebar config nav ([cf1fc9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cf1fc9ceaa8b1f8a8cc94d09b43ea3fe87f8434c))
* **org:** remove collaborators mention from reports subtitle ([a6514ec](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a6514ec1dba865a324db324cbf465ad938350d90))
* **orgs:** remove redundant non-null assertion on session.user.id already guarded above ([bf913e8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bf913e8dda15987456ea4dbaab966352376cf565))
* **page:** update navigation link and modify content in LandingPage component ([9eeacf0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9eeacf0206585bdeb355095e261f0eadc006b39a))
* **page:** update pipeline steps and modify content for clarity ([b68eda1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b68eda1536886c3382b44e9a2eb79d917faae88d))
* **pipeline:** remove collaborator email attribution branch from issue body ([997f9d6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/997f9d6e11f9fedfde0cfe6179173a666f418e02))
* **pipeline:** update pipeline steps for clarity and consistency ([f6f3242](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f6f324242f9b487693c2d9fd05b881d83c9f2479))
* **proxy:** exclude config paths from org redirect to prevent loops ([b192d6c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b192d6c8a923d03d7bfa78b5330e643ba2a6ef8e))
* **proxy:** remove /collaborators from CONFIG_PATHS exclusion list ([6235712](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/623571224c6ecf034a0d4c0f4579358f2cca2104))
* **reports:** remove COLLABORATOR from source labels map ([c44e9f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c44e9f119370d4075af4872c8d797b6a628f8fe4))
* **reports:** remove collaborator-view subtitle branch ([e012640](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e0126401004237fe76e28557a2b924a3d1462804))
* **reports:** render ReportsList directly on org reports page to fix redirect loop ([39d0785](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/39d07854101707098c32ba970234063109ddc980))
* **report:** two-tier duplicate check — 24h window + 7-day open-issue suppression to stop recurring issue spam ([e483b1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e483b1a137ca491981b2628a1e40c89fcd1cb0db))
* **repos:** remove collaborator-view conditional header text ([dbfb2d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbfb2d234448a88273011d3624b73a72bbe9c576))
* **schema:** remove Collaborator/CollaboratorRepo models and COLLABORATOR enum value ([bddcb94](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bddcb9413d253e2bc2b0b3497aee8c1e995073fa))
* **seo:** remove brand from title to prevent template duplication ([1009494](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/100949408d1a6a6f7349ba569f180693530c0b93))
* **seo:** remove brand from title to prevent template duplication ([26835a1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/26835a13889eb948f869001b5b8dea75143fab05))
* **seo:** remove brand from title to prevent template duplication ([0ae81d1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0ae81d12d09cfe4bcc88e855e5a7690326151f8c))
* **seo:** remove brand from title to prevent template duplication ([74dcedc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/74dcedcd792c77e6646e9f0420879da359364c77))
* **seo:** remove brand from title; add missing canonical URL ([f93c40b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f93c40bc34bfa2e31ba3b1f62b392da7b36efcff))
* **sidebar:** remove Collaborators nav item and userType prop ([0b12838](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0b12838371c0b0b49db3cd41a809bd839cd95856))
* **signature:** extend dedup window 1h → 24h, add 7-day open-issue suppression constant ([3a4cbd0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3a4cbd056ace6aa0253a87daae75b29d9e596865))
* **sitemap:** remove /collaborate from private paths and exclude list ([33dedf9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/33dedf9816d98de6d2a562aa011db8d960794da2))
* **workflow-runs:** extract access_token to const so TS narrows string type without non-null assertion ([a28b1a8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a28b1a808561e718c414de39a9a880b1a873203a))

### Performance Improvements

* **seo:** add JPEG og-image compressed to 85KB from 778KB PNG ([6a9307b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a9307b1b62cebac4eb14241189ca7c0342906d6))

## [1.27.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.26.1...v1.27.0) (2026-05-14)

### Features

* **cron:** add nightly-sync cron to update indexing cache for all GSC properties ([0f22207](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0f22207e6e7511040ed44641955b0c8953921fe1))
* **cron:** add seo-health cron to create GitHub issues for favicon, OG, and indexing problems ([86c3aab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/86c3aabfc98d788d159fd09c486a73a5f8557556))
* **cron:** skip seo-health issue creation when property is snoozed after reindex ([4b7359a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b7359ad0f7f006223b5c41a540d2b9b895df848))
* **db:** add cachedNotIndexedPages and seoHealthIssueUrl to GscProperty ([ff09005](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ff0900505c41377aee417c9653e8faa815df0da3))
* **db:** add GscConnectSession model for temporary OAuth token storage during property selection ([fa248b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fa248b80af13aa0eab5291b4943b892f36f5e478))
* **db:** add seoHealthSnoozedUntil to GscProperty for reindex snooze window ([49f30cc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49f30cc76faa4c7cf52e970a728f161317ae730b))
* **gsc:** add /connect/gsc wizard page — no auth required, session-authenticated via GscConnectSession ([6c9cac5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6c9cac53989437f41f406420141b40dcf7673b43))
* **gsc:** add auth/link endpoint returning signed URL as JSON to avoid hydration mismatch ([9a6b47d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9a6b47dee60683823a85fa42a36c35c3bcb50178))
* **gsc:** add connect endpoint to save selected GSC properties with required repo links ([f5108f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f5108f812c6356e132e9a531c800da69f8c1127c))
* **gsc:** add favicon-check endpoint for per-property favicon validation ([5f29236](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5f292368a85fe4d1f17653bcb4eea9b350f74796))
* **gsc:** add OAuth callback to verify state, exchange code, upsert GscProperty records ([e80beb1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e80beb1843b5130bc7975da766cf7d94577b3244))
* **gsc:** add OAuth URL builder with HMAC-signed state for cross-browser auth ([e6f8484](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e6f8484aeb962c20b835e6d08d0e162596f54233))
* **gsc:** add og-check endpoint to validate OG/Twitter meta tags from site HTML ([49d2ce4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49d2ce454aa42704880a8ae7a8e3e9f0d0709c7c))
* **gsc:** add properties list/patch endpoint for repo linking ([c1bceed](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c1bceed51deafa74f1372c03f0bb0c5e502cc69d))
* **gsc:** add property DELETE endpoint for disconnecting a GSC site ([38cfe0a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38cfe0a09b08a570e284280cfafa79ce5d5acd2a))
* **gsc:** add property sync endpoint to live-check indexing status via GSC API ([ca66332](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ca66332eea3eff0bf8d53867233dbca9cd103b17))
* **gsc:** add reindex endpoint to submit not-indexed pages to Google Indexing API ([d263180](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d263180fbdabf63969b0ca9b542be8a97d7c31e1))
* **gsc:** add search functionality to filter properties by domain or repo ([2fa6bf7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2fa6bf77d306829f6071a90a0679cbf717308c3d))
* **gsc:** enhance GSC inspection and sitemap parsing with additional fields and improved URL fetching logic ([c6e2950](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c6e295018b21c8f4c9d2dece024f7212a7b70246))
* **gsc:** persist not-indexed pages to DB on sync for instant cache ([4688a8f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4688a8f4ce7700c900ef6777133302a2ec45ad46))
* **gsc:** redirect to property selection wizard after OAuth instead of auto-adding all properties ([6476135](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6476135aeb62c42ea2ab5409000b6a8b5bcb5672))
* **gsc:** return noSitemap flag when no sitemaps registered in GSC ([a0196ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0196ab503795f1a66b460ce7b79ee4c44bf455c))
* **gsc:** set 7-day SEO health snooze on reindex to give Google time to re-crawl ([a1f9c52](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a1f9c52b3d1447d606d9de213e489433c8557ed4))
* **lib:** add AES-256-GCM encrypt/decrypt utility for token storage ([85c5231](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/85c52318dae104895d734cfdf54b76daed758781))
* **lib:** add checkIssueIsOpen helper to detect open GitHub issues by URL ([f0cc417](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f0cc417792ad917ecf8bbf03d0a99b94ce5c4ba7))
* **lib:** add getValidAccessToken helper with auto-refresh for GSC properties ([4b48b77](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b48b7738283e38ad6b4ffac6139519fb0569a4b))
* **lib:** add Google Search Console API client (token exchange, sites, inspect, indexing) ([42ca42f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/42ca42f7863babb7c1c532fd9d923a90a246efcf))
* **login:** read callbackUrl from search params so post-OAuth redirect lands on correct page ([1ad2961](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1ad29616e0d7730489d24d308f97d423d055a0e7))
* **mcp:** add HTTP MCP endpoint with session auth and GSC/repo tools ([b27a5d5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b27a5d5a17d2f76c47c6b495092159d481e5356b))
* **nav:** add SEO route to dashboard sidebar ([0f0a394](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0f0a394c156416901d5b023fc5972833c4266452))
* **nav:** add SEO route to mobile bottom nav ([b7a9617](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7a96174c1f1edb3625466589296ed887e7577ac))
* **schema:** add GscProperty model, datasource directUrl, remove McpToken ([8c45ea5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8c45ea519d2b2153fb29f66c251079c97ff19a9e))
* **seo:** add Check Fix button to re-inspect not-indexed pages without opening GSC ([b7cbc14](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7cbc14d147c84360af444fae521906396b14ea3))
* **seo:** add check-fix endpoint to re-inspect not-indexed URLs via GSC inspection API ([43a91ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43a91ae5a130a889a18045040d22af92eb2605d3))
* **seo:** add copy prompt and create GitHub issue buttons to not-indexed pages section ([a5796e0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a5796e0ff292f8375ebb24ad610a290bf2ad4839))
* **seo:** add create GitHub issue button to favicon health section ([bd035f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bd035f882c80be497191032028deef85cae26d80))
* **seo:** add create issue button to OG section and remove Fix with RFG from favicon health ([d4c397b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4c397bcb52e01ff8ce6cec74d36087241819b36))
* **seo:** add GSC connect page to load session and repos for property selection ([4b06c43](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b06c43606bcb5f8b3c0188543b71db7fc1f8211))
* **seo:** add GscPropertiesClient with sync, reindex, repo linking, bulk disconnect, favicon check ([1d7e221](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d7e221b05368f97b4d93bf060785a7934b29434))
* **seo:** add multi-select bulk disconnect, searchable repo combobox, favicon per property, fix AlertDialog p-nesting hydration errors ([d874270](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d874270e6a008f191b345bfed7c8ecfc44d114a2))
* **seo:** add per-property detail page with back navigation ([4830632](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4830632e596e5bdcabee183ec37fa185c3f22403))
* **seo:** add property detail client with auto-sync, not-indexed list, favicon health, OG tag check ([15b4458](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/15b4458be0e66edb69845f0718ea9d9710d9028f))
* **seo:** add property selection wizard with per-property required repo picker ([8221b56](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8221b56e46455cf3cac97fdfa7f3a1dd9dd05077))
* **seo:** add reason-based tab filtering to not-indexed pages list ([6524cd0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6524cd09e65281ed1223db335bf5f275606c4f06))
* **seo:** add SEO dashboard page with GSC properties and MCP section ([201a9df](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/201a9dfee517723ab502311121d14d0847ce3d85))
* **seo:** make property site URL a link to detail page ([f4b774f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f4b774fd582ce57c001f609e53f6366de6b90598))
* **seo:** pass cachedNotIndexedPages from DB to property detail component ([4c29456](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4c29456ad0832d1286bc86c514a58ade45b10f3d))
* **seo:** read error/connected query params and pass human-readable flash messages to client ([a02aa4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a02aa4d8826817dfbc60b3a480d09fc0c81b3c86))
* **seo:** show cached indexing data on load, auto-sync only on first visit, add stale timestamp ([5b69297](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b69297b277ea5046f446af9a44a8f4a5d65b023))
* **seo:** show OAuth error/success toasts via flashMessage prop on SEO page load ([adc7794](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/adc779478c67f69effe0b123726a4f94c849adb3))
* **seo:** show register sitemap prompt with GSC link when no sitemap found ([f61fd4c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f61fd4c1762b3e1f26d4f3e079670ced59f64f82))
* **ui:** add shadcn Command component for searchable combobox ([461ae45](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/461ae456a983f4e0b8ae690f02cb68ecdd093e28))
* **ui:** add shadcn InputGroup component (command dep) ([63a2c1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/63a2c1a9ef4daa3c20a57d43a79a9dac8d1b53c4))
* **ui:** add shadcn Textarea component (command dep) ([3eee74b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3eee74bd2f496d688c5bf62483bd65d04cd00e97))
* **ui:** add shared Footer component for all public pages ([7f419d5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7f419d5646801d9d67af2d2f2e9415b64a1d9476))

### Bug Fixes

* **auth:** include callbackUrl when proxy redirects unauthenticated dashboard requests to login ([8bc2a89](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8bc2a89c000c12f05c517a2f467ed6c129ae9e34))
* **cron:** use per-tag attribute parsing in getMeta to avoid non-literal RegExp lint error ([078ac24](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/078ac24fe50d70ef29488f07bddbf7f7be2d27ca))
* **footer:** use Link instead of a for internal hash navigation ([f8445a7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8445a73a20ee969fc3ca5dc55bcff7464e2458c))
* **gsc:** cast GscSite[] to any for Prisma Json field assignment ([81f8432](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/81f84328cdc31cfc7a40bc15db521c343ab2c2cd))
* **gsc:** correct WhatsApp og:image check — warning not error, community-observed 300KB threshold, add dimension check ([00d4ac8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00d4ac84668f9e587ddb25dea308482c8c80b2bc))
* **gsc:** extend connect session expiry to 30 min for login redirect flow ([318cea3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/318cea321a32a5e79c43c62a6b6ee43f7a85c480))
* **gsc:** redirect to /connect/gsc after OAuth to skip dashboard auth, add granular error codes ([9edb282](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9edb2823509a8265d0685affe2e68c754147fd5f))
* **gsc:** remove auth() requirement from connect endpoint, use session userId directly ([8ae3704](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8ae3704b5e49ca5e87d834ea3860d5cfb10e9bac))
* **gsc:** use per-tag attribute parsing in getMeta to avoid non-literal RegExp lint error ([24a5d35](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/24a5d35b3a1ad0cb1fe332d531737e9688f10579))
* **lib:** remove export from internal-only GSC interfaces ([9f1a700](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9f1a700214a4d4d4d638e6cd46f59be4e8e82b2b))
* **login:** wrap GitHubSignInButton in Suspense to satisfy useSearchParams requirement ([73c3eac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/73c3eac2367cc4cee8f02c7811d17624241ab67c))
* **sdk:** set inert on host radix dialogs to prevent focusscope stealing focus ([1f60c97](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1f60c97d8001ade55bee0b872737fbb54230f084))
* **sdk:** stop focus propagation to fix textarea clickability with radix focusscope ([7d1dfb9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7d1dfb9d60a0536a56bb0533631acf161ece7289))
* **sdk:** stop pointerdown propagation to fix dialog clickability with shadcn ([e41deb4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e41deb40e947a7b39cb7dc277df6115277d1c817))
* **seo:** capture first indexing API error and expose failed count in response ([f77e0f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f77e0f871fc33913d88e23e08260849bd9d89126))
* **seo:** fix useEffect dep, ternary-as-statement, and Tailwind canonical classes ([41ca92b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/41ca92b26baac77a8db43cca4f8893f4ad26ca2a))
* **seo:** preserve session id in callbackUrl when redirecting unauthenticated users to login ([4f00d3d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4f00d3dd09987eeaa7eae09ab7372b30b2753e55))
* **seo:** replace max-h-[420px] with canonical max-h-105 ([ece6a6d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ece6a6d760f7aa8c494238124d7699058540f37e))

### Performance Improvements

* **gsc:** parallelize URL inspection with 10 concurrent requests to fix sync timeout ([daa69fe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/daa69fe7be9949b65f62b6184d276149c004330e))

## [1.26.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.26.0...v1.26.1) (2026-05-13)

### Bug Fixes

* **dashboard:** show tooltips on upper contribution graph cells ([576022e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/576022e62f52d4991ca5407f67d9b5491d8ce925))

## [1.26.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.25.0...v1.26.0) (2026-05-13)

### Features

* **analytics:** add Analytics nav item to sidebar ([78edba8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/78edba899bd1d19a45572a9560d1fad28a6a20b7))
* **analytics:** add day-wise issues-closed API endpoint ([e96c694](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e96c69447eb1da2a7888a3a10a8fc375810d9988))
* **analytics:** add issues closed dashboard page with bar chart ([aa0c656](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aa0c6567b2f81dc8b544331220360b5c4bff453c))
* **dashboard:** add DashboardStatusBar component with dynamic path from usePathname ([f5f9939](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f5f99394b12707b50dd54ef74fe614d5bf5a5964))
* **dashboard:** add issues-closed sneak peek mini chart to dashboard ([67ca6cb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/67ca6cb9939243fe48f7676149adde1c41a67416))
* **dashboard:** expand stat grid to 3x2 with issues-closed metrics ([a81fce3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a81fce3a02ee2b5b0adc0fe44813ee0c9f14eef3))
* **dependencies:** add motion library version 12.38.0 to package.json and bun.lock ([11c5ae7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/11c5ae7f768351e04ed1cc22ad2d4cd159e08a4e))
* **layout:** mount DashboardStatusBar above main for full-width border ([1a0a36e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1a0a36e0e05626489aaf393217cdf4d954fa29c5))
* **sidebar:** replace static Lucide icons with animated lucide-animated icons ([4abf196](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4abf196e9365b943c2b11e4d00c2d1df0220a8bc))
* **sidebar:** wire Cmd+G shortcut and animate Bug icon on report button ([38bcf69](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38bcf6907aafa08f3db7873a4c4c33cc011b6ec5))
* **ui:** add animated BugIcon with shake wiggle using motion/react ([12a54dd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/12a54dd878d34bb69c61f17445d389115c7f8820))

### Bug Fixes

* **analytics:** eliminate tooltip flicker using CSS group-hover instead of React state ([5260282](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5260282133ef831426063866d8ac1013d6ffde4a))
* **analytics:** memo BarList to prevent re-render disrupting CSS hover state ([5c2af19](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5c2af1909829ca1299be4faa5360d202291e5d5b))
* **analytics:** remove hover from breakdown table rows to prevent layout shift flicker ([75d0bc6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/75d0bc65515b25b3620999556479b8d783dd8ff5))
* **analytics:** use absolute positioned x-axis labels to prevent rotation clipping ([c40905c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c40905c3dc3ef80e7db4dc797e7262f3eee396dc))
* **dashboard:** cap priority issues triage height to prevent layout imbalance ([e555da5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e555da525a9e9cf64f29e65deaf312bf20c0c8dc))
* **dashboard:** compact stat cards - reduce padding and font sizes ([9757877](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/97578776c548a858cf76cd564b482b540b58e635))
* **dashboard:** drop unused userName from DashboardAnalytics call ([1b9f9c8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1b9f9c8bbd0bd3d63c7661bf0af97ac3912112f3))
* **dashboard:** reduce stat card width by shrinking grid column span ([c46507d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c46507db08687f46a799ada8c1e81f3d6b4e6d12))
* **dashboard:** remove greeting header and userName prop ([c82330e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c82330efa31f0ea5f0684080b0ec402972134b61))
* **pipeline:** append reporter session info to SDK_AUTO GitHub issues ([92b06f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/92b06f137016a8867c9afd20e3ac8f2b1a486502))
* **sdk:** include phone in auto-capture payloads and add session to effect deps ([6a0f8de](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a0f8de55910d3f59017f279e0d3f34fcce47281))
* **sdk:** include session data in error boundary auto-reports ([b93fd62](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b93fd625d3145308ef318d3c2fa24edcec790306))
* **sidebar:** guard startAnimation call for non-animated Lucide icons ([302abd8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/302abd8c84efd505388b2746735612bdfa4ab935))
* **sidebar:** replace static Bug with animated BugIcon and fix CMD G shortcut display ([c8ca2e4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c8ca2e462a59450e6e8100fcafc8a981cbc75a38))
* **sidebar:** trigger icon animation from full nav item hover via imperative ref ([3d58482](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3d58482115640e0881586b1828806f309e9522c2))
* **ui:** add global dark themed scrollbar styles ([f64667d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f64667d6883a5590e0e0b1b81753a1aa36d18afa))

## [1.25.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.24.0...v1.25.0) (2026-05-05)

### Features

* **dashboard:** group open issues by repo with per-project count badges ([af5e0ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af5e0ae5684d8b6be4c77e992c0b5e4ddfe51e9a))

## [1.24.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.23.2...v1.24.0) (2026-05-05)

### Features

* add dotenv support for environment variable management ([627eec2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/627eec26ea21ac727365add142873fc52568c189))

### Bug Fixes

* **sdk:** use waitUntil to keep pipeline alive after response on Vercel ([bd06245](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bd062456473929f13a40415569b59f89e53f6ede))

## [1.23.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.23.1...v1.23.2) (2026-04-30)

### Bug Fixes

* **sdk:** detect host theme from html element when body bg is transparent ([dc848c3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dc848c36d18788474abd84648d42d2030eedea86))

## [1.23.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.23.0...v1.23.1) (2026-04-30)

## [1.23.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.22.2...v1.23.0) (2026-04-30)

### Features

* **sdk:** add Cmd+Shift+G global keyboard shortcut to open report dialog ([23cfae1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/23cfae1e3b27f11352d23164ee882e11af0aae4e))
* **sdk:** add deduplication check before dispatching report in error boundary ([340487b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/340487be7bf55073aaa94c6a4f6bd77003f0c25c))
* **sdk:** add in-memory error signature dedup with 5min window ([517b622](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/517b62265e752fb0123d99842865eb5d673cb66d))
* **sdk:** export deduplication utilities ([c65ad1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c65ad1cd03fe341f483c9f91894d2792a72bcbdf))
* **sdk:** implement deduplication check for global error and unhandled rejection listeners ([4f6d865](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4f6d865116976560f76a51c88cc5e1dee2df66f7))
* **sdk:** support Cmd+V clipboard paste and update upload hint text in report dialog ([e33924b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e33924ba6250199e34781a2cf52d03d8c68d2b2c))
* **seo:** add dynamic llms-full.txt route with SDK quickstart and API reference ([f5067c7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f5067c76cc8941bc8b3ba6887430f91fa0e35097))
* **seo:** add keywords, authors, robots meta and title template to root layout ([ec8c8d7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec8c8d763ee823c5eb8b5c560dac9ecb5ba24aa8))
* **seo:** add llms.txt for AI crawler indexing and citation ([f8c6b34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8c6b349ab70f85782784abaa790cc1c311ccec0))
* **seo:** add Script-based JSON-LD components for Organization, FAQ, Breadcrumb, HowTo ([fe1830b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fe1830b9e951a9e76fce0a969d8707a6145e399d))
* **web:** add utility to compute error signatures for issue deduplication ([7df700a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7df700a34b6f1dc28362f57fef01f301bcf4801a))
* **web:** implement server-side verification to detect and skip duplicate error reports ([2473c26](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2473c2623ba787ac63e49ad0fbd690e050284278))
* **web:** update schema with report signature field and index for deduplication ([561f2ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/561f2ab304e870ca199caf5a53719baa5f416b3d))

## [1.22.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.22.1...v1.22.2) (2026-04-21)

### Bug Fixes

* **bug-chat:** show full repo names in dropdown without truncation ([ce79687](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ce796870ef10d6785a44e204cc9e7c6421ff0ac3))

## [1.22.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.22.0...v1.22.1) (2026-04-21)

### Bug Fixes

* **collaborators:** show action buttons on mobile without hover ([4ff6a1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4ff6a1cc51ab89973f380f74d250f26f62580115))
* **dashboard:** wrap GitHub contributions heatmap in horizontal scroll container ([2245fc8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2245fc847b14369e264c1f3ffaaff2261ed177cf))
* **repos:** stack sync + status badge vertically on mobile ([731ea34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/731ea344cae9d211e087caaea6c449ec7b938a81))
* **responsive:** use canonical min-w-130 instead of min-w-[520px] ([03c22d0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/03c22d0d63d10b7c6e13d9bdd5feb36c150b1453))

## [1.22.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.21.0...v1.22.0) (2026-04-21)

### Features

* add CreateTokenDialog component for repository-scoped API token generation ([0e15b8a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0e15b8a1f6e5f837ae2737758ff43fc3b17a29a6))
* add db:deploy script to run prisma migrate deploy ([4889f93](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4889f93a88817204c6ecb2d21e6dd437c6979917))

## [1.21.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.6...v1.21.0) (2026-04-21)

### Features

* **repos:** expose owner avatar_url in GitHub repo listing ([3267d1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3267d1a9a369ba8aa54a0855a1a4d938dee0fc64))
* **repos:** render GitHub owner avatars in connect dialog ([22f3abf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/22f3abf9e7a59fb304e4bd61be7b8c7deb3e024c))

### Bug Fixes

* **db:** migration for per-user Repo.githubId uniqueness ([212f628](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/212f6287cfe9432764bb4399b96a025ab22b4421))
* **repos:** return result from connectRepo instead of throwing ([16d5211](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/16d5211fbd8c82b0f7937d6157530350450295af))
* **schema:** scope Repo.githubId uniqueness per user ([8680193](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/868019394bcc8aa21194d7b7a4c5a4e9c1b75f62))

## [1.20.6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.5...v1.20.6) (2026-04-17)

### Bug Fixes

* **reports:** remove internal status filter, keep GitHub open/closed only ([43de5f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43de5f5231406c6b60305381d59cf4a965c537ba))

## [1.20.5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.4...v1.20.5) (2026-04-17)

### Bug Fixes

* **reports:** add open/closed issue state filter to reports list ([0af44ee](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0af44eefe49e3fbf652df91beeea0afa7c9c80c0))

## [1.20.4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.3...v1.20.4) (2026-04-17)

### Bug Fixes

* **chat:** increase repo name max-width to prevent premature truncation ([f79aefd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f79aefdbc393f7d3ae16463dd181ba6d5b20fbed))
* **select:** allow popup to grow wider than trigger for long repo names ([ebde8e6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ebde8e6aaae1f15ca79a0da36c798845d2feb889))
* **tokens:** make repo select trigger full-width to show complete names ([282e7a3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/282e7a3795bdefc2a88008045fc33a452e280e64))
* **tokens:** remove max-w-40 cap on repo column to show full repo names ([6265933](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6265933a18b1cb7c3d16505eb6aa8142569a8583))

## [1.20.3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.2...v1.20.3) (2026-04-15)

### Bug Fixes

* **claude:** simplify enricher to single-turn API call ([3500632](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3500632d1c2e5a06a5904dfd178a3a3c3a4076b6))
* **claude:** trim enricher context to prevent turn exhaustion on large issue lists ([9f51536](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9f5153644dc9d1405c1773b94f559f300f7d5fb8)), closes [#142](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues/142)
* **claude:** use instanceof directly in ternary to fix TS2749 type error ([205b952](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/205b952d568fd8817df1a30f8722da9993d01fa8))

## [1.20.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.1...v1.20.2) (2026-04-15)

### Bug Fixes

* **chat:** add lightbox for staged screenshot preview ([6561880](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/65618802b394f8012d28c99d5e54e5bac84d32d9))

## [1.20.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.20.0...v1.20.1) (2026-04-15)

### Bug Fixes

* **repos:** surface specific GitHub status codes in resyncRepo error messages ([390daf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/390daf6b31a25f046f2472966a7503eafc36bc86))

## [1.20.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.19.3...v1.20.0) (2026-04-15)

### Features

* **repos:** add org filter chips, reconnect github, and grant-access CTA ([6b6f70b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6b6f70be264da46a1cfdf3c11f6f78e0253e7e5f))
* **repos:** add resyncRepo server action for detecting transfers and renames ([2dafd0a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2dafd0aa2e1a09bc7751634c0bd013b57ff4c45a))
* **repos:** add sync button on repo rows to resync transferred or renamed repos ([4812162](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/481216273178e84e19c3bef35a185db38a1ddfb4))
* **repos:** paginate GitHub repos and expose accounts + reconnect url ([a810367](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a810367c7f5434251bf12997e4de838ec7fa6306))

### Bug Fixes

* **auth:** refresh stored GitHub access_token on every sign-in ([be027e6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/be027e637671e71e2e25513a1d1a727ac5eeee28))

## [1.19.3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.19.2...v1.19.3) (2026-04-15)

### Bug Fixes

* **ci:** fail deploy-web step when Vercel hook returns error ([db1706d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/db1706d2dd430ed4f375a9abfc4ba67febf1b172))

## [1.19.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.19.1...v1.19.2) (2026-04-15)

## [1.19.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/v1.19.0...v1.19.1) (2026-04-15)

### Bug Fixes

* **chat:** stack REPL prefix above content on mobile and prevent issue card button wrap ([b8e5215](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b8e5215553a1c41a8040993dcab2fec5e7ab17f3))

## [1.19.0](https://github.com/WebNaresh/glitchgrab/compare/v1.18.1...v1.19.0) (2026-04-15)

### Features

* **dashboard:** add elapsed time and progress bar to active workflow rows ([16fa7ce](https://github.com/WebNaresh/glitchgrab/commit/16fa7ceb83f315c027179489756dbb149b2c21c1))
* **dashboard:** show check status pill on awaiting-review PR list ([c1f9273](https://github.com/WebNaresh/glitchgrab/commit/c1f9273b30899fc89aca1c765587d714bc70d592))
* **enricher:** add structured emit tools for reliable action termination ([df60244](https://github.com/WebNaresh/glitchgrab/commit/df602441f18ed40b6c584528135619d4ccd19a73))
* **pulls:** fetch and roll up check-run status per PR ([9a622f5](https://github.com/WebNaresh/glitchgrab/commit/9a622f531ae9ac8d8ed04e7fd12913a96b6cb355))

### Bug Fixes

* **enricher:** detect emit-tool calls to eliminate JSON parse failures ([a291126](https://github.com/WebNaresh/glitchgrab/commit/a2911267776d828cad479f5f5701777bf9a60287))
* **reports:** link rows directly to GitHub issue instead of in-app page ([b45f6b3](https://github.com/WebNaresh/glitchgrab/commit/b45f6b3876e1d237b95c24a96dcf8a6da3e00167))

## [1.18.1](https://github.com/WebNaresh/glitchgrab/compare/v1.18.0...v1.18.1) (2026-04-14)

### Bug Fixes

* **dashboard:** show toast error when pasting image without repo selected ([8163718](https://github.com/WebNaresh/glitchgrab/commit/81637182465d2f195e8e5e71726a59be832aa973))

## [1.18.0](https://github.com/WebNaresh/glitchgrab/compare/v1.17.3...v1.18.0) (2026-04-14)

### Features

* **reports:** add date-wise filter pills (TODAY, LAST_7_DAYS, LAST_30_DAYS) ([d73e9f4](https://github.com/WebNaresh/glitchgrab/commit/d73e9f49d30a187f545553b8c48d86b1ca06a5b6))

### Bug Fixes

* **reports:** move Date.now() out of component to fix react-hooks/purity lint error ([f602030](https://github.com/WebNaresh/glitchgrab/commit/f602030b5437048b5369e2f4f25246b43b16862c))
* **reports:** move Date.now() out of useMemo into event handler ([484f393](https://github.com/WebNaresh/glitchgrab/commit/484f39387d4461c86d489d97e28cf20952c514ec))

## [1.17.3](https://github.com/WebNaresh/glitchgrab/compare/v1.17.2...v1.17.3) (2026-04-14)

### Bug Fixes

* **chat:** disable input and upload until a repo is selected ([a6c88ba](https://github.com/WebNaresh/glitchgrab/commit/a6c88baae2b1843c96703ccb00f956dcad0f9a47))

## [1.17.2](https://github.com/WebNaresh/glitchgrab/compare/v1.17.1...v1.17.2) (2026-04-14)

### Bug Fixes

* **chat:** include issue number in chat history sent to AI ([c41b023](https://github.com/WebNaresh/glitchgrab/commit/c41b0237cccdf8e3465b414ecd9c0c9149e8126f))
* **prompt:** escape backticks in template literal to fix parse error ([ac2e9df](https://github.com/WebNaresh/glitchgrab/commit/ac2e9df9b6ccfdf732efd5c7222f0ab65f591945))
* **prompt:** teach AI to recognise attach-to-last-issue requests ([68b68ac](https://github.com/WebNaresh/glitchgrab/commit/68b68ac01f6478598593450f19b89e30f729f658))

## [1.17.1](https://github.com/WebNaresh/glitchgrab/compare/v1.17.0...v1.17.1) (2026-04-14)

### Bug Fixes

* **reports:** exclude dismissed reports from sidebar failed count ([13c2a8e](https://github.com/WebNaresh/glitchgrab/commit/13c2a8e96c3e0c9fc787f60a52c391b7b6acddea))

## [1.17.0](https://github.com/WebNaresh/glitchgrab/compare/v1.16.0...v1.17.0) (2026-04-14)

### Features

* **reports:** add dismiss action for failed reports ([108a683](https://github.com/WebNaresh/glitchgrab/commit/108a6835aa75133028f52c1a2b2e58043a2096a6))
* **reports:** include dismissed field in reports GET response ([bee9214](https://github.com/WebNaresh/glitchgrab/commit/bee92146457a0361f1228b64911d09c3de884a97))

### Bug Fixes

* **reports:** add dismissed field to ReportItem, remove isOwner from ReportsTabs ([5a38431](https://github.com/WebNaresh/glitchgrab/commit/5a38431939c2a8bb540cff6b4b6ffb603a683607))
* **reports:** add repo filter, remove approve/reject, clarify failed status ([7fe2ead](https://github.com/WebNaresh/glitchgrab/commit/7fe2ead88003294be5a04d850f5470f78a5f9a28))
* **reports:** remove unused isOwner prop from ReportsList ([ef3579f](https://github.com/WebNaresh/glitchgrab/commit/ef3579f1d4dd9f4b4d66357f2ed0357e0e9d6e78))

## [1.16.0](https://github.com/WebNaresh/glitchgrab/compare/v1.15.1...v1.16.0) (2026-04-14)

### Features

* **seo:** add canonical URLs to docs, legal, and contact pages ([c0720f3](https://github.com/WebNaresh/glitchgrab/commit/c0720f3ec2b47c6e149798bd0ac2a743e22ac0bf))
* **seo:** add explicit Next.js sitemap route covering all public pages ([c10ef0c](https://github.com/WebNaresh/glitchgrab/commit/c10ef0cf0bb8b81b5eae37049cc6f3465bd631bc))
* **seo:** add JSON-LD schema utility for Organization, SoftwareApplication, and BreadcrumbList ([743d8f5](https://github.com/WebNaresh/glitchgrab/commit/743d8f57c3637e83eff5cbac80400650b0e0e6a4))
* **seo:** add SoftwareApplication and BreadcrumbList JSON-LD to homepage ([d3b0cb5](https://github.com/WebNaresh/glitchgrab/commit/d3b0cb5e27c722debe4630d830dd531a520aad0d))
* **seo:** inject Organization JSON-LD and add canonical URL to root layout ([d6954ec](https://github.com/WebNaresh/glitchgrab/commit/d6954ec2891dc1aac3a0a9f4567f3a6aa57dd417))

### Bug Fixes

* **enricher:** force JSON output on last turn to prevent exhausted-turns fallback ([e316aa8](https://github.com/WebNaresh/glitchgrab/commit/e316aa8d3e73cc8250262782571c24193c138944))
* **seo:** add explicit sitemap.xml reference to robots.txt via next-sitemap config ([4ad7683](https://github.com/WebNaresh/glitchgrab/commit/4ad768364a82368b7b63e13a932c487554b3acbb))

## [1.15.1](https://github.com/WebNaresh/glitchgrab/compare/v1.15.0...v1.15.1) (2026-04-14)

### Bug Fixes

* **dashboard:** add refetchOnWindowFocus and refetchInterval to analytics queries ([a34894e](https://github.com/WebNaresh/glitchgrab/commit/a34894e57d7531325519945e71a15347372a8693))

## [1.15.0](https://github.com/WebNaresh/glitchgrab/compare/v1.14.0...v1.15.0) (2026-04-14)

### Features

* **dashboard:** add compact active workflows widget ([2a7a538](https://github.com/WebNaresh/glitchgrab/commit/2a7a53801823c4a819e3dca2b96658c32c1e8073))

## [1.14.0](https://github.com/WebNaresh/glitchgrab/compare/v1.13.0...v1.14.0) (2026-04-14)

### Features

* **api:** add workflow-runs endpoint listing GitHub Actions per repo ([8f8b010](https://github.com/WebNaresh/glitchgrab/commit/8f8b010c92c8499c231de2e41f470271456bdc9e))
* **billing:** bypass Razorpay in dev and return PRO_PLATFORM active ([8168e8b](https://github.com/WebNaresh/glitchgrab/commit/8168e8b294003229543356db7463e9dcc1065ff8))
* **dashboard:** add workflow runs section with smart polling and manual refresh ([d6cb835](https://github.com/WebNaresh/glitchgrab/commit/d6cb835ddaf3131b568084e4743d1722224c925e))
* **dashboard:** wire workflow runs section into analytics view ([652b4ef](https://github.com/WebNaresh/glitchgrab/commit/652b4ef254574a396631b2ccfd4013593f85b1d0))
* **github:** add listWorkflowRuns API client for GitHub Actions ([7a1e6fc](https://github.com/WebNaresh/glitchgrab/commit/7a1e6fc7f605c46f763da7a6c65f1eb38cd7434c))
* **scripts:** load env vars from workspace .env in db-sync script ([83cf32c](https://github.com/WebNaresh/glitchgrab/commit/83cf32c5dd21579058a47375374d4ce8c8473356))

### Bug Fixes

* **api:** replace non-null assertion with local variable in workflow-runs ([f54e75e](https://github.com/WebNaresh/glitchgrab/commit/f54e75efeaf4555ed694c74811a7f4b3a761dba9))
* **scripts:** point dotenvx at root .env and correct db:sync script path ([e2a4388](https://github.com/WebNaresh/glitchgrab/commit/e2a43880062123fd82dfba65852a29ee18dbfbf7))
* **turbo:** add env allowlist to dev task so secrets reach next dev ([9756250](https://github.com/WebNaresh/glitchgrab/commit/97562509214bf01ce9b95553c49d6f49c728f684))

## [1.13.0](https://github.com/WebNaresh/glitchgrab/compare/v1.12.0...v1.13.0) (2026-04-14)

### Features

* **reports:** add GET /api/v1/reports/[id] with session auth ([ead5e56](https://github.com/WebNaresh/glitchgrab/commit/ead5e5679110b0cb6694ee43f74d6f1179f1c08c))
* **reports:** add POST /api/v1/reports/[id]/comments with session auth ([aff3fb8](https://github.com/WebNaresh/glitchgrab/commit/aff3fb8de28811fcc1e6ed8869cd7bcea64e4ef2))

### Bug Fixes

* **web:** use session-auth endpoints in report detail page ([5547fbe](https://github.com/WebNaresh/glitchgrab/commit/5547fbe7eedb42f1e875ccb6dfaf1c1a52ce6223))

## [1.12.0](https://github.com/WebNaresh/glitchgrab/compare/v1.11.1...v1.12.0) (2026-04-14)

### Features

* **chat:** add screenshot lightbox modal on thumbnail click ([08052ca](https://github.com/WebNaresh/glitchgrab/commit/08052ca8026e64029c33f01e25fc91e5c3873699))

## [1.11.1](https://github.com/WebNaresh/glitchgrab/compare/v1.11.0...v1.11.1) (2026-04-14)

### Bug Fixes

* **dashboard:** default to no repo selected and clear chat on repo change ([3bbcb5d](https://github.com/WebNaresh/glitchgrab/commit/3bbcb5d129132cd75d007a87f29aa39135600a40))

## [1.11.0](https://github.com/WebNaresh/glitchgrab/compare/v1.10.0...v1.11.0) (2026-04-14)

### Features

* **claude:** add agentic enricher loop with 6-turn cap, 15s timeout, and fallback ([21945d9](https://github.com/WebNaresh/glitchgrab/commit/21945d9634cb36617bc2ba5109655830748260e3))
* **claude:** add Anthropic SDK client factory ([670a9cc](https://github.com/WebNaresh/glitchgrab/commit/670a9cc3e9ca77bbc5bd6910b831c5b343e9f77d))
* **claude:** add in-memory TTL cache for tree/file/search lookups ([ec806fa](https://github.com/WebNaresh/glitchgrab/commit/ec806fa511126e1dfce5ce21f67c3573cb423aa8))
* **claude:** add list_repo_tree/read_file/search_code tools scoped to one repo ([82b3893](https://github.com/WebNaresh/glitchgrab/commit/82b389308d0715692e513c47f999dc7aef317970))
* **claude:** add system prompt encoding the 6-action decision ([0656067](https://github.com/WebNaresh/glitchgrab/commit/065606712bda8e9014311d720c4d8944e5c44b10))
* **claude:** add ToolContext and EnrichmentMetrics types ([0818bb7](https://github.com/WebNaresh/glitchgrab/commit/0818bb787d30729f46def670e0965c25719363b5))
* **web:** thread repo context into classifyAndGenerate so claude can read it ([de871d4](https://github.com/WebNaresh/glitchgrab/commit/de871d41cdb9c551e2df2d1f558a4f9d168ed41c))

## [1.10.0](https://github.com/WebNaresh/glitchgrab/compare/v1.9.1...v1.10.0) (2026-04-14)

### Features

* **analytics:** add reports analytics endpoint for dashboard stats ([50c8134](https://github.com/WebNaresh/glitchgrab/commit/50c8134bc555bea37b34ce68513fa982d65c99e3))
* **bottom-nav:** replace Repos with Chat tab and add Chat to menu sheet ([41a969f](https://github.com/WebNaresh/glitchgrab/commit/41a969f52c7f251ddf18ca516914c97fd90d13f8))
* **chat:** add dedicated chat route separated from main dashboard ([a383fa5](https://github.com/WebNaresh/glitchgrab/commit/a383fa5aa81759445abe06820b212017bdc3154c))
* **dashboard:** add analytics view with action cards, PR/issue lists, and heatmap ([8c44ef8](https://github.com/WebNaresh/glitchgrab/commit/8c44ef84100a42e8345df67fedd0841c1e8fb122))
* **dashboard:** add GitHub contributions heatmap with tooltip on hover ([5b2191d](https://github.com/WebNaresh/glitchgrab/commit/5b2191d391e055d24279369f073d3ba00d4adaac))
* **dashboard:** add GitHub-style yearly reports contribution heatmap ([bafdb24](https://github.com/WebNaresh/glitchgrab/commit/bafdb24ab956db7f9ba9f0d00e3eddd032ef20fc))
* **dashboard:** add open GitHub issues card with labels and direct links ([05c9700](https://github.com/WebNaresh/glitchgrab/commit/05c9700c419650d7e4a35628ab913580ca346465))
* **dashboard:** add open pull-requests card with direct GitHub links ([b80319b](https://github.com/WebNaresh/glitchgrab/commit/b80319b59d4252e7f6b6c846739f663e9f92df93))
* **dashboard:** add shared InnerPageHeader primitive for terminal-dev inner pages ([eee136e](https://github.com/WebNaresh/glitchgrab/commit/eee136ee78f804fcd7c69405ebb45b3cacecb4c2))
* **dashboard:** extract reusable no-repos empty state ([33a84bb](https://github.com/WebNaresh/glitchgrab/commit/33a84bbf7eefb9b2e841a484749eeb2d7af94783))
* **dashboard:** extract shared repo-context loader for reuse across pages ([5b14538](https://github.com/WebNaresh/glitchgrab/commit/5b1453846d4d4b65b444ce4708312b05ee15bd93))
* **github:** add GitHub contributions GraphQL endpoint ([e34212d](https://github.com/WebNaresh/glitchgrab/commit/e34212d796ba3b297df1d53c61b01141ce566ab1))
* **landing:** terminal-dev redesign — hero with live terminal, log-entry feature cards, CLI install transcript + demo video split, pipeline with icons, subscribe.sh waitlist, mono footer ([c8903cf](https://github.com/WebNaresh/glitchgrab/commit/c8903cf8f7e5cb8d6316cbf36a639b05ffa408e3))
* **repos:** add open issues endpoint for dev triage ([1e7cde3](https://github.com/WebNaresh/glitchgrab/commit/1e7cde329630e56b5a40eaf0f895f0c8bb61dbef))
* **repos:** add open pull-requests endpoint via GitHub API ([93892cd](https://github.com/WebNaresh/glitchgrab/commit/93892cd7bc94fbd35156673982f11eb57b0ddc4f))
* **sidebar:** add Chat nav entry for dedicated chat route ([7e733dd](https://github.com/WebNaresh/glitchgrab/commit/7e733ddbe476be0a592d38d8fbc40ef0740d4f56))
* **sidebar:** redesign with nav groups, kbd hints, status dot, live count badges, keyboard-styled report button ([d388a57](https://github.com/WebNaresh/glitchgrab/commit/d388a57e8624836817a3f6ed371dfc55e99156d6))

### Bug Fixes

* **chat:** replace non-null assertion and '!=' with strict equality and guard check ([8f63ae0](https://github.com/WebNaresh/glitchgrab/commit/8f63ae001a83f672e35351794f92fc01ad7f691a))
* **landing:** use real logo image in footer brand instead of generic terminal icon ([8a6117b](https://github.com/WebNaresh/glitchgrab/commit/8a6117bf826381545ebf565eb8aed5505f97acde))
* **reports:** inline source-icon rendering to satisfy react-hooks/static-components rule ([32b626c](https://github.com/WebNaresh/glitchgrab/commit/32b626c1b5a342cb7d078e655b5856181f5a4372))
* **web:** add data-scroll-behavior=smooth to html for proper nextjs route transitions ([d3d6fd0](https://github.com/WebNaresh/glitchgrab/commit/d3d6fd0e28806bb588ea408f2c078a94ad61602f))

## [1.9.1](https://github.com/WebNaresh/glitchgrab/compare/v1.9.0...v1.9.1) (2026-04-13)

### Bug Fixes

* **dashboard:** remove toast notifications on screenshot upload ([5e67523](https://github.com/WebNaresh/glitchgrab/commit/5e6752352723ea5e4a5baa16502f2a939ca332e2))

## [1.9.0](https://github.com/WebNaresh/glitchgrab/compare/v1.8.3...v1.9.0) (2026-04-13)

### Features

* **sdk:** auto-detect host app theme color for report dialog ([28ac18c](https://github.com/WebNaresh/glitchgrab/commit/28ac18c3960fe9a623cbedf7d2d0f623734ee8bb))

### Bug Fixes

* **sdk:** ensure client-side text quality validation is included in build ([b9a6836](https://github.com/WebNaresh/glitchgrab/commit/b9a683674a5a500c2c99746cd7e6858b0967a7be))
* **sdk:** improve gibberish detection with consonant-cluster and char-reuse checks ([2cd7db1](https://github.com/WebNaresh/glitchgrab/commit/2cd7db133a90ebb9e2ce32a8c846d526ba5d194b))
* **sdk:** preserve envelope success flag in sendReport result ([0c3cded](https://github.com/WebNaresh/glitchgrab/commit/0c3cded2dca21ee82d555e07247e1d694f3a6316))

## [1.8.3](https://github.com/WebNaresh/glitchgrab/compare/v1.8.2...v1.8.3) (2026-04-10)

### Bug Fixes

* **dashboard:** validate report text quality before submitting to AI pipeline ([c638011](https://github.com/WebNaresh/glitchgrab/commit/c6380111a7d3ea7fb857dc858348d1daf56bd3ec))
* **sdk:** add client-side validation to reject gibberish and throwaway text in report dialog ([177bcb5](https://github.com/WebNaresh/glitchgrab/commit/177bcb51b186e822d0406f826aada59a8a8cfa50))
* **sdk:** skip keepalive for large payloads to avoid 64KB browser limit ([00f53cb](https://github.com/WebNaresh/glitchgrab/commit/00f53cba7c865aa63672071471760b5ad02debcb))

## [1.8.2](https://github.com/WebNaresh/glitchgrab/compare/v1.8.1...v1.8.2) (2026-04-09)

### Bug Fixes

* **api:** detect localhost via body pageUrl instead of unreliable Origin/Referer headers ([95a7cba](https://github.com/WebNaresh/glitchgrab/commit/95a7cba5024875b9c3126595c28ba374e242cc73))

## [1.8.1](https://github.com/WebNaresh/glitchgrab/compare/v1.8.0...v1.8.1) (2026-04-09)

### Bug Fixes

* **api:** add CORS headers and localhost dev-mode response to SDK report endpoint ([bec7f0f](https://github.com/WebNaresh/glitchgrab/commit/bec7f0f3246982b0ec8361a30c9172588d8c7c3c))
* **sdk:** replace useSyncExternalStore with useState+useEffect to prevent hydration mismatch ([fe8ec33](https://github.com/WebNaresh/glitchgrab/commit/fe8ec339b201e9e37b8b0e1d38bfb0f90935acf4))

## [1.8.0](https://github.com/WebNaresh/glitchgrab/compare/v1.7.0...v1.8.0) (2026-04-08)

### Features

* **sdk:** extract report dialog into standalone component rendered by provider ([49edec6](https://github.com/WebNaresh/glitchgrab/commit/49edec69c9721fef01496719dd422890a17a5bb5))
* **sdk:** render ReportDialog inside GlitchgrabProvider so dialog is always available ([5e92acc](https://github.com/WebNaresh/glitchgrab/commit/5e92acc3e48662540e8bb388ecb09b3fa445d04b))

### Bug Fixes

* **sdk:** prevent hydration mismatch with useSyncExternalStore mounted guard ([f09d5a1](https://github.com/WebNaresh/glitchgrab/commit/f09d5a156377e3657dc160ee0085d83ada9929a6))

## [1.7.0](https://github.com/WebNaresh/glitchgrab/compare/v1.6.0...v1.7.0) (2026-04-08)

### Features

* **api:** map report type and severity to dynamic GitHub labels and title prefixes ([1b286d2](https://github.com/WebNaresh/glitchgrab/commit/1b286d20cff0418afd720504223ceb27862dad00))
* **sdk:** accept type option in openReportDialog for pre-selecting category ([077901c](https://github.com/WebNaresh/glitchgrab/commit/077901c07697c8c463e91364899c8c125bd9888a))
* **sdk:** add multi-step stepper variant for report dialog with category, details, and review steps ([b6d2af0](https://github.com/WebNaresh/glitchgrab/commit/b6d2af0f8c4fc6089a4434fa56c0c74396ffd6cf))
* **sdk:** add ReportSeverity type, variant and showSeverity props to ReportButtonProps ([2e2c31e](https://github.com/WebNaresh/glitchgrab/commit/2e2c31e4b1ac7a64e6ad225767e254bba9afded7))
* **sdk:** export ReportSeverity type from barrel ([3769c8d](https://github.com/WebNaresh/glitchgrab/commit/3769c8dd24b333baea449485c4abdf30b33f54c1))

## [1.6.0](https://github.com/WebNaresh/glitchgrab/compare/v1.5.1...v1.6.0) (2026-04-04)

### Features

* **api:** add commentCount to reports list endpoint ([f8a78b1](https://github.com/WebNaresh/glitchgrab/commit/f8a78b1127aae7c61333ad0c4448965cd8b4ffb5))
* **sdk:** add commentCount field to GlitchgrabReport type ([459b6db](https://github.com/WebNaresh/glitchgrab/commit/459b6dbcab26f39a4540dfcc281937311bd23464))
* **sdk:** export GlitchgrabReport type from barrel ([0446f19](https://github.com/WebNaresh/glitchgrab/commit/0446f1989dc80b77325c8bb873e5af4516ba4486))

## [1.5.1](https://github.com/WebNaresh/glitchgrab/compare/v1.5.0...v1.5.1) (2026-04-04)

### Bug Fixes

* **billing:** revalidate dashboard layout after payment verification ([ed62da2](https://github.com/WebNaresh/glitchgrab/commit/ed62da2b9a47df2d6f4a71c393cef93cc397f856))
* **billing:** revalidate dashboard layout after subscription cancellation ([5b36d54](https://github.com/WebNaresh/glitchgrab/commit/5b36d545abbbfc2dfda16e82031c5c6a367bde9e))

## [1.5.0](https://github.com/WebNaresh/glitchgrab/compare/v1.4.1...v1.5.0) (2026-04-04)

### Features

* **billing:** show cancelled status message from live Razorpay state ([6d7eee0](https://github.com/WebNaresh/glitchgrab/commit/6d7eee0f7d53671ec4886c2b997b6cdb27b394a4))
* **docs:** implement Markdown to JSX renderer for documentation page ([c4ba583](https://github.com/WebNaresh/glitchgrab/commit/c4ba5832386b0e837770a2bd91e4712138efae90))
* **landing:** add docs link to navbar/footer and remove pricing section ([4e2bf93](https://github.com/WebNaresh/glitchgrab/commit/4e2bf93d4ed54a4cd1d5efef65f85404509bf72f))
* **sdk:** add documentation links to the landing page ([ca96328](https://github.com/WebNaresh/glitchgrab/commit/ca963288083f8b83706e372ebe18416bd2cce469))
* **sdk:** add openReportDialog() to programmatically trigger ReportButton modal ([280658d](https://github.com/WebNaresh/glitchgrab/commit/280658d8e42cb7786dfee583a29b96153371c4b6))
* **sdk:** pass description in openReportDialog custom event detail ([1dbabe0](https://github.com/WebNaresh/glitchgrab/commit/1dbabe03d8e38d646edbe974a82cdaa83c50eb4e))
* **sdk:** pre-fill description textarea from openReportDialog event detail ([c9a047d](https://github.com/WebNaresh/glitchgrab/commit/c9a047d69d0a2b9dc09f21b9d38d4f206eaf1280))
* **sdk:** update openReportDialog type to accept optional description ([826920c](https://github.com/WebNaresh/glitchgrab/commit/826920c02f6b30fe31454b9b9a4f256003f9e32c))

### Bug Fixes

* **billing:** check live Razorpay status before creating new subscription ([4ee70ad](https://github.com/WebNaresh/glitchgrab/commit/4ee70ad922edfeeebc29c2be4ad14bc17311e405))
* **billing:** fetch subscription status live from Razorpay API instead of stale DB ([3b6a495](https://github.com/WebNaresh/glitchgrab/commit/3b6a495713c3d1208d501f99105e293e7fde1ce3))
* **billing:** only store razorpay subscription ID on verify, no status ([bd64bf7](https://github.com/WebNaresh/glitchgrab/commit/bd64bf77e2cd9ff35902f310a4c2915974ebbd1b))

### Performance Improvements

* **billing:** pass pre-fetched plan to getTrialStatus to avoid redundant API call ([2b2cc09](https://github.com/WebNaresh/glitchgrab/commit/2b2cc09fa59d059f845f92ebb903481cfb86e433))

## [1.4.1](https://github.com/WebNaresh/glitchgrab/compare/v1.4.0...v1.4.1) (2026-03-28)

### Bug Fixes

* **sdk-api:** remove status, rawInput, source, pageUrl from SDK reports response ([951095a](https://github.com/WebNaresh/glitchgrab/commit/951095a5e5028a8425e833ec12d95fe6ca388651))

## [1.4.0](https://github.com/WebNaresh/glitchgrab/compare/v1.3.0...v1.4.0) (2026-03-27)

### Features

* **sdk:** add useGlitchgrabActions hook with isPending, error, onSuccess, onError callbacks ([b6c700c](https://github.com/WebNaresh/glitchgrab/commit/b6c700c8aacf0939bb0dfd2345451d19940df19d))

### Bug Fixes

* **proxy:** add CORS for /api/v1/reports routes used by SDK actions ([2e2ee15](https://github.com/WebNaresh/glitchgrab/commit/2e2ee158d5b23d7613dd20321af61c944f23f2d0))
* **sdk:** add session to report callback deps so session data is included in reports ([f244e81](https://github.com/WebNaresh/glitchgrab/commit/f244e818313232cd238855b8a14d73e24de26e9c))

## [1.3.0](https://github.com/WebNaresh/glitchgrab/compare/v1.2.3...v1.3.0) (2026-03-27)

### Features

* **sdk:** add limit option to useGlitchgrabReports and update README with hook + TanStack Query examples ([cad4ebf](https://github.com/WebNaresh/glitchgrab/commit/cad4ebf530def378ae8302c263a751dc2748582d))
* **sdk:** add useGlitchgrabReports hook and fetchGlitchgrabReports fetcher ([d43822e](https://github.com/WebNaresh/glitchgrab/commit/d43822e7ff9739f6420f0b389e1b43225b28dc4b))

### Bug Fixes

* **sdk-report:** remove debug console.log statements ([3f0bf8e](https://github.com/WebNaresh/glitchgrab/commit/3f0bf8efdd018c5db2d53a7f7a62e217610094a5))

## [1.2.3](https://github.com/WebNaresh/glitchgrab/compare/v1.2.2...v1.2.3) (2026-03-27)

### Bug Fixes

* **s3:** hardcode cdn.glitchgrab.dev for screenshot URLs ([7d4db8e](https://github.com/WebNaresh/glitchgrab/commit/7d4db8e8093762721f83413dbbab042bec31ad15))

## [1.2.2](https://github.com/WebNaresh/glitchgrab/compare/v1.2.1...v1.2.2) (2026-03-27)

### Bug Fixes

* **sdk-report:** add S3 upload debug logging to diagnose screenshot failures ([46fdc1b](https://github.com/WebNaresh/glitchgrab/commit/46fdc1b7f504120746180cdfcb11ae91e1c7d547))
* **sdk:** await reportBug response before showing success message ([d9c01b3](https://github.com/WebNaresh/glitchgrab/commit/d9c01b38ac76560ac4680b7a4440e5682c4341ee))
* **sdk:** use www.glitchgrab.dev to avoid naked domain redirect breaking CORS preflight ([bccbbd4](https://github.com/WebNaresh/glitchgrab/commit/bccbbd41d3c762420b468d0aac4ea5f15d591034))

## [1.2.1](https://github.com/WebNaresh/glitchgrab/compare/v1.2.0...v1.2.1) (2026-03-27)

### Bug Fixes

* **proxy:** add CORS for SDK API routes in proxy.ts, remove incorrect middleware.ts ([b872920](https://github.com/WebNaresh/glitchgrab/commit/b872920609bfa7a012adb4cabff38c25bb65e2ee))

### Reverts

* Revert "chore: remove dead proxy.ts replaced by middleware.ts" ([7187bbe](https://github.com/WebNaresh/glitchgrab/commit/7187bbee68209dfb7a6d6ae750ca978bc8e1c15b))

## [1.2.0](https://github.com/WebNaresh/glitchgrab/compare/v1.1.1...v1.2.0) (2026-03-27)

### Features

* **middleware:** add CORS for SDK API routes and merge with dashboard auth guard ([ef00849](https://github.com/WebNaresh/glitchgrab/commit/ef008495cb2d508e488dce4305bd317efec0f4ce))
* **sdk:** auto-detect light/dark theme and adapt modal colors ([16227a5](https://github.com/WebNaresh/glitchgrab/commit/16227a5051625d547f74ce7611b8262badae0046))

### Bug Fixes

* **sdk:** default baseUrl to glitchgrab.dev instead of window.location.origin ([976ab41](https://github.com/WebNaresh/glitchgrab/commit/976ab4122f2bade71d632efec21baab4a464d548))
* **sdk:** max z-index to cover all host elements, fix button colors for light theme ([2c0765c](https://github.com/WebNaresh/glitchgrab/commit/2c0765c0a421f2ca7ee94f5790cad2bb1f289b45))
* **sdk:** render modal in portal to escape host stacking contexts ([eeb58cd](https://github.com/WebNaresh/glitchgrab/commit/eeb58cd28b1d8a672588eddaa8d640f7696a2ac1))
* **sdk:** replace × characters with SVG icons and add isolation to prevent host CSS bleed ([220447d](https://github.com/WebNaresh/glitchgrab/commit/220447d88ef0fcd6aced368d350bf0456aedd288))

## [1.1.1](https://github.com/WebNaresh/glitchgrab/compare/v1.1.0...v1.1.1) (2026-03-27)

### Bug Fixes

* **ci:** enable GitHub Release creation in SDK publish workflow ([7ec3b04](https://github.com/WebNaresh/glitchgrab/commit/7ec3b04f8142336901c34a1e1d13de0f3ae4d96b))

## [1.1.0](https://github.com/WebNaresh/glitchgrab/compare/v1.0.0...v1.1.0) (2026-03-27)

### Features

* **sdk:** add changelog generation to SDK release workflow ([9e5650b](https://github.com/WebNaresh/glitchgrab/commit/9e5650badf5d48fcb3cb34f370c493cf263e1ed5))

## 1.0.0 (2026-03-27)

### Features

* **ai:** add chat history context (last 5 msgs), proactive merge, and better prompting ([0ed7a58](https://github.com/WebNaresh/glitchgrab/commit/0ed7a58b5702dc3830750e4d00c931c4cab33a2c))
* **ai:** add clarify intent and repo-aware context for smart questioning ([a5ad63e](https://github.com/WebNaresh/glitchgrab/commit/a5ad63e450e3d05b124e3d88ef5aa196ba5dae16))
* **ai:** add intent detection — create, update, close, or chat based on user input and open issues ([ecc6ba3](https://github.com/WebNaresh/glitchgrab/commit/ecc6ba367b4230d3060ebb9a3ea667c872981580))
* **ai:** add merge action to combine related issues into one ([01d0076](https://github.com/WebNaresh/glitchgrab/commit/01d00766c72332548f10860b023b19c366fe0a38))
* **ai:** add OpenAI GPT-4o service to generate structured GitHub issues from bug descriptions ([ea84e2f](https://github.com/WebNaresh/glitchgrab/commit/ea84e2fcc4e51192ed5cfc2ad4dbd28d7bae6d34))
* **ai:** improve dedup with recent issues context, ask for clarification, use gpt-4o for screenshots ([846d307](https://github.com/WebNaresh/glitchgrab/commit/846d30717aa68da95d141214b5b93b45dc9ee323))
* **ai:** return structured options with clarify questions for interactive UI ([1c3025d](https://github.com/WebNaresh/glitchgrab/commit/1c3025d5f6a4684a86823f12939a667669c86965))
* **api:** accept breadcrumbs, device info, and report type from SDK ([b9dd3c7](https://github.com/WebNaresh/glitchgrab/commit/b9dd3c71bc1ea90107996f61ed096ca2973d015e))
* **api:** accept collab session and verify shared repo access in reports ([940a215](https://github.com/WebNaresh/glitchgrab/commit/940a2151dd8fa854f4d7c68153004e0c60c9f0ed))
* **api:** accept suggestion field in waitlist survey ([0677772](https://github.com/WebNaresh/glitchgrab/commit/06777722b87993ee341dcd79075966950080b446))
* **api:** accept survey responses and update waitlist entry ([d1fc3db](https://github.com/WebNaresh/glitchgrab/commit/d1fc3db843f8235e2ec0be02ed9b19422f2a6dad))
* **api:** add GET /collaborators endpoint to list invited collaborators ([2682848](https://github.com/WebNaresh/glitchgrab/commit/2682848d8516252eb168467f1acc3765c11dec36))
* **api:** add GET /collaborators/accept for magic link verification ([f988052](https://github.com/WebNaresh/glitchgrab/commit/f98805218a9deead01758bb7ab74a55d04b93116))
* **api:** add GitHub repos endpoint to fetch user repos via OAuth token ([67349d6](https://github.com/WebNaresh/glitchgrab/commit/67349d6b688692ac0ce6d422df3ecfc72079c543))
* **api:** add GitHub webhook listener to forward issue events to client webhooks ([fc86379](https://github.com/WebNaresh/glitchgrab/commit/fc86379f45ada05641e1e8efa557c00d7ab56a5e))
* **api:** add mobile auth endpoint — exchanges GitHub token for NextAuth JWT session ([82b7da1](https://github.com/WebNaresh/glitchgrab/commit/82b7da17d871ffabf24f4adc662a49201409eaa9))
* **api:** add PATCH /collaborators/:id/repos to update repo access ([6cb6d78](https://github.com/WebNaresh/glitchgrab/commit/6cb6d78703bcf3946470a7cb8495d2977502c8c6))
* **api:** add PATCH /collaborators/:id/revoke to revoke access ([6bba8f1](https://github.com/WebNaresh/glitchgrab/commit/6bba8f16f8642525077c90a65bc02857f4f7e0db))
* **api:** add POST /api/v1/reports endpoint for dashboard bug submissions ([e671f53](https://github.com/WebNaresh/glitchgrab/commit/e671f53a5911a5f6c396734227b0c051ff1bb43a))
* **api:** add POST /api/waitlist endpoint with email validation and dedup ([5de4fca](https://github.com/WebNaresh/glitchgrab/commit/5de4fca715e21ab9726f844925a2b080a96046b6))
* **api:** add POST /collaborators/invite to send magic link invitations ([0a96db0](https://github.com/WebNaresh/glitchgrab/commit/0a96db002754eef99138fa9c25a4d696a4d27a15))
* **api:** add POST /collaborators/report for collaborator bug submissions ([eae3a8f](https://github.com/WebNaresh/glitchgrab/commit/eae3a8fe8616da1267a6319f6181a0e58566d69b))
* **api:** add rate limiting to SDK report endpoint with 429 response ([c343bbf](https://github.com/WebNaresh/glitchgrab/commit/c343bbff10b1c910378cf26c8357e6d51b3cdcba))
* **api:** add Razorpay billing endpoints — subscribe, verify, and webhook ([b4a114a](https://github.com/WebNaresh/glitchgrab/commit/b4a114aaaa5042ae6170cfa019e9143f23bf740e))
* **api:** add SDK report endpoint with token auth, auto-capture, and user report support ([b5f9e81](https://github.com/WebNaresh/glitchgrab/commit/b5f9e816cfefb01231662e7d12f6caf87c2f96c3))
* **api:** integrate AI pipeline into reports endpoint for real issue creation ([6565145](https://github.com/WebNaresh/glitchgrab/commit/6565145b2993f3fa06d6ddf2b350907be4940f51))
* **api:** return intent type in report response for multi-action chat ([4eae2a7](https://github.com/WebNaresh/glitchgrab/commit/4eae2a7961ed23deaeba710c404dd5a9597cd97b))
* **api:** send welcome email to user and notification to admin on waitlist signup ([09f2f37](https://github.com/WebNaresh/glitchgrab/commit/09f2f3798ddb9b66fb7a09583797ef6884b3e8df))
* **api:** update billing APIs to support BYOK and Platform plan selection ([f4dd9cd](https://github.com/WebNaresh/glitchgrab/commit/f4dd9cd4b94593d18a71938e068b01dda2aca146))
* **auth:** add AuthSessionProvider wrapper for client-side session access ([c2dc17c](https://github.com/WebNaresh/glitchgrab/commit/c2dc17cf78980a60c0ed27abf2179c8f53745768))
* **auth:** add JWT-based middleware to protect /dashboard routes ([08992e9](https://github.com/WebNaresh/glitchgrab/commit/08992e9620f49f200d7663252be98771f5c9470a))
* **auth:** add lightweight collaborator session with HMAC-signed tokens ([c66773c](https://github.com/WebNaresh/glitchgrab/commit/c66773c981524c04a1bc630b9a026832e2cfc85c))
* **auth:** add NextAuth route handler for /api/auth/* ([3dedca1](https://github.com/WebNaresh/glitchgrab/commit/3dedca1d9ad44b123ba5eee95409f9fbc0117711))
* **auth:** add NextAuth v5 config with GitHub OAuth, JWT sessions, and Prisma adapter ([e98cdc0](https://github.com/WebNaresh/glitchgrab/commit/e98cdc05398bb76b7fca7522cbd13db9c0029e8b))
* **billing:** add billing dashboard page with plan info and Razorpay upgrade flow ([28026e5](https://github.com/WebNaresh/glitchgrab/commit/28026e584e01808cb4bd586f86da8977796c23be))
* **billing:** add cancel button to active subscription card ([1b7b72a](https://github.com/WebNaresh/glitchgrab/commit/1b7b72ab63894321ce8e82c6c76eaafe4c84ebb1))
* **billing:** add cancel subscription API route with end-of-period cancellation ([e675683](https://github.com/WebNaresh/glitchgrab/commit/e675683c44366e0fb21334b5d3051eb24a4b1eb7))
* **billing:** add cancel subscription button with confirmation dialog ([de41b26](https://github.com/WebNaresh/glitchgrab/commit/de41b2651fd22d8039f924dc001dfca43a02ca54))
* **billing:** add full-screen PaywallBlock with Razorpay plan cards ([8421371](https://github.com/WebNaresh/glitchgrab/commit/8421371a121a4452dcdebfc19c20e2f72c1446be))
* **billing:** add getTrialStatus helper for 2-day free trial calculation ([c7f7f0c](https://github.com/WebNaresh/glitchgrab/commit/c7f7f0cf89992d40bb33d1a72eac7356633c1f91))
* **billing:** add Glitchgrab logo and dark backdrop to Razorpay checkout ([103e7d7](https://github.com/WebNaresh/glitchgrab/commit/103e7d79fb816ce9139961a5e678279ebeda477d))
* **billing:** add non-dismissable welcome trial dialog for new users ([e44542d](https://github.com/WebNaresh/glitchgrab/commit/e44542daf804ca3ba4858f476b4582ddd9c035fa))
* **billing:** add PaywallGuard server component to gate dashboard access ([2ec30ca](https://github.com/WebNaresh/glitchgrab/commit/2ec30ca61e98504951a5d5e80fc81bff8fbd760c))
* **billing:** add plan checking with repo and issue limits for free vs pro ([c11b963](https://github.com/WebNaresh/glitchgrab/commit/c11b963def697b5af0ade456ded2381c5c553e71))
* **billing:** add PlanBadge component with premium, trial, and byok variants ([854fd68](https://github.com/WebNaresh/glitchgrab/commit/854fd68ca9227f8e68b092bd3456615d4edceb83))
* **billing:** add Razorpay client initialization and plan constants ([a527a9e](https://github.com/WebNaresh/glitchgrab/commit/a527a9e8d413e12921ed74611bfee95cc5b5adb3))
* **billing:** add razorpay:create-plans script using dotenvx ([041045c](https://github.com/WebNaresh/glitchgrab/commit/041045cda6cdc51da7b46c0f29b037f9762334b2))
* **billing:** add razorpayPlanId to PLANS config for subscription-based billing ([b74b4e7](https://github.com/WebNaresh/glitchgrab/commit/b74b4e7776a16e0c6b5a5992907a6286216f72ed))
* **billing:** add script to create Razorpay subscription plans for dev and prod ([d0b7cae](https://github.com/WebNaresh/glitchgrab/commit/d0b7cae1896fb89b74eba4d7f8bea0e34ef27f4f))
* **billing:** add TrialBanner countdown component for trial period ([fa5eabc](https://github.com/WebNaresh/glitchgrab/commit/fa5eabc4a1d1417b1f99485f43982bc45d1fffbd))
* **billing:** delay first Razorpay charge until trial ends ([81ac2b0](https://github.com/WebNaresh/glitchgrab/commit/81ac2b0c3bceae06007a8b2ca7a621ba396cf3f9))
* **billing:** extend trial period from 2 to 7 days ([5d11b37](https://github.com/WebNaresh/glitchgrab/commit/5d11b37f3ee75a5f4b68fa0a17c2a783731a969a))
* **billing:** fetch plan status and pass badge type to sidebar and bottom nav ([d68d113](https://github.com/WebNaresh/glitchgrab/commit/d68d11388b71bf1a46e64d3ae048b91974903a40))
* **billing:** handle subscription lifecycle webhooks for recurring billing ([6e90c75](https://github.com/WebNaresh/glitchgrab/commit/6e90c752521187eb5e518426d23c2dc7f09e3932))
* **billing:** re-enable PaywallGuard to enforce subscription ([32918cb](https://github.com/WebNaresh/glitchgrab/commit/32918cb3e3b740782162fff9b4b25c5bd101d146))
* **billing:** rebuild billing page with 2-tier plan cards and Razorpay checkout ([0c9e39f](https://github.com/WebNaresh/glitchgrab/commit/0c9e39fcb7c012c31b732dfb1897cb7bc26b07af))
* **billing:** show welcome dialog for all trial users without subscription ([fae8a38](https://github.com/WebNaresh/glitchgrab/commit/fae8a38112daa7f6eba89ac29ce3da1ad141afbd))
* **billing:** switch pricing to INR — ₹99 BYOK, ₹199 Platform AI ([e3ddb06](https://github.com/WebNaresh/glitchgrab/commit/e3ddb0690a1f39e382dd942bcf63e588740e3a21))
* **billing:** switch subscribe route from one-time orders to recurring subscriptions ([22f1b96](https://github.com/WebNaresh/glitchgrab/commit/22f1b9668045af7a20dd2994e4717947ff0aeea0))
* **billing:** update pricing UI to ₹99 and ₹199 INR ([59f37a4](https://github.com/WebNaresh/glitchgrab/commit/59f37a475e2f1d330ef9f8cd74a28c540165251f))
* **billing:** use Razorpay subscription checkout instead of one-time order ([62aa996](https://github.com/WebNaresh/glitchgrab/commit/62aa996c78afaab67fff943268da66df2ce621f6))
* **billing:** verify subscription payments using subscription_id instead of order_id ([f220b58](https://github.com/WebNaresh/glitchgrab/commit/f220b58786809afa02ea5c615de64e4376328dc7))
* **billing:** wrap dashboard layout with PaywallGuard to block expired trials ([e280c92](https://github.com/WebNaresh/glitchgrab/commit/e280c923884e689fed668acc986a76804110a91c))
* **bottom-nav:** add Report Bug tab and sidebar link in mobile menu sheet ([2d02026](https://github.com/WebNaresh/glitchgrab/commit/2d020262d3b4b4f13f509cfbe413d68977ea4af6))
* **bottom-nav:** add Reports nav item to mobile menu ([0f3ca23](https://github.com/WebNaresh/glitchgrab/commit/0f3ca234eff9961979508204c4303c36368fc516))
* **bottom-nav:** show plan badge next to username in mobile menu ([cc0aa36](https://github.com/WebNaresh/glitchgrab/commit/cc0aa36b282be1bc3d8559dd6586afef8c6b8f6a))
* **bottom-nav:** show user avatar with plan badge dot instead of generic profile icon ([38dd9f4](https://github.com/WebNaresh/glitchgrab/commit/38dd9f41b2f617118661b46c9ced3c0f70e0d1a4))
* **changelog:** add changelog link to landing page footer ([9277ee2](https://github.com/WebNaresh/glitchgrab/commit/9277ee2c57eeb0ac5f700a84d680d74296f445e1))
* **changelog:** add public changelog page that renders CHANGELOG.md at build time ([23f8921](https://github.com/WebNaresh/glitchgrab/commit/23f8921209c36377ec35fe3cfc9d35d0c8cab944))
* **chat:** add multi-select images, new chat button, and transparent screenshot background ([c2d9d16](https://github.com/WebNaresh/glitchgrab/commit/c2d9d1660b2a3c2c7f24683bce0f0b79722dce61))
* **chat:** handle clarify intent in bug chat UI ([2a8ab2c](https://github.com/WebNaresh/glitchgrab/commit/2a8ab2c192af9674ab48b9127b8264c0c13e5dcc))
* **ci:** add CI workflow for PR validation — lint, typecheck, knip, pruny, build ([43d7855](https://github.com/WebNaresh/glitchgrab/commit/43d78553d9791c177c8ab0d7e46847b0a84fc602))
* **ci:** add GitHub Release with APK download on app-v tags ([90fb9df](https://github.com/WebNaresh/glitchgrab/commit/90fb9dfdb39c84cd845f25650bb227826914af33))
* **ci:** add GitHub workflow to build Android APK via EAS ([f6009f6](https://github.com/WebNaresh/glitchgrab/commit/f6009f696fff26e49d073996d6199765a53688e2))
* **ci:** add GitHub workflow to publish SDK to npm on tag ([4de5cea](https://github.com/WebNaresh/glitchgrab/commit/4de5ceaf850ed6c930757976a27a30edf81b5f1c))
* **ci:** add release workflow for auto-generating changelog on push to main ([c8ff0b9](https://github.com/WebNaresh/glitchgrab/commit/c8ff0b94fbf692528c8781b3f101a3af3578985f))
* **ci:** add Vercel deploy hook workflow for main branch deploys ([c4363f4](https://github.com/WebNaresh/glitchgrab/commit/c4363f4083ca864351a26a8c60df7b0b0cad060e))
* **ci:** replace manual SDK publish with semantic-release workflow ([3641abb](https://github.com/WebNaresh/glitchgrab/commit/3641abb22d177855feca0eb6f5646d8e042e8070))
* **collaborate:** add bug report form with repo selector and screenshot upload ([01af895](https://github.com/WebNaresh/glitchgrab/commit/01af89519f2788664b67e2b031afec517b9107b4))
* **collaborate:** add magic link accept page with token verification ([fa29d2e](https://github.com/WebNaresh/glitchgrab/commit/fa29d2eaf6d45ec0e9e4d6e1200e30f464026bb3))
* **collaborate:** add minimal layout for collaborator pages ([aa52b8b](https://github.com/WebNaresh/glitchgrab/commit/aa52b8b5156d3c6e9ea18c8a7fc6696030726113))
* **collaborate:** add restricted report page for collaborators ([076260c](https://github.com/WebNaresh/glitchgrab/commit/076260cc7c9effeae4e1293031bb9debba09d0ab))
* **collaborators:** add Edit repos button for accepted collaborators ([664f9d9](https://github.com/WebNaresh/glitchgrab/commit/664f9d9d8278528874ca3a58ccbcb09d003eb15e))
* **collaborators:** add edit repos dialog to update collaborator repo access ([3001504](https://github.com/WebNaresh/glitchgrab/commit/3001504925057a6dd1c95de66275251fcd104ca6))
* **collaborators:** replace confirm() with AlertDialog for remove action ([5ccdd17](https://github.com/WebNaresh/glitchgrab/commit/5ccdd17506d0dedb920e67e4169169eea09431b5))
* **contact:** add API route to send contact form emails ([84076b5](https://github.com/WebNaresh/glitchgrab/commit/84076b599d07c23bb5d79369fea53b4960c97809))
* **contact:** add contact form component with useMutation ([3c8b3d3](https://github.com/WebNaresh/glitchgrab/commit/3c8b3d339d791915a7ca510961b0982e20fd06b9))
* **dashboard:** add API tokens page with token list ([e782f54](https://github.com/WebNaresh/glitchgrab/commit/e782f5434e72d020f7ed9e56bde68205c617562d))
* **dashboard:** add Billing link to sidebar and mobile nav ([04900a5](https://github.com/WebNaresh/glitchgrab/commit/04900a5ee4dbe9b4988dcd8dc73ee3c5f59f4c66))
* **dashboard:** add chat-based bug reporter with repo selector and screenshot attach ([b6c939c](https://github.com/WebNaresh/glitchgrab/commit/b6c939c3a2fd61d7338c26d6e1a1dd2ecfbc7f29))
* **dashboard:** add clipboard paste support for screenshots in chat input ([1336a1f](https://github.com/WebNaresh/glitchgrab/commit/1336a1f056d65bdfcfecbfb91171cb4c63e4d120))
* **dashboard:** add collaborators page with invite list and status badges ([030f20d](https://github.com/WebNaresh/glitchgrab/commit/030f20dbb82ff5ac86d61f5e162f135458dcd364))
* **dashboard:** add dashboard layout with sidebar and mobile nav ([cb0167d](https://github.com/WebNaresh/glitchgrab/commit/cb0167ddab70082fb4eedc6fdd788c01faee4526))
* **dashboard:** add desktop sidebar with nav, user info, and sign-out ([f5720f5](https://github.com/WebNaresh/glitchgrab/commit/f5720f5bd68f1aba2756d40fa8afc76b872162f2))
* **dashboard:** add dual auth support for owner and collaborator sessions ([684f08e](https://github.com/WebNaresh/glitchgrab/commit/684f08e8991abe908192782ff4d8026073149ab6))
* **dashboard:** add error boundary page with retry button ([4f114fe](https://github.com/WebNaresh/glitchgrab/commit/4f114fe2d27bd3f9400aa59d646a34025b96f0a9))
* **dashboard:** add InteractiveQuestions card with option buttons, custom input, and skip ([c87b3f5](https://github.com/WebNaresh/glitchgrab/commit/c87b3f5144ad8ec0f98b0ff478a28f606ec668d8))
* **dashboard:** add invite collaborator dialog with email and repo multi-select ([24cb720](https://github.com/WebNaresh/glitchgrab/commit/24cb7209f8e8551e1a49335c55b87797aa156014))
* **dashboard:** add loading spinner for page transitions ([50baddd](https://github.com/WebNaresh/glitchgrab/commit/50badddf16c60b96c39b3122906d2fa233e6cd6d))
* **dashboard:** add mobile navigation with sheet drawer ([d5da817](https://github.com/WebNaresh/glitchgrab/commit/d5da8177c3192a886f917ea58d43d21ef41c9e61))
* **dashboard:** add overview page with stats cards and empty state ([66843a0](https://github.com/WebNaresh/glitchgrab/commit/66843a0c65c3eb79adcdbb051a17d5d6138169e9))
* **dashboard:** add ReportBugButton with capture-first-then-modal UX ([842cf80](https://github.com/WebNaresh/glitchgrab/commit/842cf807fe023517d060ed2468800eb7dd5a4ea9))
* **dashboard:** add repos page with connected repos list ([2f510b5](https://github.com/WebNaresh/glitchgrab/commit/2f510b5e8ea8c824d10d11a4007a28ce2220b164))
* **dashboard:** add retry button on failed messages with original screenshot preserved ([b861be9](https://github.com/WebNaresh/glitchgrab/commit/b861be9142a0f5384480c25909bec4447af9bebf))
* **dashboard:** add revoke access button for collaborators ([07e1083](https://github.com/WebNaresh/glitchgrab/commit/07e108367d6ed031ffc4444de6a5589bfb4a668c))
* **dashboard:** add settings page with account info and AI config placeholder ([a454a5b](https://github.com/WebNaresh/glitchgrab/commit/a454a5b056a820a63b6d4376f92bef9111491551))
* **dashboard:** handle 'ask me questions' locally with test questions for reliable testing ([0f91048](https://github.com/WebNaresh/glitchgrab/commit/0f910483cef32510cfac63f1ec9b853846ba7bb4))
* **dashboard:** handle create, update, close, and chat responses in bug chat ([10911c0](https://github.com/WebNaresh/glitchgrab/commit/10911c0ca75488eb35fd67b7271bf31d4876f6d7))
* **dashboard:** integrate interactive questions into bug chat with dismiss and submit ([b0160a5](https://github.com/WebNaresh/glitchgrab/commit/b0160a5ac663a4c990178fcc1b04cc349935ed1d))
* **dashboard:** show shared repos in BugChat for collaborators ([4d9fc34](https://github.com/WebNaresh/glitchgrab/commit/4d9fc3431af1ac745ca26b528ebd3db2935bf525))
* **db:** add full schema with User, Repo, ApiToken, Report, Issue, AiConfig models ([8797a02](https://github.com/WebNaresh/glitchgrab/commit/8797a02837c1f928ffa096b072340767a8780644))
* **db:** add init migration with all tables, enums, and foreign keys ([11f73ea](https://github.com/WebNaresh/glitchgrab/commit/11f73eadd83dc03aa30656b885ce467b7cdd7e4a))
* **db:** add migration for subscription billing tables ([8b5e96c](https://github.com/WebNaresh/glitchgrab/commit/8b5e96c144a0a534d9eb9ca748a4bd0235cfe4dd))
* **db:** add migration for waitlist suggestion field ([a992fc7](https://github.com/WebNaresh/glitchgrab/commit/a992fc7fe7de5702c13e41fbe67cf22989e042d9))
* **db:** add migration for waitlist survey fields ([4885c1d](https://github.com/WebNaresh/glitchgrab/commit/4885c1da3eddf46dc5d1bee0765ccf014b4ab278))
* **db:** add migration for webhook table ([174a15e](https://github.com/WebNaresh/glitchgrab/commit/174a15ebab9bdac2552c4d28c592edc9169db9af))
* **db:** add Prisma schema with Waitlist model for email capture ([38668ee](https://github.com/WebNaresh/glitchgrab/commit/38668eeeacbae94d31e37e04c52ad5b543e97cb2))
* **db:** add Subscription model with plan, status, and Razorpay fields ([8fc3aed](https://github.com/WebNaresh/glitchgrab/commit/8fc3aed6ad812bd620a043db95a4aee710b222c6))
* **db:** add suggestion field to Waitlist model ([bd66d37](https://github.com/WebNaresh/glitchgrab/commit/bd66d37138d4199bd7e33b860c53a4d17c9e758f))
* **db:** add survey fields to Waitlist model for pricing and feature validation ([a337d9b](https://github.com/WebNaresh/glitchgrab/commit/a337d9be348b8a982ffebed17db007779d89f874))
* **db:** add Webhook model for GitHub event forwarding to client apps ([a03fd05](https://github.com/WebNaresh/glitchgrab/commit/a03fd056f52ee34a23eb74fd31202f4b7103d229))
* **github:** add comment, close, and fetch open issues API functions ([915d9a0](https://github.com/WebNaresh/glitchgrab/commit/915d9a0ee76331a8c6ce3a69d078ff2cdaa0bf8e))
* **github:** add fetchIssueBody to retrieve full issue content for merges ([7e1663a](https://github.com/WebNaresh/glitchgrab/commit/7e1663a17118d665a8e1c3cff6d3f025d5b70742))
* **github:** add fetchRepoReadme and fetchRepoDescription helpers ([b5c3fff](https://github.com/WebNaresh/glitchgrab/commit/b5c3fff758e2e9ad939f79a4787b5c2ff893b3b1))
* **github:** add GitHub API service for creating issues and fetching labels ([3c0d431](https://github.com/WebNaresh/glitchgrab/commit/3c0d4314e16492c563c8559330ccf45ba72e16d4))
* **github:** add screenshot upload to repo via Contents API ([ab0a466](https://github.com/WebNaresh/glitchgrab/commit/ab0a4662210763728086573983df04b9dbeed85f))
* **github:** add updateIssueBody to append content directly to issue body ([154bafd](https://github.com/WebNaresh/glitchgrab/commit/154bafd9e8198872a5951b82ad0518ae09b47cfc))
* **landing:** add auth-aware nav with Sign In and Dashboard links ([e0f6c49](https://github.com/WebNaresh/glitchgrab/commit/e0f6c49c1cf9511f47d84c069578ee9d161346ab))
* **landing:** add Bebas Neue font to Google Fonts import ([d9af2a8](https://github.com/WebNaresh/glitchgrab/commit/d9af2a84a3536d349dcf80a3adeca700218c7a1f))
* **landing:** add flow animations component for landing page ([806e6c4](https://github.com/WebNaresh/glitchgrab/commit/806e6c46a7bd59473bd9b40e32b94f5b83e42caa))
* **landing:** add free-text suggestion box to post-signup survey ([aec7377](https://github.com/WebNaresh/glitchgrab/commit/aec7377a2e638cdefb2ecd7ec68881345caee018))
* **landing:** add full landing page with hero, features, comparison, pricing sections ([a57dcc0](https://github.com/WebNaresh/glitchgrab/commit/a57dcc00e2157f2173092dae7c40a35c3ad0c254))
* **landing:** add hero terminal component with animated capture flow ([498e29a](https://github.com/WebNaresh/glitchgrab/commit/498e29a2ee2d4a6975cb54f236683550a991d18b))
* **landing:** add hero video component for landing page ([c1819c3](https://github.com/WebNaresh/glitchgrab/commit/c1819c3f84d1a78272fd386fe0539416f04253ca))
* **landing:** add hero waitlist component with email input, validation, and avatar stack ([c02feba](https://github.com/WebNaresh/glitchgrab/commit/c02feba835c0bef1592fa4c3dc1d3d83fbb7348f))
* **landing:** add iPhone-style status bar, home indicator, and dynamic island to hero video ([e224c31](https://github.com/WebNaresh/glitchgrab/commit/e224c3162b6df9907279146be87a31712f41a1dd))
* **landing:** add Navibyte logo and link to footer, update feature cards and dedup copy ([e621dc8](https://github.com/WebNaresh/glitchgrab/commit/e621dc8801933d707522f9fc5199769e2ee9029a))
* **landing:** add post-signup survey for pricing, feature priority, and current tool ([9f3899b](https://github.com/WebNaresh/glitchgrab/commit/9f3899bee2851898f6e6ba04884b1e1ae0ce321f))
* **landing:** add privacy, terms, refunds, and contact links to footer ([595e5ef](https://github.com/WebNaresh/glitchgrab/commit/595e5ef492387c4744a745ba08dee4242fd8c4d4))
* **landing:** add waitlist email form with loading and success states ([51d79e6](https://github.com/WebNaresh/glitchgrab/commit/51d79e6aaa1084d32946a6ed560280cd5f8f19de))
* **landing:** redesign features section with stacked cards, numbered steps, and sticky video ([205427e](https://github.com/WebNaresh/glitchgrab/commit/205427eb93872b5a02da1b4f37dcee0fb8eb7fc4))
* **landing:** redesign footer with 4-column grid, add Navibyte attribution and more links ([5267929](https://github.com/WebNaresh/glitchgrab/commit/52679292956ce858e445bccd3770e5b0b98a4cd4))
* **landing:** replace code preview with vertical demo video in phone frame on hero section ([9e949a6](https://github.com/WebNaresh/glitchgrab/commit/9e949a6b999321b74255e3cc506540a890765b3f))
* **landing:** replace CTA buttons with inline waitlist form, add Bebas Neue font to heading ([7a1298b](https://github.com/WebNaresh/glitchgrab/commit/7a1298be4189905bf00c320cfdcfacdfca95c0d6))
* **landing:** replace text logo with glitched G icon in nav and footer ([983bcc6](https://github.com/WebNaresh/glitchgrab/commit/983bcc6b476801d07e07bd8d788b49fc08f5eb22))
* **landing:** update pricing section to Pro BYOK $5/mo and Pro Platform $10/mo ([5c22e8c](https://github.com/WebNaresh/glitchgrab/commit/5c22e8c3f77b9dbe627bb486a3f3bc003739adf7))
* **layout:** wrap app with QueryProvider ([4e4515d](https://github.com/WebNaresh/glitchgrab/commit/4e4515d58440e62af7a18d462e9ae10ef83758a1))
* **legal:** add contact page with email and GitHub links ([268f2f3](https://github.com/WebNaresh/glitchgrab/commit/268f2f3ca665b3df46020f3d5eb7ebb912e2e837))
* **legal:** add privacy policy page ([24e8cc7](https://github.com/WebNaresh/glitchgrab/commit/24e8cc7006e22cb7767beb333b7d48e1ff47d230))
* **legal:** add refund policy page with 7-day guarantee ([89cecde](https://github.com/WebNaresh/glitchgrab/commit/89cecdeb9907f85d19523f54cdb5eaa2a6189676))
* **legal:** add shared layout for legal pages with logo and back link ([587b9a6](https://github.com/WebNaresh/glitchgrab/commit/587b9a60578656b2b53e7aed1d6cff314229d13e))
* **legal:** add terms of service page ([bcd3bc1](https://github.com/WebNaresh/glitchgrab/commit/bcd3bc1b23b3966116bbe691d55a9b648353ea95))
* **lib:** add AES-256-GCM encryption for user API keys ([6545729](https://github.com/WebNaresh/glitchgrab/commit/6545729b963daaec94d0c49b9dee6ec20453ae91))
* **lib:** add in-memory rate limiter with 60 req/hr per token ([091107b](https://github.com/WebNaresh/glitchgrab/commit/091107b919c027b66cd9c550ebad3f0786c499b8))
* **lib:** add token generation (gg_ prefix) and SHA-256 hashing utilities ([db1d0a9](https://github.com/WebNaresh/glitchgrab/commit/db1d0a929cd99ae71812bedca09ce56f6e7cf09d))
* **lib:** add webhook dispatcher with HMAC-SHA256 signature and retry ([ef9322a](https://github.com/WebNaresh/glitchgrab/commit/ef9322a3a6cdff4591bb8aab8e1a2ac616edf027))
* **login:** add code rain, mini terminal, glitch text, and HUD ring animations ([6ecb4b7](https://github.com/WebNaresh/glitchgrab/commit/6ecb4b758354cfa12cf0fc2897776f0c134b7023))
* **login:** add GitHub sign-in button with loading state ([1143be6](https://github.com/WebNaresh/glitchgrab/commit/1143be6bf41272f2512140bba065e5bbb8f1a97b))
* **login:** add login page with GitHub sign-in button ([0a7e54c](https://github.com/WebNaresh/glitchgrab/commit/0a7e54c12a79c9b8880d55b65e19b0e118535e00))
* **login:** redesign login page with animated terminal, code rain bg, and early access warning ([a7613d3](https://github.com/WebNaresh/glitchgrab/commit/a7613d3596218f7fce466a060f6c2805b0f77146))
* **mail:** add sendCollaboratorInvite email with branded template ([ec52798](https://github.com/WebNaresh/glitchgrab/commit/ec527980b69b1f044d69c4b1700923778d281607))
* **mobile:** add android build and install scripts for prod and dev ([07812bd](https://github.com/WebNaresh/glitchgrab/commit/07812bd8f50857a7d9ae4f8b6da2677c6e689163))
* **mobile:** add Android share intent to receive screenshots and create issues ([c89c3f3](https://github.com/WebNaresh/glitchgrab/commit/c89c3f3faf92a39738a34d42af7a9a2e43c4ea1a))
* **mobile:** add API helpers for GitHub OAuth code exchange and session creation ([f0edb0c](https://github.com/WebNaresh/glitchgrab/commit/f0edb0c958b0394e46f097f574ca99641637c6f1))
* **mobile:** add APP_ENV extra config for build-time environment control ([d5b4c7d](https://github.com/WebNaresh/glitchgrab/commit/d5b4c7ddca4f9dfdbf1790ceaa49fc0ab087ecf6))
* **mobile:** add associated domains and collaborate intent filter for deep linking ([5a07584](https://github.com/WebNaresh/glitchgrab/commit/5a0758467cfa16cfc77f5144a993d41cc1189a3b))
* **mobile:** add collaborator deep link handling and collaborator app state ([d1c22b3](https://github.com/WebNaresh/glitchgrab/commit/d1c22b369b701c0f6eaff3075f5d227f2fa30df0))
* **mobile:** add ESLint config with React Native and a11y plugins ([3d30068](https://github.com/WebNaresh/glitchgrab/commit/3d3006858015d5590c872ccbf5d3fa71e9fbc907))
* **mobile:** add Expo wrapper with WebView, dark theme, GitHub OAuth bridge, and offline error screen ([d5a4f44](https://github.com/WebNaresh/glitchgrab/commit/d5a4f44d7e3df0c95416357ecfca3eb90c05210a))
* **mobile:** add expo-clipboard for native clipboard bridge ([f3c3d0a](https://github.com/WebNaresh/glitchgrab/commit/f3c3d0a51c237ad64bbd3162ac6791a4c38fe910))
* **mobile:** add expo-share-intent plugin for image sharing ([f3c00a0](https://github.com/WebNaresh/glitchgrab/commit/f3c00a0142ce58031a0c6e4fa8a9d1729729929f))
* **mobile:** add lint/validate scripts and ESLint dev dependencies ([b04d1a2](https://github.com/WebNaresh/glitchgrab/commit/b04d1a2e4e4433c29e7f24bf039419dec0a78ac8))
* **mobile:** add loading overlay for shared screenshots and enable pull-to-refresh ([22160dd](https://github.com/WebNaresh/glitchgrab/commit/22160ddfed566ced88f082e332a4ef778fe0b2eb))
* **mobile:** add native login screen with GitHub OAuth via expo-auth-session ([a6827d2](https://github.com/WebNaresh/glitchgrab/commit/a6827d2545f4879b8e006806c943752012cfdc3c))
* **mobile:** add pull-to-refresh for Android using ScrollView RefreshControl ([a65d7f6](https://github.com/WebNaresh/glitchgrab/commit/a65d7f6658c7086a41f265fd8eca3f7d8b97b928))
* **mobile:** add set-env script to swap APP_ENV before builds ([ec163fc](https://github.com/WebNaresh/glitchgrab/commit/ec163fcd519ef2e9df45075631f9fff7a8647530))
* **mobile:** add WebView debug logs for navigation, errors, and render process ([b83e36a](https://github.com/WebNaresh/glitchgrab/commit/b83e36ab843dc8e4da505e934bf0edf769e986cb))
* **mobile:** bridge GitHub OAuth via system browser with openAuthSessionAsync callback ([42f6234](https://github.com/WebNaresh/glitchgrab/commit/42f62345916a8502211032b8bce8ab9a89c50fb6))
* **mobile:** extract WebView into screen with session cookie injection and logout detection ([23e6e98](https://github.com/WebNaresh/glitchgrab/commit/23e6e986638f2726ff0713f9653240cbc6c8a4b0))
* **mobile:** support overrideUrl prop for collaborator WebView mode ([037d53a](https://github.com/WebNaresh/glitchgrab/commit/037d53a453e6aca8ff82bb03355863887a9360be))
* **mobile:** use APP_ENV config for base URL instead of __DEV__ flag ([5aeb200](https://github.com/WebNaresh/glitchgrab/commit/5aeb2004feccbb88e2b7e7d2e99d619729bcfcea))
* **mobile:** use expo-share-intent to handle shared screenshots ([9a7d6da](https://github.com/WebNaresh/glitchgrab/commit/9a7d6dac6f1a19ae410127779d3f378e7974ea55))
* **nav:** add bottom navigation bar with menu sheet for mobile ([1a820af](https://github.com/WebNaresh/glitchgrab/commit/1a820af3919b0a1ebf43570b144753fd62e0a17f))
* **nav:** add Collaborators link to desktop sidebar ([128ff59](https://github.com/WebNaresh/glitchgrab/commit/128ff596ae7fe7279391a6eda719ecd524dafe2b))
* **nav:** add Collaborators link to mobile bottom nav sheet ([439bcce](https://github.com/WebNaresh/glitchgrab/commit/439bcce0a5e56a26c2fb9a2454e260a7a570cb39))
* **nav:** hide owner-only items in mobile nav for collaborators ([e9eae5b](https://github.com/WebNaresh/glitchgrab/commit/e9eae5b2e667ce8c0db2ed4cc85e9b03c4793ad0))
* **nav:** hide owner-only nav items for collaborators ([84e9151](https://github.com/WebNaresh/glitchgrab/commit/84e9151b200356a50602474c47beb51b6e1167fa))
* **pipeline:** add collaborator email attribution to GitHub issues ([c6c8252](https://github.com/WebNaresh/glitchgrab/commit/c6c82527cf5f70e8326a0d2c4c0a565b1a154b4c))
* **pipeline:** add report processing orchestrator — AI generate → GitHub push → DB save ([f0f716d](https://github.com/WebNaresh/glitchgrab/commit/f0f716d1b6a0f6e91966bccfcf73c4694e0c9c0f))
* **pipeline:** add screenshot analysis note and Glitchgrab attribution to GitHub issues ([8bd161c](https://github.com/WebNaresh/glitchgrab/commit/8bd161c368a9619e152ca3e118f655274ff4e4ff))
* **pipeline:** dispatch webhooks after issue create, update, and close ([388a4d0](https://github.com/WebNaresh/glitchgrab/commit/388a4d016b37cc90ad981efe2ddf5b82e4fad054))
* **pipeline:** fetch repo README/description and handle clarify intent ([74bcc45](https://github.com/WebNaresh/glitchgrab/commit/74bcc45f7c0efd766704011d3e571418fa7aa283))
* **pipeline:** handle create, update, close, and chat intents with dedup support ([d25d3bb](https://github.com/WebNaresh/glitchgrab/commit/d25d3bb1a316786ba2c6a48db02847152393d1fd))
* **pipeline:** pass clarifyQuestions through pipeline result to API ([1018072](https://github.com/WebNaresh/glitchgrab/commit/1018072804c7bea95da02ec12f54ff488ef0fcd9))
* **pipeline:** upload screenshot to GitHub repo and embed in issue body ([cf31749](https://github.com/WebNaresh/glitchgrab/commit/cf31749109d6bb309a97eecc45733b326e962a04))
* **providers:** add TanStack Query provider ([0148e08](https://github.com/WebNaresh/glitchgrab/commit/0148e08b756b083d38bfa1c85952c974f3dbe723))
* **providers:** pass auth session to GlitchgrabProvider ([72a0d65](https://github.com/WebNaresh/glitchgrab/commit/72a0d6521353120bb74dbea785a20990d0ad8f98))
* **reports:** add API endpoint to close, reopen, and label GitHub issues ([fc3b4e0](https://github.com/WebNaresh/glitchgrab/commit/fc3b4e0361b9fe8f4c24a43d96337da7320d0a61))
* **reports:** add approve, reject, and close buttons on report cards ([06bea2c](https://github.com/WebNaresh/glitchgrab/commit/06bea2c6ca74939c4055043c83784f17e937b6d7))
* **reports:** add GET handler for fetching reports with filters ([cd7c151](https://github.com/WebNaresh/glitchgrab/commit/cd7c151bab6f09ab626f91c3565d2290c2c5c673))
* **reports:** add report detail page with conversation thread and reply input ([82678a9](https://github.com/WebNaresh/glitchgrab/commit/82678a99a93b46b09c0fe74998bc2f04bd2c02c9))
* **reports:** add reports page showing all bug reports and created issues ([6419495](https://github.com/WebNaresh/glitchgrab/commit/6419495c09912e0d87e6bcf541f48cbb7e94e3ad))
* **reports:** add ReportsTabs client component with OPEN/CLOSED/DELETED/NO ISSUE badges ([0f693b4](https://github.com/WebNaresh/glitchgrab/commit/0f693b406dc8f2fc2275862b441d01f31c214f73))
* **reports:** add tabs for Product Issues vs My Reports with GitHub state sync ([4cddfd4](https://github.com/WebNaresh/glitchgrab/commit/4cddfd4e17bb97c9024379cce6228101e40028de))
* **reports:** display reporter name and primary key on report cards ([aefad8e](https://github.com/WebNaresh/glitchgrab/commit/aefad8e246d35d0607ec432646e4b62c887588d2))
* **reports:** extract reports list into client component ([6675395](https://github.com/WebNaresh/glitchgrab/commit/66753950283fa556e2941feb401fc2acfb2c5c9a))
* **reports:** include clarifyQuestions in API response for interactive flow ([ecbf3fc](https://github.com/WebNaresh/glitchgrab/commit/ecbf3fc1f5bfd6f49052a2745217eb3c76d44d88))
* **reports:** make report titles clickable to open conversation thread ([aed4e38](https://github.com/WebNaresh/glitchgrab/commit/aed4e38cbcdeb63408e2e76b8326e818d3c848a9))
* **reports:** pass isOwner prop to enable action buttons ([3c7de2c](https://github.com/WebNaresh/glitchgrab/commit/3c7de2cb38dd600f1fd404574f55db5662897e92))
* **reports:** pass reporter info to reports tabs component ([07ed90d](https://github.com/WebNaresh/glitchgrab/commit/07ed90d36ae69de53e088b1dc9e0921b09e64980))
* **reports:** support Bearer token auth for issue actions API ([2a36693](https://github.com/WebNaresh/glitchgrab/commit/2a36693c990c474f7baa89866d14fd4e436aeb88))
* **repos:** add connect repo dialog with searchable GitHub repo list ([9c8e261](https://github.com/WebNaresh/glitchgrab/commit/9c8e26194a3d9902fe6b4afcabc241cf6f34d30c))
* **repos:** add GET API route for client-side repo fetching ([d884682](https://github.com/WebNaresh/glitchgrab/commit/d884682e084881617e9c6f3eb217badd0a554290))
* **repos:** add ReposList client component with useQuery and axios ([08ce1bc](https://github.com/WebNaresh/glitchgrab/commit/08ce1bc58f9325f4a02cbd608b0be68e4fe572ef))
* **repos:** add server actions for connecting and disconnecting repos ([4213944](https://github.com/WebNaresh/glitchgrab/commit/4213944fd310181e729722d36f02cd7cc3625758))
* **repos:** auto-setup GitHub webhook on repo when connecting ([4eea523](https://github.com/WebNaresh/glitchgrab/commit/4eea52354fe944d0f527dcc404f4518d69cf3e49))
* **repos:** integrate connect repo dialog into repos page ([12d1a7c](https://github.com/WebNaresh/glitchgrab/commit/12d1a7c3bd2f98a462c9928ae36f7adbf044457c))
* **repos:** show shared repos with badge for collaborators ([284a322](https://github.com/WebNaresh/glitchgrab/commit/284a322e21821f0b8f5f71a6e98db9ec6370a508))
* **s3:** add S3 screenshot upload replacing GitHub repo commits ([a22f22c](https://github.com/WebNaresh/glitchgrab/commit/a22f22c0e87708d7373cf7eacc95d224fd2e1803))
* **schema:** add Collaborator and CollaboratorRepo models with status enum ([69c65bf](https://github.com/WebNaresh/glitchgrab/commit/69c65bf7722af781b64387472e9a7130659e25bf))
* **schema:** add reporter fields (primaryKey, name, email, phone) to Report model ([6f8612b](https://github.com/WebNaresh/glitchgrab/commit/6f8612bd3e15a663578da0da26420044b7602dc8))
* **scripts:** add db-sync script to pull production database to local ([6596af5](https://github.com/WebNaresh/glitchgrab/commit/6596af5d4fc4c1d23e75f7608fdc9c5c848a56d2))
* **sdk-api:** add comment endpoint to post replies on GitHub issues with reporter attribution ([a964cbc](https://github.com/WebNaresh/glitchgrab/commit/a964cbcc2bbcad9106cf928389f133d251c09b50))
* **sdk-api:** add GET endpoint to fetch reports by reporter primary key ([b3bd0d0](https://github.com/WebNaresh/glitchgrab/commit/b3bd0d06e3b5243be8fac6f07737b23ce8cbb651))
* **sdk-api:** add GitHub issue state, labels, and severity to reports response ([29beaf4](https://github.com/WebNaresh/glitchgrab/commit/29beaf4e2fd331a5a26647e8154274e6005c53c2))
* **sdk-api:** add single report detail endpoint with GitHub issue body and comments ([793684b](https://github.com/WebNaresh/glitchgrab/commit/793684b9c61c4889a82e62ae0aa6283bd44acee2))
* **sdk-report:** create GitHub issues directly without AI for user reports ([1cfbc02](https://github.com/WebNaresh/glitchgrab/commit/1cfbc025a2c4f08da2699b81b82483b159d80465))
* **sdk-report:** include environment, page history, and activity log in GitHub issues ([be4f7eb](https://github.com/WebNaresh/glitchgrab/commit/be4f7eb1dad471189c0f936ebb41931c921c8afe))
* **sdk-report:** save reporter session fields and include in GitHub issue body ([6ea72c9](https://github.com/WebNaresh/glitchgrab/commit/6ea72c9cb8efc270f7a75b285f55c526c822d20b))
* **sdk:** add barrel exports for all SDK components and utilities ([b119dab](https://github.com/WebNaresh/glitchgrab/commit/b119dabb4b126ab328a28319d010307de3d52a53))
* **sdk:** add breadcrumb tracker — console, fetch, navigation, and click interception ([25a0537](https://github.com/WebNaresh/glitchgrab/commit/25a0537d58eea2c5b63484d928558e0603786d4d))
* **sdk:** add device info capture and return report result from sendReport ([29e7155](https://github.com/WebNaresh/glitchgrab/commit/29e715585c8fbed49763e31e91555a88a57183d0))
* **sdk:** add floating ReportButton with inline modal for user bug reports ([c280117](https://github.com/WebNaresh/glitchgrab/commit/c28011770a0a00912f61cc132beecbdbd914a313))
* **sdk:** add GlitchgrabProvider with error capture, page tracking, and useGlitchgrab hook ([8abdc43](https://github.com/WebNaresh/glitchgrab/commit/8abdc4321d66c5fc1907ba53e455886104e39db1))
* **sdk:** add GlitchgrabSession type with required userId, name and optional email, phone ([19e8953](https://github.com/WebNaresh/glitchgrab/commit/19e8953cc14b35a86033f507cc3ea57e10a0c1c5))
* **sdk:** add React ErrorBoundary with auto-report and custom fallback ([ac128d6](https://github.com/WebNaresh/glitchgrab/commit/ac128d65095d556f98b54c4797abe318c49f77b7))
* **sdk:** add README, fix types, update exports for headless-first API ([6571ac4](https://github.com/WebNaresh/glitchgrab/commit/6571ac487684a078dd05af57c01820003e7f6798))
* **sdk:** add report types, breadcrumbs, addBreadcrumb hook, and onReportSent callback ([6f343b9](https://github.com/WebNaresh/glitchgrab/commit/6f343b9bc0300f1f30dca456bcedd405e20c406d))
* **sdk:** add semantic-release config for automated versioning ([9d2445d](https://github.com/WebNaresh/glitchgrab/commit/9d2445dca6c625498051b282efcb1704a9808a82))
* **sdk:** add top-right and top-left position options for ReportButton ([d8ccc03](https://github.com/WebNaresh/glitchgrab/commit/d8ccc032ca5f080a9c3891a43eb09a6e857cb478))
* **sdk:** add types for breadcrumbs, device info, report types, and onReportSent callback ([f209046](https://github.com/WebNaresh/glitchgrab/commit/f2090466f0056f0a9e87f91df6d3d22a0b6f92f1))
* **sdk:** add TypeScript types for config, payload, and components ([448034c](https://github.com/WebNaresh/glitchgrab/commit/448034caa0d2742ce837dee829fb6ebbe2d1f6bd))
* **sdk:** add URL sanitization, context capture, and silent report sending ([5be780a](https://github.com/WebNaresh/glitchgrab/commit/5be780a42ab9d91cb9223b3f13717684f072ed14))
* **sdk:** auto-capture page screenshot when ReportButton opens ([a3e6c48](https://github.com/WebNaresh/glitchgrab/commit/a3e6c480e7e023291805197f035de80e2111577c))
* **sdk:** auto-detect baseUrl and skip initialization when token is empty ([7b23e01](https://github.com/WebNaresh/glitchgrab/commit/7b23e01a14d8b70f76a2d8524ca59323c769e798))
* **sdk:** export GlitchgrabSession type ([41a1c5d](https://github.com/WebNaresh/glitchgrab/commit/41a1c5df874f3bf263b022ca64da79319354ea33))
* **sdk:** include breadcrumbs and device info in error boundary reports ([6445077](https://github.com/WebNaresh/glitchgrab/commit/6445077c08a9b7b2edc6711718aead3920e936ea))
* **sdk:** initialize @glitchgrab/nextjs package with tsup build config ([dc4eb41](https://github.com/WebNaresh/glitchgrab/commit/dc4eb41ed5207bdc21477ac765d20cbb00bdfae3))
* **sdk:** refactor ReportButton as headless wrapper with screenshot preview, upload, and retake ([f301a53](https://github.com/WebNaresh/glitchgrab/commit/f301a5372e2f4462d0c006c76161ddb6a6f2fc72))
* **sdk:** send session data (userId, name, email, phone) in report metadata ([69eb8dd](https://github.com/WebNaresh/glitchgrab/commit/69eb8dd834d52c77e01de1d61c5bcc0cf3675c58))
* **seo:** add next-sitemap for automatic sitemap and robots.txt generation ([182177a](https://github.com/WebNaresh/glitchgrab/commit/182177a4b39f2a733d8f0c5540cbf538d8ad908d))
* **settings:** add AI config and webhook management sections ([1227283](https://github.com/WebNaresh/glitchgrab/commit/12272839dfa75d5429eb26c8f824bd1d5ed1df43))
* **settings:** add AI provider selection form with encrypted BYOK key input ([6f1bf00](https://github.com/WebNaresh/glitchgrab/commit/6f1bf006b2d90e615196f588645dd5ecba538b54))
* **settings:** add issue.commented event for developer comments from GitHub ([6dba35b](https://github.com/WebNaresh/glitchgrab/commit/6dba35b75c0f43585142d6c207c8d9a85d6f2f6a))
* **settings:** add server actions for AI config (get, update, delete) ([ff46790](https://github.com/WebNaresh/glitchgrab/commit/ff46790d5a30118323560da074d38e2365a9a084))
* **settings:** add server actions for webhook CRUD ([09ea856](https://github.com/WebNaresh/glitchgrab/commit/09ea8569205631bb670a88a0ebe4ea83b9eb0159))
* **settings:** add webhook management form with secret display and event selection ([abbe2f3](https://github.com/WebNaresh/glitchgrab/commit/abbe2f3a3d53e45f6959720ec61c1f9b4e2cc979))
* **sidebar:** add Report Bug button above user section ([549ac1a](https://github.com/WebNaresh/glitchgrab/commit/549ac1a5659314a54b607e7ddb1a12b106415f95))
* **sidebar:** add Reports nav item ([8af108e](https://github.com/WebNaresh/glitchgrab/commit/8af108efeafd955bdf2b5c9264e34ea2c3c52bb0))
* **sidebar:** show plan badge next to username ([d854471](https://github.com/WebNaresh/glitchgrab/commit/d854471bae4b50d13711d81e2167988cc27b1730))
* **tokens:** add create token dialog with one-time display and copy ([6111956](https://github.com/WebNaresh/glitchgrab/commit/6111956e3d98da2313da765f80dc9d529c1f7bfe))
* **tokens:** add delete token button with loading state ([f393438](https://github.com/WebNaresh/glitchgrab/commit/f3934387694fd33ab24333a8ad76d1fb2e8970bb))
* **tokens:** add server actions for creating and revoking API tokens ([480a98b](https://github.com/WebNaresh/glitchgrab/commit/480a98b480f0f94204db760539779cf2117efa30))
* **tokens:** rebuild tokens page with create dialog, token list, and delete ([29dfd5a](https://github.com/WebNaresh/glitchgrab/commit/29dfd5a0e31ff2ccd82f59d1de144aa29de76f3f))
* **ui:** add alert-dialog component ([de450dd](https://github.com/WebNaresh/glitchgrab/commit/de450dd9a8c80e727c817363ed6d22182099e70c))
* **ui:** add shadcn avatar component ([1768b18](https://github.com/WebNaresh/glitchgrab/commit/1768b183396e8a1bcbda77fbe8e2cc6cf95dd036))
* **ui:** add shadcn badge component ([d935273](https://github.com/WebNaresh/glitchgrab/commit/d9352737b03ad55fd54e23c410d5625660988be0))
* **ui:** add shadcn button component ([17c1f56](https://github.com/WebNaresh/glitchgrab/commit/17c1f56214bd1b3d94ec0d89735c1fc35e8f0ee1))
* **ui:** add shadcn card component ([af30b5a](https://github.com/WebNaresh/glitchgrab/commit/af30b5a8b3fefabd197eebe4f02ac134e1609c4b))
* **ui:** add shadcn dialog component ([315a9d0](https://github.com/WebNaresh/glitchgrab/commit/315a9d0c18bdc13a30029603f54f3b385ecbd622))
* **ui:** add shadcn dropdown-menu component ([3430622](https://github.com/WebNaresh/glitchgrab/commit/34306227c6169f6852ec715d20a44eb7d3a66dca))
* **ui:** add shadcn input component ([82ef90d](https://github.com/WebNaresh/glitchgrab/commit/82ef90d613b95e550289b6f595de3e0b4f7eeb5c))
* **ui:** add shadcn label component ([8d460cb](https://github.com/WebNaresh/glitchgrab/commit/8d460cbe89f3718a69523a685f794bc88a6d37c6))
* **ui:** add shadcn popover component ([33c2307](https://github.com/WebNaresh/glitchgrab/commit/33c230796d84b0643e2a89eb1ec700a16e147675))
* **ui:** add shadcn select component ([71e0bb8](https://github.com/WebNaresh/glitchgrab/commit/71e0bb86f5845daf9e846bc1ae3ae2d88c2fbd92))
* **ui:** add shadcn separator component ([60c13ff](https://github.com/WebNaresh/glitchgrab/commit/60c13ffa02d28428dd61311888afd8576750df10))
* **ui:** add shadcn sheet component ([2d1d000](https://github.com/WebNaresh/glitchgrab/commit/2d1d0005e454aa2345222948778e3b2bd2ae96d4))
* **ui:** add shadcn sonner component ([a300ef4](https://github.com/WebNaresh/glitchgrab/commit/a300ef4cbfabb40abbe331010b87cc3946064fed))
* **ui:** add shadcn table component ([456ffea](https://github.com/WebNaresh/glitchgrab/commit/456ffea816607da76dd5855370dbd2aef2f46ef7))
* **waitlist:** add stats API endpoint for count and recent initials ([b58953e](https://github.com/WebNaresh/glitchgrab/commit/b58953eef38cce4591e6a476c12355e574fdd4ff))
* **web:** add 180x180 rounded apple-touch-icon ([e38a2fc](https://github.com/WebNaresh/glitchgrab/commit/e38a2fce433487e42665b6ae3da4e5b6aebbdeaa))
* **web:** add 192x192 rounded app icon ([839d498](https://github.com/WebNaresh/glitchgrab/commit/839d498319205a527c925dd0050594a6d4bb9784))
* **web:** add clipboard utility with WebView native bridge fallback ([a87cd99](https://github.com/WebNaresh/glitchgrab/commit/a87cd99ff27bdac48a0944cf9a881746172d54db))
* **web:** add cn utility for class merging ([1876cbc](https://github.com/WebNaresh/glitchgrab/commit/1876cbc01840074b103ddc40b23bae3b4e110b71))
* **web:** add dark theme with cyan accent, custom animations, and design tokens ([a6251e0](https://github.com/WebNaresh/glitchgrab/commit/a6251e0b2f63c862759476de789f783d37f8ec5f))
* **web:** add email utility with welcome, signup notification, and survey response emails ([4f4bac5](https://github.com/WebNaresh/glitchgrab/commit/4f4bac590b045d3a14bca08f35b70bf46459cc1b))
* **web:** add ESLint v9 flat config with strict TS, unused imports, and tailwind canonical rules ([33a2d7d](https://github.com/WebNaresh/glitchgrab/commit/33a2d7dc922fd09c9b8d2b17b0f3c126d247a55a))
* **web:** add favicon and touch icons to public directory ([4568957](https://github.com/WebNaresh/glitchgrab/commit/456895755214f70219f3ddcd320359fafa383fdc))
* **web:** add glitchgrab workspace dependency ([2424acb](https://github.com/WebNaresh/glitchgrab/commit/2424acb484652e856c64adf9afe3f43e83a2f17a))
* **web:** add GlitchgrabSDKProvider for self-hosted SDK integration ([1b70010](https://github.com/WebNaresh/glitchgrab/commit/1b700107dcacb275b79ab9a5c7388d2b4bb3c772))
* **web:** add OG image and twitter card image to metadata ([eed8412](https://github.com/WebNaresh/glitchgrab/commit/eed841228fe8159ded81a421d2268d10690dc5e9))
* **web:** add OG social share image with glitched G logo ([2383f3d](https://github.com/WebNaresh/glitchgrab/commit/2383f3d67bf74690210e801db9a8cf8d6882260e))
* **web:** add Prisma client singleton for database access ([55c1b08](https://github.com/WebNaresh/glitchgrab/commit/55c1b08536bf9a67dd1e196ed7c664c37ce16949))
* **web:** add root layout with SEO metadata, OG tags, and font preloads ([973ac7a](https://github.com/WebNaresh/glitchgrab/commit/973ac7aebfd10177b2bc7c18d38b5abdb43d2785))
* **web:** add rounded glitched G favicon ([ff48df3](https://github.com/WebNaresh/glitchgrab/commit/ff48df37c92012421d1f8823edea12a7fb4c0411))
* **web:** add security, react-hooks, and stricter ESLint rules ([7605a00](https://github.com/WebNaresh/glitchgrab/commit/7605a008317a36aa196f4d8cd1b1683f0327ad7a))
* **web:** add SessionProvider, Toaster, favicon links, and metadataBase to layout ([2f80cca](https://github.com/WebNaresh/glitchgrab/commit/2f80cca4feb11664653e9d0b7e0edd1d7a2a9ca4))
* **web:** add validate script with eslint and tsc ([4054838](https://github.com/WebNaresh/glitchgrab/commit/405483874ffcbbfd33b0ff126461daa6fc354af9))
* **web:** replace OG image with landscape logo + tagline version ([fa076d4](https://github.com/WebNaresh/glitchgrab/commit/fa076d4e98f32245ede8b6e22e1e7d8f7244aaa2))
* **web:** set up dark-first Glitchgrab theme with cyan primary for shadcn ([e68f3fd](https://github.com/WebNaresh/glitchgrab/commit/e68f3fde2c830d7dd7fbc8f839fbbf97468d64ed))
* **web:** wrap root layout with GlitchgrabSDKProvider ([474dc48](https://github.com/WebNaresh/glitchgrab/commit/474dc48f166121e6c46f25bb41b9716c0969e9b8))

### Bug Fixes

* **ai:** enforce action-bias in system prompt and include issue bodies for accurate merges ([42e0afc](https://github.com/WebNaresh/glitchgrab/commit/42e0afc98c8e70d615a2e3e3aef99ac46c93f70f))
* **ai:** enforce one-report-one-issue rule to prevent duplicate issue creation ([3277798](https://github.com/WebNaresh/glitchgrab/commit/3277798d7c43a79dfada34fde0389ad426b28f93))
* **ai:** enforce structured options format in clarify rules ([4037743](https://github.com/WebNaresh/glitchgrab/commit/4037743117dc2bc03a015054c94e5efeef03a038))
* **ai:** fallback to direct issue creation when AI returns empty response ([e12ff6b](https://github.com/WebNaresh/glitchgrab/commit/e12ff6b2fb6eb0ded55daabfb3063668028ef18a))
* **ai:** force JSON mode, handle non-JSON responses, and accept any screenshot content ([44634df](https://github.com/WebNaresh/glitchgrab/commit/44634df8625f177b9a0d1272cb8c5869d5b752f0))
* **ai:** move 'ask me questions' clarify rule before CHAT section to prevent override ([163c822](https://github.com/WebNaresh/glitchgrab/commit/163c8224dd8e5562d060ffef4efce3b9d7436b04))
* **ai:** prevent destructive actions on informational queries like 'how many bugs' ([0ba520c](https://github.com/WebNaresh/glitchgrab/commit/0ba520c0c858b6f543628aa042485392e7942dbc))
* **ai:** treat 'ask me questions' as clarify trigger for testing interactive UI ([1aad027](https://github.com/WebNaresh/glitchgrab/commit/1aad0279175ca93778b71cc3c25e1059bac07a5a))
* **api:** add salt parameter for NextAuth v5 JWT encode ([b2decca](https://github.com/WebNaresh/glitchgrab/commit/b2decca439b670ea1243189c814854f87de4e0fc))
* **api:** check both own and shared repo access when submitting reports ([19d0a7d](https://github.com/WebNaresh/glitchgrab/commit/19d0a7d98479996a1ddb706f21764f6aef85fea3))
* **api:** convert uploaded screenshot to base64 data URL for AI vision processing ([55db16d](https://github.com/WebNaresh/glitchgrab/commit/55db16dabd9d2dfcc2e0f511c314a4ff406cafc8))
* **api:** delete collaborator on revoke instead of marking as REVOKED ([4b62dc4](https://github.com/WebNaresh/glitchgrab/commit/4b62dc46377de87b86f7e1187e38a59412055011))
* **api:** exchange OAuth code server-side with mobile client secret for secure token flow ([34596cf](https://github.com/WebNaresh/glitchgrab/commit/34596cf575d788e38123f98bec21194e3fb3a716))
* **api:** forward code_verifier to GitHub for PKCE token exchange ([d041e04](https://github.com/WebNaresh/glitchgrab/commit/d041e04039b1d8b44107016c6694b70af8130057))
* **api:** redirect collaborator accept to /dashboard and remove REVOKED check ([0029d05](https://github.com/WebNaresh/glitchgrab/commit/0029d05e0717827d1d35a919647a1d070e949ded))
* **api:** replace non-null assertion in billing verify ([f6e94fe](https://github.com/WebNaresh/glitchgrab/commit/f6e94fe7b95dce07b7912327699c6fc2d54b20f9))
* **api:** replace non-null assertions with nullish coalescing ([c8c8978](https://github.com/WebNaresh/glitchgrab/commit/c8c89782aea9ff7e7cfcb78934c25ded7413a775))
* **api:** resize screenshots to 1024px before AI processing to prevent token overflow ([42e75a3](https://github.com/WebNaresh/glitchgrab/commit/42e75a3e52c83240834afd3a19ed6e4533f9d127))
* **auth:** add 1.5s delay before redirect to let WebView persist cookie ([3a253a7](https://github.com/WebNaresh/glitchgrab/commit/3a253a72a921958ab9a463e5b4c223cf8bb08500))
* **auth:** add production logging to mobile session endpoint ([a3224dc](https://github.com/WebNaresh/glitchgrab/commit/a3224dcfe041df15eed8583bee3c07d0848c2030))
* **auth:** disable secure cookie prefix so Android WebView can persist session cookies ([24387e6](https://github.com/WebNaresh/glitchgrab/commit/24387e6be737b0127b7ce653a95d351054ff0316))
* **auth:** enable Secure flag on mobile session cookie ([bab813e](https://github.com/WebNaresh/glitchgrab/commit/bab813e5d5d0e3bfcc461f59b366256f70e0be48))
* **auth:** explicitly set secret from env for NextAuth v5 compatibility ([26c3c22](https://github.com/WebNaresh/glitchgrab/commit/26c3c22d6c22f22c19b9028f34843abacdc50d01))
* **auth:** override session cookie name without __Secure- prefix while keeping Secure flag ([17ccaf4](https://github.com/WebNaresh/glitchgrab/commit/17ccaf464a86162e2862b60fc3a51da7424186a9))
* **auth:** redirect to /login on sign out in bottom nav ([a7afd25](https://github.com/WebNaresh/glitchgrab/commit/a7afd25b1e14ada0c9e85d0ee9d3f216490d1136))
* **auth:** redirect to /login on sign out in mobile nav ([0ed8c5b](https://github.com/WebNaresh/glitchgrab/commit/0ed8c5bccdb184d380f7ec5fd8e88be5f061abc8))
* **auth:** redirect to /login on sign out so mobile WebView detects logout ([3c7774f](https://github.com/WebNaresh/glitchgrab/commit/3c7774f6d022d3fee939849e7cee1bd7632ddb21))
* **auth:** return HTML instead of 307 redirect to fix WebView cookie persistence ([2b7c203](https://github.com/WebNaresh/glitchgrab/commit/2b7c203936badd71bdb889eda2ea0e1b9101460c))
* **auth:** set explicit cookie domain .glitchgrab.dev for cross-subdomain access ([9e58e5b](https://github.com/WebNaresh/glitchgrab/commit/9e58e5bf298328052afd1e40ce40dc2da113e7d3))
* **auth:** set secure cookie flag based on protocol so dev mode works over HTTP ([2560ab1](https://github.com/WebNaresh/glitchgrab/commit/2560ab12f4d5d46a9b13de739f72145d12acf04e))
* **auth:** use non-prefixed cookie name for mobile — Android WebView rejects __Secure- cookies ([8d2d5ee](https://github.com/WebNaresh/glitchgrab/commit/8d2d5ee47c624199506ea51138802981274520af))
* **billing:** add null check for userId instead of non-null assertion ([baae63d](https://github.com/WebNaresh/glitchgrab/commit/baae63d50d221ce3fd33f475c835ab6c73e059c1))
* **billing:** add responsive padding and text sizing for mobile ([7643929](https://github.com/WebNaresh/glitchgrab/commit/7643929db987a5cffe220d4c8f939841b987084d))
* **billing:** add responsive padding and text sizing for mobile ([1302d4a](https://github.com/WebNaresh/glitchgrab/commit/1302d4a4337151de639cd7c36f6362f3c3772990))
* **billing:** auto-detect test mode and use INR currency for Razorpay test keys ([110be59](https://github.com/WebNaresh/glitchgrab/commit/110be59d471c38dfe0f34263b84bb6da83adf61b))
* **billing:** check user exists before creating subscription to prevent FK error ([f0d9506](https://github.com/WebNaresh/glitchgrab/commit/f0d9506a808a7c0066967b072df3672daf2b87da))
* **billing:** handle missing user in getTrialStatus instead of throwing ([0db43d4](https://github.com/WebNaresh/glitchgrab/commit/0db43d4b9a59f26c11d79ebe520c74d22b1fc675))
* **billing:** remove unsupported dismissible prop from welcome dialog ([d98402c](https://github.com/WebNaresh/glitchgrab/commit/d98402ca8eadeefbdf86d9a925f34c8a2735073c))
* **billing:** remove unused Cpu import from paywall block ([b1411b6](https://github.com/WebNaresh/glitchgrab/commit/b1411b63f3a1d2f331abf5c2455a07ca3f6c8310))
* **billing:** replace console.log with console.info in plan creation script ([8954035](https://github.com/WebNaresh/glitchgrab/commit/89540350e022ac035046ab2880a31e7a9e985f7c))
* **billing:** show single ₹199/mo plan instead of two USD plans on paywall ([8a044d6](https://github.com/WebNaresh/glitchgrab/commit/8a044d6156675dc98f6d9e575d98aa345a7da13f))
* **billing:** use boolean param for Razorpay cancel to fix TS error ([c1c1faa](https://github.com/WebNaresh/glitchgrab/commit/c1c1faa29119e885e266359c16066ef59382d3cc))
* **billing:** use brighter badge colors for dark theme visibility ([dbc49ea](https://github.com/WebNaresh/glitchgrab/commit/dbc49ea6732af433269a1c60d0b862e67d25909a))
* **billing:** use INR for test mode and improve error logging in plan creation script ([9aed22e](https://github.com/WebNaresh/glitchgrab/commit/9aed22e74a7028f1ff8f749f359492d4329c6848))
* **bottom-nav:** bigger avatar, brighter badge dot at top-right ([c415365](https://github.com/WebNaresh/glitchgrab/commit/c4153651e46e0b1e14660f301a7e6f3a6b566cb3))
* **bottom-nav:** close sheet before navigating to prevent Android WebView freeze ([953d112](https://github.com/WebNaresh/glitchgrab/commit/953d112b7c7ecd1c6b2032cc44734b26738e23a0))
* **bottom-nav:** increase nav delay to 500ms to prevent GPU crash on sheet close ([8054ae0](https://github.com/WebNaresh/glitchgrab/commit/8054ae005d681be076902b65fdd5513f114d6bf5))
* **bottom-nav:** show loading overlay during WebView full-page navigation ([d996167](https://github.com/WebNaresh/glitchgrab/commit/d996167446d57f007d7d9aacfd9d392df4f46759))
* **bottom-nav:** use canonical Tailwind z-index class ([2885046](https://github.com/WebNaresh/glitchgrab/commit/28850469a4ccd723a34229a24834dc12b3f5dc26))
* **bottom-nav:** use full page navigation in WebView to prevent Sheet freeze ([6a4061f](https://github.com/WebNaresh/glitchgrab/commit/6a4061f04205ddc8c92dd47c5a9e0d4035e3c13f))
* **bug-chat:** compress images at attach time with standard canvas for WebView compat ([3643d44](https://github.com/WebNaresh/glitchgrab/commit/3643d44a98d9c5b57dd9e08adea68c15d29a5b30))
* **bug-chat:** compress images client-side to avoid Vercel 4.5MB payload limit ([ff16386](https://github.com/WebNaresh/glitchgrab/commit/ff16386e1db82063612a0394fa8323ad6f4c2d9a))
* **bug-chat:** use standard canvas for WebView compat and show file size on preview ([57920fb](https://github.com/WebNaresh/glitchgrab/commit/57920fb98b754a7eac56b15225e1e94fc28a0f6a))
* **chat:** remove non-null assertions for lint compliance ([5191667](https://github.com/WebNaresh/glitchgrab/commit/519166732a3dad4eb6621c43b3840087d8d1e9f9))
* **ci:** add build dependency to validate task so SDK types exist ([924d9e8](https://github.com/WebNaresh/glitchgrab/commit/924d9e81a97663d00acb6fa2a97d159a00f2a6ab))
* **ci:** add npm install for semantic-release compatibility with bun layout ([1631734](https://github.com/WebNaresh/glitchgrab/commit/1631734e64187130f3999de417e61c4fbbc87e5a))
* **ci:** build SDK before typecheck so glitchgrab types are available ([b085324](https://github.com/WebNaresh/glitchgrab/commit/b085324e4d4f57166bd8bb28901f70e6d2791937))
* **ci:** fix npm install in SDK release workflow for bun workspace compatibility ([7c955ba](https://github.com/WebNaresh/glitchgrab/commit/7c955ba599974bcd5e831a62d0140c504a1346a5))
* **ci:** generate Prisma client before typecheck to resolve type inference ([7e00922](https://github.com/WebNaresh/glitchgrab/commit/7e009223c2edf2b554e8be130d1dc0bc6287ef68))
* **ci:** ignore mobile app in pruny check ([14ed2cf](https://github.com/WebNaresh/glitchgrab/commit/14ed2cf03f757218cf236fb90f5239f0f1535f2b))
* **ci:** remove root bun.lock before semantic-release to fix workspace protocol error ([be61547](https://github.com/WebNaresh/glitchgrab/commit/be61547c25a18804dd0e7446caf23913f9b98e6e))
* **ci:** use bun for SDK install to fix workspace protocol error ([bf90827](https://github.com/WebNaresh/glitchgrab/commit/bf90827975dd456fd0522ddd61705dd5cb566bbb))
* **ci:** use GH_TOKEN for semantic-release push and add [skip ci] to prevent loop ([de017e3](https://github.com/WebNaresh/glitchgrab/commit/de017e3d0f3bd09bef100fb9a827398b5e71ea60))
* **ci:** use GH_TOKEN in release workflow and add [skip ci] guard ([c714570](https://github.com/WebNaresh/glitchgrab/commit/c71457071efe92856d8daeab3b901967412c3ffd))
* **ci:** use npm-only workflow to avoid bun/npm layout conflict in semantic-release ([9db8124](https://github.com/WebNaresh/glitchgrab/commit/9db8124bfa76b87ce0b8c042e4e902832c373ca1))
* **collaborate:** redirect to API route to set cookie instead of page component ([b500738](https://github.com/WebNaresh/glitchgrab/commit/b5007383e7f763775290b1034882439117c7c714))
* **collaborate:** use canonical Tailwind class max-w-35 ([513c0bc](https://github.com/WebNaresh/glitchgrab/commit/513c0bcc80a01de8c7b38d98d0bd850ee8ef9bd0))
* **collaborators:** remove REVOKED status guard since revoke now deletes ([fff8e11](https://github.com/WebNaresh/glitchgrab/commit/fff8e11a3fbf3ed72fc2ea2b8643aeff1ad69b7f))
* **dashboard:** always show popover with search, use text-base to prevent iOS zoom ([8503fbc](https://github.com/WebNaresh/glitchgrab/commit/8503fbce3c166f4167a82f862976c68fe885eef2))
* **dashboard:** auto-submit on last skip and prevent question text truncation ([2138105](https://github.com/WebNaresh/glitchgrab/commit/2138105f60f4cc90584aa61027f1004bf6607d7e))
* **dashboard:** carry forward screenshots during clarification and clear after issue creation ([aaf3a94](https://github.com/WebNaresh/glitchgrab/commit/aaf3a94ffb21b3b487d02d5dc931161b8a71e36e))
* **dashboard:** hide text bubble when interactive questions card is shown ([78d6580](https://github.com/WebNaresh/glitchgrab/commit/78d65806a6e8d2fedd623b19b991e6bac4648644))
* **dashboard:** merge own repos and shared repos so users with both sessions see all ([b9dfae1](https://github.com/WebNaresh/glitchgrab/commit/b9dfae15308246116a5740f8f10fcb481d512849))
* **dashboard:** parse fallback questions from text and make dismiss non-destructive ([bc781bd](https://github.com/WebNaresh/glitchgrab/commit/bc781bdb7859e1821247616d008577b0b355a48c))
* **dashboard:** remove unsupported onOpenAutoFocus prop from base-ui Popover ([32f52cd](https://github.com/WebNaresh/glitchgrab/commit/32f52cdfc67a75b4b9db5da695a99a3b7b22ca6b))
* **dashboard:** shorten input placeholder text ([722822f](https://github.com/WebNaresh/glitchgrab/commit/722822f5ccf1f3c583e0baad49a09b3a979d8c1b))
* **dashboard:** show repo name in selector and fix input bar padding ([a45a55d](https://github.com/WebNaresh/glitchgrab/commit/a45a55d92b7593710b18a5be8f5e03672d63f01f))
* **dashboard:** skip popover for single repo, only show search for 5+ repos, prevent auto-focus ([aa3f325](https://github.com/WebNaresh/glitchgrab/commit/aa3f32564cfc5b60de0090bc2f7027f74d5cc56e))
* **dashboard:** use --app-height CSS variable so layout respects keyboard viewport ([b46117b](https://github.com/WebNaresh/glitchgrab/commit/b46117b91c355884ced34742fef56528635d22a9))
* **dashboard:** use --app-height in bug-chat max-height to prevent keyboard gap ([733de95](https://github.com/WebNaresh/glitchgrab/commit/733de9577d6189b4bdce8e3eef767648bcb7f3cf))
* **dashboard:** use canonical Tailwind class for app-height variable ([5bad5ed](https://github.com/WebNaresh/glitchgrab/commit/5bad5ed915dc2d593953ab07dec96b24ec9016a9))
* **dashboard:** use text-base (16px) on textarea to prevent iOS WebView zoom on focus ([1d565b4](https://github.com/WebNaresh/glitchgrab/commit/1d565b4974a0b6261ecfe09fbb0c9aa05ec6df7c))
* **github:** include issue body in fetchRecentIssues for merge context ([006b3d7](https://github.com/WebNaresh/glitchgrab/commit/006b3d71aece3a8d008b0b578afa167a454321a1))
* **github:** use permanent blob URL for screenshots instead of expiring download_url ([c081c23](https://github.com/WebNaresh/glitchgrab/commit/c081c23c4d9e851c56c642f0afb714802918beaa))
* **landing:** add login button to nav, fix pricing to single ₹199 plan, use Button components in footer ([efbda48](https://github.com/WebNaresh/glitchgrab/commit/efbda48cd095ee6a5551b75b9a31905643c65f10))
* **landing:** compact feature cards into 2x2 grid with smaller padding and text ([897c492](https://github.com/WebNaresh/glitchgrab/commit/897c492e2ec59e3667c8828d890362e149d626af))
* **landing:** make fully responsive with shadcn components and mobile-first design ([0bfee97](https://github.com/WebNaresh/glitchgrab/commit/0bfee97a7a17d587775bcd6927462a0637b86c31))
* **landing:** remove login button from nav, keep only Join Waitlist ([4dadc54](https://github.com/WebNaresh/glitchgrab/commit/4dadc54b46e1568ed9f1701fd06e7b998c4e0b87))
* **landing:** replace arbitrary tailwind classes with canonical equivalents ([073d5bb](https://github.com/WebNaresh/glitchgrab/commit/073d5bb91364b049dbcb58e911154f3749cb7f67))
* **landing:** update dedup card to highlight open-source and developer-first approach ([c66001f](https://github.com/WebNaresh/glitchgrab/commit/c66001f5363b80e420cef46393cce0c14ea4f8ba))
* **landing:** use square icon instead of OG image for nav and footer logo ([e8d6fdc](https://github.com/WebNaresh/glitchgrab/commit/e8d6fdc2929df1117b1736aadb6d36904f05b136))
* **legal:** update footer copyright to Navibyte Innovation Pvt. Ltd. ([5e2bd38](https://github.com/WebNaresh/glitchgrab/commit/5e2bd38a4851327aa8aa31192f8e9bc4b71daa01))
* **login:** center original.png logo above system access badge on left panel ([20b3b2c](https://github.com/WebNaresh/glitchgrab/commit/20b3b2ca071818b632d46bfed04493f299b8a0c4))
* **meta:** remove handwritten notes from SEO descriptions since feature is not built yet ([6d2da29](https://github.com/WebNaresh/glitchgrab/commit/6d2da290729a570536f048686f82e5019a2edfa7))
* **mobile:** add Android internet permission and cleartext traffic for dev ([60b3d53](https://github.com/WebNaresh/glitchgrab/commit/60b3d53c33be6b70dedab410e51846450bd7b128))
* **mobile:** add Android status bar padding to prevent content overlap ([1866b17](https://github.com/WebNaresh/glitchgrab/commit/1866b178c6c46de05f33979c2a1f07d115ac7870))
* **mobile:** add debug logging to OAuth login flow for troubleshooting ([3cf30af](https://github.com/WebNaresh/glitchgrab/commit/3cf30af326fe03797d553d5d1a460f5d1736dd1e))
* **mobile:** add KeyboardAvoidingView with zero offset for proper keyboard handling ([ae2c89f](https://github.com/WebNaresh/glitchgrab/commit/ae2c89f98ce34b02a165271124fd3c93dd371145))
* **mobile:** add redirect loop protection and logging to WebView, remove broken JS cookie injection ([a1a5823](https://github.com/WebNaresh/glitchgrab/commit/a1a582358eb4bcd910a38d08f2197ebd43e9edcb))
* **mobile:** add safe-area-context dep and reset APP_ENV after prod build ([69405d6](https://github.com/WebNaresh/glitchgrab/commit/69405d66c218b9fe197da4894c89a1f12a48ebd0))
* **mobile:** add touch-action:manipulation and remove hardware layer to fix Android tap delay ([523dc2e](https://github.com/WebNaresh/glitchgrab/commit/523dc2e17ecbf77155c1a019561d03dfc1d23497))
* **mobile:** add webview class to html for GPU-safe CSS detection ([4e9ec63](https://github.com/WebNaresh/glitchgrab/commit/4e9ec63973f2432cf2cc578a072f84d31ed13ebc))
* **mobile:** allow HTTP local networking in iOS for dev mode ([39f2659](https://github.com/WebNaresh/glitchgrab/commit/39f26599ced5f827b769e490b083a023b1630e64))
* **mobile:** allow Razorpay URLs in WebView so checkout modal works inline ([7f9f131](https://github.com/WebNaresh/glitchgrab/commit/7f9f131569b7ca4dd379b4437f7eedea066a8147))
* **mobile:** allow www.glitchgrab.dev URLs in WebView instead of opening externally ([bdf1158](https://github.com/WebNaresh/glitchgrab/commit/bdf11586418f40f5225fb1e08d07b223f53f8f76))
* **mobile:** auto-create local.properties after prebuild for Android SDK path ([6361594](https://github.com/WebNaresh/glitchgrab/commit/6361594e22e2e5a641d8be7d3d4b8f211086de1d))
* **mobile:** auto-detect dev server IP from Expo constants instead of hardcoding ([78634e1](https://github.com/WebNaresh/glitchgrab/commit/78634e1296929a3f281e0edcebf623c95df5cfa6))
* **mobile:** debounce layout recalc, dedup nav callbacks, fix scroll jank ([0e45fd0](https://github.com/WebNaresh/glitchgrab/commit/0e45fd03a04b3cb95687c7c2e8f38d629ce42242))
* **mobile:** enable bounces on iOS WebView so pull-to-refresh works ([40ac67d](https://github.com/WebNaresh/glitchgrab/commit/40ac67d16755ce04e33a30db894f10c2368cab9e))
* **mobile:** enable pull-to-refresh on both iOS and Android by removing overflow:hidden ([bd4004a](https://github.com/WebNaresh/glitchgrab/commit/bd4004a1f7a2a1550373944c75e453bbb03bea82))
* **mobile:** fix pull-to-refresh by removing overflow:hidden from updateAppHeight and enabling body scroll ([25bf6c6](https://github.com/WebNaresh/glitchgrab/commit/25bf6c687deb398627ac40ddd52a8e41a37937f7))
* **mobile:** force overflow visible on all layout containers in WebView for pull-to-refresh ([2b6ec9c](https://github.com/WebNaresh/glitchgrab/commit/2b6ec9cc673fe8cd2b9ee52b5c7f3eb8239e226f))
* **mobile:** handle iOS keyboard by using visualViewport resize and preventing scroll offset ([8110e44](https://github.com/WebNaresh/glitchgrab/commit/8110e44682525039c4558b635ecb635dc3be74b5))
* **mobile:** hide native keyboard accessory bar so web input stays visible ([269b51c](https://github.com/WebNaresh/glitchgrab/commit/269b51c192271a58bfdd81533493fa34368187bf))
* **mobile:** inject CSS to force 16px inputs and block pinch-zoom in WebView ([a614914](https://github.com/WebNaresh/glitchgrab/commit/a614914949d5f1fea37d0dc487ce8d6f7122baec))
* **mobile:** inject GPU-disabling CSS directly from WebView for reliability ([c40c9f0](https://github.com/WebNaresh/glitchgrab/commit/c40c9f0d9d65caa9e04d1be2986d90b5bf6a00ee))
* **mobile:** inject viewport meta before content loads to prevent initial zoom ([94cd8ee](https://github.com/WebNaresh/glitchgrab/commit/94cd8ee6de1dd25d5b67aa333f88be7c31528f12))
* **mobile:** keep loading overlay until dashboard loads, not the session redirect page ([6d13b59](https://github.com/WebNaresh/glitchgrab/commit/6d13b5943ed929788c092e99903bbeaf1c9956f5))
* **mobile:** navigate to dashboard and wait for load before injecting shared image ([e5acc22](https://github.com/WebNaresh/glitchgrab/commit/e5acc22aaeaed41a9d76fc36b6e1c4020332f553))
* **mobile:** prevent duplicate screenshot injection on share ([82a2326](https://github.com/WebNaresh/glitchgrab/commit/82a232601cfad3097c2b510ea444fa35be583049))
* **mobile:** prevent WebView zoom with viewport meta, input font-size, and scalesPageToFit ([e2c49b9](https://github.com/WebNaresh/glitchgrab/commit/e2c49b98940edc15bf9169fcd581e9f559a23345))
* **mobile:** remove associatedDomains to fix signing on Personal Team ([12e1dba](https://github.com/WebNaresh/glitchgrab/commit/12e1dbaba669c8fece49fada0eb0dd98b65200b0))
* **mobile:** remove forced input font-size, viewport meta already prevents zoom ([04beec7](https://github.com/WebNaresh/glitchgrab/commit/04beec7ae668304e50ed31caf9fc90abeff7d6b3))
* **mobile:** remove KeyboardAvoidingView, use visualViewport resize for keyboard handling ([c5df6d7](https://github.com/WebNaresh/glitchgrab/commit/c5df6d7f44220bf3f13ca4b33814e23fc9997c19))
* **mobile:** remove overscroll-behavior and touch-action that block pull-to-refresh ([930f274](https://github.com/WebNaresh/glitchgrab/commit/930f274d78976e1e9837889a08aaf561f4c5a4ef))
* **mobile:** remove ScrollView wrapper around WebView to fix Android UI freeze ([e6d6e5a](https://github.com/WebNaresh/glitchgrab/commit/e6d6e5aa3a4e616297a7510557a86f256a86cf07))
* **mobile:** remove webview class from injectedBeforeLoad to prevent hydration mismatch ([ba6a52e](https://github.com/WebNaresh/glitchgrab/commit/ba6a52e08263ed717c2e68c522433052f95eebba))
* **mobile:** replace circular icon with square version to remove white border on iOS ([a55eaeb](https://github.com/WebNaresh/glitchgrab/commit/a55eaeb33b269c944c9f081b1b668a8d94e623d1))
* **mobile:** replace deprecated SafeAreaView in login screen ([b5d436b](https://github.com/WebNaresh/glitchgrab/commit/b5d436bea1da9f35910888a92f4dc8c98664c185))
* **mobile:** replace deprecated SafeAreaView with react-native-safe-area-context ([11a5834](https://github.com/WebNaresh/glitchgrab/commit/11a58341f0896c643769d5dc8fe26d72092953db))
* **mobile:** revert dev script to iOS for simulator testing ([5da1dba](https://github.com/WebNaresh/glitchgrab/commit/5da1dba83ee75c61a37029062a601012d278d824))
* **mobile:** send OAuth code to backend instead of exchanging client-side, update to mobile client ID ([83ed174](https://github.com/WebNaresh/glitchgrab/commit/83ed174e20f4120dd92bd186aeba122df81e46db))
* **mobile:** send PKCE code_verifier with OAuth code exchange ([b2c78b8](https://github.com/WebNaresh/glitchgrab/commit/b2c78b81919604baf351c65d2c4e3243f68c775a))
* **mobile:** set --app-height on body instead of html to prevent hydration mismatch ([604af36](https://github.com/WebNaresh/glitchgrab/commit/604af36d7f375564e66ec2e1d2ee1f82914c3ef3))
* **mobile:** simulate paste event for shared images instead of auto-submitting ([3fef95d](https://github.com/WebNaresh/glitchgrab/commit/3fef95d046d2850285b4c869a6605163bbb0183c))
* **mobile:** use __Secure- cookie prefix for production and set domain for glitchgrab.dev ([39627e5](https://github.com/WebNaresh/glitchgrab/commit/39627e5ebd170621a97a3bbecd249601ac21462e))
* **mobile:** use correct Glitchgrab G logo for all app icons ([b9578d4](https://github.com/WebNaresh/glitchgrab/commit/b9578d4731c54838d6c7fa1d7e76a6f310b429f2))
* **mobile:** use data-webview attribute instead of className to avoid hydration mismatch ([6595c15](https://github.com/WebNaresh/glitchgrab/commit/6595c15f457eb6bd61a49d137309d444cf6ca197))
* **mobile:** use GitHub PNG icon on login button and log redirect URI for OAuth setup ([a081916](https://github.com/WebNaresh/glitchgrab/commit/a0819165724a0551f3ba48cc482274f28b589ba5))
* **mobile:** use glitchgrab.dev without www prefix for production base URL ([748c3b9](https://github.com/WebNaresh/glitchgrab/commit/748c3b9ab783ab6232d8b091277be5e042737280))
* **mobile:** use injected style tag instead of data-webview attribute to avoid hydration mismatch ([d321df0](https://github.com/WebNaresh/glitchgrab/commit/d321df04d0d5da2b780514ff5a2cda59524694db))
* **mobile:** use legacy file-system import and enable pull-to-refresh ([b0d18e7](https://github.com/WebNaresh/glitchgrab/commit/b0d18e770ce6e5525fb3ccdfeba06de8465f5ce1))
* **mobile:** use local dev server URL in development, production URL in release ([73fbdf0](https://github.com/WebNaresh/glitchgrab/commit/73fbdf0bc32c5446b58757ea70f7575fe7a8d3ed))
* **mobile:** use numeric decelerationRate to fix Fabric crash in release builds ([b80ec72](https://github.com/WebNaresh/glitchgrab/commit/b80ec726082c7773ede715edee07f600d9708d03))
* **mobile:** use server-side cookie setter endpoint instead of client-side injection ([eaa1f28](https://github.com/WebNaresh/glitchgrab/commit/eaa1f2836d604e9277bc2b01617308bdc11c0b03))
* **mobile:** use string encoding instead of enum for FileSystem base64 read ([aa48241](https://github.com/WebNaresh/glitchgrab/commit/aa48241d7ade172f7fc576c2c47ebe730ed88488))
* **mobile:** use style tag instead of inline styles to prevent hydration mismatch ([c041573](https://github.com/WebNaresh/glitchgrab/commit/c0415733ae6daa7d4794a2de8883dadd7984e3e7))
* **mobile:** use visualViewport to dynamically resize layout when Android keyboard opens ([5fce237](https://github.com/WebNaresh/glitchgrab/commit/5fce23748621d1d6d6dcc856729bcb50daa05e1d))
* **mobile:** whitelist Razorpay payment partner domains in WebView ([2deb1e8](https://github.com/WebNaresh/glitchgrab/commit/2deb1e8eb601fe7dd62330f8d80a76bd41911dcd))
* **mobile:** wrap WebView in KeyboardAvoidingView to handle iOS keyboard properly ([00210f2](https://github.com/WebNaresh/glitchgrab/commit/00210f2ab33d56cee7133f354a7994082cd22f09))
* **paywall:** remove unused TrialBanner import ([b0dd6ba](https://github.com/WebNaresh/glitchgrab/commit/b0dd6ba6d54a07f7894ff0dbb55260d6861f50c5))
* **pipeline:** attach screenshots to merged and closed issues ([89e5412](https://github.com/WebNaresh/glitchgrab/commit/89e541273a41c47ff9dea065392978bcdb5c92d2))
* **pipeline:** collect screenshots from all issues during merge and update DB records ([6f3cfcc](https://github.com/WebNaresh/glitchgrab/commit/6f3cfcce39997fe46ee50ea6dfda132cf2f133ac))
* **pipeline:** update issue body instead of commenting for dedup updates ([2f014a9](https://github.com/WebNaresh/glitchgrab/commit/2f014a9de17fc93992f982969fca43aa7737f996))
* **pipeline:** upload all screenshots from report including extras in metadata ([fe3336e](https://github.com/WebNaresh/glitchgrab/commit/fe3336e34434db262f95a8f95fa8bb28483edf0c))
* **providers:** handle nullable name in session prop ([589dd28](https://github.com/WebNaresh/glitchgrab/commit/589dd2808175e67817e953654fa9d66731fdceda))
* **proxy:** use AUTH_SECRET with NEXTAUTH_SECRET fallback for JWT verification ([acce199](https://github.com/WebNaresh/glitchgrab/commit/acce199417d3625433c02aee0a67670f05056f1b))
* **reports:** accept multiple screenshots via formData.getAll and store extras in metadata ([dd54ea6](https://github.com/WebNaresh/glitchgrab/commit/dd54ea694290a55b0bd85b462dfcac5cbcd6906f))
* **reports:** add required reporter fields to dashboard report creation ([68b8c62](https://github.com/WebNaresh/glitchgrab/commit/68b8c6234b017984b86c0d2d147062164bf7f24c))
* **reports:** remove forbidden non-null assertion ([c106f2e](https://github.com/WebNaresh/glitchgrab/commit/c106f2eb2f41a21abc9589870f546c7fed01f6cc))
* **reports:** use report.repo.userId instead of non-null assertion for eslint ([16dbde8](https://github.com/WebNaresh/glitchgrab/commit/16dbde8080ad6796f5212ae84c13bc6477a13b6e))
* **repos:** add explicit type for repo parameter in map ([a11f075](https://github.com/WebNaresh/glitchgrab/commit/a11f075d71dda2aa88c1dc2ab697e52ae4ab82e3))
* **repos:** align Connect Repo button to right and reduce section spacing ([fc75ba6](https://github.com/WebNaresh/glitchgrab/commit/fc75ba65c4df591540720881bb6c2b3714e9b114))
* **repos:** allow long repository names to wrap instead of truncating ([7fb4ef7](https://github.com/WebNaresh/glitchgrab/commit/7fb4ef7e2dad0e7ca1780590136a9394b23ee937))
* **repos:** force router refresh after connecting repo to update UI immediately ([451e926](https://github.com/WebNaresh/glitchgrab/commit/451e926e6623c1be66665afe31508b9234161fc7))
* **repos:** make connect repo dialog fit mobile viewport ([4f5291f](https://github.com/WebNaresh/glitchgrab/commit/4f5291f68dc5a43425569020ef7aa3532246d5a6))
* **repos:** make connect repo dialog fit mobile viewport ([5858b5b](https://github.com/WebNaresh/glitchgrab/commit/5858b5be22d99c72da7ffef2c0ec900b7a444b7c))
* **repos:** make page header and repo cards responsive on mobile ([fdbff06](https://github.com/WebNaresh/glitchgrab/commit/fdbff06d87b518e2e9a01389787f37bba42bd856))
* **repos:** make page header and repo cards responsive on mobile ([af72018](https://github.com/WebNaresh/glitchgrab/commit/af720186d958ceeeb310017f4ff496c8fd556309))
* **repos:** prevent badge text clipping and improve responsive layout ([cc790a2](https://github.com/WebNaresh/glitchgrab/commit/cc790a2f570c0c963faecd8cb73956b04752606e))
* **repos:** replace Connect Repo text button with icon-only plus button ([fb7fac9](https://github.com/WebNaresh/glitchgrab/commit/fb7fac9485c8aefbe94f2ad24e5a91d6406632a5))
* **root:** clean up knip config for shadcn deps and entry points ([ec0bf4e](https://github.com/WebNaresh/glitchgrab/commit/ec0bf4e8f62350967ce7f759931695d369404cb6))
* **root:** clean up knip config hints and remove stale ignores ([8bb63ab](https://github.com/WebNaresh/glitchgrab/commit/8bb63ab0f2a5374600a9cc2e4207e401c4bbf360))
* **root:** ignore scaffolding files in pruny to pass validation ([c432a52](https://github.com/WebNaresh/glitchgrab/commit/c432a520bbc7b0935f6b05972a615bed99a4726d))
* **root:** ignore shadcn UI components and proxy.ts in pruny ([c8d1f6a](https://github.com/WebNaresh/glitchgrab/commit/c8d1f6ab4e8913287c48ab5e1e0119c88eaaddac))
* **root:** make bun dev run both web and mobile, add dev:web for web-only ([120da2a](https://github.com/WebNaresh/glitchgrab/commit/120da2afb6a0a6568b91ea5600349031737956e8))
* **root:** pass env vars through turbo to fix Vercel build ([802f595](https://github.com/WebNaresh/glitchgrab/commit/802f595a0b50b60ac195502c071f5011cb840129))
* **root:** remove stale .glitchgrab ignore from knip ([9e7cd07](https://github.com/WebNaresh/glitchgrab/commit/9e7cd074249ca401952cbf7770c54248d0ce993e))
* **root:** update knip and pruny configs to pass validation cleanly ([1391006](https://github.com/WebNaresh/glitchgrab/commit/1391006deaba14a216524f1812fb30d018dc2e86))
* **root:** use local prisma binary path in db scripts to avoid global v7 conflict ([91bf682](https://github.com/WebNaresh/glitchgrab/commit/91bf682bddc182e19eb4b4d0c08498a304e3f20c))
* **root:** use local prisma v6 binary for db scripts to avoid prisma 7 conflict ([17cc03e](https://github.com/WebNaresh/glitchgrab/commit/17cc03e51d6704528ac75b0f9f300cb403da5ed0))
* **sdk:** disable GitHub Release creation for SDK, keep npm publish only ([a5b8208](https://github.com/WebNaresh/glitchgrab/commit/a5b8208050f57fdd63e64279ed7d648625985b50))
* **sdk:** handle ReportButton rendered outside GlitchgrabProvider gracefully ([e2e3c46](https://github.com/WebNaresh/glitchgrab/commit/e2e3c46bc9b90420fff4230d0471ece28aa46d76))
* **sdk:** lazy-import SDK in useEffect to prevent Next.js prerender crash ([3a547ec](https://github.com/WebNaresh/glitchgrab/commit/3a547ecf947f4c6f84104464832356e3cafe462b))
* **sdk:** lazy-load SDK in useEffect to prevent prerender crash with NEXT_PUBLIC token ([3ca212a](https://github.com/WebNaresh/glitchgrab/commit/3ca212a6afafaf55a4f2b37c9e1cb72ccdfafaa6))
* **sdk:** skip auto-error capture in development mode ([bcfe9be](https://github.com/WebNaresh/glitchgrab/commit/bcfe9bed10b414d312fa0c122e933b24b745ce61))
* **sdk:** update reports response to include issue state and labels ([a7535fa](https://github.com/WebNaresh/glitchgrab/commit/a7535faa6b7ec069335027bc1e904e1b6de3cb05))
* **settings:** make account card avatar and text responsive ([452dcad](https://github.com/WebNaresh/glitchgrab/commit/452dcadc7413e70562e8234dc36e9244a70baae6))
* **settings:** make account card avatar and text responsive ([8976f66](https://github.com/WebNaresh/glitchgrab/commit/8976f66c0a4c268ad93e94c77b5e8ee91abea8c9))
* **settings:** remove AI config section from settings page ([78332c2](https://github.com/WebNaresh/glitchgrab/commit/78332c2f5d3feef2ce8d91a12437e72476c5d505))
* **settings:** remove AI provider selection form component ([80ec78c](https://github.com/WebNaresh/glitchgrab/commit/80ec78c347327dfc35c47c9c379faf7b48a6c417))
* **settings:** remove unused AI config server actions ([5a65bc7](https://github.com/WebNaresh/glitchgrab/commit/5a65bc7d2ea86d4ee0a8c6e9f865514cafcf2311))
* **tokens:** stack header and token cards vertically on mobile ([ae24dac](https://github.com/WebNaresh/glitchgrab/commit/ae24dac188bfc2a60d50801597a718d330c23d37))
* **tokens:** stack header and token cards vertically on mobile ([f65b80f](https://github.com/WebNaresh/glitchgrab/commit/f65b80f4d3db44b884f226e7c5ecda70e84b06c2))
* **ui:** disable backdrop-blur and animations globally in Android WebView ([1448dfb](https://github.com/WebNaresh/glitchgrab/commit/1448dfb8ee9bb4914b0ffc93fb15715327ad541d))
* **ui:** fix Recommended badge overflow on mobile by repositioning and adding padding ([ab265a2](https://github.com/WebNaresh/glitchgrab/commit/ab265a2dbd5bb682a7fdfa6f16cce4a77e7c93ec))
* **ui:** remove backdrop-blur from sheet overlay to prevent Android WebView GPU freeze ([bffc72d](https://github.com/WebNaresh/glitchgrab/commit/bffc72d9d65c8a1fa2a2ed5dd49c3bc71acce110))
* **ui:** restore sheet overlay backdrop-blur now handled by global webview CSS ([599f7d4](https://github.com/WebNaresh/glitchgrab/commit/599f7d4cee6f967ddf4d8fbadd111dee2852ffb5))
* **web:** add tsconfig path alias for glitchgrab SDK types ([6ec04d6](https://github.com/WebNaresh/glitchgrab/commit/6ec04d690ceedce5e95b052bf0c249c4ed17f994))
* **web:** add turbopack resolveAlias so SDK uses pre-built dist instead of source ([b4fce12](https://github.com/WebNaresh/glitchgrab/commit/b4fce12ab3ae982af9767ce86f17c1187b70884d))
* **web:** auto-fix tailwind canonical class names ([5364f90](https://github.com/WebNaresh/glitchgrab/commit/5364f90edf17c7c88aff7ea902921fa9fedc2e9e))
* **web:** correct OG image dimensions to 1200x630 ([b49d053](https://github.com/WebNaresh/glitchgrab/commit/b49d053c4eb8c06914085fb17ea6ad47c079ef47))
* **web:** fix TypeScript cast in clipboard utility ([9842871](https://github.com/WebNaresh/glitchgrab/commit/98428716c17acc33e51821829d548c1a9a6950ae))
* **webhooks:** add explicit type for webhook parameter in map ([1b40346](https://github.com/WebNaresh/glitchgrab/commit/1b403467affb7af2e8016764c2945b885388080c))
* **web:** memoize messages, use native img for base64, batch state updates ([df1704b](https://github.com/WebNaresh/glitchgrab/commit/df1704ba22d81ad65df4503127a97f5bff5bc004))
* **web:** remove shadcn Geist font override, keep Inter + JetBrains Mono ([ff4b0b0](https://github.com/WebNaresh/glitchgrab/commit/ff4b0b0fbefa437c628e5434dc45bc32b7ddbabc))
* **web:** resolve icon.png conflict, rename to logo.png and add metadataBase ([f57a4ce](https://github.com/WebNaresh/glitchgrab/commit/f57a4ceb12c021fca6e6654bee92abd5862067fb))
* **web:** run prisma generate before next build for Vercel deployment ([1e41a99](https://github.com/WebNaresh/glitchgrab/commit/1e41a992dca923790426eec6a26ff50a54ab0395))
* **web:** use clipboard utility with WebView fallback for token copy ([7719c29](https://github.com/WebNaresh/glitchgrab/commit/7719c29c417f6cacd954e3c6757c4ad7bc9dd97b))
* **web:** use clipboard utility with WebView fallback for webhook secret copy ([4bd0764](https://github.com/WebNaresh/glitchgrab/commit/4bd0764d388c577132962a6d1c237db71d48f385))

### Performance Improvements

* **ai:** switch from gpt-4o to gpt-4o-mini for faster and cheaper responses ([a15afa7](https://github.com/WebNaresh/glitchgrab/commit/a15afa79fe37879bd83c1ae49515f6c0e36ca0dd))
* **ai:** switch to gpt-4o-mini and add logging ([a8bba50](https://github.com/WebNaresh/glitchgrab/commit/a8bba500b713fea213c3be920c332d5a23191206))
* **nav:** add prefetch to all navigation links for faster page transitions ([1864946](https://github.com/WebNaresh/glitchgrab/commit/1864946e8127189e756904df3120eead534ddd10))

# Changelog

All notable changes to Glitchgrab will be documented in this file. This file is auto-generated by [semantic-release](https://github.com/semantic-release/semantic-release).
