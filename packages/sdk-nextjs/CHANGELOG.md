## [1.20.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.19.2...sdk-v1.20.0) (2026-05-22)

### ⚠ BREAKING CHANGES

* SDK_AUTO responses no longer return status='PROCESSING'
— they return the created issue inline.
* response no longer includes intent variants
(update/close/merge/clarify); always returns intent='create' or an
error.
* The AI pipeline no longer mutates report content.
Issue titles, bodies, labels, and severity are derived deterministically.

### Features

* **.mcp.json:** add expo-mcp server configuration ([1d87ab7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d87ab79145dc535f440fb7dcf2ff3a8fcf878cc))
* add AI enhance button to dashboard chat composer ([a15687a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a15687a919d90de32155458028b99301403b6d60))
* add ai-enhance lib for polishing user-written text ([2cf29ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2cf29acac8df22d2e946148a76f83da2f9d00487))
* add metro.config.js for apps/mobile ([54bbbff](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/54bbbffb09f6b9d84b0f546ae9a71be123fee4b7))
* add POST /api/v1/ai/enhance-text endpoint ([61bc7a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/61bc7a2862078ce5127d08de55cf80f23f876d09))
* Add ReportCard component in mobile app ([d255b34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d255b348fd2c564d416bff164d72763703e9a480))
* add useGlitchgrab hook ([77922b6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/77922b61c616d4eb80a103a5b13bbcd6fe2e824d))
* **ai:** add sessionInfo field to AiInput for reporter context ([43a54b9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43a54b9db1925e5b53b61717f873f2aeb865e1ed))
* **analytics:** add analytics and SEO sections with visual insights and management features ([29aa353](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/29aa3532cd26527f83aa53fc5135aa69df7b35fa))
* **analytics:** compact 2x2 stat grid + chart side-by-side, fix tooltip headroom and x-axis labels ([75b1794](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/75b1794a7e3aa84a1bb34950c5d142710814c1c4))
* **analytics:** enhance hover overlay for closed issues with detailed repo counts and improve layout spacing ([dbac746](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbac74607e6c3ced2de8454f6befc11d0ee6ed14))
* **api/orgs/members:** POST invite sends email to pending member with GitHub sign-in link ([d4e28d9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4e28d96ebb2d47c00f65ab4cd18a6b0d26df265))
* **api/orgs:** add GET /orgs/[slug]/pull-requests endpoint ([205df7a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/205df7a6ee10a006ec20dbb5d15be967b83eba46))
* **api/orgs:** add GET my-github-orgs endpoint to fetch user GitHub org memberships ([bb096b4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bb096b423bcab1f5930817376df2fa6299fa0485))
* **api/orgs:** GET and PATCH member repo assignments, OWNER-only write access ([52bc798](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/52bc7989739b253b0f377f2ad2a87e8d4f49ebba))
* **api/orgs:** GET members merges GitHub org members with DB state, shows pending for non-signed-in users ([f29f6b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f29f6b861f440be9b81efa33515d16ffc8bd42f2))
* **api/orgs:** GET org by slug with members and repos, verify requester is a member ([1c90d86](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1c90d862e6b16ac8934dd2c36331e07a93737672))
* **api/orgs:** GET own org membership, POST create org with GitHub org login and auto-sync repos ([1caccbc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1caccbce885c457ddd186ff92f1e9116dfa7e3d9))
* **api/orgs:** POST sync-repos pulls all GitHub org repos and upserts them into DB ([7d7b556](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7d7b5565021cfe101d4298fe6f12eb338c121153))
* **api:** add logout listener to handle 401 responses ([7b9cb0e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7b9cb0ec388eca2bec7f600db1797e2b5a7bb3b1))
* **api:** remove collaborator accept endpoint ([a08b5d4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a08b5d480ec7a992ce71fd37867d38c50e06dbe3))
* **api:** remove collaborator invite endpoint ([ccf7568](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ccf75684a788b0062437346333c414e74d0f68cd))
* **api:** remove collaborator repo access endpoint ([980c480](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/980c480b8d2d0320140a34284f8b557a1d1b4630))
* **api:** remove collaborator revoke endpoint ([e6a6ca5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e6a6ca53660286043af5c74ff2efa80c8b30e449))
* **api:** remove collaborators list endpoint ([cd172b7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cd172b76376008b351e6506527a3d281647d0d62))
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
* **assets:** add bug-report.webp — converted from PNG (312K → 49K) ([72b068c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/72b068c65d0b68d33a965a51d9675adb9d7125d2))
* **assets:** add chat.webp — converted from PNG (97K → 28K) ([723cb1b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/723cb1b19a46335d124e3b62696c87d982d2e40f))
* **assets:** add dashboard.webp — converted from PNG (171K → 54K) ([07bfa2f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/07bfa2fe3e1ef6c12f2994d1cfea509f381e97bf))
* **assets:** add repos.webp — converted from PNG (153K → 47K) ([0b7a4a3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0b7a4a3e21ec27a6d7bd23eeac0a9f0afa21f480))
* **auth:** add AuthLayout component ([434fd23](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/434fd23dc2c0887fb90023b629c9101889d90ad7))
* **auth:** auto-assign org repos to MEMBER on login using their GitHub token — no manual assignment needed ([ef72a5d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef72a5dd5f79dc8915f52efb115e2aced56ad664))
* **auth:** auto-detect GitHub org membership on login and upsert OrgMember with correct role ([65f0800](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/65f0800391b634c1fc16324ea53735d7717e86c1))
* **auth:** Implement login functionality with GitHub integration ([ea23faa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ea23faa20959bb43f8a5a82f2df73f4ece0d0eaa))
* **auth:** use GitHub org membership role (admin→OWNER) instead of ownerId comparison ([e244d3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e244d3e699df26b24f0310fca78e61416aeceb68))
* **collaborate:** remove collaborator accept page ([be66296](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/be6629667fe273a7c42ad728e2a36c841c2b5bed))
* **collaborators:** remove collaborators dashboard page ([aa17abd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aa17abda2d786ae518c640d9ed43dfd416d7f2d0))
* **collaborators:** remove edit repos dialog UI ([9c2b610](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9c2b610f65a5806e54882ff6e09ddb1d6bb2997b))
* **collaborators:** remove invite dialog UI ([f8aa6fa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8aa6fa69e0c663f00f6157973a69616c8b96084))
* **collaborators:** remove revoke access button UI ([9130134](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9130134430cbc774f7102196f3554a25a0026b8a))
* **colors:** add new colors constants ([a15d223](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a15d223fd0b368f5a995e9b883754e03d7c81f6f))
* **compare:** add Glitchgrab vs Linear comparison page with table, breadcrumb schema, and canonical ([6e6846f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6e6846fd0945941d46c0d781a81198a8a75cf501))
* **compare:** add Glitchgrab vs Sentry comparison page with table, breadcrumb schema, and canonical ([38b3996](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38b39960159067f19a079d1d951b87a1472c3a60))
* **config:** update animations type and cast for rc.7 vs rc.42 AnimationDriver types ([194679f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/194679fefc813f62098ad842285bf65c297e3c74))
* **contexts:** added AuthContext for managing authentication state ([d5a85b3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d5a85b3fe1825376211070ce076ebba4a0231b08))
* **cron:** add nightly-sync cron to update indexing cache for all GSC properties ([0f22207](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0f22207e6e7511040ed44641955b0c8953921fe1))
* **cron:** add seo-health cron to create GitHub issues for favicon, OG, and indexing problems ([86c3aab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/86c3aabfc98d788d159fd09c486a73a5f8557556))
* **cron:** skip seo-health issue creation when property is snoozed after reindex ([4b7359a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b7359ad0f7f006223b5c41a540d2b9b895df848))
* dashboard report endpoint creates GitHub issues directly ([080dd70](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/080dd706671293a0e347da2fce0b2e2229bdb918))
* **dashboard:** redirect org members away from /dashboard to their org path ([d54a8db](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d54a8db22215d1a51c2159d1a2fcdee7710c550a))
* **dashboard:** redirect org members to their org on landing instead of personal dashboard ([e3d42d3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e3d42d3828fe16590e4f91b44aef866d111bd619))
* **db:** add cachedNotIndexedPages and seoHealthIssueUrl to GscProperty ([ff09005](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ff0900505c41377aee417c9653e8faa815df0da3))
* **db:** add GscConnectSession model for temporary OAuth token storage during property selection ([fa248b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fa248b80af13aa0eab5291b4943b892f36f5e478))
* **db:** add seoHealthSnoozedUntil to GscProperty for reindex snooze window ([49f30cc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49f30cc76faa4c7cf52e970a728f161317ae730b))
* **docs:** add Glitchgrab bug capture SDK for Expo apps ([b7a6a72](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7a6a726e5a359aa48db6f0838bf79ee887f9313))
* enhance commit counting by utilizing GitHub search API for deduplication ([f69ec0d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f69ec0de5301e9d3d59249a8d4bec85886a38802))
* **enricher:** include all context in GitHub issue body — full error, stack, breadcrumbs, reporter, environment ([213ad96](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/213ad9678d869926ef878bf62a7d5abcfb82df18))
* **footer:** add About link to Resources column ([eac7f8b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/eac7f8beab8b99f42c3f3a30de74821b819cf2ed))
* **footer:** add vs Sentry and vs Linear comparison page links under Resources ([8767b7f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8767b7f4bffa0f8f0f707b78b2d7bc0033bfec58))
* **github:** add getGitHubOrgMembers helper to fetch all GitHub org members ([ec6a660](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec6a660f6a9540aaad825558c14248220942fdd7))
* **github:** add getUserOrgRoles to fetch real org membership roles from GitHub API ([814750f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/814750fbabbbb39321d917a05b5703ca05b06436))
* **github:** add getUserOrgs, getOrgRepos, getGitHubOrgInfo, getGitHubUserLogin helpers for org integration ([5f08405](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5f08405f9021d18b8f10c4aabe78e4991ea32c72))
* **gsc-property-detail:** integrate Skeleton component for loading states in indexing and favicon sections ([d639441](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d639441ffe74a22831c44f22ae238546ad0287bc))
* **gsc-property-detail:** refactor UI with icon buttons, tooltips, skeletons, sync/reindex in card header, and repo picker in page header ([c4de9ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c4de9abba156e8591d688d2944b898473c8ca915))
* **gsc-property-detail:** reorganize stats section for improved layout and clarity ([24d8e75](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/24d8e75e77963dcb17398580952815395b585738))
* **gsc:** add /connect/gsc wizard page — no auth required, session-authenticated via GscConnectSession ([6c9cac5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6c9cac53989437f41f406420141b40dcf7673b43))
* **gsc:** add auth/link endpoint returning signed URL as JSON to avoid hydration mismatch ([9a6b47d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9a6b47dee60683823a85fa42a36c35c3bcb50178))
* **gsc:** add connect endpoint to save selected GSC properties with required repo links ([f5108f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f5108f812c6356e132e9a531c800da69f8c1127c))
* **gsc:** add favicon-check endpoint for per-property favicon validation ([5f29236](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5f292368a85fe4d1f17653bcb4eea9b350f74796))
* **gsc:** add Google Search Console section with indexing health report ([0fef507](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0fef507ff0851134cda3a196d77c3e536a26f503))
* **gsc:** add OAuth callback to verify state, exchange code, upsert GscProperty records ([e80beb1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e80beb1843b5130bc7975da766cf7d94577b3244))
* **gsc:** add OAuth URL builder with HMAC-signed state for cross-browser auth ([e6f8484](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e6f8484aeb962c20b835e6d08d0e162596f54233))
* **gsc:** add og-check endpoint to validate OG/Twitter meta tags from site HTML ([49d2ce4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49d2ce454aa42704880a8ae7a8e3e9f0d0709c7c))
* **gsc:** add properties list/patch endpoint for repo linking ([c1bceed](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c1bceed51deafa74f1372c03f0bb0c5e502cc69d))
* **gsc:** add property DELETE endpoint for disconnecting a GSC site ([38cfe0a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38cfe0a09b08a570e284280cfafa79ce5d5acd2a))
* **gsc:** add property sync endpoint to live-check indexing status via GSC API ([ca66332](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ca66332eea3eff0bf8d53867233dbca9cd103b17))
* **gsc:** add reindex endpoint to submit not-indexed pages to Google Indexing API ([d263180](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d263180fbdabf63969b0ca9b542be8a97d7c31e1))
* **gsc:** add search functionality to filter properties by domain or repo ([2fa6bf7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2fa6bf77d306829f6071a90a0679cbf717308c3d))
* **gsc:** enhance GSC inspection and sitemap parsing with additional fields and improved URL fetching logic ([c6e2950](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c6e295018b21c8f4c9d2dece024f7212a7b70246))
* **gsc:** expose cached notIndexedPages in properties list ([c333caf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c333cafd7dcb1ee67e5cc009f5a46c79a5ea13ff))
* **gsc:** persist not-indexed pages to DB on sync for instant cache ([4688a8f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4688a8f4ce7700c900ef6777133302a2ec45ad46))
* **gsc:** redirect to property selection wizard after OAuth instead of auto-adding all properties ([6476135](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6476135aeb62c42ea2ab5409000b6a8b5bcb5672))
* **gsc:** return noSitemap flag when no sitemaps registered in GSC ([a0196ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0196ab503795f1a66b460ce7b79ee4c44bf455c))
* **gsc:** set 7-day SEO health snooze on reindex to give Google time to re-crawl ([a1f9c52](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a1f9c52b3d1447d606d9de213e489433c8557ed4))
* **homepage:** replace tagline H1 with keyword-rich text and add trust bar between hero and features ([6ff342b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6ff342bfa2fc5fbe991836a80fd5720c95cdb81e))
* **images:** add image size constants ([0045235](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0045235bc8eba6e24ea4781ef7ed850867c18a22))
* **landing:** add version badge in nav, dashboard/chat/bug-report/repos product screenshot sections ([49b6767](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/49b6767f0c0ad0f6a119d46ac9d610f63b631cff))
* **landing:** replace pipeline boxes with 3-card vacation dev story workflow ([7ac29dc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7ac29dcd63b3080ab2d138735bbee6fec4d875aa))
* **layout:** wrap app in TooltipProvider for shadcn tooltip support ([5bf8dfd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5bf8dfd9df3e6e845b7b1c3003bf8faf140b0f9a))
* **legal:** replace simple header with shared PublicNav for consistent navigation ([23a7509](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/23a75092abe1c820b0a8911ce76986c1c0567174))
* **lib/api:** add BASE_URL environment variable for API URL ([159c4fc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/159c4fc3fa387cd252e5b2f61d6c01b467c521cf))
* **lib/secure-store:** add secure storage functionalities ([ea20239](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ea20239e302287cda809230e9d33dd037377d057))
* **lib:** add AES-256-GCM encrypt/decrypt utility for token storage ([85c5231](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/85c52318dae104895d734cfdf54b76daed758781))
* **lib:** add checkIssueIsOpen helper to detect open GitHub issues by URL ([f0cc417](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f0cc417792ad917ecf8bbf03d0a99b94ce5c4ba7))
* **lib:** add getValidAccessToken helper with auto-refresh for GSC properties ([4b48b77](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b48b7738283e38ad6b4ffac6139519fb0569a4b))
* **lib:** add Google Search Console API client (token exchange, sites, inspect, indexing) ([42ca42f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/42ca42f7863babb7c1c532fd9d923a90a246efcf))
* **lib:** remove collab-auth cookie session module ([972a6ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/972a6accd7b019af8387141383f254f276b0b890))
* **login:** read callbackUrl from search params so post-OAuth redirect lands on correct page ([1ad2961](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1ad29616e0d7730489d24d308f97d423d055a0e7))
* **login:** redirect org members to /org/[slug] or /org/[slug]/chat based on role after login ([a4ae3a8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a4ae3a88a161807999f98079ed76aa9725757ee6))
* **mail:** add sendOrgMemberInvite email to invite pending GitHub org members to sign in ([db9d006](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/db9d006e455c036bd12b24ee7de0ac5234015265))
* **mcp:** add HTTP MCP endpoint with session auth and GSC/repo tools ([b27a5d5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b27a5d5a17d2f76c47c6b495092159d481e5356b))
* **member-stats:** add PRs-created-today per repo to member activity ([c5a7d61](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c5a7d615c2ca4bc94badf92190b270bb161fa432))
* **meta:** add analytics screenshot WebP for landing page ([bb461c5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bb461c5e076136a61f36839ed4e60f7a3c57e007))
* **meta:** add issue reports image for enhanced visual representation ([a078999](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a07899949ff2e29c208e9ffc6728f1dbbcbf9bc2))
* **meta:** add SEO screenshot WebP for landing page ([00ad58f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00ad58f7671d556a1024e26b7ff6e99380046dc3))
* **migration:** drop OrgMemberRepo table ([2778854](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/27788547e71a7ece1544c3170a07e2c413b25a19))
* **nav:** add PublicNav shared component for consistent header across all public pages ([c3ce405](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c3ce405dd6dec0ae0ee85a97175dfb8f9ac26990))
* **nav:** add SEO route to dashboard sidebar ([0f0a394](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0f0a394c156416901d5b023fc5972833c4266452))
* **nav:** add SEO route to mobile bottom nav ([b7a9617](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7a96174c1f1edb3625466589296ed887e7577ac))
* optimize commit counting by using GitHub search API for deduplication ([275f707](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/275f7071807f000dd6be882f56bb4c4e366611fe))
* **org-overview:** add Connect GSC button and dialog to SEO panel ([5ffc08d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5ffc08d45525b371df2a8f6ee523a4e53f6627cc))
* **org-overview:** add open PRs tab with workflows fallback and skeleton loading ([7daaeec](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7daaeec368f4464ead073998094f2922d4f9b163))
* **org-overview:** add SEO panel with GSC properties and indexing stats ([02f9b84](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/02f9b84569819ecc721b87a451ed1401b93ca2df))
* **org-overview:** add sync functionality for GSC properties with user feedback ([1d57d67](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d57d67877015e014837d0f24bb302b4ac9decde))
* **org-overview:** add sync progress bar visibility during syncing ([778e43c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/778e43c2ca7c28d6d7690b3f77d5a698eea02b76))
* **org-overview:** embed not-indexed URLs in Page Issues copy prompt ([f658b29](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f658b295dcc693e99686a37ff9287e40c30d6aa7))
* **org-overview:** enhance SEO panel with site domain extraction and health prompts ([b4722c3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b4722c387d6a8b3d7c487f65e03680b2230c2f5c))
* **org-overview:** enhance sync and reindex button functionality and visibility ([1d8236a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d8236afbd9bd6a9f0e71499b37d977574d1c355))
* **org-overview:** implement health check for favicon and OG metadata with improved prompt handling ([51fc08a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/51fc08a1d049adc6ba1f898452d7b57c8f9520e4))
* **org-overview:** refactor health check logic for favicon and OG metadata ([4da4c79](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4da4c794c2f12f5e54a546aa86ec29eb32c55baa))
* **org-overview:** show PR count with icons in team panel member rows ([1bdd8a5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1bdd8a50882f0c4f3bdfc25d65ec1de82e2d93d6))
* **org-overview:** skeleton for member commits loading + +N repos hint in triage chips ([bad97e7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bad97e7199767d1d28c59d12d6b5280f3fc24887))
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
* **org:** add member-stats API — today commits per GitHub org member including pending ([5a0e548](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5a0e548b5a0034a00ccbb9c93b3af9742c545b7c))
* **org:** getOrgContext helper returns org membership, role, and scoped repos per role ([8bf7b65](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8bf7b65056dace92353c79027310d224c97214ba))
* **org:** mobile bottom nav scoped to role — OWNER gets 5 items, MEMBER gets chat only ([ab6fcbe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ab6fcbe5ca4f63823be77cf32e214acbddd12d48))
* **org:** org layout with role-aware sidebar and bottom nav ([ad1d13d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ad1d13dd61b60c516ec59b872ead60a3c6c198c0))
* **org:** org overview shows repo/member counts, team list with roles, and quick nav links ([81b2d3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/81b2d3e86f3c690b9a6d25fc87c331e3f0a9264c))
* **org:** org root page — MEMBER bounced to chat, OWNER sees overview ([64ed193](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/64ed193dc9364f8904ed8bce53d35a24254c71db))
* **org:** org sidebar shows full nav for OWNER, chat-only for MEMBER ([888d9cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/888d9cf15e4116ee58bc2dbaeef6cd10ba538a4e))
* **org:** remove org collaborators page ([752b7a5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/752b7a5f8fe843110e01fce013fca9059be0e492))
* **orgs:** count commits across all branches in member-stats ([35559ed](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/35559ed18390e2e5348dd76b7eee776e32c14374))
* **orgs:** count today-activity commits across all branches ([34b43a9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/34b43a94df3ce0370b439cdacd30909b89489478))
* **org:** show contributing branches in repo tooltip ([e643345](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e64334509c02f8535645c964894f9f6ab329b408))
* **packages/sdk-expo/src:** add `useGlitchgrab` hook for interacting with the glitchgrab service ([ec89b3d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec89b3d9e10c55893d42fd713b92dd32a99e4812))
* **page:** add OrgGscPropertyPage component for Google Search Console integration ([919de20](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/919de20f4562ccdd2d4ba3ebc102c78ce9ae13b3))
* **pipeline:** pass reporter session info to AI enricher ([c4f85a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c4f85a28c5d7975af457e7c858952c8ebed19853))
* remove AI enrichment pipeline ([6a6f1cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a6f1cfaf5c318f6033d03b8c2bb457062b4bea5))
* **reports:** add useReports and useReport hooks for mobile app ([90b444f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/90b444f62b7c13843503af912aa265d65870bc9a))
* **reports:** restructure filter bar to single row with labeled groups, switch list to grid cards ([0259165](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0259165a1f102dd156ac572c1022d28eba4d3dea))
* **repos:** add search input and grid card layout ([dbc8d4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbc8d4d401d85db0de16a9b95d631e4ff7a2b8b2))
* **repos:** add search input and grid card layout for org repos page ([c9426ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c9426ae06c745ea402097ab8c61db4ebec128400))
* **schema:** add GscProperty model, datasource directUrl, remove McpToken ([8c45ea5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8c45ea519d2b2153fb29f66c251079c97ff19a9e))
* **schema:** add Organization, OrgMember, OrgMemberRepo models and orgId on Repo for team support ([93038ce](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/93038ce583b97d250225e1830c63df6c4e881a1b))
* **schema:** drop OrgMemberRepo model — member repo access now via GitHub API ([88f15a2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/88f15a2dea72bf12cf2852a58e4e6b62776a151c))
* SDK report endpoint creates GitHub issues directly ([4af2a6c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4af2a6cb2d1ef3d6317bacffafe59f5e5121c805))
* **sdk-expo/tsconfig.json:** add default tsconfig.json ([b2d0072](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b2d00728b55b771987d9c82478092b8880a060b1))
* **sdk:** add AI enhance link to report dialog description step ([9e33d1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9e33d1a76324072de78b01897bd20ee99051da8e))
* **sdk:** expose enhanceText helper on useGlitchgrab ([074ca87](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/074ca87143e4399c2631908675c1c4848c40235a))
* **seo:** add /about page with founder bio, company background, and E-E-A-T signals ([6b402f0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6b402f0788f602fc362e8dc0d0949aac44cfc4bd))
* **seo:** add /about to sitemap with priority 0.8 ([b4ce995](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b4ce995c34e8366c7f62b73f203630966cee11a3))
* **seo:** add Check Fix button to re-inspect not-indexed pages without opening GSC ([b7cbc14](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b7cbc14d147c84360af444fae521906396b14ea3))
* **seo:** add check-fix endpoint to re-inspect not-indexed URLs via GSC inspection API ([43a91ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43a91ae5a130a889a18045040d22af92eb2605d3))
* **seo:** add collapsible FAQ section with FAQPage JSON-LD schema to homepage ([d4230e3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4230e3ea1f3467ce36a78bc61d4ffa3777f528f))
* **seo:** add complete favicon links, web manifest, and switch to compressed og-image.jpg ([af00b16](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af00b1648ab794afee58fd29804f9b9de5eeb094))
* **seo:** add copy prompt and create GitHub issue buttons to not-indexed pages section ([a5796e0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a5796e0ff292f8375ebb24ad610a290bf2ad4839))
* **seo:** add create GitHub issue button to favicon health section ([bd035f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bd035f882c80be497191032028deef85cae26d80))
* **seo:** add create issue button to OG section and remove Fix with RFG from favicon health ([d4c397b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d4c397bcb52e01ff8ce6cec74d36087241819b36))
* **seo:** add favicon proxy route with apex/www fallback ([f6270cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f6270cf3d9ab237a8b1cba9b81288aec8cd73c4e))
* **seo:** add google-seo.webp for improved SEO visuals ([aa90cce](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aa90cce4d793a99d76fe5aa658382bed0d34c78c))
* **seo:** add GSC connect page to load session and repos for property selection ([4b06c43](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b06c43606bcb5f8b3c0188543b71db7fc1f8211))
* **seo:** add GscPropertiesClient with sync, reindex, repo linking, bulk disconnect, favicon check ([1d7e221](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1d7e221b05368f97b4d93bf060785a7934b29434))
* **seo:** add llms-full.txt with full page-by-page content for AI engine indexing ([6bf59b8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6bf59b8b000c782558f2c00058d7e0956ca53a0e))
* **seo:** add multi-select bulk disconnect, searchable repo combobox, favicon per property, fix AlertDialog p-nesting hydration errors ([d874270](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d874270e6a008f191b345bfed7c8ecfc44d114a2))
* **seo:** add per-property detail page with back navigation ([4830632](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4830632e596e5bdcabee183ec37fa185c3f22403))
* **seo:** add property detail client with auto-sync, not-indexed list, favicon health, OG tag check ([15b4458](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/15b4458be0e66edb69845f0718ea9d9710d9028f))
* **seo:** add property selection wizard with per-property required repo picker ([8221b56](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8221b56e46455cf3cac97fdfa7f3a1dd9dd05077))
* **seo:** add reason-based tab filtering to not-indexed pages list ([6524cd0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6524cd09e65281ed1223db335bf5f275606c4f06))
* **seo:** add SEO dashboard page with GSC properties and MCP section ([201a9df](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/201a9dfee517723ab502311121d14d0847ce3d85))
* **seo:** add skeleton loading for GSC properties list page ([ca55d37](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ca55d370a9ec14db9cc29d0a271de2857660034b))
* **seo:** add skeleton loading for org SEO properties list page ([69b7f8f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/69b7f8f608bd4dfb4ad12a8b0c56cfe53a66a2c8))
* **seo:** add two-column skeleton loading for GSC property detail page ([075d76d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/075d76d0fd70acc90357743f5c81367e97a57558))
* **seo:** add two-column skeleton loading for org GSC property detail page ([8b070bc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8b070bcdee566f2dfd69a0729035b9934d290571))
* **seo:** consolidate favicon and Open Graph issue handling into a unified health prompt ([8f66704](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8f6670480eb7f9a701bf34edefc0d0195925df82))
* **seo:** enrich SoftwareApplication schema with featureList, softwareVersion, dual offers, MIT license, sameAs ([da49743](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/da497437e99f64f0eae12c49ded95d57cc79bcdb))
* **seo:** extract reusable ConnectGscDialog component ([907881f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/907881f6dc39a9af914222812df3c5e4df610fff))
* **seo:** fix duplicate title tag; add HowToJsonLd for 5-step SDK install walkthrough ([b017fe8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b017fe81909e1827e3daec2583c259099592fc03))
* **seo:** inject WebSiteJsonLd with SearchAction in root layout ([cfb0b7d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cfb0b7d5091864610e092ca25b4f27019f0ed579))
* **seo:** make property site URL a link to detail page ([f4b774f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f4b774fd582ce57c001f609e53f6366de6b90598))
* **seo:** pass cachedNotIndexedPages from DB to property detail component ([4c29456](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4c29456ad0832d1286bc86c514a58ade45b10f3d))
* **seo:** read error/connected query params and pass human-readable flash messages to client ([a02aa4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a02aa4d8826817dfbc60b3a480d09fc0c81b3c86))
* **seo:** replace Script with script tag for synchronous rendering; add WebSiteJsonLd, FAQJsonLd, HowToJsonLd; improve OrganizationJsonLd with logo object, npm sameAs, contact email ([b6b5ea0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b6b5ea01fe9535bd5f5ef80df3a65e4f6e056c7d))
* **seo:** show cached indexing data on load, auto-sync only on first visit, add stale timestamp ([5b69297](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b69297b277ea5046f446af9a44a8f4a5d65b023))
* **seo:** show OAuth error/success toasts via flashMessage prop on SEO page load ([adc7794](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/adc779478c67f69effe0b123726a4f94c849adb3))
* **seo:** show register sitemap prompt with GSC link when no sitemap found ([f61fd4c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f61fd4c1762b3e1f26d4f3e079670ced59f64f82))
* **sidebar:** add Create Org link in Config section for users without an org ([aca164a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aca164a36fd550a2a8b4deaa0face5d651f47087))
* **skeleton:** add Skeleton component for loading placeholders ([cddf8c2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cddf8c25ed8155117870eaff6e861ac56752c510))
* **src/BugReportSheet.tsx:** Add bug report sheet feature ([17367b9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/17367b95bc69c431e57e2eea25d8ac5a20526189))
* **sync-progress:** add sync progress bar animation and styling ([ed3c690](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ed3c6907a68bc2b5dabe7851adfb309bee4bcfff))
* **tabs:** add home screen with stats and recent reports ([a869bf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a869bf677f515a32cb06606f44e063e24b531d22))
* **tamagui:** upgrade packages to rc.42 ([0d3127b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0d3127b418f999be6dba59ae3572d1eaeaa01b39))
* **tooltip:** implement TooltipProvider, Tooltip, TooltipTrigger, and TooltipContent components ([0faf2e7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0faf2e7b35a4f8468e2750ba9863bdebf2506fac))
* **types:** add types for mobile apps ([b51b42c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b51b42c5080faff9aa0d093752b0405ddfcc44ee))
* **ui/LoadingSpinner:** add loading spinner component ([1b9eb79](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1b9eb79874db7c44243dd966a470d01081e5cc58))
* **ui:** add button for previewing Open Graph image in GscPropertyDetail ([a96d5bc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a96d5bcc2fa752431839f0bff98c5c0745e7c6e1))
* **ui:** add EmptyState component ([711f8cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/711f8cfaf547c4e8a24a50481bbb533a707b62c0))
* **ui:** add favicon preview functionality with dialog display ([84177bb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/84177bbc3321045d4483df126b72c1f9c6f04e4f))
* **ui:** add shadcn Command component for searchable combobox ([461ae45](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/461ae456a983f4e0b8ae690f02cb68ecdd093e28))
* **ui:** add shadcn InputGroup component (command dep) ([63a2c1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/63a2c1a9ef4daa3c20a57d43a79a9dac8d1b53c4))
* **ui:** add shadcn Textarea component (command dep) ([3eee74b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3eee74bd2f496d688c5bf62483bd65d04cd00e97))
* **ui:** add shared Footer component for all public pages ([7f419d5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7f419d5646801d9d67af2d2f2e9415b64a1d9476))
* **useScreenshotDetection:** added dynamic screenshot detection functionality ([fc21367](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fc2136733541b27b331d6e183571641150097534))
* **web:** add IssueRow component for improved issue display and link copying ([e7fc939](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e7fc939c51ce792818167ae5e1efc02373720cca))
* **web:** add repo filtering to OrgIssuesTriage component ([d5e1d9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d5e1d9c3aaddd87dcd54ed7d247f0ca8efd9176e))
* **web:** enhance issue fetching by linking PRs to issues ([575d409](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/575d409472395fdae8bebc382641e9201a57fa0d))
* **web:** enhance IssueRow for improved link handling and styling ([8198640](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8198640dde9056b61907a1ee39543091cfd46aa2))
* **web:** implement repo filter popover for issue triage ([34e652f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/34e652f52f6960d601600487d93ec569ce655d53))
* **web:** include CI check state in org PR list endpoint ([3324939](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3324939037c2862038c043aae03dd094ac334784))
* **web:** show CI check badge on org overview PR list ([317f7c8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/317f7c866ba6acd78a3727ec1246d72d328f3afc))

