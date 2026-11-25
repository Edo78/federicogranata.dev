module.exports = {
  ELEVENTY_ENV: process.env.ELEVENTY_ENV || 'production',
  CMS_GITHUB_REPO: process.env.CMS_GITHUB_REPO || 'Edo78/federicogranata.dev',
  CMS_GITHUB_BRANCH: process.env.CMS_GITHUB_BRANCH || process.env.BRANCH || 'main',
  CMS_GITHUB_AUTH_SCOPE: process.env.CMS_GITHUB_AUTH_SCOPE || 'public_repo',
  CMS_OAUTH_SITE_DOMAIN: process.env.CMS_OAUTH_SITE_DOMAIN || 'federico-granata.netlify.app',
  CMS_SITE_URL: (process.env.CONTEXT === 'production' ? process.env.URL : '') || process.env.DEPLOY_PRIME_URL || '',
};
