declare const process: {
  env: {
    NODE_ENV: string;
    /** Release fallbacks, inlined by the bundler at build time when defined */
    NEXT_PUBLIC_APP_VERSION?: string;
    NEXT_PUBLIC_RELEASE?: string;
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
  };
};