### Bug Fixes

* **.gitignore:** add tamagui auto-generated style cache ([6bc7a42](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6bc7a425332cf9e4d5f2f6273b1164d85ba54718))
* **active-workflows:** replace spinner with skeleton rows on loading ([b9db3d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b9db3d2179382c2e0d839d4d6099485079d57b13))
* Add context for Glitchgrab configurations and user state ([5b4a295](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b4a29594fdcbb305549e4e6015f0f8eaf997961))
* add report detail screen ([cbc53b1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cbc53b17c761e410ebfd3e718a509ac937572c94))
* **analytics:** adjust height of X-axis labels and background size for better layout ([0e3f778](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0e3f7787628cfb610041eaad3d2d98e384a1c33b))
* **analytics:** adjust margin for tooltip space and update grid height for better layout ([6971cab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6971cabfc8bc18b896e2238463d196fba20bac28))
* **analytics:** render IssuesClosedAnalytics directly to fix redirect loop ([deac534](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/deac534a85869d7b69a68e6afb86f5496186f78a))
* **api/orgs/members:** backfill githubLogin from GitHub API for users who logged in before it was stored, preventing duplicate entries in team list ([89ee7cd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/89ee7cd563164148fc487c0337b57abe2cba10bb))
* **api:** add API endpoints for mobile device interactions ([8299f1b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8299f1b66a17b96285fb1cd081aa37372b59fd10))
* **api:** add submitReport function to sdk-expo ([a097b8c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a097b8ce35b1ac9e3a9c4ae3a20ee500ff11e45e))
* **api:** remove collab session from issues-closed analytics auth ([2c429fe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2c429fe810dafb4583d6ac3a2006ab31030b1085))
* **api:** remove collab session from reports analytics auth ([55128ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/55128aef2533a16e949cb36245d6b6b8422077b7))
* **api:** remove collab session from reports list and create ([cc6225d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cc6225dd5e5a033d3772f8030e259f7363c59c82))
* **api:** remove collab session from single report auth ([1aa2e18](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1aa2e18309394922cfe2a39c0c2d0b3880385be9))
* **api:** remove collab shared-repos from repos list ([589423e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/589423eddc41eaacf63bbe1c1c5426609bab68c8))
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
* **auth:** include callbackUrl when proxy redirects unauthenticated dashboard requests to login ([8bc2a89](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8bc2a89c000c12f05c517a2f467ed6c129ae9e34))
* **auth:** update login form UI ([14b195c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/14b195c3df71881785f9b1c22b428e843b7847a0))
* **babel:** update react-native-reanimated/plugin dependency ([3f36a17](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3f36a17ec96c632f603a61315024d59125fa2617))
* **bottom-nav:** remove Collaborators from sheet nav and userType prop ([675f34b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/675f34bcb0dce372866fdc9c1895862bee7dd9f9))
* **bug-chat:** remove unnecessary padding in top context bar ([beab1e1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/beab1e1089376e3527be2f1befbd5d0ffe9ff395))
* **capture:** add dynamic capture and readUriAsBase64 functions ([d3faba7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d3faba791c67d43f13f864bcdba339d32f5d775c))
* **chat:** Add chat screen with type selector, repo selector, description input, and submit button ([3a07262](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3a07262605c2d5624d38e08a50064616e2a94a39))
* **chat:** remove collaboratorOnly prop from no-repos state ([b0e66b2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b0e66b2fb4b77e5ba96b82f6bc839df411a006d8))
* **ci:** add legacy-peer-deps to unblock semantic-release npm version step ([c63e0eb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c63e0eb616c02faf1356bb3b85d66e855ced6c08))
* **ci:** replace workspace:* with file: protocol for npm compatibility ([4195dd9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4195dd9613a2693229c9407d0462c8fc2acf7c2d))
* **components:** add bug report sheet component ([21e8448](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/21e844801bb016e5397d93bc214c2f9eab59ee38))
* **config:** add tamagui.config.ts for mobile branch ([093671d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/093671d55478530b734deb145585f91487ea406f))
* **config:** update Tamagui config to match rc.7 and ensure type safety ([9d45a1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9d45a1c6212b1e1363f3d4d381d06510d870f20f))
* **cron:** use per-tag attribute parsing in getMeta to avoid non-literal RegExp lint error ([078ac24](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/078ac24fe50d70ef29488f07bddbf7f7be2d27ca))
* **dashboard:** increase issues-closed bar chart height from h-14 to h-24 ([b78484b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b78484b3a8173db85a25ffc00df73ed87bcf850a))
* **dashboard:** prevent redirect for specific config paths in DashboardLayout ([a0d039d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0d039d602ae451ada6f70a01096304481cf5bd8))
* **dashboard:** remove collab session and simplify to owner-only auth ([3c2f761](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3c2f7618aa71a748373abd96c009b1f5f6709089))
* **dashboard:** remove collaboratorOnly prop and message ([e560adb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e560adbe7cedc5938f2f5078db2d4bea90793adf))
* **dashboard:** remove collaboratorOnly prop from no-repos state ([1133dc9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1133dc93a30e1c8b1880f1c0c2cd98b12746a03c))
* **dashboard:** remove shared-repo collab logic from context ([b714d11](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b714d110bde8a743c2ed312250d851c508512cd0))
* ensure ogImage is correctly typed as string in GscPropertyDetail ([27c1d7b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/27c1d7b88762d21a5b5d38cfc6cd3a9f6ed15eb6))
* **eslint.config.mjs:** refactor ESLint config to use TypeScript config and plugins ([d531627](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d531627895709c4cafe70af90bd2c6c6c7f037a7))
* **expoConstants:** add `APP_ENV` and `hostUri` to ExpoConfig for API URL ([44c0717](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/44c07175f78adc277afd68414ee5300df43a1872))
* **footer:** use Link instead of a for internal hash navigation ([f8445a7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8445a73a20ee969fc3ca5dc55bcff7464e2458c))
* **github-contributions:** replace spinner with full 52×7 skeleton heatmap grid on loading ([53115f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/53115f5700c29bc58890c0f1cb0d2d7451b0d187))
* **github-contributions:** update skeleton component styling for consistency ([53798c5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/53798c57a404e080762baa362a2f89940d963fa1))
* **glitchgrab-vs-linear:** escape unescaped quote entities for ESLint compliance ([7a729d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7a729d23710114784b87570d2f543c3ec117e073))
* **glitchgrab-vs-sentry:** escape unescaped apostrophe entities for ESLint compliance ([810c823](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/810c823980253ac52716610ae20dfb5a7978101f))
* **gsc-property-detail:** add tooltips for copy prompt and GitHub issue actions ([ef0e48a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef0e48aa63787bf39489f810d4f88cee00033cd6))
* **gsc-property-detail:** enhance layout responsiveness and adjust flex properties ([c0c13b0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0c13b0ff12f99a0ce38c73bdaa2024ab90a2ebd))
* **gsc-property-detail:** improve favicon and OG tag issue handling with copy prompt functionality ([82f0b56](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/82f0b569d79b76c7eb73f4f7c2f3e4c4912ae000))
* **gsc:** cast GscSite[] to any for Prisma Json field assignment ([81f8432](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/81f84328cdc31cfc7a40bc15db521c343ab2c2cd))
* **gsc:** correct WhatsApp og:image check — warning not error, community-observed 300KB threshold, add dimension check ([00d4ac8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00d4ac84668f9e587ddb25dea308482c8c80b2bc))
* **gsc:** extend connect session expiry to 30 min for login redirect flow ([318cea3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/318cea321a32a5e79c43c62a6b6ee43f7a85c480))
* **gsc:** redirect to /connect/gsc after OAuth to skip dashboard auth, add granular error codes ([9edb282](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9edb2823509a8265d0685affe2e68c754147fd5f))
* **gsc:** remove auth() requirement from connect endpoint, use session userId directly ([8ae3704](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8ae3704b5e49ca5e87d834ea3860d5cfb10e9bac))
* **gsc:** use per-tag attribute parsing in getMeta to avoid non-literal RegExp lint error ([24a5d35](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/24a5d35b3a1ad0cb1fe332d531737e9688f10579))
* **hero-terminal:** implement logic to reset line count when cycle changes ([886454f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/886454fe576087e6937f61e8fc45e51210a5aae4))
* **index:** update expo-router entry import ([06611a7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/06611a7c96cd1db1c0a73868d30a572c5cc6941e))
* initial commit of SDK-expo ([c0320cd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0320cdad9168516d396ccbd1f5924772cb22cd5))
* initial implementation of GlitchgrabProvider ([00e408a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/00e408a3b9df883f2b5e2ee527317dad5e74c291))
* **inner-page-header:** add truncate class to title for better text handling ([04a92f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/04a92f1556e1d2c3b425bad995a8a4ea415da9f2))
* **knip.json:** add project and ignore dependencies for mobile app ([978e054](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/978e0540bd8aa5936776400c4f1de24b3570ff02))
* **landing:** add GitFork to lucide import to fix runtime error ([4d20c3b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4d20c3bae72c6cbe2c6231b669b729f1f4f018a0))
* **landing:** escape apostrophes and comment slashes as JSX entities for ESLint ([8800da2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8800da294d2ca223c371673800f7e456d6d9a0d5))
* **layout:** add TooltipProvider for enhanced user interaction ([3497933](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3497933d1a3a1f4348e16a8f8e3468bea7e731b9))
* **lib:** remove export from internal-only GSC interfaces ([9f1a700](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9f1a700214a4d4d4d638e6cd46f59be4e8e82b2b))
* **llms:** remove COLLABORATOR from report sources documentation ([7890eba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7890ebaa4131f6425d488f7cdc9e7dbc12d602c7))
* **login:** wrap GitHubSignInButton in Suspense to satisfy useSearchParams requirement ([73c3eac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/73c3eac2367cc4cee8f02c7811d17624241ab67c))
* **mail:** remove sendCollaboratorInvite email function ([9694709](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/969470916c88e3ba7c4133f1ee3d88c40db2e065))
* **member-stats:** remove export from internal-only interfaces to satisfy pruny ([3902789](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3902789b8576290aa680499b7dc5c0c41ae9619f))
* **metro.config.js:** patch resolveRequest to handle specs_DEPRECATED/NativePlatformConstantsIOS ([e7eb262](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e7eb262eb138088b44b370b913f859d99aa727b5))
* **metro.config.js:** patch specs_DEPRECATED/NativePlatformConstantsIOS.js for RN 0.83 ([59cfaf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/59cfaf60539f7d475a7c701238c8254dc12a6a9f))
* **migration:** drop collaborator tables and remove COLLABORATOR from ReportSource enum ([1b9935e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1b9935efa3bc269a0e861a1d348993f0ecdb39ed))
* **NativePlatformConstantsIOS:** add lazy proxy for TurboModule ([8d44f6f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8d44f6f5caf30acea1d5d8374514d0d80887a0ec))
* **org-bottom-nav:** use full-page nav in WebView to prevent removeChild crash ([8800424](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/880042413dc0d8295da817ba29d0791383c0c19b))
* **org-overview:** adjust layout of SEO panel for improved responsiveness ([74f6b07](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/74f6b070f9a16c763579294198b55c206faaed13))
* **org-overview:** improve SEO panel layout and sync button visibility ([1f3f3d4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1f3f3d4c906b76614b1d526b993c92bb1ca75377))
* **org-overview:** shrink PR panel skeleton to prevent layout shift ([3792416](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/37924162eb375725e59dabbaf08cc8ff8487eb00))
* **org/overview:** use merged members endpoint so all GitHub org members show, pending badge for non-joined ([38f3aba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/38f3abafad910fdf2bff3cc296f1d4e77efb8a24))
* **org:** remove Collaborators from org sidebar config nav ([cf1fc9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/cf1fc9ceaa8b1f8a8cc94d09b43ea3fe87f8434c))
* **org:** remove collaborators mention from reports subtitle ([a6514ec](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a6514ec1dba865a324db324cbf465ad938350d90))
* **orgs:** remove redundant non-null assertion on session.user.id already guarded above ([bf913e8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bf913e8dda15987456ea4dbaab966352376cf565))
* **overview:** replace Math.random in render with static height array for skeleton bars ([99841db](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/99841dbe22871b811811e88b4dc858be0e11f495))
* **package.json:** update development build steps to include node script and port option ([e2066b2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e2066b25854625f469dd1d948ebf5c93ca0d78cf))
* **page:** update navigation link and modify content in LandingPage component ([9eeacf0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9eeacf0206585bdeb355095e261f0eadc006b39a))
* **page:** update pipeline steps and modify content for clarity ([b68eda1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b68eda1536886c3382b44e9a2eb79d917faae88d))
* **pipeline:** remove collaborator email attribution branch from issue body ([997f9d6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/997f9d6e11f9fedfde0cfe6179173a666f418e02))
* **pipeline:** update pipeline steps for clarity and consistency ([f6f3242](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f6f324242f9b487693c2d9fd05b881d83c9f2479))
* **provider:** ignore cross-origin script errors ([54339ba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/54339ba392d695e539751410f3cf33c54589e6cc))
* **proxy:** exclude config paths from org redirect to prevent loops ([b192d6c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b192d6c8a923d03d7bfa78b5330e643ba2a6ef8e))
* **proxy:** remove /collaborators from CONFIG_PATHS exclusion list ([6235712](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/623571224c6ecf034a0d4c0f4579358f2cca2104))
* **reports:** add button to filter reports ([2b24950](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2b24950cdba33aea4b9aee51155da72e11facbc8))
* **reports:** remove COLLABORATOR from source labels map ([c44e9f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c44e9f119370d4075af4872c8d797b6a628f8fe4))
* **reports:** remove collaborator-view subtitle branch ([e012640](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e0126401004237fe76e28557a2b924a3d1462804))
* **reports:** render ReportsList directly on org reports page to fix redirect loop ([39d0785](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/39d07854101707098c32ba970234063109ddc980))
* **report:** two-tier duplicate check — 24h window + 7-day open-issue suppression to stop recurring issue spam ([e483b1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e483b1a137ca491981b2628a1e40c89fcd1cb0db))
* **repos:** remove collaborator-view conditional header text ([dbfb2d2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dbfb2d234448a88273011d3624b73a72bbe9c576))
* **schema:** remove Collaborator/CollaboratorRepo models and COLLABORATOR enum value ([bddcb94](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bddcb9413d253e2bc2b0b3497aee8c1e995073fa))
* **seo:** capture first indexing API error and expose failed count in response ([f77e0f8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f77e0f871fc33913d88e23e08260849bd9d89126))
* **seo:** fix useEffect dep, ternary-as-statement, and Tailwind canonical classes ([41ca92b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/41ca92b26baac77a8db43cca4f8893f4ad26ca2a))
* **seo:** pass detailHrefPrefix prop to avoid hardcoded /dashboard/seo link in org context ([a4ed37c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a4ed37c1b7923ea1e120eb1135c39e21f0221cbc))
* **seo:** preserve session id in callbackUrl when redirecting unauthenticated users to login ([4f00d3d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4f00d3dd09987eeaa7eae09ab7372b30b2753e55))
* **seo:** remove brand from title to prevent template duplication ([1009494](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/100949408d1a6a6f7349ba569f180693530c0b93))
* **seo:** remove brand from title to prevent template duplication ([26835a1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/26835a13889eb948f869001b5b8dea75143fab05))
* **seo:** remove brand from title to prevent template duplication ([0ae81d1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0ae81d12d09cfe4bcc88e855e5a7690326151f8c))
* **seo:** remove brand from title to prevent template duplication ([74dcedc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/74dcedcd792c77e6646e9f0420879da359364c77))
* **seo:** remove brand from title; add missing canonical URL ([f93c40b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f93c40bc34bfa2e31ba3b1f62b392da7b36efcff))
* **seo:** replace circular spinner with skeleton in dashboard loading fallback ([10a60b6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/10a60b6ffdb47fcb5eb6ad3f310452cd87c87f8e))
* **seo:** replace max-h-[420px] with canonical max-h-105 ([ece6a6d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ece6a6d760f7aa8c494238124d7699058540f37e))
* **seo:** supply detailHrefPrefix to GscPropertiesClient in dashboard ([462d380](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/462d38087601786d8422f0bdfd43b94092b62ab6))
* **seo:** supply org-scoped detailHrefPrefix so property links stay within org routing ([bcfd93c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bcfd93c201b164fa36a257201ae330b7eb08d1bb))
* **seo:** switch favicon API to gstatic faviconV2 for reliable display ([4b4efaa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4b4efaa2ab10666ce751f7034b082add63e417b2))
* **seo:** use favicon proxy so 404 fallback to Globe works ([52ba745](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/52ba74511671ff374158013d97e5db91e140fcc4))
* **settings:** added settings screen and components ([40b3f3e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/40b3f3e3383577ad1070ce0736e72d5a7e1c7831))
* **settings:** update sign-out button and header ([6e8ac9b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6e8ac9b0ddf7d9bf3ce9dfe3aa8abec5b4ff9441))
* **sidebar:** remove Collaborators nav item and userType prop ([0b12838](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0b12838371c0b0b49db3cd41a809bd839cd95856))
* **signature:** extend dedup window 1h → 24h, add 7-day open-issue suppression constant ([3a4cbd0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3a4cbd056ace6aa0253a87daae75b29d9e596865))
* **sitemap:** remove /collaborate from private paths and exclude list ([33dedf9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/33dedf9816d98de6d2a562aa011db8d960794da2))
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
* **web:** add 32x32 size to favicon.ico ([a0edb1f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a0edb1fd47b38ad3ed3a355c505bf23ddd9bfee1))
* **web:** allow team panel repo list to wrap instead of truncating ([195fc4d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/195fc4d656f114259e28f7c955e7a249137806a7))
* **web:** declare 32x32 size on favicon.ico link tag ([c0916ad](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0916ad24e44f13b9bc9ec7ac037e4cfd7ebf9b6))
* **web:** extract token const to satisfy TypeScript narrowing in issues route ([005ed9c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/005ed9c1b0e5e29099e7b806e99d5d53df828b92))
* **web:** show all repos in org team panel instead of slicing to 3 ([01bb2ef](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/01bb2ef46082e08121e73f691563326aed7f6fd5))
* **workflow-runs:** extract access_token to const so TS narrows string type without non-null assertion ([a28b1a8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a28b1a808561e718c414de39a9a880b1a873203a))

