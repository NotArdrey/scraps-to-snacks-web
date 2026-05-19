import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'docs', 'page-screenshots');
const screenshotsDir = path.join(outputDir, 'screenshots');

const pages = [
  {
    name: 'Login',
    route: '/login?visualRole=guest',
    displayRoute: '/login',
    fileName: '01-login.png',
    purpose: 'Public sign-in screen for returning users.',
    access: 'Guest-only route. Authenticated users are redirected to their default app destination.',
    workflow: 'A returning user enters an email and password, optionally uses the remember-me checkbox, and submits the form to start a Supabase password login. The forgot-password action opens the reset request flow.',
    keyAreas: [
      'Split-screen authentication layout with the login form on the left and a branded food image panel on the right.',
      'Email and password fields, password visibility toggle, remember-me checkbox, forgot-password action, and primary login button.',
      'Theme toggle is available in the top-left corner for light/dark mode switching.',
    ],
    notes: 'This page is the main entry point for existing users. Error and notice alerts appear above the form after login or password-reset actions.',
  },
  {
    name: 'Register',
    route: '/register?visualRole=guest',
    displayRoute: '/register',
    fileName: '02-register.png',
    purpose: 'Public account creation and paid plan selection flow.',
    access: 'Guest-only route. Authenticated users are redirected to their app destination.',
    workflow: 'A new user enters name, email, password, confirms the password, selects a paid subscription plan, accepts the terms, and continues to PayMongo checkout.',
    keyAreas: [
      'Brand image panel introduces the zero-waste cooking theme.',
      'Account fields collect first name, last name, email, password, and password confirmation.',
      'Plan cards show available paid plans with billing frequency and price.',
      'Terms and Conditions opens an in-page dialog before account creation.',
    ],
    notes: 'The visual documentation uses seeded plan data so the page can be captured even without a live Supabase subscription_plans table.',
  },
  {
    name: 'Reset Password',
    route: '/reset-password?type=recovery&visualRole=user',
    displayRoute: '/reset-password',
    fileName: '03-reset-password.png',
    purpose: 'Password recovery screen shown from a valid recovery link.',
    access: 'Recovery-link route. The real app requires a Supabase password recovery session.',
    workflow: 'A user arriving from a recovery email enters a new password, confirms it, and submits the update. After success, the app signs the user out and sends them back to login.',
    keyAreas: [
      'Compact centered card keeps the recovery task focused.',
      'New password and confirmation fields enforce a minimum password length.',
      'Alert areas communicate invalid links, mismatch errors, or successful password updates.',
    ],
    notes: 'The screenshot is captured with recovery parameters so the form is enabled instead of showing an expired-link state.',
  },
  {
    name: 'Subscription',
    route: '/subscription?visualRole=user',
    displayRoute: '/subscription',
    fileName: '04-subscription.png',
    purpose: 'Plan selection page for authenticated users without active access.',
    access: 'Authenticated route. Users without an active subscription land here before onboarding or app access.',
    workflow: 'The user chooses a plan, reviews the price and billing period, then continues to PayMongo checkout. Active subscribers see a plan-management version of this screen.',
    keyAreas: [
      'Split-screen plan selection layout mirrors the auth pages for a consistent purchase flow.',
      'Plan options highlight the selected plan and show price, description, and billing cadence.',
      'Continue to Payment starts the PayMongo checkout creation flow.',
    ],
    notes: 'This capture shows the pre-subscription state because it is the most important gated access screen.',
  },
  {
    name: 'Payment Success',
    route: '/payment/success?attempt_id=mock-pending&visualRole=user',
    displayRoute: '/payment/success',
    fileName: '05-payment-success.png',
    purpose: 'PayMongo return page while payment confirmation is pending.',
    access: 'Authenticated payment-return route. It expects a checkout attempt reference in the URL.',
    workflow: 'After PayMongo returns the user to the app, this page checks the checkout session. If payment is confirmed, it refreshes the subscription and redirects to onboarding or account.',
    keyAreas: [
      'Status card explains whether the app is still waiting for PayMongo confirmation.',
      'Plan details appear when the payment attempt is available.',
      'Check Again lets users manually retry status verification.',
    ],
    notes: 'The screenshot intentionally shows the pending state because it is visible before automatic verification or redirect completes.',
  },
  {
    name: 'Payment Cancel',
    route: '/payment/cancel?attempt_id=mock-canceled&visualRole=user',
    displayRoute: '/payment/cancel',
    fileName: '06-payment-cancel.png',
    purpose: 'Checkout cancellation page with retry and plan navigation.',
    access: 'Authenticated payment-return route. It expects a checkout attempt or session reference when available.',
    workflow: 'A user who exits PayMongo without completing payment can return to plan selection or retry checkout for the same plan.',
    keyAreas: [
      'Status card explains that the account exists but access remains locked until payment succeeds.',
      'Plan details provide context for the canceled checkout.',
      'Plans and Retry buttons give clear recovery paths.',
    ],
    notes: 'This screen prevents users from feeling stuck after leaving the external payment provider.',
  },
  {
    name: 'Onboarding',
    route: '/onboarding?visualRole=user',
    displayRoute: '/onboarding',
    fileName: '07-onboarding.png',
    purpose: 'Diet and allergy preference setup before entering the app.',
    access: 'Authenticated and subscribed route. New users see this before the pantry; onboarded users can revisit it from Account.',
    workflow: 'The user selects diet preferences and allergies, then completes onboarding. These preferences personalize ingredient validation and recipe generation.',
    keyAreas: [
      'Diet chips capture positive personalization preferences.',
      'Allergy chips capture exclusions that should be avoided in recipe suggestions.',
      'Complete Onboarding saves preferences and marks the profile as onboarded.',
    ],
    notes: 'The app reuses this route later as a preferences editor, but this capture shows the first-run onboarding version.',
  },
  {
    name: 'Pantry',
    route: '/pantry?visualRole=user',
    displayRoute: '/pantry',
    fileName: '08-pantry.png',
    purpose: 'Household pantry management and recipe generation workspace.',
    access: 'Authenticated, subscribed, and onboarded route. Regular users land here after completing setup.',
    workflow: 'Users add pantry items manually, review existing household ingredients, edit or delete items, select ingredients, and generate AI recipes from selected pantry items.',
    keyAreas: [
      'Hero banner gives page context and displays active diet/allergy badges.',
      'Add-item form captures ingredient name, quantity, unit, category, and optional expiration date.',
      'Pantry table shows item amount, category, expiration status, and row-level edit/delete actions.',
      'Batch actions let users delete selected items or generate a recipe from selected ingredients.',
    ],
    notes: 'This is the core productivity page for reducing food waste. Mock pantry data includes varied expiration dates to show table badges and actions.',
  },
  {
    name: 'Magic Scan',
    route: '/scan?visualRole=user',
    displayRoute: '/scan',
    fileName: '09-magic-scan.png',
    purpose: 'Image upload and camera entry point for ingredient scanning.',
    access: 'Authenticated, subscribed, onboarded route. Requires a household in the real app.',
    workflow: 'Users upload an image or take a photo. The app sends the image to AI, validates detected food items against preferences, then lets the user confirm items into the pantry.',
    keyAreas: [
      'Hero banner introduces the AI scanning workflow.',
      'Upload area supports file upload and device camera capture.',
      'Result state can show detected ingredients, confidence, freshness, quantities, units, warnings, and save actions.',
    ],
    notes: 'The screenshot captures the idle upload state. Detection results appear after a user chooses an image.',
  },
  {
    name: 'Cookbook',
    route: '/cookbook?visualRole=user',
    displayRoute: '/cookbook',
    fileName: '10-cookbook.png',
    purpose: 'Saved AI recipes and cookbook management.',
    access: 'Authenticated, subscribed, onboarded route.',
    workflow: 'Users review saved recipes, select recipes for batch deletion, edit recipe title/ingredients/instructions, remove recipes, and use the cookbook chatbot for recipe help.',
    keyAreas: [
      'Hero banner frames the saved recipe library.',
      'Recipe cards show saved date, calories when available, ingredients, and instructions.',
      'Card actions support edit and delete; toolbar actions support select-all and batch delete.',
      'Cookbook chatbot is available as an assistant for saved recipe questions.',
    ],
    notes: 'Mock saved recipes are included so the documentation shows the populated cookbook state instead of the empty state.',
  },
  {
    name: 'Account',
    route: '/account?visualRole=user',
    displayRoute: '/account',
    fileName: '11-account.png',
    purpose: 'Profile, password, subscription, preferences, and sign-out controls.',
    access: 'Authenticated, subscribed, onboarded route.',
    workflow: 'Users manage email, password, subscription, diet/allergy preferences, and sign out. Inline edit forms open when email or password rows are selected.',
    keyAreas: [
      'Hero banner identifies the account settings area.',
      'Email and password rows open edit forms for credential updates.',
      'Subscription row routes to plan management; Diet & Allergies routes to preferences.',
      'Sign Out opens a confirmation modal before ending the session.',
    ],
    notes: 'This page acts as the navigation hub for account-level settings and billing/preferences management.',
  },
  {
    name: 'Admin Dashboard',
    route: '/admin?visualRole=admin',
    displayRoute: '/admin - Dashboard',
    fileName: '12-admin-dashboard.png',
    purpose: 'Admin landing section for high-level metrics and operational shortcuts.',
    access: 'Admin-only route. Non-admin users are redirected away from this page.',
    workflow: 'Admins monitor app metrics, review users and subscriptions, manage plans, inspect pantry records, and maintain recipes from a dedicated dashboard.',
    keyAreas: [
      'Persistent sidebar provides admin section navigation and account controls.',
      'Metric cards summarize users, active subscriptions, monthly revenue, and recipes.',
      'Dashboard charts show user growth and plan breakdown.',
      'Quick actions jump to common admin tasks such as reviewing users, creating plans, and adding pantry or recipe records.',
    ],
    notes: 'This is the default admin section shown when an admin opens the /admin route.',
  },
  {
    name: 'Admin Users',
    route: '/admin?visualRole=admin',
    displayRoute: '/admin - Users section',
    fileName: '13-admin-users.png',
    purpose: 'Admin user-management section reached from the Users item in the sidebar.',
    access: 'Admin-only section inside the /admin route.',
    workflow: 'Admins review registered users, inspect subscription status, update roles or subscription assignments, and remove user profiles when needed.',
    sidebarButton: 'Open Users',
    keyAreas: [
      'Sidebar remains visible so admins can move between dashboard sections.',
      'Users table lists account identity, role, subscription status, plan information, and account dates.',
      'Row actions expose editing and deletion controls for individual user records.',
      'Role and subscription controls help admins correct access or support account issues.',
    ],
    notes: 'This section is not a separate React Router page; it is a sidebar-driven tab inside Admin, so the documentation labels it as an admin section.',
  },
  {
    name: 'Admin Plans',
    route: '/admin?visualRole=admin',
    displayRoute: '/admin - Plans section',
    fileName: '14-admin-plans.png',
    purpose: 'Admin plan-management section reached from the Plans item in the sidebar.',
    access: 'Admin-only section inside the /admin route.',
    workflow: 'Admins create, edit, activate, deactivate, or delete subscription plans used by registration, checkout, and account billing views.',
    sidebarButton: 'Open Plans',
    keyAreas: [
      'Plans table shows plan name, code, pricing, billing period, active status, and action controls.',
      'Add Plan opens a modal for creating a new subscription plan.',
      'Toggle controls let admins turn plans on or off without deleting them.',
      'Edit and delete actions support plan maintenance.',
    ],
    notes: 'These plan records feed the public registration and subscription pages, so this section is part of the app configuration surface.',
  },
  {
    name: 'Admin Pantry',
    route: '/admin?visualRole=admin',
    displayRoute: '/admin - Pantry section',
    fileName: '15-admin-pantry.png',
    purpose: 'Admin pantry-inspection section reached from the Pantry item in the sidebar.',
    access: 'Admin-only section inside the /admin route.',
    workflow: 'Admins inspect pantry items across households, add items for support/testing, edit item details, and discard records when needed.',
    sidebarButton: 'Open Pantry',
    keyAreas: [
      'Pantry table lists ingredient, category, quantity, expiration, created date, and row actions.',
      'Add Item opens an admin form for creating pantry items against a household.',
      'Edit actions allow correction of ingredient name, quantity, unit, category, and expiration date.',
      'Delete actions mark pantry items as discarded.',
    ],
    notes: 'This admin section supports operational review of household pantry data and is separate from the user-facing Pantry page.',
  },
  {
    name: 'Admin Recipes',
    route: '/admin?visualRole=admin',
    displayRoute: '/admin - Recipes section',
    fileName: '16-admin-recipes.png',
    purpose: 'Admin recipe-maintenance section reached from the Recipes item in the sidebar.',
    access: 'Admin-only section inside the /admin route.',
    workflow: 'Admins review generated recipes, add curated recipes, edit ingredients and instructions, and remove recipes from the system.',
    sidebarButton: 'Open Recipes',
    keyAreas: [
      'Recipes table lists title, ingredient/step counts, created date, and row actions.',
      'Add Recipe opens a modal for recipe title, ingredient lines, and instructions.',
      'Edit actions update an existing recipe’s details.',
      'Delete actions remove recipe records and related saved-recipe links.',
    ],
    notes: 'This section documents the final sidebar destination that was missing from the earlier admin capture.',
  },
];

