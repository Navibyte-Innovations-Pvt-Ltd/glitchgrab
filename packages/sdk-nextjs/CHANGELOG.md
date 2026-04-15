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