### Performance Improvements

* **gsc:** parallelize URL inspection with 10 concurrent requests to fix sync timeout ([daa69fe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/daa69fe7be9949b65f62b6184d276149c004330e))
* **seo:** add JPEG og-image compressed to 85KB from 778KB PNG ([6a9307b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a9307b1b62cebac4eb14241189ca7c0342906d6))
* **web:** compress og-image.png below 300KB for WhatsApp previews ([af7cf4f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af7cf4f5902df2324249969642d7b8716b9ce29f))

## [1.19.2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.19.1...sdk-v1.19.2) (2026-05-13)

### Bug Fixes

* **sdk:** set inert on host radix dialogs to prevent focusscope stealing focus ([1f60c97](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1f60c97d8001ade55bee0b872737fbb54230f084))

## [1.19.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.19.0...sdk-v1.19.1) (2026-05-13)

### Bug Fixes

* **sdk:** stop focus propagation to fix textarea clickability with radix focusscope ([7d1dfb9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7d1dfb9d60a0536a56bb0533631acf161ece7289))

## [1.19.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.18.1...sdk-v1.19.0) (2026-05-13)

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
* **dashboard:** show tooltips on upper contribution graph cells ([576022e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/576022e62f52d4991ca5407f67d9b5491d8ce925))
* **sdk:** stop pointerdown propagation to fix dialog clickability with shadcn ([e41deb4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e41deb40e947a7b39cb7dc277df6115277d1c817))
* **sidebar:** guard startAnimation call for non-animated Lucide icons ([302abd8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/302abd8c84efd505388b2746735612bdfa4ab935))
* **sidebar:** replace static Bug with animated BugIcon and fix CMD G shortcut display ([c8ca2e4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c8ca2e462a59450e6e8100fcafc8a981cbc75a38))
* **sidebar:** trigger icon animation from full nav item hover via imperative ref ([3d58482](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3d58482115640e0881586b1828806f309e9522c2))
* **ui:** add global dark themed scrollbar styles ([f64667d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f64667d6883a5590e0e0b1b81753a1aa36d18afa))