const documentationDate = 'May 9, 2026';

const previousSystemUpdates = [
  {
    title: 'Secure Account Access and Recovery',
    status: 'Implemented',
    screenshots: ['Login', 'Register', 'Reset Password', 'Account'],
    summary: 'The system supports guest registration, returning-user login, password recovery, and authenticated account management.',
    discussion: 'This update established the user identity foundation. It separates guest-only routes from authenticated routes, gives users a recovery path when they lose access, and places account-level settings in one controlled area.',
    documentation: 'The screenshots show the full access journey: sign in, create account, recover password, and manage account settings after login.',
  },
  {
    title: 'Paid Subscription and Checkout Flow',
    status: 'Implemented',
    screenshots: ['Subscription', 'Payment Success', 'Payment Cancel'],
    summary: 'The system includes paid plan selection, PayMongo checkout handling, and clear return screens for successful, pending, or canceled payment attempts.',
    discussion: 'This update protects premium app areas behind subscription status while giving users a visible path to recover from checkout cancellation or delayed payment confirmation.',
    documentation: 'The screenshots document plan selection, pending payment verification, and checkout cancellation recovery.',
  },
  {
    title: 'Personalized Onboarding',
    status: 'Implemented',
    screenshots: ['Onboarding'],
    summary: 'The onboarding flow collects diet preferences and allergy restrictions before users enter the pantry workflow.',
    discussion: 'This update makes recipe and ingredient experiences more relevant because the system can apply preferences before generating suggestions or validating scanned food items.',
    documentation: 'The screenshot captures the preference chips and the completion action used during first-run setup.',
  },
  {
    title: 'Pantry Management and Magic Scan',
    status: 'Implemented',
    screenshots: ['Pantry', 'Magic Scan'],
    summary: 'Users can manage household pantry items manually and start an AI-assisted image scanning workflow for ingredient capture.',
    discussion: 'This update forms the core food-waste reduction workflow. The pantry keeps ingredient records organized, while Magic Scan reduces manual entry by allowing users to upload or capture food images.',
    documentation: 'The screenshots show both the populated pantry workspace and the image upload entry point for AI scanning.',
  },
  {
    title: 'Cookbook and Recipe Assistance',
    status: 'Implemented',
    screenshots: ['Cookbook'],
    summary: 'The system stores saved recipes and provides a cookbook area for reviewing, editing, deleting, and getting recipe help.',
    discussion: 'This update connects pantry ingredients to reusable cooking outcomes. Users can preserve generated recipes, review instructions, and keep practical meal ideas available after the first generation.',
    documentation: 'The screenshot displays a populated cookbook state so saved recipes and actions are visible.',
  },
  {
    title: 'Admin Management Console',
    status: 'Implemented',
    screenshots: ['Admin Dashboard', 'Admin Users', 'Admin Plans', 'Admin Pantry', 'Admin Recipes'],
    summary: 'Admins have a dedicated console for system metrics, user records, subscription plans, pantry data, and recipes.',
    discussion: 'This update gives operators a single place to review activity and maintain system data. It supports both monitoring and direct management of records used by the public app.',
    documentation: 'The screenshots cover every admin sidebar section so the documentation includes the complete admin surface.',
  },
  {
    title: 'Supabase Data and Payment Backend Hardening',
    status: 'Implemented',
    screenshots: ['Subscription', 'Payment Success', 'Admin Users'],
    summary: 'Database migrations and Edge Functions support checkout sessions, subscription records, personal household setup, and safer admin user deletion flows.',
    discussion: 'This update strengthens the data layer behind the visible screens. It keeps subscriptions, households, checkout attempts, and admin maintenance behavior aligned with the frontend routes.',
    documentation: 'The related screenshots show the user-facing and admin-facing areas most directly supported by the backend changes.',
  },
];

const latestSystemUpdate = {
  date: documentationDate,
  title: 'Visual System Documentation and Update Presentation',
  feature: 'A complete presentation-ready documentation layer that explains previous updates, identifies the latest update, and pairs system screenshots with clear discussion.',
  status: 'Added today',
  screenshots: ['Admin Dashboard', 'Admin Recipes'],
  purpose: 'This update turns the page screenshot bundle into a structured system presentation. It is designed for reviewers who need to understand what the system already has, what was added most recently, and how each screenshot proves or explains the feature.',
  additions: [
    'Added a Previous System Updates section with explanations for completed system features.',
    'Added a Latest System Update section dated May 9, 2026.',
    'Added a Screenshot and Documentation Coverage section so every screenshot has a labeled explanation.',
    'Kept the detailed page-by-page documentation with route, access, user flow, detected page structure, notes, and full screenshots.',
  ],
  discussion: 'The newest update is documentation-focused rather than a new business workflow. It improves the system presentation by connecting screenshots to feature history, current functionality, and review requirements.',
};

const presentationRequirements = [
  {
    requirement: 'Previous System Updates',
    evidence: 'Covered through grouped update summaries for authentication, checkout, onboarding, pantry, scanning, cookbook, admin, and backend hardening.',
  },
  {
    requirement: 'Latest System Update',
    evidence: `Documented as the ${latestSystemUpdate.title} update added on ${latestSystemUpdate.date}.`,
  },
  {
    requirement: 'Screenshots and Documentation',
    evidence: 'Every captured page screenshot is included in the detailed page sections and summarized in the coverage table.',
  },
  {
    requirement: 'Clear Formatting',
    evidence: 'The document uses labeled headings, tables, route metadata, user-flow notes, screenshot discussions, and export-ready HTML, DOC, and PDF output.',
  },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAvailablePort(startPort) {
  return new Promise(resolve => {
    const tryPort = port => {
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    };

    tryPort(startPort);
  });
}

async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for dev server at ${url}`);
}

function startDevServer(port) {
  const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: projectRoot,
      env: { ...process.env, VITE_VISUAL_DOCS: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));

  return child;
}

async function summarizePage(page) {
  return page.evaluate(() => {
    const clean = value => (value || '').replace(/\s+/g, ' ').trim();
    const shorten = value => value.length > 90 ? `${value.slice(0, 87)}...` : value;
    const textFrom = selector => Array.from(document.querySelectorAll(selector))
      .map(element => clean(element.innerText || element.textContent))
      .map(shorten)
      .filter(Boolean);

    const fields = Array.from(document.querySelectorAll('input, select, textarea'))
      .map(element => (
        element.getAttribute('aria-label') ||
        element.getAttribute('placeholder') ||
        element.getAttribute('name') ||
        element.id ||
        element.tagName.toLowerCase()
      ))
      .map(clean)
      .map(shorten)
      .filter(Boolean);

    return {
      finalUrl: `${window.location.pathname}${window.location.search}`,
      headings: textFrom('h1, h2, h3').slice(0, 8),
      buttons: textFrom('button').slice(0, 12),
      fields: fields.slice(0, 12),
    };
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownList(values) {
  if (!values.length) return 'None detected.';
  return values.map(value => `\`${value}\``).join(', ');
}