## [1.18.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.18.0...sdk-v1.18.1) (2026-05-12)

### Bug Fixes

* **sdk:** include session data in error boundary auto-reports ([b93fd62](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b93fd625d3145308ef318d3c2fa24edcec790306))

## [1.18.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.17.1...sdk-v1.18.0) (2026-05-07)

### Features

* add dotenv support for environment variable management ([627eec2](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/627eec26ea21ac727365add142873fc52568c189))
* **dashboard:** group open issues by repo with per-project count badges ([af5e0ae](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/af5e0ae5684d8b6be4c77e992c0b5e4ddfe51e9a))

### Bug Fixes

* **pipeline:** append reporter session info to SDK_AUTO GitHub issues ([92b06f1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/92b06f137016a8867c9afd20e3ac8f2b1a486502))
* **sdk:** include phone in auto-capture payloads and add session to effect deps ([6a0f8de](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6a0f8de55910d3f59017f279e0d3f34fcce47281))
* **sdk:** use waitUntil to keep pipeline alive after response on Vercel ([bd06245](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bd062456473929f13a40415569b59f89e53f6ede))

## [1.17.1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.17.0...sdk-v1.17.1) (2026-04-30)

### Bug Fixes

* **sdk:** detect host theme from html element when body bg is transparent ([dc848c3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/dc848c36d18788474abd84648d42d2030eedea86))