function markdownBullets(values) {
  return values.map(value => `  - ${value}`).join('\n');
}

function resultsByName(results) {
  return new Map(results.map(result => [result.name, result]));
}

function screenshotLinksMarkdown(screenshots, resultMap) {
  return screenshots
    .map(name => {
      const result = resultMap.get(name);
      return result
        ? `[${result.name}](./screenshots/${result.fileName})`
        : name;
    })
    .join(', ');
}

function screenshotLinksHtml(screenshots, resultMap) {
  return screenshots
    .map(name => {
      const result = resultMap.get(name);
      return result
        ? `<a href="./screenshots/${result.fileName}">${escapeHtml(result.name)}</a>`
        : escapeHtml(name);
    })
    .join(', ');
}

function renderUpdatePresentationMarkdown(results) {
  const resultMap = resultsByName(results);
  const previousSections = previousSystemUpdates.map(update => `### ${update.title}

- Status: ${update.status}
- Related screenshots: ${screenshotLinksMarkdown(update.screenshots, resultMap)}
- Update summary: ${update.summary}
- Discussion: ${update.discussion}
- Documentation notes: ${update.documentation}
`).join('\n');

  const latestScreenshotDiscussion = latestSystemUpdate.screenshots
    .map(name => {
      const result = resultMap.get(name);
      if (!result) return `- ${name}: Screenshot reference unavailable.`;
      return `- ${result.name}: ${result.purpose} ${result.notes}`;
    })
    .join('\n');

  const coverageRows = results
    .map((result, index) => (
      `| ${index + 1} | [${result.name}](./screenshots/${result.fileName}) | ${result.purpose} | ${result.notes} |`
    ))
    .join('\n');

  const requirementRows = presentationRequirements
    .map(item => `| ${item.requirement} | ${item.evidence} |`)
    .join('\n');

  return `## Previous System Updates

${previousSections}
## Latest System Update

- Date added: ${latestSystemUpdate.date}
- Update title: ${latestSystemUpdate.title}
- Status: ${latestSystemUpdate.status}
- Feature added today: ${latestSystemUpdate.feature}
- Purpose: ${latestSystemUpdate.purpose}
- Related screenshots: ${screenshotLinksMarkdown(latestSystemUpdate.screenshots, resultMap)}

### What Was Added Today

${markdownBullets(latestSystemUpdate.additions)}

### Latest Update Discussion

${latestSystemUpdate.discussion}

### Latest Update Screenshot Discussion

${latestScreenshotDiscussion}

## Screenshots and Documentation Coverage

The table below labels every screenshot included in this documentation bundle and explains what each image demonstrates. Full-size screenshots and page-level discussions appear in the detailed sections after the page index.

| # | Screenshot | What It Shows | Discussion |
|---|---|---|---|
${coverageRows}

## Presentation Requirements Checklist

| Requirement | Documentation Evidence |
|---|---|
${requirementRows}
`;
}

function renderUpdatePresentationHtml(results) {
  const resultMap = resultsByName(results);

  const previousSections = previousSystemUpdates.map(update => `
    <section class="presentation-card">
      <h3>${escapeHtml(update.title)}</h3>
      <dl>
        <dt>Status</dt><dd>${escapeHtml(update.status)}</dd>
        <dt>Screenshots</dt><dd>${screenshotLinksHtml(update.screenshots, resultMap)}</dd>
      </dl>
      <p><strong>Update summary:</strong> ${escapeHtml(update.summary)}</p>
      <p><strong>Discussion:</strong> ${escapeHtml(update.discussion)}</p>
      <p><strong>Documentation notes:</strong> ${escapeHtml(update.documentation)}</p>
    </section>
  `).join('');

  const latestScreenshotDiscussion = latestSystemUpdate.screenshots
    .map(name => {
      const result = resultMap.get(name);
      if (!result) return `<li><strong>${escapeHtml(name)}:</strong> Screenshot reference unavailable.</li>`;
      return `<li><strong>${escapeHtml(result.name)}:</strong> ${escapeHtml(`${result.purpose} ${result.notes}`)}</li>`;
    })
    .join('');

  const coverageRows = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><a href="./screenshots/${result.fileName}">${escapeHtml(result.name)}</a></td>
      <td>${escapeHtml(result.purpose)}</td>
      <td>${escapeHtml(result.notes)}</td>
    </tr>
  `).join('');

  const requirementRows = presentationRequirements.map(item => `
    <tr>
      <td>${escapeHtml(item.requirement)}</td>
      <td>${escapeHtml(item.evidence)}</td>
    </tr>
  `).join('');

  return `
    <section class="presentation-section">
      <h2>Previous System Updates</h2>
      ${previousSections}
    </section>

    <section class="presentation-section">
      <h2>Latest System Update</h2>
      <dl>
        <dt>Date added</dt><dd>${escapeHtml(latestSystemUpdate.date)}</dd>
        <dt>Update title</dt><dd>${escapeHtml(latestSystemUpdate.title)}</dd>
        <dt>Status</dt><dd>${escapeHtml(latestSystemUpdate.status)}</dd>
        <dt>Screenshots</dt><dd>${screenshotLinksHtml(latestSystemUpdate.screenshots, resultMap)}</dd>
      </dl>
      <p><strong>Feature added today:</strong> ${escapeHtml(latestSystemUpdate.feature)}</p>
      <p><strong>Purpose:</strong> ${escapeHtml(latestSystemUpdate.purpose)}</p>
      <h3>What Was Added Today</h3>
      <ul>${latestSystemUpdate.additions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>Latest Update Discussion</h3>
      <p>${escapeHtml(latestSystemUpdate.discussion)}</p>
      <h3>Latest Update Screenshot Discussion</h3>
      <ul>${latestScreenshotDiscussion}</ul>
    </section>

    <section class="presentation-section">
      <h2>Screenshots and Documentation Coverage</h2>
      <p>The table below labels every screenshot included in this documentation bundle and explains what each image demonstrates. Full-size screenshots and page-level discussions appear in the detailed sections after the page index.</p>
      <table>
        <thead>
          <tr><th>#</th><th>Screenshot</th><th>What It Shows</th><th>Discussion</th></tr>
        </thead>
        <tbody>${coverageRows}</tbody>
      </table>
    </section>

    <section class="presentation-section">
      <h2>Presentation Requirements Checklist</h2>
      <table>
        <thead>
          <tr><th>Requirement</th><th>Documentation Evidence</th></tr>
        </thead>
        <tbody>${requirementRows}</tbody>
      </table>
    </section>
  `;
}

function renderMarkdown(results) {
  const summaryRows = results
    .map((result, index) => (
      `| ${index + 1} | ${result.name} | \`${result.displayRoute}\` | ${result.access} | [Screenshot](./screenshots/${result.fileName}) |`
    ))
    .join('\n');

  const sections = results.map((result, index) => `## ${index + 1}. ${result.name}

- Route: \`${result.displayRoute}\`
- Captured URL: \`${result.summary.finalUrl}\`
- Purpose: ${result.purpose}
- Access and routing: ${result.access}

### User Flow

${result.workflow}

### Main Screen Areas

${markdownBullets(result.keyAreas)}

### Detected Page Structure

- Key headings visible in the screenshot: ${markdownList(result.summary.headings)}
- Visible buttons/actions detected by Playwright: ${markdownList(result.summary.buttons)}
- Inputs and selects detected by Playwright: ${markdownList(result.summary.fields)}

### Documentation Notes

${result.notes}

![${result.name}](./screenshots/${result.fileName})
`).join('\n');

  return `# Scraps2Snacks Page Screenshot Documentation

Each page section explains why the page exists, who can access it, what the user is expected to do, the important interface areas, and what Playwright detected on the screen during capture.

The root route \`/\` is a redirect route: guests go to \`/login\`, while signed-in users are routed to the appropriate app area.

${renderUpdatePresentationMarkdown(results)}

## Page Index

| # | Page | Route | Access / Routing | Screenshot |
|---|---|---|---|---|
${summaryRows}

${sections}
`;
}