## [1.17.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.16.0...sdk-v1.17.0) (2026-04-30)

### Features

* **sdk:** add Cmd+Shift+G global keyboard shortcut to open report dialog ([23cfae1](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/23cfae1e3b27f11352d23164ee882e11af0aae4e))
* **sdk:** support Cmd+V clipboard paste and update upload hint text in report dialog ([e33924b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e33924ba6250199e34781a2cf52d03d8c68d2b2c))
* **seo:** add dynamic llms-full.txt route with SDK quickstart and API reference ([f5067c7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f5067c76cc8941bc8b3ba6887430f91fa0e35097))
* **seo:** add keywords, authors, robots meta and title template to root layout ([ec8c8d7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec8c8d763ee823c5eb8b5c560dac9ecb5ba24aa8))
* **seo:** add llms.txt for AI crawler indexing and citation ([f8c6b34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f8c6b349ab70f85782784abaa790cc1c311ccec0))
* **seo:** add Script-based JSON-LD components for Organization, FAQ, Breadcrumb, HowTo ([fe1830b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/fe1830b9e951a9e76fce0a969d8707a6145e399d))

## [1.16.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.15.0...sdk-v1.16.0) (2026-04-21)

### Features

* add CreateTokenDialog component for repository-scoped API token generation ([0e15b8a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0e15b8a1f6e5f837ae2737758ff43fc3b17a29a6))
* add db:deploy script to run prisma migrate deploy ([4889f93](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4889f93a88817204c6ecb2d21e6dd437c6979917))
* **repos:** add org filter chips, reconnect github, and grant-access CTA ([6b6f70b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6b6f70be264da46a1cfdf3c11f6f78e0253e7e5f))
* **repos:** add resyncRepo server action for detecting transfers and renames ([2dafd0a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2dafd0aa2e1a09bc7751634c0bd013b57ff4c45a))
* **repos:** add sync button on repo rows to resync transferred or renamed repos ([4812162](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/481216273178e84e19c3bef35a185db38a1ddfb4))
* **repos:** expose owner avatar_url in GitHub repo listing ([3267d1a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3267d1a9a369ba8aa54a0855a1a4d938dee0fc64))
* **repos:** paginate GitHub repos and expose accounts + reconnect url ([a810367](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a810367c7f5434251bf12997e4de838ec7fa6306))
* **repos:** render GitHub owner avatars in connect dialog ([22f3abf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/22f3abf9e7a59fb304e4bd61be7b8c7deb3e024c))
* **sdk:** add deduplication check before dispatching report in error boundary ([340487b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/340487be7bf55073aaa94c6a4f6bd77003f0c25c))
* **sdk:** add in-memory error signature dedup with 5min window ([517b622](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/517b62265e752fb0123d99842865eb5d673cb66d))
* **sdk:** export deduplication utilities ([c65ad1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c65ad1cd03fe341f483c9f91894d2792a72bcbdf))
* **sdk:** implement deduplication check for global error and unhandled rejection listeners ([4f6d865](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4f6d865116976560f76a51c88cc5e1dee2df66f7))
* **web:** add utility to compute error signatures for issue deduplication ([7df700a](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7df700a34b6f1dc28362f57fef01f301bcf4801a))
* **web:** implement server-side verification to detect and skip duplicate error reports ([2473c26](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2473c2623ba787ac63e49ad0fbd690e050284278))
* **web:** update schema with report signature field and index for deduplication ([561f2ab](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/561f2ab304e870ca199caf5a53719baa5f416b3d))