function imageDataUri(filePath) {
  return fs.readFile(filePath).then(buffer => `data:image/png;base64,${buffer.toString('base64')}`);
}

async function renderHtml(results, { embedImages = false } = {}) {
  const imageSources = new Map();
  if (embedImages) {
    await Promise.all(results.map(async result => {
      imageSources.set(result.fileName, await imageDataUri(path.join(screenshotsDir, result.fileName)));
    }));
  }

  const rowHtml = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(result.name)}</td>
      <td><code>${escapeHtml(result.displayRoute)}</code></td>
      <td>${escapeHtml(result.access)}</td>
      <td>${escapeHtml(result.purpose)}</td>
    </tr>
  `).join('');

  const sections = results.map((result, index) => {
    const imageSrc = embedImages
      ? imageSources.get(result.fileName)
      : `./screenshots/${result.fileName}`;

    return `
      <section class="page-section">
        <h2>${index + 1}. ${escapeHtml(result.name)}</h2>
        <dl>
          <dt>Route</dt><dd><code>${escapeHtml(result.displayRoute)}</code></dd>
          <dt>Captured URL</dt><dd><code>${escapeHtml(result.summary.finalUrl)}</code></dd>
          <dt>Purpose</dt><dd>${escapeHtml(result.purpose)}</dd>
          <dt>Access</dt><dd>${escapeHtml(result.access)}</dd>
        </dl>
        <h3>User Flow</h3>
        <p>${escapeHtml(result.workflow)}</p>
        <h3>Main Screen Areas</h3>
        <ul>${result.keyAreas.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <h3>Detected Page Structure</h3>
        <dl>
          <dt>Key headings</dt><dd>${escapeHtml(result.summary.headings.join(', ') || 'None detected')}</dd>
          <dt>Visible buttons/actions</dt><dd>${escapeHtml(result.summary.buttons.join(', ') || 'None detected')}</dd>
          <dt>Inputs/selects</dt><dd>${escapeHtml(result.summary.fields.join(', ') || 'None detected')}</dd>
        </dl>
        <h3>Documentation Notes</h3>
        <p>${escapeHtml(result.notes)}</p>
        <img src="${imageSrc}" alt="${escapeHtml(result.name)} screenshot" />
      </section>
    `;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Scraps2Snacks Page Screenshot Documentation</title>
  <style>
    @page { size: A4; margin: 0.45in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #172033;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 0 0 12px; page-break-after: avoid; }
    h3 { font-size: 14px; margin: 14px 0 6px; page-break-after: avoid; }
    p { margin: 0 0 12px; }
    ul { margin: 0 0 12px 18px; padding: 0; }
    li { margin: 0 0 5px; }
    code {
      background: #eef2f7;
      border-radius: 4px;
      padding: 2px 5px;
      font-family: Consolas, Monaco, monospace;
      font-size: 0.92em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #d9e1ec;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f3f6fa; }
    a { color: #4b3fb5; text-decoration: none; }
    strong { color: #172033; }
    dl {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 6px 12px;
      margin: 0 0 14px;
      font-size: 12px;
    }
    dt { color: #637083; font-weight: 700; }
    dd { margin: 0; }
    img {
      width: 100%;
      height: auto;
      border: 1px solid #d9e1ec;
      border-radius: 8px;
      display: block;
    }
    .cover {
      border-bottom: 3px solid #7a5ed3;
      margin-bottom: 18px;
      padding-bottom: 14px;
    }
    .page-section {
      page-break-before: always;
      margin: 0 0 28px;
    }
    .note {
      background: #f7f5ff;
      border-left: 4px solid #7a5ed3;
      padding: 10px 12px;
      margin: 14px 0;
      font-size: 13px;
    }
    .presentation-section {
      margin: 20px 0 28px;
    }
    .presentation-card {
      border: 1px solid #d9e1ec;
      border-radius: 8px;
      padding: 12px 14px;
      margin: 0 0 12px;
      page-break-inside: avoid;
    }
    .presentation-card h3 {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <section class="cover">
    <h1>Scraps2Snacks Page Screenshot Documentation</h1>
  </section>

  <p class="note">The root route <code>/</code> redirects guests to <code>/login</code> and signed-in users to the appropriate app area, so the screenshots below focus on the concrete routed screens.</p>

  ${renderUpdatePresentationHtml(results)}

  <h2>Page Index</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Page</th><th>Route</th><th>Access / Routing</th><th>Purpose</th></tr>
    </thead>
    <tbody>${rowHtml}</tbody>
  </table>

  ${sections}
</body>
</html>`;
}