### Bug Fixes

* **auth:** refresh stored GitHub access_token on every sign-in ([be027e6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/be027e637671e71e2e25513a1d1a727ac5eeee28))
* **bug-chat:** show full repo names in dropdown without truncation ([ce79687](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ce796870ef10d6785a44e204cc9e7c6421ff0ac3))
* **chat:** add lightbox for staged screenshot preview ([6561880](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/65618802b394f8012d28c99d5e54e5bac84d32d9))
* **chat:** increase repo name max-width to prevent premature truncation ([f79aefd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f79aefdbc393f7d3ae16463dd181ba6d5b20fbed))
* **ci:** fail deploy-web step when Vercel hook returns error ([db1706d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/db1706d2dd430ed4f375a9abfc4ba67febf1b172))
* **claude:** simplify enricher to single-turn API call ([3500632](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3500632d1c2e5a06a5904dfd178a3a3c3a4076b6))
* **claude:** trim enricher context to prevent turn exhaustion on large issue lists ([9f51536](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9f5153644dc9d1405c1773b94f559f300f7d5fb8)), closes [#142](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues/142)
* **claude:** use instanceof directly in ternary to fix TS2749 type error ([205b952](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/205b952d568fd8817df1a30f8722da9993d01fa8))
* **collaborators:** show action buttons on mobile without hover ([4ff6a1c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4ff6a1cc51ab89973f380f74d250f26f62580115))
* **dashboard:** wrap GitHub contributions heatmap in horizontal scroll container ([2245fc8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2245fc847b14369e264c1f3ffaaff2261ed177cf))
* **db:** migration for per-user Repo.githubId uniqueness ([212f628](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/212f6287cfe9432764bb4399b96a025ab22b4421))
* **reports:** add open/closed issue state filter to reports list ([0af44ee](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0af44eefe49e3fbf652df91beeea0afa7c9c80c0))
* **reports:** remove internal status filter, keep GitHub open/closed only ([43de5f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/43de5f5231406c6b60305381d59cf4a965c537ba))
* **repos:** return result from connectRepo instead of throwing ([16d5211](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/16d5211fbd8c82b0f7937d6157530350450295af))
* **repos:** stack sync + status badge vertically on mobile ([731ea34](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/731ea344cae9d211e087caaea6c449ec7b938a81))
* **repos:** surface specific GitHub status codes in resyncRepo error messages ([390daf6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/390daf6b31a25f046f2472966a7503eafc36bc86))
* **responsive:** use canonical min-w-130 instead of min-w-[520px] ([03c22d0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/03c22d0d63d10b7c6e13d9bdd5feb36c150b1453))
* **schema:** scope Repo.githubId uniqueness per user ([8680193](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/868019394bcc8aa21194d7b7a4c5a4e9c1b75f62))
* **select:** allow popup to grow wider than trigger for long repo names ([ebde8e6](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ebde8e6aaae1f15ca79a0da36c798845d2feb889))
* **tokens:** make repo select trigger full-width to show complete names ([282e7a3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/282e7a3795bdefc2a88008045fc33a452e280e64))
* **tokens:** remove max-w-40 cap on repo column to show full repo names ([6265933](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/6265933a18b1cb7c3d16505eb6aa8142569a8583))

## [1.15.0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/compare/sdk-v1.14.1...sdk-v1.15.0) (2026-04-15)

### Features

* **analytics:** add reports analytics endpoint for dashboard stats ([50c8134](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/50c8134bc555bea37b34ce68513fa982d65c99e3))
* **api:** add workflow-runs endpoint listing GitHub Actions per repo ([8f8b010](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8f8b010c92c8499c231de2e41f470271456bdc9e))
* **billing:** bypass Razorpay in dev and return PRO_PLATFORM active ([8168e8b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8168e8b294003229543356db7463e9dcc1065ff8))
* **bottom-nav:** replace Repos with Chat tab and add Chat to menu sheet ([41a969f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/41a969f52c7f251ddf18ca516914c97fd90d13f8))
* **chat:** add dedicated chat route separated from main dashboard ([a383fa5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a383fa5aa81759445abe06820b212017bdc3154c))
* **chat:** add screenshot lightbox modal on thumbnail click ([08052ca](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/08052ca8026e64029c33f01e25fc91e5c3873699))
* **claude:** add agentic enricher loop with 6-turn cap, 15s timeout, and fallback ([21945d9](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/21945d9634cb36617bc2ba5109655830748260e3))
* **claude:** add Anthropic SDK client factory ([670a9cc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/670a9cc3e9ca77bbc5bd6910b831c5b343e9f77d))
* **claude:** add in-memory TTL cache for tree/file/search lookups ([ec806fa](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ec806fa511126e1dfce5ce21f67c3573cb423aa8))
* **claude:** add list_repo_tree/read_file/search_code tools scoped to one repo ([82b3893](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/82b389308d0715692e513c47f999dc7aef317970))
* **claude:** add system prompt encoding the 6-action decision ([0656067](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/065606712bda8e9014311d720c4d8944e5c44b10))
* **claude:** add ToolContext and EnrichmentMetrics types ([0818bb7](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/0818bb787d30729f46def670e0965c25719363b5))
* **dashboard:** add analytics view with action cards, PR/issue lists, and heatmap ([8c44ef8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8c44ef84100a42e8345df67fedd0841c1e8fb122))
* **dashboard:** add compact active workflows widget ([2a7a538](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/2a7a53801823c4a819e3dca2b96658c32c1e8073))
* **dashboard:** add elapsed time and progress bar to active workflow rows ([16fa7ce](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/16fa7ceb83f315c027179489756dbb149b2c21c1))
* **dashboard:** add GitHub contributions heatmap with tooltip on hover ([5b2191d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b2191d391e055d24279369f073d3ba00d4adaac))
* **dashboard:** add GitHub-style yearly reports contribution heatmap ([bafdb24](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bafdb24ab956db7f9ba9f0d00e3eddd032ef20fc))
* **dashboard:** add open GitHub issues card with labels and direct links ([05c9700](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/05c9700c419650d7e4a35628ab913580ca346465))
* **dashboard:** add open pull-requests card with direct GitHub links ([b80319b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b80319b59d4252e7f6b6c846739f663e9f92df93))
* **dashboard:** add shared InnerPageHeader primitive for terminal-dev inner pages ([eee136e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/eee136ee78f804fcd7c69405ebb45b3cacecb4c2))
* **dashboard:** add workflow runs section with smart polling and manual refresh ([d6cb835](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d6cb835ddaf3131b568084e4743d1722224c925e))
* **dashboard:** extract reusable no-repos empty state ([33a84bb](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/33a84bbf7eefb9b2e841a484749eeb2d7af94783))
* **dashboard:** extract shared repo-context loader for reuse across pages ([5b14538](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5b1453846d4d4b65b444ce4708312b05ee15bd93))
* **dashboard:** show check status pill on awaiting-review PR list ([c1f9273](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c1f9273b30899fc89aca1c765587d714bc70d592))
* **dashboard:** wire workflow runs section into analytics view ([652b4ef](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/652b4ef254574a396631b2ccfd4013593f85b1d0))
* **enricher:** add structured emit tools for reliable action termination ([df60244](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/df602441f18ed40b6c584528135619d4ccd19a73))
* **github:** add GitHub contributions GraphQL endpoint ([e34212d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e34212d796ba3b297df1d53c61b01141ce566ab1))
* **github:** add listWorkflowRuns API client for GitHub Actions ([7a1e6fc](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7a1e6fc7f605c46f763da7a6c65f1eb38cd7434c))
* **landing:** terminal-dev redesign — hero with live terminal, log-entry feature cards, CLI install transcript + demo video split, pipeline with icons, subscribe.sh waitlist, mono footer ([c8903cf](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c8903cf8f7e5cb8d6316cbf36a639b05ffa408e3))
* **pulls:** fetch and roll up check-run status per PR ([9a622f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/9a622f531ae9ac8d8ed04e7fd12913a96b6cb355))
* **reports:** add date-wise filter pills (TODAY, LAST_7_DAYS, LAST_30_DAYS) ([d73e9f4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d73e9f49d30a187f545553b8c48d86b1ca06a5b6))
* **reports:** add dismiss action for failed reports ([108a683](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/108a6835aa75133028f52c1a2b2e58043a2096a6))
* **reports:** add GET /api/v1/reports/[id] with session auth ([ead5e56](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ead5e5679110b0cb6694ee43f74d6f1179f1c08c))
* **reports:** add POST /api/v1/reports/[id]/comments with session auth ([aff3fb8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/aff3fb8de28811fcc1e6ed8869cd7bcea64e4ef2))
* **reports:** include dismissed field in reports GET response ([bee9214](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/bee92146457a0361f1228b64911d09c3de884a97))
* **repos:** add open issues endpoint for dev triage ([1e7cde3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/1e7cde329630e56b5a40eaf0f895f0c8bb61dbef))
* **repos:** add open pull-requests endpoint via GitHub API ([93892cd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/93892cd7bc94fbd35156673982f11eb57b0ddc4f))
* **scripts:** load env vars from workspace .env in db-sync script ([83cf32c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/83cf32c5dd21579058a47375374d4ce8c8473356))
* **seo:** add canonical URLs to docs, legal, and contact pages ([c0720f3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c0720f3ec2b47c6e149798bd0ac2a743e22ac0bf))
* **seo:** add explicit Next.js sitemap route covering all public pages ([c10ef0c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c10ef0cf0bb8b81b5eae37049cc6f3465bd631bc))
* **seo:** add JSON-LD schema utility for Organization, SoftwareApplication, and BreadcrumbList ([743d8f5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/743d8f57c3637e83eff5cbac80400650b0e0e6a4))
* **seo:** add SoftwareApplication and BreadcrumbList JSON-LD to homepage ([d3b0cb5](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d3b0cb5e27c722debe4630d830dd531a520aad0d))
* **seo:** inject Organization JSON-LD and add canonical URL to root layout ([d6954ec](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d6954ec2891dc1aac3a0a9f4567f3a6aa57dd417))
* **sidebar:** add Chat nav entry for dedicated chat route ([7e733dd](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7e733ddbe476be0a592d38d8fbc40ef0740d4f56))
* **sidebar:** redesign with nav groups, kbd hints, status dot, live count badges, keyboard-styled report button ([d388a57](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d388a57e8624836817a3f6ed371dfc55e99156d6))
* **web:** thread repo context into classifyAndGenerate so claude can read it ([de871d4](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/de871d41cdb9c551e2df2d1f558a4f9d168ed41c))

### Bug Fixes

* **api:** replace non-null assertion with local variable in workflow-runs ([f54e75e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f54e75efeaf4555ed694c74811a7f4b3a761dba9))
* **chat:** disable input and upload until a repo is selected ([a6c88ba](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a6c88baae2b1843c96703ccb00f956dcad0f9a47))
* **chat:** include issue number in chat history sent to AI ([c41b023](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/c41b0237cccdf8e3465b414ecd9c0c9149e8126f))
* **chat:** replace non-null assertion and '!=' with strict equality and guard check ([8f63ae0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8f63ae001a83f672e35351794f92fc01ad7f691a))
* **chat:** stack REPL prefix above content on mobile and prevent issue card button wrap ([b8e5215](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b8e5215553a1c41a8040993dcab2fec5e7ab17f3))
* **dashboard:** add refetchOnWindowFocus and refetchInterval to analytics queries ([a34894e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a34894e57d7531325519945e71a15347372a8693))
* **dashboard:** default to no repo selected and clear chat on repo change ([3bbcb5d](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/3bbcb5d129132cd75d007a87f29aa39135600a40))
* **dashboard:** show toast error when pasting image without repo selected ([8163718](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/81637182465d2f195e8e5e71726a59be832aa973))
* **enricher:** detect emit-tool calls to eliminate JSON parse failures ([a291126](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/a2911267776d828cad479f5f5701777bf9a60287))
* **enricher:** force JSON output on last turn to prevent exhausted-turns fallback ([e316aa8](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e316aa8d3e73cc8250262782571c24193c138944))
* **landing:** use real logo image in footer brand instead of generic terminal icon ([8a6117b](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/8a6117bf826381545ebf565eb8aed5505f97acde))
* **prompt:** escape backticks in template literal to fix parse error ([ac2e9df](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ac2e9df9b6ccfdf732efd5c7222f0ab65f591945))
* **prompt:** teach AI to recognise attach-to-last-issue requests ([68b68ac](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/68b68ac01f6478598593450f19b89e30f729f658))
* **reports:** add dismissed field to ReportItem, remove isOwner from ReportsTabs ([5a38431](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5a38431939c2a8bb540cff6b4b6ffb603a683607))
* **reports:** add repo filter, remove approve/reject, clarify failed status ([7fe2ead](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/7fe2ead88003294be5a04d850f5470f78a5f9a28))
* **reports:** exclude dismissed reports from sidebar failed count ([13c2a8e](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/13c2a8e96c3e0c9fc787f60a52c391b7b6acddea))
* **reports:** inline source-icon rendering to satisfy react-hooks/static-components rule ([32b626c](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/32b626c1b5a342cb7d078e655b5856181f5a4372))
* **reports:** link rows directly to GitHub issue instead of in-app page ([b45f6b3](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/b45f6b3876e1d237b95c24a96dcf8a6da3e00167))
* **reports:** move Date.now() out of component to fix react-hooks/purity lint error ([f602030](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/f602030b5437048b5369e2f4f25246b43b16862c))
* **reports:** move Date.now() out of useMemo into event handler ([484f393](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/484f39387d4461c86d489d97e28cf20952c514ec))
* **reports:** remove unused isOwner prop from ReportsList ([ef3579f](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/ef3579f1d4dd9f4b4d66357f2ed0357e0e9d6e78))
* **scripts:** point dotenvx at root .env and correct db:sync script path ([e2a4388](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/e2a43880062123fd82dfba65852a29ee18dbfbf7))
* **seo:** add explicit sitemap.xml reference to robots.txt via next-sitemap config ([4ad7683](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/4ad768364a82368b7b63e13a932c487554b3acbb))
* **turbo:** add env allowlist to dev task so secrets reach next dev ([9756250](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/97562509214bf01ce9b95553c49d6f49c728f684))
* **web:** add data-scroll-behavior=smooth to html for proper nextjs route transitions ([d3d6fd0](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/d3d6fd0e28806bb588ea408f2c078a94ad61602f))
* **web:** use session-auth endpoints in report detail page ([5547fbe](https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/commit/5547fbe7eedb42f1e875ccb6dfaf1c1a52ce6223))

## [1.14.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.14.0...sdk-v1.14.1) (2026-04-13)

### Bug Fixes

* **dashboard:** remove toast notifications on screenshot upload ([5e67523](https://github.com/WebNaresh/glitchgrab/commit/5e6752352723ea5e4a5baa16502f2a939ca332e2))
* **sdk:** preserve envelope success flag in sendReport result ([0c3cded](https://github.com/WebNaresh/glitchgrab/commit/0c3cded2dca21ee82d555e07247e1d694f3a6316))

## [1.14.0](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.13.4...sdk-v1.14.0) (2026-04-10)

### Features

* **sdk:** auto-detect host app theme color for report dialog ([28ac18c](https://github.com/WebNaresh/glitchgrab/commit/28ac18c3960fe9a623cbedf7d2d0f623734ee8bb))

## [1.13.4](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.13.3...sdk-v1.13.4) (2026-04-10)

### Bug Fixes

* **sdk:** improve gibberish detection with consonant-cluster and char-reuse checks ([2cd7db1](https://github.com/WebNaresh/glitchgrab/commit/2cd7db133a90ebb9e2ce32a8c846d526ba5d194b))

## [1.13.3](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.13.2...sdk-v1.13.3) (2026-04-10)

### Bug Fixes

* **sdk:** ensure client-side text quality validation is included in build ([b9a6836](https://github.com/WebNaresh/glitchgrab/commit/b9a683674a5a500c2c99746cd7e6858b0967a7be))

## [1.13.2](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.13.1...sdk-v1.13.2) (2026-04-10)

### Bug Fixes

* **api:** add CORS headers and localhost dev-mode response to SDK report endpoint ([bec7f0f](https://github.com/WebNaresh/glitchgrab/commit/bec7f0f3246982b0ec8361a30c9172588d8c7c3c))
* **api:** detect localhost via body pageUrl instead of unreliable Origin/Referer headers ([95a7cba](https://github.com/WebNaresh/glitchgrab/commit/95a7cba5024875b9c3126595c28ba374e242cc73))
* **dashboard:** validate report text quality before submitting to AI pipeline ([c638011](https://github.com/WebNaresh/glitchgrab/commit/c6380111a7d3ea7fb857dc858348d1daf56bd3ec))
* **sdk:** add client-side validation to reject gibberish and throwaway text in report dialog ([177bcb5](https://github.com/WebNaresh/glitchgrab/commit/177bcb51b186e822d0406f826aada59a8a8cfa50))
* **sdk:** skip keepalive for large payloads to avoid 64KB browser limit ([00f53cb](https://github.com/WebNaresh/glitchgrab/commit/00f53cba7c865aa63672071471760b5ad02debcb))

## [1.13.1](https://github.com/WebNaresh/glitchgrab/compare/sdk-v1.13.0...sdk-v1.13.1) (2026-04-09)

### Bug Fixes

* **sdk:** prevent hydration mismatch with useSyncExternalStore mounted guard ([f09d5a1](https://github.com/WebNaresh/glitchgrab/commit/f09d5a156377e3657dc160ee0085d83ada9929a6))
* **sdk:** replace useSyncExternalStore with useState+useEffect to prevent hydration mismatch ([fe8ec33](https://github.com/WebNaresh/glitchgrab/commit/fe8ec339b201e9e37b8b0e1d38bfb0f90935acf4))

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