async function writeDocs(results) {
  const markdownPath = path.join(outputDir, 'SCRAPS_TO_SNACKS_PAGE_DOCUMENTATION.md');
  const htmlPath = path.join(outputDir, 'SCRAPS_TO_SNACKS_PAGE_DOCUMENTATION.html');
  const wordPath = path.join(outputDir, 'SCRAPS_TO_SNACKS_PAGE_DOCUMENTATION.doc');
  const pdfPath = path.join(outputDir, 'SCRAPS_TO_SNACKS_PAGE_DOCUMENTATION.pdf');

  await fs.writeFile(markdownPath, renderMarkdown(results), 'utf8');
  await fs.writeFile(htmlPath, await renderHtml(results), 'utf8');
  await fs.writeFile(wordPath, await renderHtml(results, { embedImages: true }), 'utf8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();

  return { markdownPath, htmlPath, wordPath, pdfPath };
}

async function capturePages(baseUrl) {
  await fs.rm(screenshotsDir, { recursive: true, force: true });
  await fs.mkdir(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const results = [];
  for (const route of pages) {
    const url = new URL(route.route, baseUrl);
    const screenshotPath = path.join(screenshotsDir, route.fileName);

    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(800);

    if (route.sidebarButton) {
      await page.getByRole('button', { name: route.sidebarButton }).click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const summary = await summarizePage(page);
    results.push({ ...route, screenshotPath, summary });
    console.log(`Captured ${route.name}: ${route.displayRoute}`);
  }

  await browser.close();
  return results;
}

async function main() {
  const port = await getAvailablePort(5177);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startDevServer(port);

  const cleanup = () => {
    if (!server.killed) server.kill();
  };

  process.once('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });

  try {
    await waitForServer(baseUrl);
    const results = await capturePages(baseUrl);
    const outputs = await writeDocs(results);

    console.log('\nGenerated documentation:');
    for (const filePath of Object.values(outputs)) {
      console.log(`- ${path.relative(projectRoot, filePath)}`);
    }
  } finally {
    cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
